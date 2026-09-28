import axios from "axios";

// Same-origin: the dashboard and its API routes are served by this one Next.js app.
export const api = axios.create({
  baseURL: "/api",
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (typeof window !== "undefined" && error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

/** True when the API tagged its rejection as being about the email field. */
export function isEmailFieldError(err: unknown): boolean {
  return axios.isAxiosError(err) && err.response?.data?.field === "email";
}

export function apiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    if (err.response?.data?.error) return err.response.data.error;
    // No response at all: the request never completed — offline, or the server
    // restarted mid-flight (common in development). Saying so is more useful
    // than a blanket "something went wrong", which reads as a bug in the app.
    if (!err.response) return "Couldn't reach the server. Check your connection and try again.";
  }
  return "Something went wrong. Please try again.";
}
