"use client";

import { useRef } from "react";
import api from "@/lib/api";

type UploadSectionProps = {
  userId: string;
  disabled: boolean;
  isGuest: boolean;
  onUploaded?: () => void;
};

export default function UploadSection({
  userId,
  disabled,
  isGuest,
  onUploaded,
}: UploadSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("user_id", userId);

    await api.post("/upload", formData);

    onUploaded?.();
    };

  return (
    <div className="border border-borderSubtle rounded-xl bg-white p-6 space-y-3">
      <h2 className="text-lg font-medium">Upload a Document</h2>

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
        disabled={disabled}
        className={`px-4 py-2 border rounded-md text-sm ${
          disabled
            ? "opacity-50 cursor-not-allowed"
            : "hover:bg-gray-50"
        }`}
      >
        Upload PDF
      </button>

      {disabled && isGuest && (
        <p className="text-sm text-textSecondary">
          Guest limit reached. Sign up to upload more documents.
        </p>
      )}
    </div>
  );
}
