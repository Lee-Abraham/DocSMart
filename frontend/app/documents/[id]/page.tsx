"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { useAuth } from "@/lib/useAuth";

type Answer = {
  question: string;
  answer: string;
};

const GUEST_LIMITS = {
  questions: 3,
};

export default function DocumentViewerPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const isAuthenticated = !!user && user.emailVerified;
  const isGuest = searchParams.get("mode") === "guest" || !isAuthenticated;
  const userId = isGuest ? "guest" : user!.uid;

  const [documentName, setDocumentName] = useState("Loading...");
  const [question, setQuestion] = useState("");
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [questionCount, setQuestionCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const guestLimitReached =
    isGuest && questionCount >= GUEST_LIMITS.questions;

  useEffect(() => {
    if (!userId) return;

    api.get("/documents", { params: { user_id: userId } }).then((res) => {
      const doc = res.data.find((d: any) => d.id === id);
      if (doc) setDocumentName(doc.file_name);
    });
  }, [id, userId]);

  const handleAsk = async () => {
    if (!question || guestLimitReached) return;

    setLoading(true);

    try {
      const res = await api.post("/ask", {
        document_id: id,
        user_id: userId,
        question,
      });

      setAnswers((prev) => [
        ...prev,
        {
          question,
          answer:
            res.data?.answer ??
            "This is a preview answer. Full access requires an account.",
        },
      ]);

      setQuestionCount((c) => c + 1);
      setQuestion("");
    } catch {
      alert("Unable to process question.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="max-w-6xl mx-auto space-y-10">
      {/* Header */}
      <header className="space-y-1">
        <p className="text-sm text-textSecondary">/documents</p>
        <h1 className="text-3xl font-semibold">{documentName}</h1>
      </header>

      {/* Guest Notice */}
      {isGuest && (
        <div className="border border-dashed border-borderSubtle p-4 rounded-lg text-sm bg-gray-50">
          You’re in <strong>Guest Mode</strong>. You can ask up to{" "}
          {GUEST_LIMITS.questions} questions per document.{" "}
          <Link href="/register" className="underline text-brand">
            Sign up
          </Link>{" "}
          for unlimited access.
        </div>
      )}

      {/* Ask Panel */}
      <div className="border border-borderSubtle rounded-xl p-6 bg-white space-y-4">
        <h2 className="text-lg font-medium">Ask a Question</h2>

        <textarea
          className="w-full border rounded-md p-3"
          placeholder="Ask something about this document..."
          value={question}
          disabled={guestLimitReached}
          onChange={(e) => setQuestion(e.target.value)}
        />

        <div className="flex justify-between items-center">
          <span className="text-sm text-textSecondary">
            {isGuest
              ? `${GUEST_LIMITS.questions - questionCount} questions remaining`
              : "Unlimited questions"}
          </span>

          <button
            onClick={handleAsk}
            disabled={loading || !question || guestLimitReached}
            className={`px-4 py-2 text-sm rounded-md border ${
              loading || guestLimitReached
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-gray-50"
            }`}
          >
            {loading ? "Thinking..." : "Ask"}
          </button>
        </div>

        {guestLimitReached && (
          <p className="text-sm text-textSecondary">
            Guest limit reached.{" "}
            <Link href="/register" className="underline text-brand">
              Sign up
            </Link>{" "}
            to continue asking questions.
          </p>
        )}
      </div>

      {/* Answers */}
      {answers.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-xl font-medium">Answers</h2>

          {answers.map((a, i) => (
            <div
              key={i}
              className="border border-borderSubtle rounded-xl p-6 bg-white"
            >
              <p className="font-medium mb-2">Q: {a.question}</p>
              <p className="text-textSecondary">{a.answer}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
