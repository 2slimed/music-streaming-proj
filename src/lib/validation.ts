import { NextResponse } from "next/server";

export function getHttpsUrlError(value: unknown, field: string, optional = true) {
  if ((value === undefined || value === null || value === "") && optional) return null;
  if (typeof value !== "string") return `${field} must be a URL string`;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return `${field} must use HTTPS`;
  } catch {
    return `${field} must be a valid URL`;
  }
  return null;
}

export function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}
