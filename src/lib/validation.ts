import type { Lead } from "./types";

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export interface LeadInput {
  name: string;
  phone: string;
  email?: string;
  enquiryType?: string;
  treatment?: string;
  preferredContact?: string;
  message?: string;
  honeypot?: string;
}

export interface AppointmentInput {
  name: string;
  phone: string;
  email?: string;
  treatment: string;
  preferredDate: string;
  preferredTime?: string;
  preferredContact?: string;
  message?: string;
  honeypot?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_DIGITS_RE = /[^\d]/g;

export function sanitizeText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export function sanitizeMultiline(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/\r\n/g, "\n").trim().slice(0, maxLength);
}

export function isValidPhone(phone: string): boolean {
  const digits = phone.replace(PHONE_DIGITS_RE, "");
  return digits.length >= 7 && digits.length <= 15;
}

export function isValidEmail(email: string): boolean {
  if (!email) return true;
  return EMAIL_RE.test(email.trim());
}

export function isSafeHref(url: string): boolean {
  const trimmed = (url || "").trim();
  if (!trimmed) return true;
  if (
    trimmed.startsWith("#") ||
    trimmed.startsWith("/") ||
    trimmed.startsWith("mailto:") ||
    trimmed.startsWith("tel:")
  ) {
    return true;
  }
  if (/^[a-zA-Z0-9._/-]+(\.html)?(#.*)?$/.test(trimmed)) {
    return true;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export function isSafeImageSrc(src: string): boolean {
  const trimmed = (src || "").trim();
  if (!trimmed) return true;
  if (trimmed.startsWith("data:image/")) {
    return /^data:image\/(png|jpeg|jpg|webp|avif);base64,[A-Za-z0-9+/=]+$/.test(trimmed);
  }
  if (trimmed.startsWith("/") || trimmed.startsWith("assets/")) {
    return !trimmed.includes("..");
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export function validateLeadInput(input: LeadInput): ValidationResult {
  const errors: Record<string, string> = {};
  if (input.honeypot && input.honeypot.trim().length > 0) {
    errors.form = "Spam check failed.";
    return { valid: false, errors };
  }

  const name = sanitizeText(input.name, 120);
  const phone = sanitizeText(input.phone, 32);
  const email = sanitizeText(input.email || "", 160);
  const message = sanitizeMultiline(input.message || "", 1200);

  if (name.length < 2) {
    errors.name = "Please enter your full name (at least 2 characters).";
  }
  if (!isValidPhone(phone)) {
    errors.phone = "Please enter a valid phone number (7–15 digits).";
  }
  if (email && !isValidEmail(email)) {
    errors.email = "Please enter a valid email address.";
  }
  if (message.length > 1200) {
    errors.message = "Message must be 1200 characters or fewer.";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateAppointmentInput(input: AppointmentInput): ValidationResult {
  const errors: Record<string, string> = {};
  if (input.honeypot && input.honeypot.trim().length > 0) {
    errors.form = "Spam check failed.";
    return { valid: false, errors };
  }

  const name = sanitizeText(input.name, 120);
  const phone = sanitizeText(input.phone, 32);
  const email = sanitizeText(input.email || "", 160);
  const treatment = sanitizeText(input.treatment, 140);
  const preferredDate = sanitizeText(input.preferredDate, 40);

  if (name.length < 2) {
    errors.name = "Please enter your full name.";
  }
  if (!isValidPhone(phone)) {
    errors.phone = "Please enter a valid phone number.";
  }
  if (email && !isValidEmail(email)) {
    errors.email = "Please enter a valid email address.";
  }
  if (!treatment) {
    errors.treatment = "Please select a treatment or consultation type.";
  }
  if (!preferredDate) {
    errors.preferredDate = "Please select a preferred date.";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "item";
}

export function generateSafeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  const ts = Date.now().toString(36);
  const cleanPrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24) || "id";
  return `${cleanPrefix}_${ts}_${rand}`;
}

export function createCooldownGuard(windowMs = 15000) {
  const recent = new Map<string, number>();
  return function checkAndMark(fingerprint: string, now = Date.now()): boolean {
    const key = fingerprint.trim().toLowerCase();
    const prev = recent.get(key);
    if (prev !== undefined && now - prev < windowMs) {
      return false;
    }
    recent.set(key, now);
    for (const [k, ts] of recent.entries()) {
      if (now - ts >= windowMs) recent.delete(k);
    }
    return true;
  };
}

export function escapeCsvCell(value: unknown): string {
  const raw = value === null || value === undefined ? "" : String(value);
  const needsFormulaPrefix = /^[=+\-@\t\r]/.test(raw);
  const safe = needsFormulaPrefix ? `'${raw}` : raw;
  if (/[",\n\r]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

export function formatLeadsToCsv(leads: Lead[]): string {
  const headers = [
    "ID",
    "Name",
    "Phone",
    "Email",
    "Enquiry Type",
    "Treatment",
    "Preferred Contact",
    "Status",
    "Message",
    "Notes",
    "Source Page",
    "Created At",
  ];

  const rows = leads.map((lead) => {
    const createdStr = formatTimestampIso(lead.createdAt);
    return [
      lead.id,
      lead.name,
      lead.phone,
      lead.email,
      lead.enquiryType,
      lead.treatment,
      lead.preferredContact,
      lead.status,
      lead.message,
      lead.notes,
      lead.sourcePage,
      createdStr,
    ]
      .map(escapeCsvCell)
      .join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

export function formatTimestampIso(ts: unknown): string {
  if (!ts) return "";
  if (typeof ts === "string") return ts;
  if (ts instanceof Date) return ts.toISOString();
  if (typeof ts === "object" && ts !== null && "toDate" in ts && typeof (ts as { toDate: () => Date }).toDate === "function") {
    return (ts as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof ts === "object" && ts !== null && "seconds" in ts && typeof (ts as { seconds: number }).seconds === "number") {
    return new Date((ts as { seconds: number }).seconds * 1000).toISOString();
  }
  return "";
}

export function formatDisplayDate(ts: unknown): string {
  const iso = formatTimestampIso(ts);
  if (!iso) return "Just now";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function reorderItems<T extends { id: string; sortOrder: number }>(
  items: T[],
  id: string,
  direction: "up" | "down"
): T[] {
  const sorted = [...items].sort((a, b) => a.sortOrder - b.sortOrder);
  const idx = sorted.findIndex((item) => item.id === id);
  if (idx === -1) return sorted;
  const targetIdx = direction === "up" ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= sorted.length) return sorted;

  const swapped = [...sorted];
  const temp = swapped[idx];
  swapped[idx] = swapped[targetIdx];
  swapped[targetIdx] = temp;

  return swapped.map((item, i) => ({
    ...item,
    sortOrder: i + 1,
  }));
}
