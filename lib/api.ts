import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "repyo.token";
const API_KEY = "repyo.apiUrl";
const PRODUCTION_HOST = "gorepyo.com";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function isPrivateHost(host: string) {
  if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0") {
    return true;
  }
  const parts = host.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return false;
  }
  const [a, b] = parts;
  return a === 10 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31);
}

/** Computer LAN host from Expo Go, e.g. 10.157.129.102 */
export function getDevLanHost() {
  const hostUri = Constants.expoConfig?.hostUri ?? "";
  const host = hostUri.split(":")[0]?.trim();
  if (!host || host === "localhost" || host === "127.0.0.1") return null;
  return host;
}

export function suggestedLocalApiUrl() {
  const host = getDevLanHost();
  return host ? `http://${host}:3000` : "http://localhost:3000";
}

export function getDefaultApiUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (fromEnv) return fromEnv;
  return `https://${PRODUCTION_HOST}`;
}

export function isLocalDevApiUrl(url: string) {
  try {
    return isPrivateHost(new URL(url).hostname);
  } catch {
    return false;
  }
}

export const DEFAULT_API_URL = getDefaultApiUrl();

export function normalizeApiUrl(input: string) {
  let raw = input.trim().replace(/\/+$/, "");
  if (!raw) {
    throw new Error("Enter an API server URL like http://YOUR_LAN_IP:3000");
  }
  if (/^exp[s]?:\/\//i.test(raw)) {
    throw new Error(
      `That's the Expo app URL. Use the GoRepYo website, like ${suggestedLocalApiUrl()}`
    );
  }
  if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(raw)) {
    const host = raw.split("/")[0].split(":")[0];
    raw = `${isPrivateHost(host) ? "http" : "https"}://${raw}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`Invalid API server URL. Use ${suggestedLocalApiUrl()}`);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("API server must start with http:// or https://");
  }

  const loopback = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  const lan = getDevLanHost();
  if (loopback && lan) {
    parsed.hostname = lan;
  }

  const path = parsed.pathname === "/" ? "" : parsed.pathname.replace(/\/+$/, "");
  return `${parsed.protocol}//${parsed.host}${path}`;
}

export async function getApiUrl() {
  const stored = await SecureStore.getItemAsync(API_KEY);
  if (!stored) return getDefaultApiUrl();
  try {
    return normalizeApiUrl(stored);
  } catch {
    await SecureStore.deleteItemAsync(API_KEY);
    return getDefaultApiUrl();
  }
}

export async function setApiUrl(url: string) {
  await SecureStore.setItemAsync(API_KEY, normalizeApiUrl(url));
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

function headerValue(headers: HeadersInit | undefined, name: string) {
  if (!headers) return null;
  const target = name.toLowerCase();
  if (Array.isArray(headers)) {
    const match = headers.find(([key]) => key.toLowerCase() === target);
    return match?.[1] ?? null;
  }
  if (headers instanceof Headers) {
    return headers.get(name);
  }
  const found = Object.entries(headers).find(([key]) => key.toLowerCase() === target);
  return found?.[1] ?? null;
}

/** React Native XHR — Expo Go's expo/fetch rejects some valid URLs as "bad URL". */
function request(
  url: string,
  init: RequestInit = {}
): Promise<{
  ok: boolean;
  status: number;
  contentType: string;
  json: () => Promise<unknown>;
}> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => {
      const contentType = xhr.getResponseHeader("content-type") ?? "";
      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        contentType,
        json: async () => JSON.parse(xhr.responseText || "null"),
      });
    };
    xhr.onerror = () =>
      reject(new Error(`Could not reach ${url}. Is the GoRepYo website running?`));
    xhr.ontimeout = () => reject(new Error(`Timed out reaching ${url}`));
    xhr.open((init.method ?? "GET").toUpperCase(), url);
    xhr.timeout = 20000;
    xhr.setRequestHeader("Accept", "application/json");
    if (init.body) {
      xhr.setRequestHeader("Content-Type", "application/json");
    }
    const auth = headerValue(init.headers, "Authorization");
    if (auth) {
      xhr.setRequestHeader("Authorization", auth);
    }
    xhr.send(typeof init.body === "string" ? init.body : null);
  });
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const [rawBase, token] = await Promise.all([getApiUrl(), getToken()]);
  const baseUrl = normalizeApiUrl(rawBase);
  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

  const res = await request(url, {
    ...init,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (!res.contentType.includes("application/json")) {
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
