import React, { useEffect, useState } from "react";
import { Save } from "lucide-react";
import type { SiteContent } from "../../lib/types";
import { sanitizeMultiline, sanitizeText } from "../../lib/validation";
import { saveSiteContent } from "../lib/api";

interface AboutTabProps {
  siteContent: SiteContent;
  onRefresh: () => Promise<void>;
  onToast: (msg: string) => void;
}

export function AboutTab({ siteContent, onRefresh, onToast }: AboutTabProps) {
  const [draft, setDraft] = useState<SiteContent>(siteContent);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setDraft(siteContent);
  }, [siteContent]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await saveSiteContent({
        aboutEyebrow: sanitizeText(draft.aboutEyebrow, 120),
        aboutHeadline: sanitizeText(draft.aboutHeadline, 240),
        aboutDescription: sanitizeMultiline(draft.aboutDescription, 2000),
        doctorsSectionTitle: sanitizeText(draft.doctorsSectionTitle, 200),
        doctorsSectionSubtitle: sanitizeText(draft.doctorsSectionSubtitle, 500),
        treatmentsSectionTitle: sanitizeText(draft.treatmentsSectionTitle, 200),
        treatmentsSectionSubtitle: sanitizeText(draft.treatmentsSectionSubtitle, 500),
        footerDescription: sanitizeText(draft.footerDescription, 600),
      });
      await onRefresh();
      onToast("About page, section headings, and footer copy published live.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save About page content.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-ink">About Page &amp; Section Copy</h2>
          <p className="text-sm text-muted">
            Edit your clinic story, doctors &amp; treatments section headings, and website footer description.
          </p>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-primary-foreground text-xs font-semibold hover:opacity-95 disabled:opacity-60 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving..." : "Save About & Sections"}
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-missed/15 border border-missed/30 px-4 py-3 text-xs text-missed">
          {error}
        </div>
      )}

      <section className="bg-panel border border-line rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-ink">About Clinic Story</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="space-y-1.5 text-xs">
            <span className="text-muted">About Section Eyebrow</span>
            <input
              type="text"
              value={draft.aboutEyebrow}
              onChange={(e) => setDraft({ ...draft, aboutEyebrow: e.target.value })}
              placeholder="About Smile Masters"
              className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-sm text-ink focus:outline-none focus:border-accent"
            />
          </label>
          <label className="space-y-1.5 text-xs">
            <span className="text-muted">About Page Headline *</span>
            <input
              type="text"
              required
              value={draft.aboutHeadline}
              onChange={(e) => setDraft({ ...draft, aboutHeadline: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-sm text-ink focus:outline-none focus:border-accent"
            />
          </label>
          <label className="space-y-1.5 text-xs md:col-span-2">
            <span className="text-muted">Full Clinic Story / Description *</span>
            <textarea
              rows={5}
              required
              value={draft.aboutDescription}
              onChange={(e) => setDraft({ ...draft, aboutDescription: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-sm text-ink leading-relaxed focus:outline-none focus:border-accent"
            />
          </label>
        </div>
      </section>

      <section className="bg-panel border border-line rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-ink">Doctors &amp; Treatments Section Headings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="space-y-1.5 text-xs">
            <span className="text-muted">Doctors Section Title</span>
            <input
              type="text"
              value={draft.doctorsSectionTitle}
              onChange={(e) => setDraft({ ...draft, doctorsSectionTitle: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-sm text-ink focus:outline-none focus:border-accent"
            />
          </label>
          <label className="space-y-1.5 text-xs">
            <span className="text-muted">Treatments Section Title</span>
            <input
              type="text"
              value={draft.treatmentsSectionTitle}
              onChange={(e) => setDraft({ ...draft, treatmentsSectionTitle: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-sm text-ink focus:outline-none focus:border-accent"
            />
          </label>
          <label className="space-y-1.5 text-xs">
            <span className="text-muted">Doctors Section Subtitle</span>
            <textarea
              rows={3}
              value={draft.doctorsSectionSubtitle}
              onChange={(e) => setDraft({ ...draft, doctorsSectionSubtitle: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-sm text-ink focus:outline-none focus:border-accent"
            />
          </label>
          <label className="space-y-1.5 text-xs">
            <span className="text-muted">Treatments Section Subtitle</span>
            <textarea
              rows={3}
              value={draft.treatmentsSectionSubtitle}
              onChange={(e) => setDraft({ ...draft, treatmentsSectionSubtitle: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-sm text-ink focus:outline-none focus:border-accent"
            />
          </label>
        </div>
      </section>

      <section className="bg-panel border border-line rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-ink">Website Footer Copy</h3>
        <label className="space-y-1.5 text-xs block">
          <span className="text-muted">Footer About Paragraph (shown on Home, About, Treatments &amp; Guides)</span>
          <textarea
            rows={3}
            value={draft.footerDescription}
            onChange={(e) => setDraft({ ...draft, footerDescription: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-sm text-ink focus:outline-none focus:border-accent"
          />
        </label>
      </section>
    </form>
  );
}
