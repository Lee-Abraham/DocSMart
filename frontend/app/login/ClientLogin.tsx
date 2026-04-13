"use client";

import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendPasswordResetEmail } from "firebase/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const handleForgotPassword = async () => {
    if (!password && !email) {
      alert("Please enter your email address.");
      return;
    }

    await sendPasswordResetEmail(auth, email);
    alert("Password reset email sent. Check your inbox.");
  };

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
      <h2 className="text-2xl text-black font-semibold mb-6">Login</h2>

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

        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password (Min 6 - max 20)"
            className="w-full border px-4 py-2 rounded pr-12"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            maxLength={20}
          />

          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 hover:text-gray-800"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>

        <button
          type="submit"
          className="w-full text-white bg-black py-2 rounded hover:bg-gray-800"
        >
          Login
        </button>
        <div className="text-right">
          <button
            type="button"
            onClick={handleForgotPassword}
            className="text-sm text-black text-brand hover:underline"
          >
            Forgot password?
          </button>
        </div>
      </form>
    </div>
  );
}