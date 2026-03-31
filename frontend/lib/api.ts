import axios from "axios";

const baseURL = process.env.NEXT_PUBLIC_API_URL;
console.log("API BASE URL:", baseURL);

const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

// Optional: global error logging
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default api;