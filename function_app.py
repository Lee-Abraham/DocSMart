import json
import uuid
import os
import io

import azure.functions as func
import psycopg2
import psycopg2.extras
import pdfplumber
import firebase_admin
from firebase_admin import credentials, auth

from email.parser import BytesParser
from email.policy import default
from openai import AzureOpenAI

from shared.db import get_connection
from shared.chunker import chunk_text


# ==================================================
# APP INIT — MUST BE AT IMPORT TIME
# ==================================================
app = func.FunctionApp()


# ==================================================
# FIREBASE (LAZY INIT — CRITICAL FOR FLEX)
# ==================================================
_firebase_initialized = False


def init_firebase():
    """
    Initializes Firebase ONLY when first needed.
    Prevents Azure Functions from crashing during import/indexing.
    """
    global _firebase_initialized

    if _firebase_initialized:
        return

    project_id = os.getenv("FIREBASE_PROJECT_ID")
    private_key = os.getenv("FIREBASE_PRIVATE_KEY")
    client_email = os.getenv("FIREBASE_CLIENT_EMAIL")

    # If vars are missing, skip init (functions still load)
    if not project_id or not private_key or not client_email:
        return

    cred = credentials.Certificate({
        "type": "service_account",
        "project_id": project_id,
        "private_key": private_key.replace("\\n", "\n"),
        "client_email": client_email,
        "token_uri": "https://oauth2.googleapis.com/token",
    })

    firebase_admin.initialize_app(cred)
    _firebase_initialized = True


def get_authenticated_user(req: func.HttpRequest):
    init_firebase()

    auth_header = req.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise Exception("Missing Authorization header")

    token = auth_header.split("Bearer ")[1]
    decoded = auth.verify_id_token(token)

    return {
        "uid": decoded["uid"],
        "email": decoded.get("email"),
    }


# ==================================================
# OPENAI CONFIG (SAFE AT IMPORT)
# ==================================================
USE_REAL_AI = os.getenv("USE_REAL_AI", "false").lower() == "true"
CHAT_DEPLOYMENT = os.getenv("AZURE_OPENAI_CHAT_DEPLOYMENT")

openai_client = None
if USE_REAL_AI:
    openai_client = AzureOpenAI(
        api_key=os.getenv("AZURE_OPENAI_KEY"),
        azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
        api_version="2024-02-15-preview",
    )


# ==================================================
# HEALTH (PUBLIC — ALWAYS LOADS)
# ==================================================
@app.function_name(name="health")
@app.route(route="health", methods=["GET"], auth_level=func.AuthLevel.ANONYMOUS)
def health(req: func.HttpRequest) -> func.HttpResponse:
    return func.HttpResponse(
        json.dumps({ "status": "ok" }),
        mimetype="application/json",
    )


# ==================================================
# LIST DOCUMENTS (AUTH)
# ==================================================
@app.function_name(name="documents")
@app.route(route="documents", methods=["GET"])
def list_documents(req: func.HttpRequest) -> func.HttpResponse:
    try:
        user = get_authenticated_user(req)
    except Exception as e:
        return func.HttpResponse(str(e), status_code=401)

    conn = get_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    cur.execute(
        """
        SELECT id, file_name, file_type, uploaded_at
        FROM documents
        WHERE user_id = %s
        ORDER BY uploaded_at DESC;
        """,
        (user["uid"],),
    )

    docs = cur.fetchall()
    cur.close()
    conn.close()

    for d in docs:
        d["uploaded_at"] = d["uploaded_at"].isoformat()

    return func.HttpResponse(json.dumps(docs), mimetype="application/json")


# ==================================================
# DELETE DOCUMENT
# ==================================================
@app.function_name(name="delete_document")
@app.route(route="documents/{document_id}", methods=["DELETE"])
def delete_document(req: func.HttpRequest) -> func.HttpResponse:
    try:
        user = get_authenticated_user(req)
    except Exception as e:
        return func.HttpResponse(str(e), status_code=401)

    document_id = req.route_params.get("document_id")

    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        "DELETE FROM documents WHERE id = %s AND user_id = %s;",
        (document_id, user["uid"]),
    )

    if cur.rowcount == 0:
        conn.rollback()
        return func.HttpResponse(
            json.dumps({"error": "Not found or unauthorized"}),
            status_code=404,
            mimetype="application/json",
        )

    conn.commit()
    cur.close()
    conn.close()

    return func.HttpResponse(
        json.dumps({ "status": "deleted" }),
        mimetype="application/json",
    )


# ==================================================
# UPLOAD DOCUMENT
# ==================================================
@app.function_name(name="upload")
@app.route(route="upload", methods=["POST"])
def upload(req: func.HttpRequest) -> func.HttpResponse:
    try:
        user = get_authenticated_user(req)
    except Exception as e:
        return func.HttpResponse(str(e), status_code=401)

    content_type = req.headers.get("content-type")
    raw = b"Content-Type: " + content_type.encode() + b"\n\n" + req.get_body()
    msg = BytesParser(policy=default).parsebytes(raw)

    file_part = None
    for part in msg.iter_parts():
        if part.get_param("name", header="content-disposition") == "file":
            file_part = part

    if not file_part:
        return func.HttpResponse("No file provided", status_code=400)

    pdf_bytes = file_part.get_payload(decode=True)
    file_name = file_part.get_filename()

    text = ""
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages:
            if page.extract_text():
                text += page.extract_text() + "\n"

    if not text.strip():
        return func.HttpResponse("No text extracted", status_code=400)

    document_id = str(uuid.uuid4())
    chunks = chunk_text(text)

    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        INSERT INTO users (id, email)
        VALUES (%s, %s)
        ON CONFLICT (id) DO NOTHING;
        """,
        (user["uid"], user["email"]),
    )

    cur.execute(
        """
        INSERT INTO documents (id, user_id, file_name, file_type, blob_path)
        VALUES (%s, %s, %s, %s, %s);
        """,
        (document_id, user["uid"], file_name, "pdf", "local"),
    )

    for i, chunk in enumerate(chunks):
        cur.execute(
            """
            INSERT INTO document_chunks (document_id, chunk_index, content)
            VALUES (%s, %s, %s);
            """,
            (document_id, i, chunk),
        )

    conn.commit()
    cur.close()
    conn.close()

    return func.HttpResponse(
        json.dumps({
            "document_id": document_id,
            "file_name": file_name,
            "total_chunks": len(chunks),
        }),
        status_code=201,
        mimetype="application/json",
    )


# ==================================================
# ASK QUESTION
# ==================================================
@app.function_name(name="ask")
@app.route(route="ask", methods=["POST"])
def ask(req: func.HttpRequest) -> func.HttpResponse:
    try:
        user = get_authenticated_user(req)
    except Exception as e:
        return func.HttpResponse(str(e), status_code=401)

    body = req.get_json()
    document_id = body.get("document_id")
    question = body.get("question")

    if not document_id or not question:
        return func.HttpResponse(
            json.dumps({"error": "document_id and question required"}),
            status_code=400,
            mimetype="application/json",
        )

    conn = get_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    cur.execute(
        """
        SELECT content
        FROM document_chunks
        WHERE document_id = %s
        ORDER BY chunk_index
        LIMIT 4;
        """,
        (document_id,),
    )

    chunks = cur.fetchall()
    context = "\n\n".join(c["content"] for c in chunks)

    if not USE_REAL_AI:
        answer = context
    else:
        prompt = f"""
You are an AI assistant answering ONLY using the document content below.

Document:
{context}

Question:
{question}
"""
        response = openai_client.chat.completions.create(
            model=CHAT_DEPLOYMENT,
            messages=[
                {"role": "system", "content": "Answer using only the document."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
            max_tokens=500,
        )
        answer = response.choices[0].message.content

    cur.execute(
        """
        INSERT INTO qa_history (user_id, document_id, question, answer)
        VALUES (%s, %s, %s, %s);
        """,
        (user["uid"], document_id, question, answer),
    )

    conn.commit()
    cur.close()
    conn.close()

    return func.HttpResponse(
        json.dumps({"question": question, "answer": answer}),
        mimetype="application/json",
    )


# ==================================================
# HISTORY
# ==================================================
@app.function_name(name="history")
@app.route(route="history", methods=["GET"])
def history(req: func.HttpRequest) -> func.HttpResponse:
    try:
        user = get_authenticated_user(req)
    except Exception as e:
        return func.HttpResponse(str(e), status_code=401)

    conn = get_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    cur.execute(
        """
        SELECT q.id, d.file_name, q.question, q.answer, q.created_at
        FROM qa_history q
        JOIN documents d ON d.id = q.document_id
        WHERE q.user_id = %s
        ORDER BY q.created_at DESC;
        """,
        (user["uid"],),
    )

    rows = cur.fetchall()
    cur.close()
    conn.close()

    for r in rows:
        r["created_at"] = r["created_at"].isoformat()

    return func.HttpResponse(
        json.dumps({ "history": rows }),
        mimetype="application/json",
    )