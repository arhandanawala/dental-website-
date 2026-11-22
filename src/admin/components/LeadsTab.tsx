import React, { useMemo, useState } from "react";
import { Download, Search, Trash2, Save } from "lucide-react";
import type { Lead, LeadStatus } from "../../lib/types";
import { formatDisplayDate, formatLeadsToCsv, sanitizeMultiline } from "../../lib/validation";
import { deleteLead, updateLead } from "../lib/api";

const LEAD_STATUSES: LeadStatus[] = ["New", "Contacted", "Follow-up", "Converted", "Closed"];

interface LeadsTabProps {
  leads: Lead[];
  onRefresh: () => Promise<void>;
  onToast: (msg: string) => void;
}

export function LeadsTab({ leads, onRefresh, onToast }: LeadsTabProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((lead) => {
      if (statusFilter !== "All" && lead.status !== statusFilter) return false;
      if (!q) return true;
      return (
        lead.name.toLowerCase().includes(q) ||
        lead.phone.toLowerCase().includes(q) ||
        lead.email.toLowerCase().includes(q) ||
        lead.treatment.toLowerCase().includes(q) ||
        lead.message.toLowerCase().includes(q)
      );
    });
  }, [leads, search, statusFilter]);

  async function handleStatusChange(lead: Lead, nextStatus: LeadStatus) {
    setSavingId(lead.id);
    try {
      await updateLead(lead.id, { status: nextStatus });
      await onRefresh();
      onToast(`Lead status updated to ${nextStatus}.`);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Could not update lead.");
    } finally {
      setSavingId(null);
    }
  }

  async function handleSaveNotes(lead: Lead) {
    setSavingId(lead.id);
    try {
      const notes = sanitizeMultiline(notesDraft[lead.id] ?? lead.notes ?? "", 2000);
      await updateLead(lead.id, { notes });
      await onRefresh();
      onToast("Internal notes saved.");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Could not save notes.");
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteLead(id);
      setConfirmDeleteId(null);
      await onRefresh();
      onToast("Lead deleted.");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Could not delete lead.");
    }
  }

  function handleExportCsv() {
    const csv = formatLeadsToCsv(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `smile-masters-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onToast(`Exported ${filtered.length} lead(s) to CSV.`);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-ink">Enquiries &amp; Callback Leads</h2>
          <p className="text-sm text-muted">Track incoming patient callbacks, update follow-up status, and export CSV.</p>
        </div>
        <button
          type="button"
          onClick={handleExportCsv}
          disabled={filtered.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-primary-foreground text-xs font-semibold hover:opacity-95 disabled:opacity-50 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          Export CSV ({filtered.length})
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by patient name, phone, email, or treatment..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-panel border border-line text-sm text-ink placeholder:text-muted focus:outline-none focus:border-accent"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["All", ...LEAD_STATUSES].map((st) => (
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
          No enquiries match your current filter.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((lead) => {
            const draft = notesDraft[lead.id] !== undefined ? notesDraft[lead.id] : lead.notes || "";
            return (
              <div key={lead.id} className="bg-panel border border-line rounded-2xl p-5 space-y-4">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-ink">{lead.name}</h3>
                      <span className="px-2 py-0.5 rounded-full text-[11px] bg-secondary text-muted">
                        {lead.enquiryType || "Callback"}
                      </span>
                      {lead.treatment && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] bg-accent/15 text-accent">
                          {lead.treatment}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted flex flex-wrap gap-x-4 gap-y-1">
                      <a href={`tel:${lead.phone}`} className="text-ink hover:text-accent">{lead.phone}</a>
                      {lead.email && <a href={`mailto:${lead.email}`} className="hover:text-accent">{lead.email}</a>}
                      <span>Preferred: {lead.preferredContact || "Phone"}</span>
                      <span>Submitted: {formatDisplayDate(lead.createdAt)}</span>
                      {lead.sourcePage && <span>Page: {lead.sourcePage}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      aria-label={`Status for ${lead.name}`}
                      value={lead.status}
                      disabled={savingId === lead.id}
                      onChange={(e) => handleStatusChange(lead, e.target.value as LeadStatus)}
                      className="px-3 py-1.5 rounded-xl bg-canvas border border-line text-xs font-medium text-ink focus:outline-none focus:border-accent"
                    >
                      {LEAD_STATUSES.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>

                    {confirmDeleteId === lead.id ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleDelete(lead.id)}
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
                        onClick={() => setConfirmDeleteId(lead.id)}
                        className="p-2 rounded-xl border border-line text-muted hover:text-missed hover:border-missed/40 cursor-pointer"
                        title="Delete lead"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {lead.message && (
                  <div className="rounded-xl bg-canvas/80 border border-line/70 px-3.5 py-2.5 text-xs text-ink leading-relaxed">
                    <span className="text-muted font-medium">Patient message: </span>
                    {lead.message}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={draft}
                    onChange={(e) => setNotesDraft((prev) => ({ ...prev, [lead.id]: e.target.value }))}
                    placeholder="Add internal clinic follow-up notes..."
                    className="flex-1 px-3.5 py-2 rounded-xl bg-canvas border border-line text-xs text-ink placeholder:text-muted focus:outline-none focus:border-accent"
                  />
                  <button
                    type="button"
                    disabled={savingId === lead.id}
                    onClick={() => handleSaveNotes(lead)}
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
