"use client";

import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
        const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
        );

        const user = userCredential.user;

        //BLOCK LOGIN IF NOT VERIFIED
        if (!user.emailVerified) {
        await signOut(auth);
        setError("Please verify your email before logging in.");
        return;
        }

        //Only verified users reach here
        router.push("/dashboard");

    } catch (err: any) {
        setError("Invalid email or password.");
    }
    };



  return (
    <div className="max-w-md mx-auto bg-white border rounded-xl p-8">
      <h2 className="text-2xl font-semibold mb-6">Login</h2>

      <form onSubmit={handleLogin} className="space-y-4" suppressHydrationWarning>
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <input
          type="email"
          placeholder="Email"
          className="w-full border px-4 py-2 rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          maxLength={50}
        />

        <input
          type="password"
          placeholder="Password  (Min 6 - max 20)"
          className="w-full border px-4 py-2 rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          maxLength={20}
        />

        <button
          type="submit"
          className="w-full bg-black text-white py-2 rounded hover:bg-gray-800"
        >
          Login
        </button>
      </form>
    </div>
  );
}