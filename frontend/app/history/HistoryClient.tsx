"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import { useSearchParams } from "next/navigation";

type HistoryItem = {
  id: string;
  question: string;
  answer: string;
  file_name: string;
  created_at: string;
};

export default function HistoryClient() {
  /* ---------- AUTH ---------- */
  const { user, loading: authLoading, isGuest } = useAuth();
  const searchParams = useSearchParams();

  const isGuestMode = isGuest || searchParams.get("mode") === "guest";

  /* ---------- STATE ---------- */
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  /* ---------- LOAD HISTORY (HOOKS FIRST) ---------- */
  useEffect(() => {
    if (authLoading || !user || isGuestMode) {
      setDataLoading(false);
      return;
    }

    setDataLoading(true);

    api
      .get("/history")
      .then((res) => {
        setHistory(res.data?.history ?? []);
      })
      .finally(() => setDataLoading(false));
  }, [authLoading, user, isGuestMode]);

  /* ---------- DELETE ---------- */
  const handleDelete = async (historyId: string) => {
    const confirmed = confirm(
      "Remove this question from your history?"
    );
    if (!confirmed) return;

    await api.delete(`/history/${historyId}`);

    setHistory((prev) =>
      prev.filter((item) => item.id !== historyId)
    );
  };

  /* ---------- AUTH GUARDS---------- */
  if (authLoading) {
    return <p className="text-textSecondary">Loading session…</p>;
  }

  if (!user) {
    return <p>Please sign in.</p>;
  }

  /* ---------- UI ---------- */
  return (
    <section className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold">Question History</h1>
        <p className="text-sm text-textSecondary">
          A record of the questions you’ve asked and the documents they came from.
        </p>
      </header>

      {/* Content */}
      {dataLoading ? (
        <p className="text-textSecondary">Loading history…</p>
      ) : history.length === 0 ? (
        <EmptyHistoryState isGuest={isGuestMode} />
      ) : (
        <div className="space-y-4">
          {history.map((item) => (
            <div
              key={item.id}
              className="border rounded-xl p-5 bg-white hover:bg-gray-50 transition space-y-2"
            >
              <p className="font-medium">{item.question}</p>

              <div className="flex justify-between text-xs text-textSecondary">
                <span>From “{item.file_name}”</span>
                <span>
                  {new Date(item.created_at).toLocaleDateString()}
                </span>
              </div>

              <button
                onClick={() => handleDelete(item.id)}
                className="bg-red-500 text-black hover:bg-red-600 rounded-md px-3 py-1 text-sm"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ---------- Empty State ---------- */

function EmptyHistoryState({ isGuest }: { isGuest: boolean }) {
  return (
    <div className="border border-dashed rounded-xl p-10 text-center text-textSecondary space-y-4">
      <p className="text-base">
        You haven’t asked any questions yet.
      </p>

      <p className="text-sm">
        Once you upload a document, your questions and answers will appear here.
      </p>

      <div className="text-sm space-y-1">
        <p className="font-medium">Try questions like:</p>
        <p>• “Summarize this document”</p>
        <p>• “What are the key points?”</p>
        <p>• “Explain this section simply”</p>
      </div>

      <Link
        href={`/documents${isGuest ? "?mode=guest" : ""}`}
        className="inline-block text-sm text-brand underline"
      >
        Ask your first question →
      </Link>
    </div>
  );
}