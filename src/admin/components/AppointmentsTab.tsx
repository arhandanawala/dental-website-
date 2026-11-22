import React, { useMemo, useState } from "react";
import { Calendar, Clock, Save, Search, Trash2 } from "lucide-react";
import type { Appointment, AppointmentStatus } from "../../lib/types";
import { formatDisplayDate, sanitizeMultiline } from "../../lib/validation";
import { deleteAppointment, updateAppointment } from "../lib/api";

const APPT_STATUSES: AppointmentStatus[] = [
  "Pending",
  "Confirmed",
  "Rescheduled",
  "Rejected",
  "Completed",
];

interface AppointmentsTabProps {
  appointments: Appointment[];
  onRefresh: () => Promise<void>;
  onToast: (msg: string) => void;
}

export function AppointmentsTab({ appointments, onRefresh, onToast }: AppointmentsTabProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return appointments.filter((appt) => {
      if (statusFilter !== "All" && appt.status !== statusFilter) return false;
      if (!q) return true;
      return (
        appt.name.toLowerCase().includes(q) ||
        appt.phone.toLowerCase().includes(q) ||
        appt.email.toLowerCase().includes(q) ||
        appt.treatment.toLowerCase().includes(q) ||
        appt.preferredDate.toLowerCase().includes(q)
      );
    });
  }, [appointments, search, statusFilter]);

  async function handleStatusChange(appt: Appointment, nextStatus: AppointmentStatus) {
    setSavingId(appt.id);
    try {
      await updateAppointment(appt.id, { status: nextStatus });
      await onRefresh();
      onToast(`Appointment marked as ${nextStatus}.`);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Could not update appointment.");
    } finally {
      setSavingId(null);
    }
  }

  async function handleSaveNotes(appt: Appointment) {
    setSavingId(appt.id);
    try {
      const notes = sanitizeMultiline(notesDraft[appt.id] ?? appt.notes ?? "", 2000);
      await updateAppointment(appt.id, { notes });
      await onRefresh();
      onToast("Appointment notes saved.");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Could not save appointment notes.");
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteAppointment(id);
      setConfirmDeleteId(null);
      await onRefresh();
      onToast("Appointment request removed.");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Could not delete appointment.");
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-ink">Appointment Requests</h2>
        <p className="text-sm text-muted">
          Review patient consultation requests and confirm, reschedule, or complete bookings.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by patient name, phone, treatment, or date..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-panel border border-line text-sm text-ink placeholder:text-muted focus:outline-none focus:border-accent"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["All", ...APPT_STATUSES].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-2 rounded-xl text-xs font-medium border transition cursor-pointer ${
                statusFilter === st
                  ? "bg-accent text-primary-foreground border-accent"
                  : "bg-panel text-muted border-line hover:text-ink"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-panel border border-line rounded-2xl p-8 text-center text-sm text-muted">
          No appointment requests match this filter.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((appt) => {
            const draft = notesDraft[appt.id] !== undefined ? notesDraft[appt.id] : appt.notes || "";
            return (
              <div key={appt.id} className="bg-panel border border-line rounded-2xl p-5 space-y-4">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-ink">{appt.name}</h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-accent/15 text-accent">
                        {appt.treatment}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                      <span className="inline-flex items-center gap-1 text-ink font-medium">
                        <Calendar className="w-3.5 h-3.5 text-accent" />
                        {appt.preferredDate || "Date not specified"}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-accent" />
                        {appt.preferredTime || "Flexible"}
                      </span>
                      <a href={`tel:${appt.phone}`} className="text-ink hover:text-accent">{appt.phone}</a>
                      {appt.email && <a href={`mailto:${appt.email}`} className="hover:text-accent">{appt.email}</a>}
                      <span>Submitted: {formatDisplayDate(appt.createdAt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      aria-label={`Appointment status for ${appt.name}`}
                      value={appt.status}
                      disabled={savingId === appt.id}
                      onChange={(e) => handleStatusChange(appt, e.target.value as AppointmentStatus)}
                      className="px-3 py-1.5 rounded-xl bg-canvas border border-line text-xs font-medium text-ink focus:outline-none focus:border-accent"
                    >
                      {APPT_STATUSES.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>

                    {confirmDeleteId === appt.id ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleDelete(appt.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-missed text-white text-xs font-semibold cursor-pointer"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2.5 py-1.5 rounded-lg border border-line text-xs text-muted cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(appt.id)}
                        className="p-2 rounded-xl border border-line text-muted hover:text-missed hover:border-missed/40 cursor-pointer"
                        title="Delete request"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {appt.message && (
                  <div className="rounded-xl bg-canvas/80 border border-line/70 px-3.5 py-2.5 text-xs text-ink leading-relaxed">
                    <span className="text-muted font-medium">Patient notes: </span>
                    {appt.message}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={draft}
                    onChange={(e) => setNotesDraft((prev) => ({ ...prev, [appt.id]: e.target.value }))}
                    placeholder="Add confirmed slot time or receptionist notes..."
                    className="flex-1 px-3.5 py-2 rounded-xl bg-canvas border border-line text-xs text-ink placeholder:text-muted focus:outline-none focus:border-accent"
                  />
                  <button
                    type="button"
                    disabled={savingId === appt.id}
                    onClick={() => handleSaveNotes(appt)}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-secondary border border-line text-xs font-medium text-ink hover:border-accent/50 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save Note
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
