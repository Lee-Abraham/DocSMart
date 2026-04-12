import { Suspense } from "react";
import ClientProfile from "./ClientProfile";

export default function ProfilePage() {
  return (
    <Suspense fallback={<div>Loading profile…</div>}>
      <ClientProfile />
    </Suspense>
  );
}