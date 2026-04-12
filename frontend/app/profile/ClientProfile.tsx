"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import { useSearchParams } from "next/navigation";

type UserProfile = {
  email: string;
  created_at: string;
};

export default function ProfileClient() {
  const { user, loading: authLoading, isGuest } = useAuth();
  const searchParams = useSearchParams();

  const isGuestMode = isGuest || searchParams.get("mode") === "guest";

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [documentCount, setDocumentCount] = useState(0);
  const [questionCount, setQuestionCount] = useState(0);
  const [dataLoading, setDataLoading] = useState(true);

  /* ---------- AUTH GUARD ---------- */
  if (authLoading) {
    return <p className="text-textSecondary">Loading session…</p>;
  }

  if (!user) {
    return <p>Please sign in.</p>;
  }

  /* ---------- LOAD PROFILE DATA ---------- */
  useEffect(() => {
    if (authLoading || !user || isGuestMode) {
      setDataLoading(false);
      return;
    }

    setDataLoading(true);

    Promise.all([
      api.get("/user"),
      api.get("/documents"),
      api.get("/history"),
    ])
      .then(([userRes, docsRes, historyRes]) => {
        setProfile(userRes.data);
        setDocumentCount(Array.isArray(docsRes.data) ? docsRes.data.length : 0);
        setQuestionCount(historyRes.data?.history?.length ?? 0);
      })
      .finally(() => setDataLoading(false));
  }, [authLoading, user, isGuestMode]);

  return (
    <section className="max-w-4xl mx-auto space-y-10">
      {/* ---------- Header ---------- */}
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold">Your Profile</h1>
        <p className="text-sm text-textSecondary">
          Account information and usage summary.
        </p>
      </header>

      {/* ---------- Guest Profile ---------- */}
      {isGuestMode ? (
        <div className="border border-dashed rounded-xl p-8 bg-gray-50 space-y-3">
          <h2 className="text-lg font-medium">Guest User</h2>
          <p className="text-sm text-textSecondary">
            You are currently using DocSMART in Guest Mode. Your data may be
            cleared when you leave the session.
          </p>
          <Link
            href="/register"
            className="inline-block text-sm text-brand underline"
          >
            Create an account
          </Link>
        </div>
      ) : dataLoading ? (
        <p className="text-textSecondary">Loading profile…</p>
      ) : (
        <>
          {/* ---------- Account Info ---------- */}
          <div className="border rounded-xl p-6 bg-white space-y-3">
            <h2 className="text-lg font-medium">Account Information</h2>

            <div className="text-sm space-y-1">
              <p>
                <span className="text-textSecondary">Email:</span>{" "}
                {user.email ?? "—"}
              </p>

              <p>
                <span className="text-textSecondary">Account ID:</span>{" "}
                {user.uid.slice(0, 8)}…
              </p>

              <p>
                <span className="text-textSecondary">Member since:</span>{" "}
                {profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString()
                  : "—"}
              </p>
            </div>
          </div>

          {/* ---------- Usage Summary ---------- */}
          <div className="border rounded-xl p-6 bg-white space-y-3">
            <h2 className="text-lg font-medium">Usage Summary</h2>

            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div className="border rounded-lg p-4">
                <p className="text-textSecondary">Documents uploaded</p>
                <p className="text-xl font-semibold">{documentCount}</p>
              </div>

              <div className="border rounded-lg p-4">
                <p className="text-textSecondary">Questions asked</p>
                <p className="text-xl font-semibold">{questionCount}</p>
              </div>
            </div>
          </div>

          {/* ---------- Session Info ---------- */}
          <div className="border rounded-xl p-6 bg-white space-y-3">
            <h2 className="text-lg font-medium">Account Details</h2>
            <p className="text-sm text-textSecondary">
              Your documents and question history are securely associated with
              your account and available whenever you sign in.
            </p>
          </div>
        </>
      )}
    </section>
  );
}