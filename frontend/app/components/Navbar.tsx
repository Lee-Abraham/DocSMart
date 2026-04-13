"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/lib/useAuth";

type Theme = "light" | "dark";

export default function Navbar() {
  /* ---------- HOOKS ---------- */
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  const isAuthenticated = !!user && user.emailVerified;

  /* ---------- INIT THEME ---------- */
  useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    const initial: Theme = stored ?? (prefersDark ? "dark" : "light");

    setTheme(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
    setMounted(true);
  }, []);

  /* ---------- TOGGLE THEME ---------- */
  const toggleTheme = () => {
    const next: Theme = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  if (loading) return null;

  return (
    <nav
      className="
        sticky top-0 z-50
        sticky top-0 z-50
        backdrop-blur
        h-18
        content-center
        bg-[var(--surface)]/90
        border-b border-[var(--border)]
      "
    >
      <div className="max-w-7xl mx-auto flex items-center gap-6">
        {/* ---------- Logo ---------- */}
        <Link
          href="/"
          className="
            text-lg font-semibold
            text-textPrimary
            hover:text-brand transition
          "
        >
          DocSMart
        </Link>

        {/* ---------- Primary Navigation ---------- */}
        {isAuthenticated && (
          <div className="flex items-center gap-6">
            <NavLink href="/dashboard" active={pathname === "/dashboard"}>
              Dashboard
            </NavLink>
            <NavLink href="/documents" active={pathname === "/documents"}>
              Documents
            </NavLink>
            <NavLink href="/history" active={pathname === "/history"}>
              History
            </NavLink>
          </div>
        )}

        <div className="flex-1" />

        {/* ---------- Theme Toggle ---------- */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="
            w-9 h-9
            flex items-center justify-center
            rounded-md
            border border-borderSubtle
            text-[var(--foreground)]
            hover:bg-[var(--border)]/40
            transition
          "
        >
          {mounted && (theme === "dark" ? "🌙" : "☀️")}
        </button>

        {/* ---------- Auth / Profile ---------- */}
        {!isAuthenticated ? (
          <div className="flex items-center gap-3">
            <NavAction href="/login">Login</NavAction>
            <NavAction href="/register">Sign Up</NavAction>
          </div>
        ) : (
          <ProfileMenu
            onLogout={async () => {
              await signOut(auth);
              router.push("/");
            }}
          />
        )}
      </div>
    </nav>
  );
}

/* ------------------ Nav Link ------------------ */

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`
        text-sm font-medium transition
        ${
          active
            ? "text-[var(--foreground)]"
            : "text-textSecondary hover:bg-[var(--border)]/40"
        }
      `}
    >
      {children}
    </Link>
  );
}

/* ------------------ Auth Buttons ------------------ */

function NavAction({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="
        px-4 py-2
        text-sm font-medium
        rounded-md
        border border-borderSubtle
        text-[var(--foreground)]
        hover:bg-[var(--border)]/40
        transition
      "
    >
      {children}
    </Link>
  );
}

/* ------------------ Profile Menu ------------------ */

function ProfileMenu({ onLogout }: { onLogout: () => void }) {
  return (
    <details className="relative">
      <summary
        className="
          list-none cursor-pointer
          w-9 h-9
          flex items-center justify-center
          rounded-full
          border border-borderSubtle
          text-textPrimary
          hover:bg-gray-100 dark:hover:bg-slate-800
        "
      >
        U
      </summary>
      <div
        className="
          absolute right-0 mt-2 w-40
          bg-[var(--surface)]
          border border-[var(--border)]
          rounded-md shadow-sm
          overflow-hidden
        "
      >
        <DropdownItem href="/profile">Profile</DropdownItem>
        <DropdownItem href="/settings">Settings</DropdownItem>

        <button
          onClick={onLogout}
          className="
            w-full text-left px-4 py-2 text-sm
            text-[var(--muted-foreground)]
            hover:bg-[var(--border)]/40
            transition
          "
        >
          Logout
        </button>
      </div>
    </details>
  );
}

/* ------------------ Dropdown Item ------------------ */

function DropdownItem({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="
        block px-4 py-2 text-sm
        text-[var(--muted-foreground)]
        hover:bg-[var(--border)]/40
        transition
      "
    >
      {children}
    </Link>
  );
}