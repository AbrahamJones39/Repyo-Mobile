import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "repyo.token";
const API_KEY = "repyo.apiUrl";
const PRODUCTION_URL = "https://gorepyo.com";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function extraApiUrl() {
  const extra = Constants.expoConfig?.extra as { apiUrl?: string } | undefined;
  return extra?.apiUrl?.trim() || "";
}

function isPrivateHost(host: string) {
  const hostname = host.split(":")[0];
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0") {
    return true;
  }
  const parts = hostname.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return false;
  }
  const [a, b] = parts;
  return a === 10 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31);
}

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
  return process.env.EXPO_PUBLIC_API_URL?.trim() || extraApiUrl() || PRODUCTION_URL;
}

export const DEFAULT_API_URL = getDefaultApiUrl();

export function isLocalDevApiUrl(url: string) {
  const host = url.match(/^https?:\/\/([^/?#]+)/i)?.[1];
  return host ? isPrivateHost(host) : false;
}

/** Parse without Expo's `URL` — it can drop the host in Expo Go. */
export function normalizeApiUrl(input: string) {
  let raw = input.trim().replace(/\/+$/, "");
  if (!raw) {
    throw new Error(`Enter an API server URL like ${PRODUCTION_URL}`);
  }
  if (/^exp[s]?:\/\//i.test(raw)) {
    throw new Error(`That's the Expo app URL. Use ${PRODUCTION_URL}`);
  }
  if (!/^https?:\/\//i.test(raw)) {
    const host = raw.split("/")[0];
    raw = `${isPrivateHost(host) ? "http" : "https"}://${raw}`;
  }

  const match = raw.match(/^(https?):\/\/([^/?#]+)(.*)$/i);
  if (!match) {
    throw new Error(`Invalid API server URL. Use ${PRODUCTION_URL}`);
  }

  const protocol = match[1].toLowerCase();
  let host = match[2];
  const rest = match[3].split(/[?#]/)[0].replace(/\/+$/, "");
  const hostname = host.split(":")[0];
  const lan = getDevLanHost();
  if ((hostname === "localhost" || hostname === "127.0.0.1") && lan) {
    const port = host.includes(":") ? host.slice(host.indexOf(":")) : "";
    host = `${lan}${port}`;
  }

  return `${protocol}://${host}${rest}`;
}

function absoluteApiUrl(baseUrl: string, path: string) {
  const base = normalizeApiUrl(baseUrl);
  const suffix = path.startsWith("/") ? path : `/${path}`;
  const url = `${base}${suffix}`;
  if (!/^https?:\/\/[^/]+\/.+/.test(url)) {
    throw new Error(`Refusing to call a relative URL (${url}). Server should be ${PRODUCTION_URL}`);
  }
  return url;
}

export async function getApiUrl() {
  const stored = await SecureStore.getItemAsync(API_KEY);
  if (!stored || isLocalDevApiUrl(stored)) {
    if (stored) await SecureStore.deleteItemAsync(API_KEY);
    return getDefaultApiUrl();
  }
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
    xhr.onerror = () => reject(new Error(`Could not reach ${url}`));
    xhr.ontimeout = () => reject(new Error(`Timed out reaching ${url}`));
    try {
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
    } catch (err) {
      reject(err instanceof Error ? err : new Error(`Could not reach ${url}`));
    }
  });
}

export async function api<T>(
  path: string,
  init?: RequestInit,
  baseOverride?: string
): Promise<T> {
  const [storedBase, token] = await Promise.all([
    baseOverride ? Promise.resolve(baseOverride) : getApiUrl(),
    getToken(),
  ]);
  const url = absoluteApiUrl(storedBase, path);

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
