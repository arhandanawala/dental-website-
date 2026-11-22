import React, { useMemo, useState } from "react";
import { Eye, EyeOff, Pencil, Plus, ShieldCheck, Trash2, X } from "lucide-react";
import type { Testimonial } from "../../lib/types";
import { sanitizeMultiline, sanitizeText } from "../../lib/validation";
import { createTestimonial, deleteTestimonial, updateTestimonial } from "../lib/api";

interface TestimonialsTabProps {
  testimonials: Testimonial[];
  onRefresh: () => Promise<void>;
  onToast: (msg: string) => void;
}

interface TestimonialFormState {
  id: string | null;
  reviewerName: string;
  reviewerContext: string;
  quote: string;
  consentConfirmed: boolean;
  published: boolean;
}

const EMPTY_FORM: TestimonialFormState = {
  id: null,
  reviewerName: "",
  reviewerContext: "",
  quote: "",
  consentConfirmed: false,
  published: false,
};

export function TestimonialsTab({ testimonials, onRefresh, onToast }: TestimonialsTabProps) {
  const sorted = useMemo(
    () => [...testimonials].sort((a, b) => a.sortOrder - b.sortOrder),
    [testimonials]
  );

  const [editing, setEditing] = useState<TestimonialFormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function openNew() {
    setError("");
    setEditing({ ...EMPTY_FORM });
  }

  function openEdit(item: Testimonial) {
    setError("");
    setEditing({
      id: item.id,
      reviewerName: item.reviewerName,
      reviewerContext: item.reviewerContext,
      quote: item.quote,
      consentConfirmed: item.consentConfirmed,
      published: item.published,
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setError("");

    const reviewerName = sanitizeText(editing.reviewerName, 120);
    const quote = sanitizeMultiline(editing.quote, 1500);
    if (!reviewerName) {
      setError("Please enter the patient's name or initials.");
      return;
    }
    if (quote.length < 5) {
      setError("Testimonial quote must be at least 5 characters.");
      return;
    }
    if (editing.published && !editing.consentConfirmed) {
      setError("Patient consent must be confirmed before publishing a testimonial.");
      return;
    }

    const payload = {
      reviewerName,
      reviewerContext: sanitizeText(editing.reviewerContext, 160),
      quote,
      consentConfirmed: editing.consentConfirmed,
      published: editing.consentConfirmed ? editing.published : false,
    };

    setSaving(true);
    try {
      if (editing.id) {
        await updateTestimonial(editing.id, payload);
        onToast("Testimonial updated.");
      } else {
        await createTestimonial(payload);
        onToast("Consented testimonial saved.");
      }
      await onRefresh();
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save testimonial.");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(item: Testimonial) {
    if (!item.published && !item.consentConfirmed) {
      onToast("Edit this entry to confirm patient consent before publishing.");
      return;
    }
    try {
      await updateTestimonial(item.id, { published: !item.published });
      await onRefresh();
      onToast(`Testimonial ${!item.published ? "published" : "hidden"}.`);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Could not update testimonial.");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteTestimonial(id);
      setConfirmDeleteId(null);
      await onRefresh();
      onToast("Testimonial deleted.");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Could not delete testimonial.");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-ink">Consented Patient Testimonials</h2>
          <p className="text-sm text-muted">
            Only add verified reviews with documented patient consent. No placeholder reviews are shown on the public site.
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-primary-foreground text-xs font-semibold hover:opacity-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Testimonial
        </button>
      </div>

      {editing && (
        <form onSubmit={handleSave} className="bg-panel border border-accent/40 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-ink">
              {editing.id ? "Edit Testimonial" : "Add Verified Patient Testimonial"}
            </h3>
            <button type="button" onClick={() => setEditing(null)} className="p-1.5 text-muted hover:text-ink cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          {error && (
            <div className="rounded-xl bg-missed/15 border border-missed/30 px-4 py-2.5 text-xs text-missed">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-1.5 text-xs">
              <span className="text-muted">Patient Name / Initials *</span>
              <input
                type="text"
                required
                value={editing.reviewerName}
                onChange={(e) => setEditing({ ...editing, reviewerName: e.target.value })}
                placeholder="e.g. A. M."
                className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-sm text-ink"
              />
            </label>
            <label className="space-y-1.5 text-xs">
              <span className="text-muted">Treatment Context (optional)</span>
              <input
                type="text"
                value={editing.reviewerContext}
                onChange={(e) => setEditing({ ...editing, reviewerContext: e.target.value })}
                placeholder="e.g. TMJ Consultation · Bandra West"
                className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-sm text-ink"
              />
            </label>
            <label className="space-y-1.5 text-xs md:col-span-2">
              <span className="text-muted">Verified Patient Quote *</span>
              <textarea
                rows={3}
                required
                value={editing.quote}
                onChange={(e) => setEditing({ ...editing, quote: e.target.value })}
                placeholder="Paste verified patient review verbatim..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-sm text-ink"
              />
            </label>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2.5 text-xs text-ink cursor-pointer">
              <input
                type="checkbox"
                checked={editing.consentConfirmed}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    consentConfirmed: e.target.checked,
                    published: e.target.checked ? editing.published : false,
                  })
                }
                className="accent-accent w-4 h-4"
              />
              <span>Patient consent confirmed for public website display</span>
            </label>
            <label className="flex items-center gap-2.5 text-xs text-ink cursor-pointer">
              <input
                type="checkbox"
                checked={editing.published}
                disabled={!editing.consentConfirmed}
                onChange={(e) => setEditing({ ...editing, published: e.target.checked })}
                className="accent-accent w-4 h-4 disabled:opacity-40"
              />
              <span>Publish live on website</span>
            </label>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-accent text-primary-foreground text-xs font-semibold cursor-pointer"
            >
              {saving ? "Saving..." : "Save Testimonial"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="px-4 py-2.5 rounded-xl border border-line text-xs text-muted hover:text-ink cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {sorted.length === 0 ? (
        <div className="bg-panel border border-line rounded-2xl p-8 text-center text-sm text-muted">
          No patient testimonials published yet. Add verified, consented testimonials here whenever ready.
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((item) => (
            <div key={item.id} className="bg-panel border border-line rounded-2xl p-5 flex flex-col sm:flex-row justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-ink">{item.reviewerName}</span>
                  {item.reviewerContext && (
                    <span className="text-xs text-muted">· {item.reviewerContext}</span>
                  )}
                  {item.consentConfirmed && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-booked/15 text-booked">
                      <ShieldCheck className="w-3 h-3" /> Consent Confirmed
                    </span>
                  )}
                </div>
                <p className="text-xs text-ink/90 leading-relaxed">“{item.quote}”</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => togglePublish(item)}
                  className="p-2 rounded-xl border border-line text-muted hover:text-ink cursor-pointer"
                  title={item.published ? "Hide" : "Publish"}
                >
                  {item.published ? <Eye className="w-4 h-4 text-booked" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(item)}
                  className="p-2 rounded-xl border border-line text-muted hover:text-accent cursor-pointer"
                  title="Edit"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                {confirmDeleteId === item.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-missed text-white text-xs font-semibold cursor-pointer"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      className="px-2 py-1.5 rounded-lg border border-line text-xs text-muted cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(item.id)}
                    className="p-2 rounded-xl border border-line text-muted hover:text-missed cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
