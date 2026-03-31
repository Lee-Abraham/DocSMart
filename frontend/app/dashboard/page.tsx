"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/useAuth";

type Document = {
  id: string;
  file_name: string;
  uploaded_at: string;
};

export default function DashboardPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();

  const isGuest = searchParams.get("mode") === "guest";
  const userId = isGuest ? "guest" : user?.uid;

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    api
      .get("/documents", { params: { user_id: userId } })
      .then((res) => setDocuments(res.data))
      .finally(() => setLoading(false));
  }, [userId]);

  return (
    <section className="max-w-6xl mx-auto space-y-10">
      {/* ---------- Header ---------- */}
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold">
          {isGuest ? "Try DocSMART" : "Dashboard"}
        </h1>
        <p className="text-sm text-textSecondary">
          {isGuest
            ? "Guest mode: upload 1 document and ask up to 3 questions."
            : "Overview of your recent documents and activity."}
        </p>
      </header>

      {/* ---------- Guest Notice ---------- */}
      {isGuest && (
        <div className="border border-dashed border-borderSubtle rounded-lg p-4 bg-gray-50 text-sm">
          You are in <strong>Guest Mode</strong>.  
          <Link href="/register" className="ml-1 text-brand underline">
            Create an account
          </Link>{" "}
          to unlock unlimited access.
        </div>
      )}

      {/* ---------- Quick Actions ---------- */}
      <div className="flex gap-4">
        <Link
          href={isGuest ? "/dashboard?mode=guest" : "/documents"}
          className="px-4 py-2 border rounded-md hover:bg-gray-50"
        >
          Upload Document
        </Link>

        <Link
          href="/documents"
          className="px-4 py-2 border rounded-md hover:bg-gray-50"
        >
          View All Documents
        </Link>
      </div>

      {/* ---------- Recent Documents ---------- */}
      <div className="space-y-4">
        <h2 className="text-xl font-medium">Recent Documents</h2>

        {loading ? (
          <p className="text-textSecondary">Loading…</p>
        ) : documents.length === 0 ? (
          <p className="text-textSecondary">
            No documents yet.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.slice(0, 3).map((doc) => (
              <Link
                key={doc.id}
                href={`/documents/${doc.id}`}
                className="border rounded-lg p-4 hover:bg-gray-50 transition"
              >
                <p className="font-medium truncate">
                  {doc.file_name}
                </p>
                <p className="text-xs text-textSecondary mt-1">
                  Uploaded{" "}
                  {new Date(doc.uploaded_at).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}