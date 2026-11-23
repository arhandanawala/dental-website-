import type {
  Appointment,
  AppointmentStatus,
  Doctor,
  Lead,
  LeadStatus,
  SiteContent,
  Testimonial,
  Treatment,
} from "../../lib/types";

let memoryToken: string | null = null;

export function setAdminToken(token: string | null) {
  memoryToken = token;
}

export function getAdminToken(): string | null {
  return memoryToken;
}

export interface VoiceCallTranscriptEntry {
  role: "caller" | "maya";
  text: string;
  at: string;
  partial?: boolean;
}

export interface VoiceCallRecord {
  id: string;
  startedAt: string;
  endedAt: string | null;
  status: "live" | "completed";
  outcome: "booked" | "not_booked" | "cancelled" | "unknown";
  patientName: string | null;
  patientEmail: string | null;
  patientPhone: string | null;
  slotStart: string | null;
  summary: string | null;
  model: string;
  transcript: VoiceCallTranscriptEntry[];
  recording: boolean;
}

export interface VoiceCallsStats {
  total: number;
  live: number;
  booked: number;
  notBooked: number;
  conversion: number;
}

export interface AdminSnapshotResponse {
  siteContent: SiteContent;
  doctors: Doctor[];
  treatments: Treatment[];
  testimonials: Testimonial[];
  leads: Lead[];
  appointments: Appointment[];
  voice: {
    configured: boolean;
    model: string;
    voice: string;
    stats: VoiceCallsStats;
    calls: VoiceCallRecord[];
  };
}

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers || {});
  headers.set("X-Requested-With", "XMLHttpRequest");
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (memoryToken) {
    headers.set("Authorization", `Bearer ${memoryToken}`);
  }

  const res = await fetch(url, {
    ...init,
    headers,
    credentials: "include",
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : `Request failed (${res.status})`);
  }
  return data as T;
}

export function getAuthStatus() {
  return request<{
    configured: boolean;
    source: string;
    authenticated: boolean;
    user: string | null;
  }>("/api/auth/status");
}

export function getMe() {
  return request<{ user: string }>("/api/me");
}

export async function loginWithPassword(username: string, password: string) {
  const res = await request<{ ok: boolean; user: string; token?: string }>("/api/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  if (res.token) setAdminToken(res.token);
  return res;
}

export async function setupInitialAdmin(username: string, password: string) {
  const res = await request<{ ok: boolean; user: string; token?: string }>("/api/auth/setup", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  if (res.token) setAdminToken(res.token);
  return res;
}

export async function logoutAdmin() {
  try {
    await request<{ ok: boolean }>("/api/logout", { method: "POST" });
  } finally {
    setAdminToken(null);
  }
}

export async function updateAdminCredentials(
  currentPassword: string,
  username: string,
  newPassword: string
) {
  const res = await request<{ ok: boolean; user: string; token?: string }>(
    "/api/admin/credentials",
    {
      method: "PUT",
      body: JSON.stringify({ currentPassword, username, newPassword }),
    }
  );
  if (res.token) setAdminToken(res.token);
  return res;
}

export function getAdminSnapshot() {
  return request<AdminSnapshotResponse>("/api/admin/snapshot");
}

export function seedAdminDefaults() {
  return request<{ ok: boolean; created: number }>("/api/admin/seed-defaults", {
    method: "POST",
  });
}

export function saveSiteContent(payload: Partial<SiteContent>) {
  return request<{ ok: boolean; siteContent: SiteContent }>("/api/admin/site-content", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function createDoctor(payload: Partial<Doctor>) {
  return request<{ ok: boolean; doctor: Doctor }>("/api/admin/doctors", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateDoctor(id: string, payload: Partial<Doctor>) {
  return request<{ ok: boolean; doctor: Doctor }>(`/api/admin/doctors/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteDoctor(id: string) {
  return request<{ ok: boolean }>(`/api/admin/doctors/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function reorderDoctors(ids: string[]) {
  return request<{ ok: boolean; doctors: Doctor[] }>("/api/admin/doctors/reorder", {
    method: "PUT",
    body: JSON.stringify({ ids }),
  });
}

export function createTreatment(payload: Partial<Treatment>) {
  return request<{ ok: boolean; treatment: Treatment }>("/api/admin/treatments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateTreatment(id: string, payload: Partial<Treatment>) {
  return request<{ ok: boolean; treatment: Treatment }>(
    `/api/admin/treatments/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    }
  );
}

export function deleteTreatment(id: string) {
  return request<{ ok: boolean }>(`/api/admin/treatments/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function reorderTreatments(ids: string[]) {
  return request<{ ok: boolean; treatments: Treatment[] }>("/api/admin/treatments/reorder", {
    method: "PUT",
    body: JSON.stringify({ ids }),
  });
}

export function createTestimonial(payload: Partial<Testimonial>) {
  return request<{ ok: boolean; testimonial: Testimonial }>("/api/admin/testimonials", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateTestimonial(id: string, payload: Partial<Testimonial>) {
  return request<{ ok: boolean; testimonial: Testimonial }>(
    `/api/admin/testimonials/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    }
  );
}

export function deleteTestimonial(id: string) {
  return request<{ ok: boolean }>(`/api/admin/testimonials/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function reorderTestimonials(ids: string[]) {
  return request<{ ok: boolean; testimonials: Testimonial[] }>("/api/admin/testimonials/reorder", {
    method: "PUT",
    body: JSON.stringify({ ids }),
  });
}

export function updateLead(id: string, patch: { status?: LeadStatus; notes?: string }) {
  return request<{ ok: boolean; lead: Lead }>(`/api/admin/leads/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function deleteLead(id: string) {
  return request<{ ok: boolean }>(`/api/admin/leads/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function updateAppointment(
  id: string,
  patch: { status?: AppointmentStatus; notes?: string }
) {
  return request<{ ok: boolean; appointment: Appointment }>(
    `/api/admin/appointments/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(patch),
    }
  );
}

export function deleteAppointment(id: string) {
  return request<{ ok: boolean }>(`/api/admin/appointments/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function getVoiceCalls() {
  return request<{
    stats: VoiceCallsStats;
    calls: VoiceCallRecord[];
    voice: { configured: boolean; model: string; voice: string };
  }>("/api/calls");
}

export function getVoicePrompt() {
  return request<{ prompt: string; overridden: boolean }>("/api/prompt");
}

export function saveVoicePrompt(prompt: string) {
  return request<{ ok: boolean; chars: number }>("/api/prompt", {
    method: "PUT",
    body: JSON.stringify({ prompt }),
  });
}

export function resetVoicePrompt() {
  return request<{ ok: boolean }>("/api/prompt", { method: "DELETE" });
}

export function getRecordingUrl(callId: string) {
  const base = `/api/calls/${encodeURIComponent(callId)}/recording`;
  return memoryToken ? `${base}?token=${encodeURIComponent(memoryToken)}` : base;
}
