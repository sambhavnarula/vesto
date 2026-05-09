/**
 * Upstox API Client
 * Handles token management and Upstox API calls server-side.
 * All secrets live in environment variables, never exposed to client.
 */

const BASE = "https://api.upstox.com/v2";

interface UpstoxConfig {
  apiKey: string;
  apiSecret: string;
  redirectUri: string;
}

function getConfig(): UpstoxConfig {
  return {
    apiKey: process.env.UPSTOX_API_KEY || "",
    apiSecret: process.env.UPSTOX_API_SECRET || "",
    redirectUri: process.env.UPSTOX_REDIRECT_URI || "https://vestroai.com/api/token/callback",
  };
}

function getStoredToken(): string | null {
  return process.env.UPSTOX_ACCESS_TOKEN || null;
}

function getRefreshToken(): string | null {
  return process.env.UPSTOX_REFRESH_TOKEN || null;
}

/**
 * Refresh the access token using the refresh token.
 * Returns the new access_token (and updates stored value).
 */
export async function refreshAccessToken(): Promise<string> {
  const config = getConfig();
  const refresh = getRefreshToken();

  if (!config.apiKey || !config.apiSecret || !refresh) {
    throw new Error("Missing Upstox credentials. Set UPSTOX_API_KEY, UPSTOX_API_SECRET, and UPSTOX_REFRESH_TOKEN in env.");
  }

  const res = await fetch(`${BASE}/login/authorization/token`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code: refresh,
      client_id: config.apiKey,
      client_secret: config.apiSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token refresh failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  const newToken = data.access_token;

  if (!newToken) {
    throw new Error("No access_token in refresh response");
  }

  // Note: In production, you'd persist this (DB, file, etc.)
  // For Netlify, update the env var via Netlify API or just use refresh
  process.env.UPSTOX_ACCESS_TOKEN = newToken;

  return newToken;
}

/**
 * Make an authenticated GET request to Upstox API.
 * Auto-refreshes token on 401.
 */
export async function upstoxGet(endpoint: string): Promise<any> {
  let token = getStoredToken();
  if (!token) {
    throw new Error("No access token available. Generate one first.");
  }

  const headers: Record<string, string> = {
    accept: "application/json",
    Authorization: `Bearer ${token}`,
    "Api-Version": "2.0",
  };

  const url = `${BASE}${endpoint}`;
  let res = await fetch(url, { headers, next: { revalidate: 30 } });

  // Token expired - refresh and retry once
  if (res.status === 401) {
    console.log("Token expired. Refreshing...");
    token = await refreshAccessToken();
    headers.Authorization = `Bearer ${token}`;
    res = await fetch(url, { headers });
  }

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Upstox API error (${res.status}): ${err}`);
  }

  return res.json();
}

/**
 * Make an authenticated POST request to Upstox API.
 */
export async function upstoxPost(endpoint: string, body: any): Promise<any> {
  let token = getStoredToken();
  if (!token) {
    throw new Error("No access token available.");
  }

  const headers: Record<string, string> = {
    accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    "Api-Version": "2.0",
  };

  const url = `${BASE}${endpoint}`;
  let res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (res.status === 401) {
    console.log("Token expired. Refreshing...");
    token = await refreshAccessToken();
    headers.Authorization = `Bearer ${token}`;
    res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  }

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Upstox API error (${res.status}): ${err}`);
  }

  return res.json();
}

/**
 * Exchange an authorization code for tokens.
 */
export async function exchangeAuthCode(code: string): Promise<{ access_token: string; refresh_token: string }> {
  const config = getConfig();

  const res = await fetch(`${BASE}/login/authorization/token`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: config.apiKey,
      client_secret: config.apiSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Auth code exchange failed (${res.status}): ${err}`);
  }

  return res.json();
}
