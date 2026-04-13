"use client";

import { useAuth } from "@/lib/useAuth";
import api from "@/lib/api";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function SettingsClient() {
  const { user, loading: authLoading, isGuest } = useAuth();

  if (authLoading) {
    return <p className="text-textSecondary">Loading session…</p>;
  }

  if (!user) {
    return <p>Please sign in.</p>;
  }

  const handleChangePassword = async () => {
    if (!user.email) return;

    await sendPasswordResetEmail(auth, user.email);
    alert("A password reset email has been sent.");
  };

  const handleClearHistory = async () => {
    const confirmClear = confirm(
      "This will permanently remove all your question history. This cannot be undone."
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
          Manage your account and data.
        </p>
      </header>

      {/* ---------- Account ---------- */}
      <div className="border rounded-xl p-6 bg-white space-y-4">
        <h2 className="text-lg font-medium">Account</h2>

        <button
          onClick={handleChangePassword}
          className="text-sm border rounded-md px-4 py-2 hover:bg-gray-50"
        >
          Change password
        </button>

        {isGuest && (
          <p className="text-xs text-textSecondary">
            Password changes are not available in Guest Mode.
          </p>
        )}
      </div>

      {/* ---------- Danger Zone ---------- */}
      {!isGuest && (
        <div className="border border-red-200 rounded-xl p-6 bg-red-50 space-y-3">
          <h2 className="text-lg font-medium text-red-700">Danger Zone</h2>

          <p className="text-sm text-red-700">
            These actions permanently remove data and cannot be undone.
          </p>

          <button
            onClick={handleClearHistory}
            className="text-sm bg-red-500 text-white hover:bg-red-600 rounded-md px-4 py-2"
          >
            Clear question history
          </button>
        </div>
      )}
    </section>
  );
}