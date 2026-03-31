import api from "./api";

export const uploadDocument = (payload: any) =>
  api.post("/documents", payload);

export const listDocuments = (user_id: string) =>
  api.get("/documents", { params: { user_id } });
``