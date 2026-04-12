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
# APP INIT
# ==================================================
app = func.FunctionApp()

# ==================================================
# FIREBASE ADMIN (SAFE + SINGLETON INIT)
# ==================================================

def init_firebase():
    # Initialize once globally
    if firebase_admin._apps:
        return

    project_id = os.getenv("FIREBASE_PROJECT_ID")
    private_key = os.getenv("FIREBASE_PRIVATE_KEY")
    client_email = os.getenv("FIREBASE_CLIENT_EMAIL")

    if not project_id or not private_key or not client_email:
        raise RuntimeError("Firebase Admin env vars not configured")

    cred = credentials.Certificate({
        "type": "service_account",
        "project_id": project_id,
        "private_key": private_key.replace("\\n", "\n"),
        "client_email": client_email,
        "token_uri": "https://oauth2.googleapis.com/token",
    })

    firebase_admin.initialize_app(cred)


def get_authenticated_user(req: func.HttpRequest):
    init_firebase()

    auth_header = req.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise Exception("Missing Authorization header")

    token = auth_header.split("Bearer ")[1]

    try:
        decoded = auth.verify_id_token(token)
    except Exception as e:
        raise Exception(f"Firebase token verification failed: {str(e)}")

    return {
        "uid": decoded["uid"],
        "email": decoded.get("email"),
    }

# ==================================================
# OPENAI (OPTIONAL, LAZY)
# ==================================================
USE_REAL_AI = os.getenv("USE_REAL_AI", "false").lower() == "true"
CHAT_DEPLOYMENT = os.getenv("AZURE_OPENAI_CHAT_DEPLOYMENT")
openai_client = None

def init_openai():
    global openai_client
    if openai_client or not USE_REAL_AI:
        return

    openai_client = AzureOpenAI(
        api_key=os.getenv("AZURE_OPENAI_KEY"),
        azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
        api_version="2024-02-15-preview",
    )

# ==================================================
# HEALTH CHECK
# ==================================================
@app.function_name(name="health")
@app.route(route="health", methods=["GET"], auth_level=func.AuthLevel.ANONYMOUS)
def health(req: func.HttpRequest):
    return func.HttpResponse(
        json.dumps({"status": "ok"}),
        mimetype="application/json"
    )

# ==================================================
# LIST DOCUMENTS
# ==================================================
@app.function_name(name="documents")
@app.route(route="documents", methods=["GET"], auth_level=func.AuthLevel.ANONYMOUS)
def list_documents(req: func.HttpRequest):
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
@app.route(
    route="documents/{document_id}",
    methods=["DELETE"],
    auth_level=func.AuthLevel.ANONYMOUS
)
def delete_document(req: func.HttpRequest):
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
        json.dumps({"status": "deleted"}),
        mimetype="application/json"
    )

# ==================================================
# UPLOAD DOCUMENT
# ==================================================
@app.function_name(name="upload")
@app.route(route="upload", methods=["POST"], auth_level=func.AuthLevel.ANONYMOUS)
def upload(req: func.HttpRequest):
    try:
        user = get_authenticated_user(req)
    except Exception as e:
        return func.HttpResponse(str(e), status_code=401)

    raw = (
        b"Content-Type: "
        + req.headers.get("content-type").encode()
        + b"\n\n"
        + req.get_body()
    )
    msg = BytesParser(policy=default).parsebytes(raw)

    file_part = next(
        (
            p for p in msg.iter_parts()
            if p.get_param("name", header="content-disposition") == "file"
        ),
        None
    )

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
        "INSERT INTO users (id, email) VALUES (%s, %s) ON CONFLICT (id) DO NOTHING;",
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
        json.dumps({"document_id": document_id, "file_name": file_name}),
        status_code=201,
        mimetype="application/json",
    )

# ==================================================
# ASK QUESTION
# ==================================================
@app.function_name(name="ask")
@app.route(route="ask", methods=["POST"], auth_level=func.AuthLevel.ANONYMOUS)
def ask(req: func.HttpRequest):
    try:
        user = get_authenticated_user(req)
    except Exception as e:
        return func.HttpResponse(str(e), status_code=401)

    body = req.get_json()
    document_id = body.get("document_id")
    question = body.get("question")

    conn = get_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    cur.execute(
        """
        SELECT content FROM document_chunks
        WHERE document_id = %s
        ORDER BY chunk_index
        LIMIT 4;
        """,
        (document_id,),
    )

    context = "\n\n".join(c["content"] for c in cur.fetchall())

    init_openai()
    answer = context

    if USE_REAL_AI and openai_client:
        response = openai_client.chat.completions.create(
            model=CHAT_DEPLOYMENT,
            messages=[
                {"role": "system", "content": "Answer using only the document."},
                {"role": "user", "content": f"Document:\n{context}\n\nQuestion:\n{question}"},
            ],
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
# HISTORY (LIST)
# ==================================================
@app.function_name(name="history")
@app.route(route="history", methods=["GET"], auth_level=func.AuthLevel.ANONYMOUS)
def history(req: func.HttpRequest):
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
        json.dumps({"history": rows}),
        mimetype="application/json",
    )

# ==================================================
# DELETE SINGLE HISTORY ITEM
# ==================================================
@app.function_name(name="delete_history_item")
@app.route(
    route="history/{history_id}",
    methods=["DELETE"],
    auth_level=func.AuthLevel.ANONYMOUS
)
def delete_history_item(req: func.HttpRequest):
    try:
        user = get_authenticated_user(req)
    except Exception as e:
        return func.HttpResponse(str(e), status_code=401)

    history_id = req.route_params.get("history_id")

    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        "DELETE FROM qa_history WHERE id = %s AND user_id = %s;",
        (history_id, user["uid"]),
    )

    conn.commit()
    cur.close()
    conn.close()

    return func.HttpResponse(
        json.dumps({"status": "deleted"}),
        mimetype="application/json",
    )

# ==================================================
# CLEAR HISTORY
# ==================================================
@app.function_name(name="clear_history")
@app.route(route="history", methods=["DELETE"], auth_level=func.AuthLevel.ANONYMOUS)
def clear_history(req: func.HttpRequest):
    try:
        user = get_authenticated_user(req)
    except Exception as e:
        return func.HttpResponse(str(e), status_code=401)

    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM qa_history WHERE user_id = %s;", (user["uid"],))
    conn.commit()
    cur.close()
    conn.close()

    return func.HttpResponse(
        json.dumps({"status": "cleared"}),
        mimetype="application/json",
    )