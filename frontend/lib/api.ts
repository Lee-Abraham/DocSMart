import axios from "axios";
import { getAuth } from "firebase/auth";

const baseURL = process.env.NEXT_PUBLIC_API_URL;

if (!baseURL) {
  console.error("NEXT_PUBLIC_API_URL is not defined");
}

const api = axios.create({
  baseURL,
});

//Attach Firebase ID token to every request
api.interceptors.request.use(
  async (config) => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (user) {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

//Global response error logging (good practice)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    return Promise.reject(error);
  }
);

export default api;