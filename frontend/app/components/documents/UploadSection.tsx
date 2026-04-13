"use client";

import { useRef, useState } from "react";
import api from "@/lib/api";

type UploadSectionProps = {
  disabled: boolean;
  isGuest: boolean;
  onUploaded?: () => void;
};

export default function UploadSection({
  disabled,
  isGuest,
  onUploaded,
}: UploadSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Defensive check (UX + safety)
    if (file.type !== "application/pdf") {
      alert("Only PDF files are supported.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploading(true);
      await api.post("/upload", formData);
      onUploaded?.();
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div
      className="
        border border-[var(--border)]*1
        bg-[var(--surface)]
        rounded-xl p-6
        space-y-3
      "
    >
      <h2 className="text-lg font-medium text-[var(--foreground)]">
        Upload a Document
      </h2>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        aria-label="Upload PDF document"
        className="hidden"
        onChange={handleFileChange}
      />

      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || uploading}
        className={`
          px-4 py-2
          border border-[var(--border)]*1.5
          rounded-md text-sm
          text-[var(--foreground)]
          transition
          ${
            disabled || uploading
              ? "opacity-60 cursor-not-allowed"
              : "hover:bg-[var(--border)]/40"
          }
        `}
      >
        {uploading ? "Uploading…" : "Upload PDF"}
      </button>

      {disabled && isGuest && (
        <p className="text-sm text-[var(--muted-foreground)]">
          Guest limit reached. Sign up to upload more documents.
        </p>
      )}
    </div>
  );
}