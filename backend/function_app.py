import json
import uuid
import os
import azure.functions as func

from shared.db import get_connection
from shared.chunker import chunk_text
from shared.embeddings import generate_embedding


app = func.FunctionApp()

def call_llm(context, question):
    """
    Simple LLM call stub: combine retrieved context and question into a single string.
    Replace this with a real LLM client call (OpenAI, Azure OpenAI, etc.) when needed.
    """
    if not context:
        return f"Question: {question}\n\nNo contextual information available."
    return "Context:\n\n" + "\n\n".join(context) + f"\n\nQuestion: {question}\n\nAnswer: (stubbed response)"

# --------------------------------------------------
# HEALTH CHECK
# --------------------------------------------------
@app.route(route="health", methods=["GET"])
def health(req: func.HttpRequest) -> func.HttpResponse:
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT 1;")
        cur.fetchone()
        cur.close()
        conn.close()

        return func.HttpResponse(
            json.dumps({"status": "ok"}),
            status_code=200,
            mimetype="application/json"
        )
    except Exception as e:
        return func.HttpResponse(
            json.dumps({"error": str(e)}),
            status_code=500,
            mimetype="application/json"
        )


# --------------------------------------------------
# DOCUMENTS (UPLOAD + LIST)
# --------------------------------------------------
@app.route(route="documents", methods=["GET", "POST"])
def documents(req: func.HttpRequest) -> func.HttpResponse:
    try:
        # ---------- POST: Upload document ----------
        if req.method == "POST":
            body = req.get_json()

            user_id = body.get("user_id")
            file_name = body.get("file_name")
            file_type = body.get("file_type")
            blob_path = body.get("blob_path")
            text = body.get("text")

            if not all([user_id, file_name, blob_path, text]):
                return func.HttpResponse(
                    json.dumps({"error": "Missing required fields"}),
                    status_code=400,
                    mimetype="application/json"
                )

            conn = get_connection()
            cur = conn.cursor()

            # Ensure user exists
            cur.execute(
                """
                INSERT INTO users (id, email)
                VALUES (%s, %s)
                ON CONFLICT (id) DO NOTHING;
                """,
                (user_id, f"{user_id}@temp.docsmart")
            )

            # Create document
            document_id = str(uuid.uuid4())
            cur.execute(
                """
                INSERT INTO documents (id, user_id, file_name, file_type, blob_path)
                VALUES (%s, %s, %s, %s, %s);
                """,
                (document_id, user_id, file_name, file_type, blob_path)
            )

            # Chunk document
            chunks = chunk_text(text)

            for index, chunk in enumerate(chunks):
                cur.execute(
                    """
                    INSERT INTO document_chunks (document_id, chunk_index, content)
                    VALUES (%s, %s, %s);
                    """,
                    (document_id, index, chunk)
                )

            conn.commit()
            cur.close()
            conn.close()

            return func.HttpResponse(
                json.dumps({
                    "message": "Document and chunks stored",
                    "document_id": document_id,
                    "total_chunks": len(chunks)
                }),
                status_code=201,
                mimetype="application/json"
            )

        # ---------- GET: List documents ----------
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

        return func.HttpResponse(
            json.dumps(docs),
            status_code=200,
            mimetype="application/json"
        )

    except Exception as e:
        return func.HttpResponse(
            json.dumps({"error": str(e)}),
            status_code=500,
            mimetype="application/json"
        )


# --------------------------------------------------
# CHUNK TEST (DEBUG / DEMO)
# --------------------------------------------------
@app.route(route="chunk-test", methods=["POST"])
def chunk_test(req: func.HttpRequest) -> func.HttpResponse:
    try:
        body = req.get_json()
        text = body.get("text")

        if not text:
            return func.HttpResponse(
                json.dumps({"error": "text is required"}),
                status_code=400,
                mimetype="application/json"
            )

        chunks = chunk_text(text)

        return func.HttpResponse(
            json.dumps({
                "total_chunks": len(chunks),
                "chunks": chunks
            }),
            status_code=200,
            mimetype="application/json"
        )

    except Exception as e:
        return func.HttpResponse(
            json.dumps({"error": str(e)}),
            status_code=500,
            mimetype="application/json"
        )


# --------------------------------------------------
# EMBED DOCUMENT (FAKE EMBEDDINGS)
# --------------------------------------------------
@app.route(route="embed-document", methods=["POST"])
def embed_document(req: func.HttpRequest) -> func.HttpResponse:
    try:
        body = req.get_json()
        document_id = body.get("document_id")

        if not document_id:
            return func.HttpResponse(
                json.dumps({"error": "document_id is required"}),
                status_code=400,
                mimetype="application/json"
            )

        conn = get_connection()
        cur = conn.cursor()

        cur.execute(
            """
            SELECT id
            FROM document_chunks
            WHERE document_id = %s
            ORDER BY chunk_index;
            """,
            (document_id,)
        )

        chunks = cur.fetchall()

        if not chunks:
            return func.HttpResponse(
                json.dumps({"error": "No chunks found for document"}),
                status_code=404,
                mimetype="application/json"
            )

        inserted = 0

        for chunk in chunks:
            embedding = generate_embedding(chunk["content"])
            cur.execute(
                """
                INSERT INTO embeddings (chunk_id, embedding)
                VALUES (%s, %s)
                ON CONFLICT (chunk_id) DO NOTHING;
                """,
                (chunk["id"], embedding)
            )
            inserted += 1

        conn.commit()
        cur.close()
        conn.close()

        return func.HttpResponse(
            json.dumps({
                "message": "Embeddings stored",
                "document_id": document_id,
                "embeddings_created": inserted
            }),
            status_code=201,
            mimetype="application/json"
        )

    except Exception as e:
        return func.HttpResponse(
            json.dumps({"error": str(e)}),
            status_code=500,
            mimetype="application/json"
        )


# --------------------------------------------------
# VECTOR SEARCH (RETRIEVAL)
# --------------------------------------------------
@app.route(route="search", methods=["POST"])
def search(req: func.HttpRequest) -> func.HttpResponse:
    try:
        body = req.get_json()
        document_id = body.get("document_id")
        question = body.get("question")
        limit = body.get("limit", 3)

        if not document_id:
            return func.HttpResponse(
                json.dumps({"error": "document_id is required"}),
                status_code=400,
                mimetype="application/json"
            )

        if not question:
            return func.HttpResponse(
                json.dumps({"error": "question is required"}),
                status_code=400,
                mimetype="application/json"
            )

        query_embedding = generate_embedding(question)

        conn = get_connection()
        cur = conn.cursor()
        
        cur.execute(
            """
            SELECT dc.chunk_index, dc.content
            FROM embeddings e
            JOIN document_chunks dc ON dc.id = e.chunk_id
            WHERE dc.document_id = %s
            ORDER BY e.embedding <=> %s::vector
            LIMIT %s;
            """,
            (document_id, query_embedding, limit)
        )

        results = cur.fetchall()
        cur.close()
        conn.close()

        return func.HttpResponse(
            json.dumps({
                "document_id": document_id,
                "results": results
            }),
            status_code=200,
            mimetype="application/json"
        )

    except Exception as e:
        return func.HttpResponse(
            json.dumps({"error": str(e)}),
            status_code=500,
            mimetype="application/json"
        )

@app.route(route="ask", methods=["POST"])
def ask(req: func.HttpRequest) -> func.HttpResponse:
    try:
        body = req.get_json()
        document_id = body.get("document_id")
        question = body.get("question")
        user_id = body.get("user_id", "anonymous")

        if not document_id or not question:
            return func.HttpResponse(
                json.dumps({"error": "document_id and question are required"}),
                status_code=400,
                mimetype="application/json"
            )

        conn = get_connection()
        cur = conn.cursor()

        # ------------------------------------------------
        # RETRIEVAL‑ONLY MODE (NO VECTOR OPS)
        # ------------------------------------------------
        if os.getenv("USE_REAL_AI", "false").lower() != "true":
            cur.execute(
                """
                SELECT content
                FROM document_chunks
                WHERE document_id = %s
                ORDER BY chunk_index
                LIMIT 4;
                """,
                (document_id,)
            )

            chunks = cur.fetchall()
            context = [c["content"] for c in chunks]

        # -------------------------------
        # Retrieval-only mode (NO AI)
        # -------------------------------
        if os.getenv("USE_REAL_AI", "false").lower() != "true":
            answer = "\n\n".join(context)

            cur.execute(
                """
                INSERT INTO qa_history (user_id, document_id, question, answer)
                VALUES (%s, %s, %s, %s);
                """,
                (user_id, document_id, question, answer)
            )

            conn.commit()
            cur.close()
            conn.close()

            return func.HttpResponse(
                json.dumps({
                    "mode": "retrieval",
                    "question": question,
                    "context": context
                }),
                status_code=200,
                mimetype="application/json"
            )

        # -------------------------------
        # AI-enabled mode (FUTURE)
        # -------------------------------
        answer = call_llm(context, question)

        cur.execute(
            """
            INSERT INTO qa_history (user_id, document_id, question, answer)
            VALUES (%s, %s, %s, %s);
            """,
            (user_id, document_id, question, answer)
        )

        conn.commit()
        cur.close()
        conn.close()

        return func.HttpResponse(
            json.dumps({
                "mode": "ai",
                "question": question,
                "answer": answer
            }),
            status_code=200,
            mimetype="application/json"
        )

    except Exception as e:
        return func.HttpResponse(
            json.dumps({"error": str(e)}),
            status_code=500,
            mimetype="application/json"
        )

@app.route(route="history", methods=["GET"])
def history(req: func.HttpRequest) -> func.HttpResponse:
    try:
        user_id = req.params.get("user_id")
        limit = int(req.params.get("limit", 20))

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
            SELECT
                q.id,
                q.document_id,
                d.file_name,
                q.question,
                q.answer,
                q.created_at
            FROM qa_history q
            JOIN documents d ON d.id = q.document_id
            WHERE q.user_id = %s
            ORDER BY q.created_at DESC
            LIMIT %s;
            """,
            (user_id, limit)
        )

        history = cur.fetchall()
        cur.close()
        conn.close()

        return func.HttpResponse(
            json.dumps({
                "user_id": user_id,
                "history": history
            }),
            status_code=200,
            mimetype="application/json"
        )

    except Exception as e:
        return func.HttpResponse(
            json.dumps({"error": str(e)}),
            status_code=500,
            mimetype="application/json"
        )