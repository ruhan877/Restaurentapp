export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "/api";
export function setSessionToken(token) {
  if (typeof window !== "undefined") localStorage.setItem("session_token", token);
}
export function getSessionToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("session_token");
}
export async function api(path, opts = {}) {
  const headers = opts.headers || {};
  if (!headers["Content-Type"] && !(opts.body instanceof FormData)) headers["Content-Type"] = "application/json";
  const token = getSessionToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const base = API_BASE.endsWith("/") ? API_BASE.slice(0, -1) : API_BASE;
  const p = path.startsWith("/") ? path : `/${path}`;
  const res = await fetch(`${base}${p}`, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw data;
  return data;
}
