import { Suspense } from "react";
import DashboardClient from "./DashBoardClient";

export default function DashboardPage() {
  return (
    <Suspense fallback={<div>Loading dashboard…</div>}>
      <DashboardClient />
    </Suspense>
  );
}