import { Suspense } from "react";
import AskDocumentClient from "./AskDocumentClient";

export default function AskDocumentPage() {
  return (
    <Suspense fallback={<div>Loading document…</div>}>
      <AskDocumentClient />
    </Suspense>
  );
}