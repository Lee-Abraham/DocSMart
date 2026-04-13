"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const isAuthenticated = !!user && user.emailVerified;

  //Redirect authenticated users to dashboard
  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.push("/dashboard");
    }
  }, [loading, isAuthenticated, router]);

  //Prevent content flash while auth state resolves
  if (loading) return null;

  //return nothing while redirecting
  if (isAuthenticated) return null;

  return (
    <section className="max-w-6xl mx-auto flex flex-col gap-20">
      {/* ================= HERO ================= */}
      <div className="text-center flex flex-col gap-8">
        <h1 className="text-5xl font-semibold tracking-tight text-textPrimary">
          Understand Your Documents
          <span className="block mt-3 text-textSecondary text-2xl font-normal">
            Ask questions. Get answers from your files.
          </span>
        </h1>

        <p className="max-w-2xl mx-auto text-lg leading-relaxed text-textSecondary">
          DocSMart helps you extract meaning from long documents using semantic
          search and AI‑ready architecture. No more endless scrolling.
        </p>

        <div className="pt-2">
          <Link
            href="/register"
            className="text-sm text-textSecondary underline hover:text-textPrimary"
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

      <p className="text-center text-sm text-textSecondary">
        Built as a cloud‑native document intelligence platform using Azure.
      </p>
    </section>
  );
}

/* ================= FEATURE CARD ================= */

function Feature({
  title,
  desc,
}: {
  title: string;
  desc: string;
}) {
  return (
    <div className="bg-white border border-borderSubtle rounded-xl p-8 text-center">
      <h3 className="text-lg font-semibold mb-3 text-textPrimary">{title}</h3>
      <p className="text-sm leading-relaxed text-textSecondary">{desc}</p>
    </div>
  );
}
