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

export default function HistoryPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();

  const isGuest = searchParams.get("mode") === "guest";
  const userId = isGuest ? "guest" : user?.uid;

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    api
      .get("/history", { params: { user_id: userId } })
      .then((res) => {
        setHistory(res.data?.history ?? []);
      })
      .finally(() => setLoading(false));
  }, [userId]);


  const handleDelete = async (historyId: string) => {
    const confirmed = confirm(
      "Remove this question from your history?"
    );
    if (!confirmed) return;

    await api.delete(`/history/${historyId}`, {
      params: { user_id: userId },
    });

    //Update UI immediately
    setHistory((prev) =>
      prev.filter((item) => item.id !== historyId)
    );
  };

  return (
    <section className="max-w-4xl mx-auto space-y-8">
      {/* ---------- Header ---------- */}
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold">Question History</h1>
        <p className="text-sm text-textSecondary">
          A record of the questions you’ve asked and the documents they came from.
        </p>
      </header>

      {/* ---------- Content ---------- */}
      {loading ? (
        <p className="text-textSecondary">Loading history…</p>
      ) : history.length === 0 ? (
        <EmptyHistoryState isGuest={isGuest} />
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
                className="text-1xl bg-red-500 text-black hover:bg-red-600 rounded-4xl w-20 py-1 text-sm self-center"
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

/* ---------- Empty State Component ---------- */

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
        <p className="font-medium text-textSecondary">Try questions like:</p>
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