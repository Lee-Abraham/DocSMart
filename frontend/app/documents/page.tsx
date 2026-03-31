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

const GUEST_LIMITS = {
  documents: 1,
};

export default function DocumentsPage() {
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

  const guestLimitReached =
    isGuest && documents.length >= GUEST_LIMITS.documents;

  return (
    <section className="max-w-6xl mx-auto space-y-8">
      {/* ---------- Header ---------- */}
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold">Documents</h1>
        <p className="text-sm text-textSecondary">
          {isGuest
            ? "Guest mode: upload 1 document."
            : "Manage and access all your documents."}
        </p>
      </header>

      {/* ---------- Guest Notice ---------- */}
      {isGuest && (
        <div className="border border-dashed border-borderSubtle bg-gray-50 p-4 rounded-lg text-sm">
          You are in <strong>Guest Mode</strong>. Upload one document to try
          DocSMart.{" "}
          <Link href="/register" className="text-brand underline">
            Create an account
          </Link>{" "}
          for unlimited documents.
        </div>
      )}

      {/* ---------- Upload Section ---------- */}
      <UploadSection
        disabled={guestLimitReached}
        isGuest={isGuest}
      />

      {/* ---------- Document List ---------- */}
      <div className="space-y-4">
        {loading ? (
          <p className="text-textSecondary">Loading documents…</p>
        ) : documents.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc) => (
              <DocumentCard key={doc.id} document={doc} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function UploadSection({
  disabled,
  isGuest,
}: {
  disabled: boolean;
  isGuest: boolean;
}) {
  return (
    <div className="border border-borderSubtle rounded-xl bg-white p-6 space-y-3">
      <h2 className="text-lg font-medium">Upload Document</h2>

      <button
        disabled={disabled}
        className={`px-4 py-2 border rounded-md text-sm
          ${
            disabled
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-gray-50"
          }`}
      >
        Upload PDF
      </button>

      {disabled && isGuest && (
        <p className="text-sm text-textSecondary">
          Guest limit reached.{" "}
          <Link href="/register" className="text-brand underline">
            Sign up
          </Link>{" "}
          to upload more documents.
        </p>
      )}
    </div>
  );
}

function DocumentCard({ document }: { document: Document }) {
  return (
    <Link
      href={`/documents/${document.id}`}
      className="
        bg-white
        border border-borderSubtle
        rounded-xl
        p-6
        hover:shadow-sm
        transition
      "
    >
      <h3 className="font-medium truncate">{document.file_name}</h3>

      <p className="text-xs text-textSecondary mt-2">
        Uploaded{" "}
        {new Date(document.uploaded_at).toLocaleDateString()}
      </p>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="border border-dashed border-borderSubtle p-12 rounded-xl text-center text-textSecondary">
      No documents uploaded yet.
    </div>
  );
}