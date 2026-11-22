import React, { useEffect, useState } from "react";
import { Plus, Save, Trash2, Upload } from "lucide-react";
import { compressImageFileToDataUrl } from "../../lib/image-upload";
import type { FaqItem, SiteContent } from "../../lib/types";
import { isSafeHref, isSafeImageSrc, sanitizeMultiline, sanitizeText } from "../../lib/validation";
import { saveSiteContent } from "../lib/api";

interface ContentTabProps {
  siteContent: SiteContent;
  onRefresh: () => Promise<void>;
  onToast: (msg: string) => void;
}

export function ContentTab({ siteContent, onRefresh, onToast }: ContentTabProps) {
  const [draft, setDraft] = useState<SiteContent>(siteContent);
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setDraft(siteContent);
  }, [siteContent]);

  async function handleImageUpload(
    field: "heroDesktopImage" | "heroMobileImage",
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setUploadingField(field);
    try {
      const dataUrl = await compressImageFileToDataUrl(file, 1200, 220_000);
      setDraft((prev) => ({ ...prev, [field]: dataUrl }));
      onToast("Hero image compressed. Click Save Website Content to publish.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not process image.");
    } finally {
      setUploadingField(null);
      e.target.value = "";
    }
  }

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
      draft.heroCtaLink,
      draft.heroSecondaryCtaLink,
      draft.socialInstagram,
      draft.socialFacebook,
      draft.socialYoutube,
      draft.socialLinkedin,
    ];
    if (urlsToCheck.some((u) => u && !isSafeHref(u))) {
      setError("One of the link URLs uses an unsupported protocol. Use https://, #, or relative links.");
      return;
    }
    if (
      (draft.heroDesktopImage && !isSafeImageSrc(draft.heroDesktopImage)) ||
      (draft.heroMobileImage && !isSafeImageSrc(draft.heroMobileImage))
    ) {
      setError("Hero images must be uploaded files, assets/... paths, or https:// URLs.");
      return;
    }

    const cleanFaqs = (draft.faqs || [])
      .map((f) => ({
        question: sanitizeText(f.question, 240),
        answer: sanitizeMultiline(f.answer, 1200),
      }))
      .filter((f) => f.question && f.answer)
      .slice(0, 30);

    const payload: Partial<SiteContent> = {
      clinicName: sanitizeText(draft.clinicName, 160) || "Smile Masters & Jaw Joint Matters",
      tagline: sanitizeText(draft.tagline, 240),
      foundedYear: sanitizeText(draft.foundedYear, 20),
      phone: sanitizeText(draft.phone, 40) || "+91 77389 68210",
      email: sanitizeText(draft.email, 160) || "info@smilemastersindia.com",
      address: sanitizeText(draft.address, 400) || "Zeba Apartments, 3rd Floor, Hill Road, Bandra West, Mumbai, Maharashtra 400050",
      city: sanitizeText(draft.city, 120),
      openingHours: sanitizeText(draft.openingHours, 300),
      heroEyebrow: sanitizeText(draft.heroEyebrow, 120),
      heroHeadline: sanitizeText(draft.heroHeadline, 240) || "Smile Masters & Jaw Joint Matters",
      heroMobileHeadline: sanitizeText(draft.heroMobileHeadline, 180) || "Specialist TMJ & Dental Care in Bandra West",
      heroDescription: sanitizeMultiline(draft.heroDescription, 800) || "Specialist TMJ and dental care in Bandra West, Mumbai.",
      heroCtaText: sanitizeText(draft.heroCtaText, 80) || "Request Appointment",
      heroCtaLink: sanitizeText(draft.heroCtaLink, 300) || "#book-appointment",
      heroSecondaryCtaText: sanitizeText(draft.heroSecondaryCtaText, 80),
      heroSecondaryCtaLink: sanitizeText(draft.heroSecondaryCtaLink, 300),
      heroDesktopImage: draft.heroDesktopImage.trim(),
      heroMobileImage: draft.heroMobileImage.trim(),
      aboutEyebrow: sanitizeText(draft.aboutEyebrow, 120),
      aboutHeadline: sanitizeText(draft.aboutHeadline, 240),
      aboutDescription: sanitizeMultiline(draft.aboutDescription, 2000),
      doctorsSectionTitle: sanitizeText(draft.doctorsSectionTitle, 200),
      doctorsSectionSubtitle: sanitizeText(draft.doctorsSectionSubtitle, 500),
      treatmentsSectionTitle: sanitizeText(draft.treatmentsSectionTitle, 200),
      treatmentsSectionSubtitle: sanitizeText(draft.treatmentsSectionSubtitle, 500),
      bookingNotice: sanitizeText(draft.bookingNotice, 500),
      footerDescription: sanitizeText(draft.footerDescription, 600),
      socialInstagram: sanitizeText(draft.socialInstagram, 300),
      socialFacebook: sanitizeText(draft.socialFacebook, 300),
      socialYoutube: sanitizeText(draft.socialYoutube, 300),
      socialLinkedin: sanitizeText(draft.socialLinkedin, 300),
      notificationEmail: sanitizeText(draft.notificationEmail, 160),
      notifyOnNewLead: Boolean(draft.notifyOnNewLead),
      notifyOnNewAppointment: Boolean(draft.notifyOnNewAppointment),
      faqs: cleanFaqs,
    };

    setSaving(true);
    try {
      await saveSiteContent(payload);
      await onRefresh();
      onToast("Website content saved and published live to the public site.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save site content.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-ink">Website Content, Hero &amp; Settings</h2>
          <p className="text-sm text-muted">
            Changes saved here immediately update the live Smile Masters public pages.
          </p>
        </div>
        <button
          type="submit"
          disabled={saving || Boolean(uploadingField)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-primary-foreground text-xs font-semibold hover:opacity-95 disabled:opacity-60 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving..." : "Save Website Content"}
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-missed/15 border border-missed/30 px-4 py-3 text-xs text-missed">
          {error}
        </div>
      )}

      <section className="bg-panel border border-line rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-ink">Clinic Contact &amp; Hours</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="space-y-1.5 text-xs">
            <span className="text-muted">Clinic Name *</span>
            <input
              type="text"
              required
              value={draft.clinicName}
              onChange={(e) => setDraft({ ...draft, clinicName: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-sm text-ink focus:outline-none focus:border-accent"
            />
          </label>
          <label className="space-y-1.5 text-xs">
            <span className="text-muted">Phone *</span>
            <input
              type="text"
              required
              value={draft.phone}
              onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-sm text-ink focus:outline-none focus:border-accent"
            />
          </label>
          <label className="space-y-1.5 text-xs">
            <span className="text-muted">Email *</span>
            <input
              type="email"
              required
              value={draft.email}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-sm text-ink focus:outline-none focus:border-accent"
            />
          </label>
          <label className="space-y-1.5 text-xs">
            <span className="text-muted">Opening Hours</span>
            <input
              type="text"
              value={draft.openingHours}
              onChange={(e) => setDraft({ ...draft, openingHours: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-sm text-ink focus:outline-none focus:border-accent"
            />
          </label>
          <label className="space-y-1.5 text-xs md:col-span-2">
            <span className="text-muted">Clinic Address *</span>
            <input
              type="text"
              required
              value={draft.address}
              onChange={(e) => setDraft({ ...draft, address: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-sm text-ink focus:outline-none focus:border-accent"
            />
          </label>
        </div>
      </section>

      <section className="bg-panel border border-line rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-ink">Desktop &amp; Mobile Hero Sections</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="space-y-1.5 text-xs">
            <span className="text-muted">Hero Eyebrow</span>
            <input
              type="text"
              value={draft.heroEyebrow}
              onChange={(e) => setDraft({ ...draft, heroEyebrow: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-sm text-ink focus:outline-none focus:border-accent"
            />
          </label>
          <label className="space-y-1.5 text-xs">
            <span className="text-muted">Primary CTA Label *</span>
            <input
              type="text"
              required
              value={draft.heroCtaText}
              onChange={(e) => setDraft({ ...draft, heroCtaText: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-sm text-ink focus:outline-none focus:border-accent"
            />
          </label>
          <label className="space-y-1.5 text-xs">
            <span className="text-muted">Desktop Hero Headline *</span>
            <input
              type="text"
              required
              value={draft.heroHeadline}
              onChange={(e) => setDraft({ ...draft, heroHeadline: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-sm text-ink focus:outline-none focus:border-accent"
            />
          </label>
          <label className="space-y-1.5 text-xs">
            <span className="text-muted">Mobile Hero Headline *</span>
            <input
              type="text"
              required
              value={draft.heroMobileHeadline}
              onChange={(e) => setDraft({ ...draft, heroMobileHeadline: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-sm text-ink focus:outline-none focus:border-accent"
            />
          </label>
          <label className="space-y-1.5 text-xs md:col-span-2">
            <span className="text-muted">Hero Description *</span>
            <textarea
              rows={2}
              required
              value={draft.heroDescription}
              onChange={(e) => setDraft({ ...draft, heroDescription: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-sm text-ink focus:outline-none focus:border-accent"
            />
          </label>

          <div className="space-y-1.5 text-xs">
            <span className="text-muted block">Desktop Hero Image</span>
            <div className="flex gap-2">
              <input
                type="text"
                value={draft.heroDesktopImage}
                onChange={(e) => setDraft({ ...draft, heroDesktopImage: e.target.value })}
                className="flex-1 px-3 py-2 rounded-xl bg-canvas border border-line text-xs text-ink"
              />
              <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary border border-line text-xs text-ink cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                {uploadingField === "heroDesktopImage" ? "..." : "Upload"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload("heroDesktopImage", e)}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="space-y-1.5 text-xs">
            <span className="text-muted block">Mobile Hero Image</span>
            <div className="flex gap-2">
              <input
                type="text"
                value={draft.heroMobileImage}
                onChange={(e) => setDraft({ ...draft, heroMobileImage: e.target.value })}
                className="flex-1 px-3 py-2 rounded-xl bg-canvas border border-line text-xs text-ink"
              />
              <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary border border-line text-xs text-ink cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                {uploadingField === "heroMobileImage" ? "..." : "Upload"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload("heroMobileImage", e)}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-panel border border-line rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-ink">About, Booking Notice &amp; Social Links</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="space-y-1.5 text-xs md:col-span-2">
            <span className="text-muted">About Page Headline</span>
            <input
              type="text"
              value={draft.aboutHeadline}
              onChange={(e) => setDraft({ ...draft, aboutHeadline: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-sm text-ink focus:outline-none focus:border-accent"
            />
          </label>
          <label className="space-y-1.5 text-xs md:col-span-2">
            <span className="text-muted">About Clinic Description</span>
            <textarea
              rows={3}
              value={draft.aboutDescription}
              onChange={(e) => setDraft({ ...draft, aboutDescription: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-sm text-ink focus:outline-none focus:border-accent"
            />
          </label>
          <label className="space-y-1.5 text-xs md:col-span-2">
            <span className="text-muted">Booking Confirmation Notice</span>
            <input
              type="text"
              value={draft.bookingNotice}
              onChange={(e) => setDraft({ ...draft, bookingNotice: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-sm text-ink focus:outline-none focus:border-accent"
            />
          </label>
          <label className="space-y-1.5 text-xs md:col-span-2">
            <span className="text-muted">Footer Description</span>
            <input
              type="text"
              value={draft.footerDescription}
              onChange={(e) => setDraft({ ...draft, footerDescription: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-sm text-ink focus:outline-none focus:border-accent"
            />
          </label>
          <label className="space-y-1.5 text-xs">
            <span className="text-muted">Instagram URL (optional)</span>
            <input
              type="url"
              value={draft.socialInstagram}
              onChange={(e) => setDraft({ ...draft, socialInstagram: e.target.value })}
              placeholder="https://instagram.com/..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-xs text-ink"
            />
          </label>
          <label className="space-y-1.5 text-xs">
            <span className="text-muted">Facebook URL (optional)</span>
            <input
              type="url"
              value={draft.socialFacebook}
              onChange={(e) => setDraft({ ...draft, socialFacebook: e.target.value })}
              placeholder="https://facebook.com/..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-xs text-ink"
            />
          </label>
          <label className="space-y-1.5 text-xs">
            <span className="text-muted">YouTube URL (optional)</span>
            <input
              type="url"
              value={draft.socialYoutube}
              onChange={(e) => setDraft({ ...draft, socialYoutube: e.target.value })}
              placeholder="https://youtube.com/..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-xs text-ink"
            />
          </label>
          <label className="space-y-1.5 text-xs">
            <span className="text-muted">LinkedIn URL (optional)</span>
            <input
              type="url"
              value={draft.socialLinkedin}
              onChange={(e) => setDraft({ ...draft, socialLinkedin: e.target.value })}
              placeholder="https://linkedin.com/..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-xs text-ink"
            />
          </label>
        </div>
      </section>

      <section className="bg-panel border border-line rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-ink">Homepage FAQs</h3>
            <p className="text-xs text-muted">Rendered dynamically on the public homepage FAQ accordion.</p>
          </div>
          <button
            type="button"
            onClick={addFaq}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary border border-line text-xs font-medium text-ink hover:border-accent cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add FAQ
          </button>
        </div>
        <div className="space-y-3">
          {(draft.faqs || []).map((faq, idx) => (
            <div key={idx} className="rounded-xl bg-canvas/80 border border-line p-4 space-y-2.5">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={faq.question}
                  onChange={(e) => updateFaq(idx, "question", e.target.value)}
                  placeholder="Question"
                  className="flex-1 px-3 py-2 rounded-lg bg-panel border border-line text-xs font-medium text-ink"
                />
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
