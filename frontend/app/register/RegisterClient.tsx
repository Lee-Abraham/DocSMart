"use client";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();


    const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
        const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
        );

        await sendEmailVerification(userCredential.user);

        alert("Verification email sent. Please check your inbox.");
        router.push("/login");
    } catch (err: any) {
        setError(err.message);
    }
    };


  return (
    <div className="max-w-md mx-auto bg-white border rounded-xl p-8">
      <h2 className="text-2xl font-semibold mb-6">Create Account</h2>

      <form onSubmit={handleRegister} className="space-y-4">
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
          placeholder="Password (Min 6 - max 20)"
          className="w-full border px-4 py-2 rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          maxLength={20}
        />

        <button
          type="submit"
          className="w-full bg-black text-white py-2 rounded"
        >
          Sign Up
        </button>
      </form>
    </div>
  );
}