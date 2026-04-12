"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import api from "@/lib/api";
import { useAuth } from "@/lib/useAuth";

type Document = {
  id: string;
  file_name: string;
  uploaded_at: string;
};

type HistoryItem = {
  id: string;
  question: string;
  file_name: string;
};

export default function DashboardPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();

  const isGuest = searchParams.get("mode") === "guest";
  const userId = isGuest ? "guest" : user?.uid;

  const [documents, setDocuments] = useState<Document[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user && !isGuest) {
      return; // wait for Firebase to hydrate
    }


    Promise.all([
      api.get("/documents"),
      api.get("/history"),
    ])
      .then(([docsRes, historyRes]) => {
        if (Array.isArray(docsRes.data)) {
          setDocuments(docsRes.data);
        }
        setHistory(historyRes.data?.history ?? []);
      })
      .finally(() => setLoading(false));
  }, [userId, isGuest]);

  return (
    <section className="max-w-6xl mx-auto space-y-10">
      {/* ---------- Header ---------- */}
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold">
          {isGuest ? "Try DocSMART" : "Dashboard"}
        </h1>
        <p className="text-sm text-textSecondary">
          Ask natural‑language questions and get answers directly from your documents.
        </p>
      </header>

      {/* ---------- Guest Notice ---------- */}
      {isGuest && (
        <div className="border border-dashed border-borderSubtle rounded-lg p-4 bg-gray-50 text-sm">
          You are in <strong>Guest Mode</strong>. You can upload one document and ask a
          few questions to try DocSMART.{" "}
          <Link href="/register" className="text-brand underline">
            Create an account
          </Link>{" "}
          for full access.
        </div>
      )}

      {/* ============================= */}
      {/* ======= GUEST VIEW ========= */}
      {/* ============================= */}
      {isGuest ? (
        <div className="space-y-8">
          {/* Intro */}
          <div className="border rounded-xl p-6 bg-white space-y-3">
            <h2 className="text-xl font-medium">What is DocSMART?</h2>
            <p className="text-sm text-textSecondary">
              DocSMART helps you understand documents faster by letting you ask
              questions in plain English and receive answers based on the document’s
              content.
            </p>

            <Link
              href="/documents?mode=guest"
              className="inline-block text-brand text-sm font-medium underline"
            >
              Upload a document →
            </Link>
          </div>

          {/* How it works */}
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="border rounded-lg p-4 bg-white space-y-2">
              <p className="font-medium">1. Upload</p>
              <p className="text-sm text-textSecondary">
                Upload a PDF such as notes, articles, or study materials.
              </p>
            </div>

            <div className="border rounded-lg p-4 bg-white space-y-2">
              <p className="font-medium">2. Ask</p>
              <p className="text-sm text-textSecondary">
                Ask questions using natural language.
              </p>
            </div>

            <div className="border rounded-lg p-4 bg-white space-y-2">
              <p className="font-medium">3. Understand</p>
              <p className="text-sm text-textSecondary">
                Get answers grounded directly in your document.
              </p>
            </div>
          </div>

          {/* Example questions */}
          <div className="border rounded-xl p-6 bg-white space-y-3">
            <h3 className="text-lg font-medium">Example questions</h3>
            <ul className="text-sm text-textSecondary space-y-2">
              <li>• “Summarize this document”</li>
              <li>• “What are the key points?”</li>
              <li>• “Are there any risks mentioned?”</li>
              <li>• “Explain this section in simple terms”</li>
            </ul>
          </div>

          {/* Register CTA */}
          <div className="border border-dashed rounded-xl p-6 text-sm text-textSecondary bg-gray-50">
            Create an account to unlock unlimited documents and questions.{" "}
            <Link href="/register" className="text-brand underline">
              Sign up →
            </Link>
          </div>
        </div>
      ) : (
        /* ============================= */
        /* ===== LOGGED‑IN VIEW ======== */
        /* ============================= */
        <>
          {/* Ask CTA */}
          <div className="border rounded-xl p-6 bg-white shadow-sm space-y-3">
            <p className="text-sm text-textSecondary">
              Ask a question about your uploaded documents
            </p>

            <Link
              href="/documents"
              className="block border rounded-md px-4 py-3 text-textSecondary hover:bg-gray-50 transition"
            >
              <span className="block text-sm">
                e.g. “What are the key risks mentioned in this contract?”
              </span>
              <span className="block mt-1 text-sm font-medium text-brand">
                Ask a question →
              </span>
            </Link>
          </div>

          {/* Recent Questions */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-medium">Recent Questions</h2>
              <Link href="/history" className="text-sm text-brand underline">
                View all
              </Link>
            </div>

            {loading ? (
              <p className="text-textSecondary">Loading…</p>
            ) : history.length === 0 ? (
              <p className="text-textSecondary">
                You haven’t asked any questions yet.
              </p>
            ) : (
              <ul className="space-y-3">
                {history.slice(0, 3).map((item) => (
                  <li
                    key={item.id}
                    className="border rounded-md p-4 hover:bg-gray-50 transition"
                  >
                    <p className="font-medium truncate">{item.question}</p>
                    <p className="text-xs text-textSecondary mt-1">
                      From “{item.file_name}”
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Documents */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-medium">
                Documents You Can Ask About
              </h2>
              <Link href="/documents" className="text-sm text-brand underline">
                View all
              </Link>
            </div>

            {loading ? (
              <p className="text-textSecondary">Loading…</p>
            ) : documents.length === 0 ? (
              <p className="text-textSecondary">
                Upload a document to start asking questions.
              </p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {documents.slice(0, 3).map((doc) => (
                  <Link
                    key={doc.id}
                    href={`/documents/${doc.id}`}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition"
                  >
                    <p className="font-medium truncate">{doc.file_name}</p>
                    <p className="text-xs text-textSecondary mt-1">
                      Uploaded{" "}
                      {new Date(doc.uploaded_at).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-brand mt-2">
                      Ask questions →
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}