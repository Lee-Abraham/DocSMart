"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";

type UseAuthResult = {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  isGuest: boolean;
};

/**
 * Central authentication hook.
 *
 * Guarantees:
 * - `loading === true` until Firebase finishes initializing
 * - `user` is stable after loading becomes false
 * - Safe to block API calls until loading is false
 */
export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return {
    user,
    loading,
    isAuthenticated: !!user,
    isGuest: !!user?.isAnonymous,
  };
}