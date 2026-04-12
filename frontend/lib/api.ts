import axios from "axios";
import { auth } from "@/lib/firebase";

const baseURL = process.env.NEXT_PUBLIC_API_URL;

if (!baseURL) {
  console.error("NEXT_PUBLIC_API_URL is not defined");
}

const api = axios.create({
  baseURL,
  timeout: 30_000,
});

// Attach Firebase ID token to every request
api.interceptors.request.use(
  async (config) => {
    const user = auth.currentUser;

    if (user) {
      // Force refresh if token is expired
      const token = await user.getIdToken(true);

      if (!config.headers) {
        // Initialize headers as a plain object and cast to any to satisfy AxiosRequestHeaders type
        config.headers = {} as any;
      }
      (config.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Global response error logging
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error", {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });

    return Promise.reject(error);
  }
);

export default api;