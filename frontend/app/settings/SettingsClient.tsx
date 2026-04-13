"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import { useSearchParams } from "next/navigation";

export default function SettingsClient() {
  /*HOOKS FIRST */
  const { user, loading: authLoading, isGuest } = useAuth();
  const searchParams = useSearchParams();

  const isGuestMode = isGuest || searchParams.get("mode") === "guest";

  const [autoOpenAsk, setAutoOpenAsk] = useState(true);
  const [showExamples, setShowExamples] = useState(true);

  /*EFFECTS */
  useEffect(() => {
    const savedAutoOpen = localStorage.getItem("autoOpenAsk");
    const savedExamples = localStorage.getItem("showExamples");

    if (savedAutoOpen !== null) {
      setAutoOpenAsk(savedAutoOpen === "true");
    }
    if (savedExamples !== null) {
      setShowExamples(savedExamples === "true");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("autoOpenAsk", String(autoOpenAsk));
  }, [autoOpenAsk]);

  useEffect(() => {
    localStorage.setItem("showExamples", String(showExamples));
  }, [showExamples]);

  /*RETURNS AFTER ALL HOOKS */
  if (authLoading) {
    return <p className="text-textSecondary">Loading session…</p>;
  }

  if (!user) {
    return <p>Please sign in.</p>;
  }

  const handleClearHistory = async () => {
    const confirmClear = confirm(
      "This will remove all your question history. This action cannot be undone."
    );
    if (!confirmClear) return;

    await api.delete("/history");
    alert("Your question history has been cleared.");
  };

  return (
    <section className="max-w-4xl mx-auto space-y-10">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold">Settings</h1>
        <p className="text-sm text-textSecondary">
          Control how DocSMART behaves for you.
        </p>
      </header>

      <div className="border rounded-xl p-6 bg-white space-y-4">
        <h2 className="text-lg font-medium">Document & Asking Behavior</h2>

        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={autoOpenAsk}
            onChange={(e) => setAutoOpenAsk(e.target.checked)}
          />
          Automatically open the Ask page after uploading a document
        </label>

        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={showExamples}
            onChange={(e) => setShowExamples(e.target.checked)}
          />
          Show example questions when asking
        </label>

        <p className="text-xs text-textSecondary">
          These preferences are saved locally in your browser.
        </p>
      </div>

      <div className="border rounded-xl p-6 bg-white space-y-3">
        <h2 className="text-lg font-medium">Session Information</h2>

        {isGuestMode ? (
          <p className="text-sm text-textSecondary">
            You are using DocSMART in <strong>Guest Mode</strong>. Data may not
            persist once you leave the session.
          </p>
        ) : (
          <p className="text-sm text-textSecondary">
            You are signed in. Your data is securely associated with your
            account.
          </p>
        )}
      </div>

      {!isGuestMode && (
        <div className="border border-red-200 rounded-xl p-6 bg-red-50 space-y-3">
          <h2 className="text-lg font-medium text-red-700">Danger Zone</h2>

          <p className="text-sm text-red-700">
            This action permanently removes data and cannot be undone.
          </p>

          <button
            onClick={handleClearHistory}
            className="text-sm bg-red-500 text-white hover:bg-red-600 rounded-md px-4 py-2"
          >
            Clear history
          </button>
        </div>
      )}
    </section>
  );
}