import * as SecureStore from "expo-secure-store";

export const DEFAULT_API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "https://gorepyo.com";

const TOKEN_KEY = "repyo.token";
const API_KEY = "repyo.apiUrl";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function getApiUrl() {
  return (await SecureStore.getItemAsync(API_KEY)) || DEFAULT_API_URL;
}

export async function setApiUrl(url: string) {
  const cleaned = url.trim().replace(/\/$/, "");
  await SecureStore.setItemAsync(API_KEY, cleaned);
}

export async function getToken() {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string | null) {
  if (token) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const [baseUrl, token] = await Promise.all([getApiUrl(), getToken()]);
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new ApiError(
      res.ok ? "Unexpected response from server" : `Request failed (${res.status})`,
      res.status
    );
  }

  const data = await res.json();
  if (!res.ok) {
    throw new ApiError(
      (data as { error?: string })?.error ?? `Request failed (${res.status})`,
      res.status
    );
  }

  return data as T;
}
