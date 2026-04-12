import { Suspense } from "react";
import LoginClient from "./ClientLogin";

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading login…</div>}>
      <LoginClient />
    </Suspense>
  );
}