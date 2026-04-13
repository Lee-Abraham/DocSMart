"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const isAuthenticated = !!user && user.emailVerified;

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.push("/dashboard");
    }
  }, [loading, isAuthenticated, router]);

  if (loading) return null;
  if (isAuthenticated) return null;

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <section className="max-w-6xl mx-auto px-6 py-20 flex flex-col gap-20">

        {/* ================= HERO ================= */}
        <div className="text-center flex flex-col gap-8">
          <h1
            className="
              text-5xl font-semibold tracking-tight
              text-[var(--foreground)]
            "
          >
            Understand Your Documents
            <span
              className="
                block mt-3 text-2xl font-normal
                text-[var(--muted-foreground)]
              "
            >
              Ask questions. Get answers from your files.
            </span>
          </h1>

          <p
            className="
              max-w-2xl mx-auto text-lg leading-relaxed
              text-[var(--muted-foreground)]
            "
          >
            DocSMart helps you extract meaning from long documents using semantic
            search and AI‑ready architecture. No more endless scrolling.
          </p>

          <div className="pt-2">
            <Link
              href="/register"
              className="
                inline-block
                px-6 py-2
                rounded-md
                text-sm font-medium
                border border-[var(--border)]
                bg-[var(--surface)]
                text-[var(--foreground)]
                hover:bg-[var(--border)]/40
                transition
              "
            >
              Sign up for free to try it out with your own documents
            </Link>
          </div>
        </div>

        {/* ================= FEATURES ================= */}
        <div className="grid md:grid-cols-3 gap-8">
          <Feature
            title="Upload Your Documents"
            desc="PDFs, reports, lecture notes, and more — all supported."
          />
          <Feature
            title="Semantic Question Answering"
            desc="Ask natural‑language questions and retrieve the most relevant sections."
          />
          <Feature
            title="Cloud‑Native & Secure"
            desc="Built with Azure Functions, PostgreSQL, and vector search for scalability."
          />
        </div>

        {/* ================= FOOTER ================= */}
        <p
          className="
            text-center text-sm
            text-[var(--muted-foreground)]
          "
        >
          Built as a cloud‑native document intelligence platform using Azure.
        </p>
      </section>
    </main>
  );
}

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <div
      className="
        bg-[var(--surface)]
        border border-[var(--border)]
        rounded-xl p-8
        text-center
        transition
      "
    >
      <h3
        className="
          text-lg font-semibold mb-3
          text-[var(--foreground)]
        "
      >
        {title}
      </h3>

      <p
        className="
          text-sm leading-relaxed
          text-[var(--muted-foreground)]
        "
      >
        {desc}
      </p>
    </div>
  );
}