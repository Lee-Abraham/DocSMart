import api from "./api";

/**
 * Upload a document (PDF).
 * Auth is derived from Firebase token via Axios interceptor.
 */
export const uploadDocument = (formData: FormData) =>
  api.post("/upload", formData);

/**
 * List documents belonging to the authenticated user.
 */
export const listDocuments = () =>
  api.get("/documents");