import React, { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from "lucide-react";
import type { FaqItem, SiteContent } from "../../lib/types";
import { isSafeHref, sanitizeMultiline, sanitizeText } from "../../lib/validation";
import { saveSiteContent } from "../lib/api";

interface ContactTabProps {
  siteContent: SiteContent;
  onRefresh: () => Promise<void>;
  onToast: (msg: string) => void;
}

export function ContactTab({ siteContent, onRefresh, onToast }: ContactTabProps) {
  const [draft, setDraft] = useState<SiteContent>(siteContent);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setDraft(siteContent);
  }, [siteContent]);

  function updateFaq(index: number, key: keyof FaqItem, value: string) {
    setDraft((prev) => {
      const faqs = [...(prev.faqs || [])];
      faqs[index] = { ...faqs[index], [key]: value };
      return { ...prev, faqs };
    });
  }

  function addFaq() {
    setDraft((prev) => ({
      ...prev,
      faqs: [...(prev.faqs || []), { question: "", answer: "" }],
    }));
  }

  function moveFaq(index: number, dir: -1 | 1) {
    setDraft((prev) => {
      const faqs = [...(prev.faqs || [])];
      const nextIdx = index + dir;
      if (nextIdx < 0 || nextIdx >= faqs.length) return prev;
      [faqs[index], faqs[nextIdx]] = [faqs[nextIdx], faqs[index]];
      return { ...prev, faqs };
    });
  }

  function removeFaq(index: number) {
    setDraft((prev) => ({
      ...prev,
      faqs: (prev.faqs || []).filter((_, i) => i !== index),
    }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const urlsToCheck = [
      draft.googleMapsUrl,
      draft.socialInstagram,
      draft.socialFacebook,
      draft.socialYoutube,
      draft.socialLinkedin,
    ];
    if (urlsToCheck.some((u) => u && !isSafeHref(u))) {
      setError("One of the map or social links uses an unsupported URL format. Use https:// URLs.");
      return;
    }

    const cleanFaqs = (draft.faqs || [])
      .map((f) => ({
        question: sanitizeText(f.question, 240),
        answer: sanitizeMultiline(f.answer, 1200),
      }))
      .filter((f) => f.question && f.answer)
      .slice(0, 30);

    setSaving(true);
    try {
      await saveSiteContent({
        phone: sanitizeText(draft.phone, 40) || "+91 77389 68210",
        whatsappNumber: sanitizeText(draft.whatsappNumber, 40) || sanitizeText(draft.phone, 40),
        email: sanitizeText(draft.email, 160) || "info@smilemastersindia.com",
        city: sanitizeText(draft.city, 120),
        address: sanitizeText(draft.address, 400),
        openingHours: sanitizeText(draft.openingHours, 300),
        googleMapsUrl: sanitizeText(draft.googleMapsUrl, 400),
        bookingNotice: sanitizeText(draft.bookingNotice, 500),
        socialInstagram: sanitizeText(draft.socialInstagram, 300),
        socialFacebook: sanitizeText(draft.socialFacebook, 300),
        socialYoutube: sanitizeText(draft.socialYoutube, 300),
        socialLinkedin: sanitizeText(draft.socialLinkedin, 300),
        notificationEmail: sanitizeText(draft.notificationEmail, 160),
        notifyOnNewLead: Boolean(draft.notifyOnNewLead),
        notifyOnNewAppointment: Boolean(draft.notifyOnNewAppointment),
        faqs: cleanFaqs,
      });
      await onRefresh();
      onToast("Contact details, social links, and FAQs published live.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save contact settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-ink">Contact Details, Maps &amp; FAQs</h2>
          <p className="text-sm text-muted">
            Every phone number, WhatsApp link, address, social handle, and FAQ updates live across all clinic pages and Maya Voice AI.
          </p>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-primary-foreground text-xs font-semibold hover:opacity-95 disabled:opacity-60 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving..." : "Save Contact & FAQs"}
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-missed/15 border border-missed/30 px-4 py-3 text-xs text-missed">
          {error}
        </div>
      )}

      {/* Direct Clinic Contact */}
      <section className="bg-panel border border-line rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-ink">Clinic Contact &amp; Location</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="space-y-1.5 text-xs">
            <span className="text-muted">Clinic Phone *</span>
            <input
              type="text"
              required
              value={draft.phone}
              onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-sm text-ink focus:outline-none focus:border-accent"
            />
          </label>
          <label className="space-y-1.5 text-xs">
            <span className="text-muted">WhatsApp Number (for Chat on WhatsApp button)</span>
            <input
              type="text"
              value={draft.whatsappNumber || ""}
              onChange={(e) => setDraft({ ...draft, whatsappNumber: e.target.value })}
              placeholder="+91 77389 68210"
              className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-sm text-ink focus:outline-none focus:border-accent"
            />
          </label>
          <label className="space-y-1.5 text-xs">
            <span className="text-muted">Clinic Email *</span>
            <input
              type="email"
              required
              value={draft.email}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-sm text-ink focus:outline-none focus:border-accent"
            />
          </label>
          <label className="space-y-1.5 text-xs">
            <span className="text-muted">City / Neighbourhood</span>
            <input
              type="text"
              value={draft.city}
              onChange={(e) => setDraft({ ...draft, city: e.target.value })}
              placeholder="Bandra West, Mumbai"
              className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-sm text-ink focus:outline-none focus:border-accent"
            />
          </label>
          <label className="space-y-1.5 text-xs md:col-span-2">
            <span className="text-muted">Full Clinic Address &amp; Landmarks *</span>
            <input
              type="text"
              required
              value={draft.address}
              onChange={(e) => setDraft({ ...draft, address: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-sm text-ink focus:outline-none focus:border-accent"
            />
          </label>
          <label className="space-y-1.5 text-xs">
            <span className="text-muted">Consultation Timings / Hours</span>
            <input
              type="text"
              value={draft.openingHours}
              onChange={(e) => setDraft({ ...draft, openingHours: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-sm text-ink focus:outline-none focus:border-accent"
            />
          </label>
          <label className="space-y-1.5 text-xs">
            <span className="text-muted">Google Maps / Reviews Link</span>
            <input
              type="url"
              value={draft.googleMapsUrl || ""}
              onChange={(e) => setDraft({ ...draft, googleMapsUrl: e.target.value })}
              placeholder="https://maps.app.goo.gl/..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-xs text-ink focus:outline-none focus:border-accent"
            />
          </label>
          <label className="space-y-1.5 text-xs md:col-span-2">
            <span className="text-muted">Appointment Confirmation Notice</span>
            <input
              type="text"
              value={draft.bookingNotice}
              onChange={(e) => setDraft({ ...draft, bookingNotice: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-sm text-ink focus:outline-none focus:border-accent"
            />
          </label>
        </div>
      </section>

      {/* Social Media Links */}
      <section className="bg-panel border border-line rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-ink">Social Media &amp; Profile Links</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="space-y-1.5 text-xs">
            <span className="text-muted">Instagram URL</span>
            <input
              type="url"
              value={draft.socialInstagram}
              onChange={(e) => setDraft({ ...draft, socialInstagram: e.target.value })}
              placeholder="https://www.instagram.com/..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-xs text-ink"
            />
          </label>
          <label className="space-y-1.5 text-xs">
            <span className="text-muted">Facebook URL</span>
            <input
              type="url"
              value={draft.socialFacebook}
              onChange={(e) => setDraft({ ...draft, socialFacebook: e.target.value })}
              placeholder="https://www.facebook.com/..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-xs text-ink"
            />
          </label>
          <label className="space-y-1.5 text-xs">
            <span className="text-muted">YouTube URL</span>
            <input
              type="url"
              value={draft.socialYoutube}
              onChange={(e) => setDraft({ ...draft, socialYoutube: e.target.value })}
              placeholder="https://www.youtube.com/..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-xs text-ink"
            />
          </label>
          <label className="space-y-1.5 text-xs">
            <span className="text-muted">Google Profile / LinkedIn URL (leave blank to hide)</span>
            <input
              type="url"
              value={draft.socialLinkedin}
              onChange={(e) => setDraft({ ...draft, socialLinkedin: e.target.value })}
              placeholder="https://..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-xs text-ink"
            />
          </label>
        </div>
      </section>

      {/* FAQs */}
      <section className="bg-panel border border-line rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-ink">Clinic FAQs ({(draft.faqs || []).length})</h3>
            <p className="text-xs text-muted">
              Edit, reorder, add, or remove existing FAQs shown on the public homepage.
            </p>
          </div>
          <button
            type="button"
            onClick={addFaq}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-secondary border border-line text-xs font-semibold text-ink hover:border-accent cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add New FAQ
          </button>
        </div>
        <div className="space-y-3">
          {(draft.faqs || []).map((faq, idx) => (
            <div key={idx} className="rounded-xl bg-canvas/80 border border-line p-4 space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-muted w-6">#{idx + 1}</span>
                <input
                  type="text"
                  value={faq.question}
                  onChange={(e) => updateFaq(idx, "question", e.target.value)}
                  placeholder="Question"
                  className="flex-1 px-3 py-2 rounded-lg bg-panel border border-line text-xs font-medium text-ink"
                />
                <button
                  type="button"
                  onClick={() => moveFaq(idx, -1)}
                  disabled={idx === 0}
                  className="p-2 rounded-lg border border-line text-muted hover:text-ink disabled:opacity-30 cursor-pointer"
                  title="Move up"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => moveFaq(idx, 1)}
                  disabled={idx === (draft.faqs || []).length - 1}
                  className="p-2 rounded-lg border border-line text-muted hover:text-ink disabled:opacity-30 cursor-pointer"
                  title="Move down"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => removeFaq(idx)}
                  className="p-2 rounded-lg border border-line text-muted hover:text-missed cursor-pointer"
                  title="Remove FAQ"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <textarea
                rows={2}
                value={faq.answer}
                onChange={(e) => updateFaq(idx, "answer", e.target.value)}
                placeholder="Clear, accurate answer"
                className="w-full px-3 py-2 rounded-lg bg-panel border border-line text-xs text-ink"
              />
            </div>
          ))}
        </div>
      </section>
    </form>
  );
}
