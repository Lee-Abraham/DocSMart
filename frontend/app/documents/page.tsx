import { Suspense } from "react";
import DocumentsClient from "./DocumentsClients";

export default function DocumentsPage() {
  return (
    <Suspense fallback={<div>Loading documents…</div>}>
      <DocumentsClient />
    </Suspense>
  );
}