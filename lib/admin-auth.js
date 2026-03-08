import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

const ADMIN_SESSION_COOKIE = "jb9store.admin.session";
const DEFAULT_ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 12;

function getAdminSessionSecret() {
  return String(
    process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_ACCESS_CODE || "",
  ).trim();
}

function getAdminSessionTtlSeconds() {
  const value = Number(process.env.ADMIN_SESSION_TTL_SECONDS);

  if (!Number.isFinite(value) || value <= 0) {
    return DEFAULT_ADMIN_SESSION_TTL_SECONDS;
  }

  return Math.floor(value);
}

function signPayload(payload, secret) {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left || ""));
  const rightBuffer = Buffer.from(String(right || ""));

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function readCookieValue(cookieHeader, cookieName) {
  const source = String(cookieHeader || "");

  if (!source) {
    return "";
  }

  const entry = source
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`));

  if (!entry) {
    return "";
  }

  return decodeURIComponent(entry.slice(cookieName.length + 1));
}

function getSessionPayload(expiresAt) {
  return `v1:${expiresAt}`;
}

function getSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: getAdminSessionTtlSeconds(),
  };
}

export function isAdminSessionConfigured() {
  return Boolean(getAdminSessionSecret());
}

export function createAdminSessionToken() {
  const secret = getAdminSessionSecret();

  if (!secret) {
    return "";
  }

  const expiresAt = Date.now() + getAdminSessionTtlSeconds() * 1000;
  const payload = getSessionPayload(expiresAt);
  const signature = signPayload(payload, secret);

  return `${payload}.${signature}`;
}

export function verifyAdminSessionToken(token) {
  const secret = getAdminSessionSecret();

  if (!secret) {
    return { ok: false, reason: "missing_secret" };
  }

  const rawToken = String(token || "");
  const dotIndex = rawToken.lastIndexOf(".");

  if (dotIndex <= 0) {
    return { ok: false, reason: "invalid_format" };
  }

  const payload = rawToken.slice(0, dotIndex);
  const submittedSignature = rawToken.slice(dotIndex + 1);
  const expectedSignature = signPayload(payload, secret);

  if (!safeEqual(submittedSignature, expectedSignature)) {
    return { ok: false, reason: "invalid_signature" };
  }

  const [version, expiresAtValue] = payload.split(":");
  const expiresAt = Number(expiresAtValue);

  if (version !== "v1" || !Number.isFinite(expiresAt)) {
    return { ok: false, reason: "invalid_payload" };
  }

  if (Date.now() > expiresAt) {
    return { ok: false, reason: "expired" };
  }

  return { ok: true, expiresAt };
}

export function getAdminSessionTokenFromRequest(request) {
  const cookieFromRequest = request?.cookies?.get?.(ADMIN_SESSION_COOKIE)?.value;

  if (cookieFromRequest) {
    return cookieFromRequest;
  }

  return readCookieValue(request?.headers?.get?.("cookie"), ADMIN_SESSION_COOKIE);
}

export function verifyAdminSessionRequest(request) {
  return verifyAdminSessionToken(getAdminSessionTokenFromRequest(request));
}

export function clearAdminSessionCookie(response) {
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    ...getSessionCookieOptions(),
    maxAge: 0,
  });
}

export function attachAdminSessionCookie(response) {
  const token = createAdminSessionToken();

  if (!token) {
    return false;
  }

  response.cookies.set(ADMIN_SESSION_COOKIE, token, getSessionCookieOptions());

  return true;
}

export function requireAdminSession(request) {
  const verification = verifyAdminSessionRequest(request);

  if (verification.ok) {
    return null;
  }

  const response = NextResponse.json({ error: "Accès administrateur requis." }, { status: 401 });
  clearAdminSessionCookie(response);
  return response;
}
