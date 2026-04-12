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

export default function DashboardClient() {
  /* ---------- AUTH ---------- */
  const { user, loading: authLoading, isGuest } = useAuth();
  const searchParams = useSearchParams();

  const isGuestMode = isGuest || searchParams.get("mode") === "guest";

  /* ---------- STATE ---------- */
  const [documents, setDocuments] = useState<Document[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  /* ---------- DATA FETCH (HOOKS MUST BE FIRST) ---------- */
  useEffect(() => {
    if (authLoading || !user || isGuestMode) {
      setDataLoading(false);
      return;
    }

    setDataLoading(true);

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
      .finally(() => setDataLoading(false));
  }, [authLoading, user, isGuestMode]);

  /* ---------- AUTH GUARDS (AFTER ALL HOOKS) ---------- */
  if (authLoading) {
    return <p className="text-textSecondary">Loading session…</p>;
  }

  if (!user) {
    return <p>Please sign in.</p>;
  }

  /* ---------- UI ---------- */
  return (
    <section className="max-w-6xl mx-auto space-y-10">
      {/* ---------- Header ---------- */}
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold">
          {isGuestMode ? "Try DocSMART" : "Dashboard"}
        </h1>
        <p className="text-sm text-textSecondary">
          Ask natural‑language questions and get answers directly from your documents.
        </p>
      </header>

      {/* ---------- Guest Notice ---------- */}
      {isGuestMode && (
        <div className="border border-dashed rounded-lg p-4 bg-gray-50 text-sm">
          You are in <strong>Guest Mode</strong>. Create an account for full access.
          <Link href="/register" className="ml-1 text-brand underline">
            Sign up →
          </Link>
        </div>
      )}

      {/* ---------- LOGGED‑IN VIEW ---------- */}
      {!isGuestMode && (
        <>
          {/* Ask CTA */}
          <div className="border rounded-xl p-6 bg-white shadow-sm space-y-3">
            <p className="text-sm text-textSecondary">
              Ask a question about your uploaded documents
            </p>
            <Link
              href="/documents"
              className="block border rounded-md px-4 py-3 hover:bg-gray-50"
            >
              Ask a question →
            </Link>
          </div>

          {/* Recent Questions */}
          <div className="space-y-4">
            <h2 className="text-xl font-medium">Recent Questions</h2>

            {dataLoading ? (
              <p className="text-textSecondary">Loading…</p>
            ) : history.length === 0 ? (
              <p className="text-textSecondary">
                You haven’t asked any questions yet.
              </p>
            ) : (
              <ul className="space-y-3">
                {history.slice(0, 3).map((item) => (
                  <li key={item.id} className="border rounded-md p-4">
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
            <h2 className="text-xl font-medium">
              Documents You Can Ask About
            </h2>

            {dataLoading ? (
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
                    className="border rounded-lg p-4 hover:bg-gray-50"
                  >
                    <p className="font-medium truncate">{doc.file_name}</p>
                    <p className="text-xs text-textSecondary mt-1">
                      Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}
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