"use client";

import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import api from "@/lib/api";
import { useAuth } from "@/lib/useAuth";

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
    alert("A password reset email has been sent to your email address.");
  };

  const handleClearHistory = async () => {
    const confirmClear = confirm(
      "This will permanently remove all of your question history. This action cannot be undone."
    );
    if (!confirmClear) return;

    await api.delete("/history");
    alert("Your question history has been cleared.");
  };

  return (
    <section className="max-w-4xl mx-auto space-y-12">
      {/* ---------- Header ---------- */}
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold">Settings</h1>
        <p className="text-sm text-textSecondary">
          Manage your account, security, and data preferences.
        </p>
      </header>

      {/* ---------- Account ---------- */}
      <div className="border rounded-xl p-6 bg-white space-y-4">
        <h2 className="text-lg font-medium">Account</h2>

        <div className="text-sm space-y-1">
          <p>
            <span className="text-textSecondary">Email:</span>{" "}
            {user.email ?? "—"}
          </p>
          <p>
            <span className="text-textSecondary">Authentication:</span>{" "}
            Email & Password (Firebase)
          </p>
        </div>

        {!isGuest && (
          <button
            onClick={handleChangePassword}
            className="text-sm border rounded-md px-4 py-2 hover:bg-gray-50"
          >
            Change password
          </button>
        )}

        {isGuest && (
          <p className="text-xs text-textSecondary">
            Password management is not available in Guest Mode.
          </p>
        )}
      </div>

      {/* ---------- Privacy & Data Use ---------- */}
      <div className="border rounded-xl p-6 bg-white space-y-4">
        <h2 className="text-lg font-medium">Privacy & Data Use</h2>

        <p className="text-sm text-textSecondary leading-relaxed">
          Your privacy is a core principle of DocSMART.
        </p>

        <ul className="text-sm text-textSecondary list-disc pl-5 space-y-2">
          <li>
            Your documents and questions are used <strong>only</strong> to
            generate answers for you.
          </li>
          <li>
            We do <strong>not</strong> use your documents to train any AI models.
          </li>
          <li>
            Your data is <strong>never sold, shared, or reviewed by humans</strong>.
          </li>
          <li>
            AI responses are generated temporarily and are not reused.
          </li>
        </ul>

        <p className="text-xs text-textSecondary">
          Document content is processed securely and remains associated only
          with your account.
        </p>
      </div>

      {/* ---------- Security ---------- */}
      <div className="border rounded-xl p-6 bg-white space-y-4">
        <h2 className="text-lg font-medium">Security</h2>

        <ul className="text-sm text-textSecondary list-disc pl-5 space-y-2">
          <li>Authentication and identity are handled by Firebase Auth.</li>
          <li>All API requests require a verified authentication token.</li>
          <li>Data is transmitted over HTTPS and stored securely.</li>
          <li>Each user’s documents and history are isolated by account ID.</li>
        </ul>

        <p className="text-xs text-textSecondary">
          Security best practices are applied throughout the system architecture.
        </p>
      </div>

      {/* ---------- Data Management ---------- */}
      {!isGuest && (
        <div className="border border-red-200 rounded-xl p-6 bg-red-50 space-y-3">
          <h2 className="text-lg font-medium text-red-700">Data Management</h2>

          <p className="text-sm text-red-700">
            These actions permanently remove stored data and cannot be undone.
          </p>

          <button
            onClick={handleClearHistory}
            className="text-sm bg-red-500 text-white hover:bg-red-600 rounded-md px-4 py-2"
          >
            Clear question history
          </button>
        </div>
      )}

      {/* ---------- Footer ---------- */}
      <div className="text-xs text-textSecondary border-t pt-4">
        Additional personalization options may be added as DocSMART evolves, but
        your data ownership and privacy principles will remain unchanged.
      </div>
    </section>
  );
}