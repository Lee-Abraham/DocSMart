"use client";

import Link from "next/link";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/lib/useAuth";

export default function Navbar() {
  const { user, loading } = useAuth();

  // Prevent UI flicker while Firebase initializes
  if (loading) return null;

  const isAuthenticated = !!user && user.emailVerified;

  return (
    <nav
      className="
        sticky top-0 z-50
        bg-[rgba(249,250,251,0.85)] backdrop-blur
        border-b border-borderSubtle
        px-8 py-4
      "
    >
      <div className="max-w-7xl mx-auto flex items-center">
        {/* ---------- Logo ---------- */}
        <Link
          href="/"
          className="text-lg font-semibold text-textPrimary"
        >
          DocSMart
        </Link>

        {/* ---------- Primary Navigation (ONLY verified users) ---------- */}
        {isAuthenticated && (
          <div className="ml-8 flex items-center gap-6">
            <NavLink href="/dashboard">Dashboard</NavLink>
            <NavLink href="/documents">Documents</NavLink>
            <NavLink href="/history">History</NavLink>
          </div>
        )}

        {/* Spacer pushes auth/profile to the right */}
        <div className="flex-1" />

        {/* ---------- Right Side ---------- */}
        {!isAuthenticated ? (
          <div className="flex items-center gap-3">
            <NavAction href="/login">Login</NavAction>
            <NavAction href="/register">Sign Up</NavAction>
          </div>
        ) : (
          <ProfileMenu />
        )}
      </div>
    </nav>
  );
}

/* ------------------ Navigation Text Link ------------------ */

function NavLink({
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
        px-2 py-1
        text-sm font-medium
        text-textSecondary
        hover:text-textPrimary
        hover:bg-gray-50
        rounded-md
        transition
      "
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
        text-textPrimary
        hover:bg-gray-50
        transition
      "
    >
      {children}
    </Link>
  );
}

/* ------------------ Profile Menu ------------------ */

function ProfileMenu() {
  return (
    <details className="relative">
      <summary
        className="
          list-none cursor-pointer
          flex items-center justify-center
          w-9 h-9
          rounded-full
          bg-white
          border border-borderSubtle
          hover:bg-gray-50
        "
      >
        <span className="text-sm font-medium text-textPrimary">U</span>
      </summary>

      <div
        className="
          absolute right-0 mt-2
          w-40
          bg-white
          border border-borderSubtle
          rounded-md
          shadow-sm
          overflow-hidden
        "
      >
        <DropdownItem href="/profile">Profile</DropdownItem>
        <DropdownItem href="/settings">Settings</DropdownItem>

        <button
          onClick={() => signOut(auth)}
          className="
            w-full text-left
            px-4 py-2
            text-sm text-red-600
            hover:bg-gray-50
          "
        >
          Logout
        </button>
      </div>
    </details>
  );
}

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
      className="block px-4 py-2 text-sm text-textPrimary hover:bg-gray-50"
    >
      {children}
    </Link>
  );
}