"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import UploadSection from "@/app/components/documents/UploadSection";

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
    .get("/documents")
    .then((res) => {
      if (Array.isArray(res.data)) {
        setDocuments(res.data);
      } else {
        console.warn("Documents API returned non-array:", res.data);
        setDocuments([]);
      }
    })
    .finally(() => setLoading(false));
    }, [userId]);

  const guestLimitReached =
    isGuest && documents.length >= GUEST_LIMITS.documents;
  
  const handleDelete = async (documentId: string) => {
    const confirmed = confirm(
      "Are you sure you want to delete this document? This cannot be undone."
    );
    if (!confirmed) return;

    await api.delete(`/documents/${documentId}`);

    setDocuments((prev) =>
      prev.filter((doc) => doc.id !== documentId)
    );
  };
  return (
    <section className="max-w-6xl mx-auto space-y-10">
      {/* ---------- Header ---------- */}
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold">Documents</h1>
        <p className="text-sm text-textSecondary">
          Manage the documents that DocSMART can use to answer your questions.
        </p>
      </header>

      {/* ---------- Guest Notice ---------- */}
      {isGuest && (
        <div className="border border-dashed border-borderSubtle bg-gray-50 p-4 rounded-lg text-sm">
          You are in <strong>Guest Mode</strong>. Upload one document to try
          DocSMART.{" "}
          <Link href="/register" className="text-brand underline">
            Create an account
          </Link>{" "}
          for unlimited documents.
        </div>
      )}

      {/* ---------- Upload Section (COMPONENT) ---------- */}
      {userId && (
        <UploadSection
          userId={userId}
          disabled={guestLimitReached}
          isGuest={isGuest}
          onUploaded={() => {
            setLoading(true);
            api
              .get("/documents")
              .then((res) => {
                  if (Array.isArray(res.data)) {
                    setDocuments(res.data);
                  } else {
                    console.warn("Documents API returned non-array:", res.data);
                    setDocuments([]);
                  }
                })
              .finally(() => setLoading(false));
          }}
        />
      )}

      {/* ---------- Document Grid ---------- */}
      <div className="space-y-4">
        <h2 className="text-xl font-medium">
          Documents You Can Ask Questions About
        </h2>

        {loading ? (
          <p className="text-textSecondary">Loading documents…</p>
        ) : documents.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc) => (
              <DocumentCard key={doc.id} document={doc} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>

      {/* ---------- Info Footer ---------- */}
      <div className="border-t pt-6 text-sm text-textSecondary space-y-2">
        <p>
          Each document acts as a knowledge source. When you open a document,
          you’ll be able to ask focused questions and receive answers grounded
          specifically in that file.
        </p>
        <p>
          Tip: Ask clear, specific questions for the most accurate results.
        </p>
      </div>
    </section>
  );
}

function DocumentCard({
  document,
  onDelete,
}: {
  document: Document;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="bg-white border border-borderSubtle rounded-xl p-6 space-y-3 flex flex-col justify-between">
      <Link href={`/documents/${document.id}`}>
        <h3 className="font-medium truncate">{document.file_name}</h3>
        <p className="text-xs text-textSecondary">
          Uploaded {new Date(document.uploaded_at).toLocaleDateString()}
        </p>
      </Link>

      <button
        onClick={() => onDelete(document.id)}
        className="text-1xl bg-red-600 text-black hover:bg-red-700 rounded-4xl w-20 py-1 text-sm self-center"
      >
        Delete
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="border border-dashed border-borderSubtle p-12 rounded-xl text-center text-textSecondary space-y-2">
      <p>No documents uploaded yet.</p>
      <p className="text-sm">
        Upload a document to start asking questions.
      </p>
    </div>
  );
}