import axios from "axios";

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000") + "/api/v1";

export const portalApi = axios.create({ baseURL: BASE });

portalApi.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("portal_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

portalApi.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("portal_token");
      localStorage.removeItem("portal_patient");
      window.location.href = "/portal/login";
    }
    return Promise.reject(err);
  },
);

export function getPortalPatient() {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("portal_patient");
  if (!raw) return null;
  try { return JSON.parse(raw) as { id: string; name: string; mrn: string; email?: string; phone: string; gender: string }; }
  catch { return null; }
}
