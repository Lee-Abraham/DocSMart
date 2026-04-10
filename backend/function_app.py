import json
import uuid
import os
import io
import azure.functions as func
import pdfplumber

from email.parser import BytesParser
from email.policy import default
from openai import AzureOpenAI

from shared.db import get_connection
from shared.chunker import chunk_text


# ==================================================
# CONFIG
# ==================================================
USE_REAL_AI = os.getenv("USE_REAL_AI", "false").lower() == "true"

openai_client = None
CHAT_DEPLOYMENT = os.getenv("AZURE_OPENAI_CHAT_DEPLOYMENT")

if USE_REAL_AI:
    openai_client = AzureOpenAI(
        api_key=os.getenv("AZURE_OPENAI_KEY"),
        azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
        api_version="2024-02-15-preview",
    )

app = func.FunctionApp()


# ==================================================
# HEALTH
# ==================================================
@app.route(route="health", methods=["GET"])
def health(req: func.HttpRequest) -> func.HttpResponse:
    return func.HttpResponse(
        json.dumps({"status": "ok"}),
        mimetype="application/json"
    )


# ==================================================
# LIST DOCUMENTS
# ==================================================
@app.route(route="documents", methods=["GET"])
def documents(req: func.HttpRequest) -> func.HttpResponse:
    user_id = req.params.get("user_id")
    if not user_id:
        return func.HttpResponse(
            json.dumps({"error": "user_id is required"}),
            status_code=400,
            mimetype="application/json"
        )

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT id, file_name, file_type, uploaded_at
        FROM documents
        WHERE user_id = %s
        ORDER BY uploaded_at DESC;
        """,
        (user_id,)
    )

    docs = cur.fetchall()
    cur.close()
    conn.close()

    for d in docs:
        d["uploaded_at"] = d["uploaded_at"].isoformat()

    return func.HttpResponse(json.dumps(docs), mimetype="application/json")


# ==================================================
# DELETE DOCUMENT ✅ (FIXES YOUR 404)
# ==================================================
@app.route(route="documents/{document_id}", methods=["DELETE"])
def delete_document(req: func.HttpRequest) -> func.HttpResponse:
    document_id = req.route_params.get("document_id")
    user_id = req.params.get("user_id")

    if not document_id or not user_id:
        return func.HttpResponse(
            json.dumps({"error": "document_id and user_id required"}),
            status_code=400,
            mimetype="application/json",
        )

    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        "DELETE FROM documents WHERE id = %s AND user_id = %s;",
        (document_id, user_id),
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

    return func.HttpResponse(json.dumps({"status": "deleted"}), mimetype="application/json")


# ==================================================
# UPLOAD
# ==================================================
@app.route(route="upload", methods=["POST"])
def upload(req: func.HttpRequest) -> func.HttpResponse:
    content_type = req.headers.get("content-type")
    raw = b"Content-Type: " + content_type.encode() + b"\n\n" + req.get_body()
    msg = BytesParser(policy=default).parsebytes(raw)

    file_part = None
    user_id = "guest"

    for part in msg.iter_parts():
        name = part.get_param("name", header="content-disposition")
        if name == "file":
            file_part = part
        elif name == "user_id":
            user_id = part.get_content()

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
        (user_id, f"{user_id}@temp.docsmart"),
    )

    cur.execute(
        """
        INSERT INTO documents (id, user_id, file_name, file_type, blob_path)
        VALUES (%s, %s, %s, %s, %s);
        """,
        (document_id, user_id, file_name, "pdf", "local"),
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
# ASK (NO EMBEDDINGS, USE AI)
# ==================================================
@app.route(route="ask", methods=["POST"])
def ask(req: func.HttpRequest) -> func.HttpResponse:
    body = req.get_json()
    document_id = body.get("document_id")
    question = body.get("question")
    user_id = body.get("user_id", "guest")

    if not document_id or not question:
        return func.HttpResponse(
            json.dumps({"error": "document_id and question required"}),
            status_code=400,
            mimetype="application/json",
        )

    conn = get_connection()
    cur = conn.cursor()

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
        (user_id, document_id, question, answer),
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
@app.route(route="history", methods=["GET"])
def history(req: func.HttpRequest) -> func.HttpResponse:
    user_id = req.params.get("user_id")
    if not user_id:
        return func.HttpResponse(
            json.dumps({"error": "user_id required"}),
            status_code=400,
            mimetype="application/json",
        )

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT q.id, d.file_name, q.question, q.answer, q.created_at
        FROM qa_history q
        JOIN documents d ON d.id = q.document_id
        WHERE q.user_id = %s
        ORDER BY q.created_at DESC;
        """,
        (user_id,),
    )

    rows = cur.fetchall()
    cur.close()
    conn.close()

    for r in rows:
        r["created_at"] = r["created_at"].isoformat()

    return func.HttpResponse(json.dumps({"history": rows}), mimetype="application/json")


# ==================================================
# DELETE HISTORY ITEM
# ==================================================
@app.route(route="history/{history_id}", methods=["DELETE"])
def delete_history(req: func.HttpRequest) -> func.HttpResponse:
    history_id = req.route_params.get("history_id")
    user_id = req.params.get("user_id")

    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        "DELETE FROM qa_history WHERE id = %s AND user_id = %s;",
        (history_id, user_id),
    )

    conn.commit()
    cur.close()
    conn.close()

    return func.HttpResponse(json.dumps({"status": "deleted"}), mimetype="application/json")


# ==================================================
# CLEAR HISTORY
# ==================================================
@app.route(route="history", methods=["DELETE"])
def clear_history(req: func.HttpRequest) -> func.HttpResponse:
    user_id = req.params.get("user_id")

    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM qa_history WHERE user_id = %s;", (user_id,))
    conn.commit()
    cur.close()
    conn.close()

    return func.HttpResponse(json.dumps({"status": "cleared"}), mimetype="application/json")