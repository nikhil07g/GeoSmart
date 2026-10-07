import axios from "axios";
const base = (import.meta.env["VITE_API_URL"] as string | undefined) ?? "http://localhost:5000/api";
export const http = axios.create({ baseURL: base, timeout: 30000 });
if (import.meta.env.DEV) console.info("GeoSmart API base URL:", base);
const tokenKey = "geosmart_token";
export const getToken = () =>
  typeof localStorage === "undefined" ? null : localStorage.getItem(tokenKey);
export const setToken = (token: string | null) => {
  if (typeof localStorage === "undefined") return;
  if (token) localStorage.setItem(tokenKey, token);
  else localStorage.removeItem(tokenKey);
  window.dispatchEvent(new Event("geosmart-auth-change"));
};
export async function api<T>(
  path: string,
  options: { method?: string; body?: BodyInit | null; headers?: Record<string, string> } = {},
): Promise<T> {
  const token = getToken();
  if (import.meta.env.DEV)
    console.debug("GeoSmart API request:", `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`);
  try {
    const response = await http.request<{ success?: boolean; data?: T; message?: string }>({
      url: path,
      method: options.method ?? "GET",
      data: options.body,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(typeof options.body === "string" ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
    if (response.data.success === false) throw new Error(response.data.message || "Request failed");
    return response.data.data as T;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.data?.message) throw new Error(error.response.data.message);
      if (error.request)
        throw new Error(
          "Unable to connect to GeoSmart server. Please make sure the backend is running.",
        );
      throw new Error(error.message);
    }
    throw error;
  }
}
export const jsonBody = (body: unknown) => JSON.stringify(body);
export const uploadBody = (fields: Record<string, string | Blob | undefined | null>) => {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields))
    if (value !== undefined && value !== null) form.append(key, value);
  return form;
};
