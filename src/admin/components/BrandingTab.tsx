import React, { useEffect, useState } from "react";
import { Image as ImageIcon, RotateCcw, Save, Upload } from "lucide-react";
import { compressImageFileToDataUrl } from "../../lib/image-upload";
import type { SiteContent } from "../../lib/types";
import { isSafeHref, isSafeImageSrc, sanitizeMultiline, sanitizeText } from "../../lib/validation";
import { saveSiteContent } from "../lib/api";

interface BrandingTabProps {
  siteContent: SiteContent;
  onRefresh: () => Promise<void>;
  onToast: (msg: string) => void;
}

export function BrandingTab({ siteContent, onRefresh, onToast }: BrandingTabProps) {
  const [draft, setDraft] = useState<SiteContent>(siteContent);
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setDraft(siteContent);
  }, [siteContent]);

  async function handleImageUpload(
    field: "logoUrl" | "heroDesktopImage" | "heroMobileImage",
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setUploadingField(field);
    try {
      const maxDim = field === "logoUrl" ? 700 : 1280;
      const maxBytes = field === "logoUrl" ? 160_000 : 240_000;
      const dataUrl = await compressImageFileToDataUrl(file, maxDim, maxBytes);
      setDraft((prev) => ({ ...prev, [field]: dataUrl }));
      onToast(
        field === "logoUrl"
          ? "Clinic logo ready. Click Save Branding & Hero to publish across all pages."
          : "Hero image ready. Click Save Branding & Hero to publish."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not process image.");
    } finally {
      setUploadingField(null);
      e.target.value = "";
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (
      (draft.heroCtaLink && !isSafeHref(draft.heroCtaLink)) ||
      (draft.heroSecondaryCtaLink && !isSafeHref(draft.heroSecondaryCtaLink))
    ) {
      setError("Hero CTA links must use https://, #, or a relative page path.");
      return;
    }
    if (
      (draft.logoUrl && !isSafeImageSrc(draft.logoUrl)) ||
      (draft.heroDesktopImage && !isSafeImageSrc(draft.heroDesktopImage)) ||
      (draft.heroMobileImage && !isSafeImageSrc(draft.heroMobileImage))
    ) {
      setError("Images must be uploaded files, assets/... paths, or https:// URLs.");
      return;
    }

    setSaving(true);
    try {
      await saveSiteContent({
        clinicName: sanitizeText(draft.clinicName, 160) || "Smile Masters & Jaw Joint Matters",
        tagline: sanitizeText(draft.tagline, 240),
        foundedYear: sanitizeText(draft.foundedYear, 20),
        logoUrl: (draft.logoUrl || "").trim(),
        logoAlt: sanitizeText(draft.logoAlt, 160) || sanitizeText(draft.clinicName, 160),
        heroEyebrow: sanitizeText(draft.heroEyebrow, 120),
        heroHeadline: sanitizeText(draft.heroHeadline, 240) || "Smile Masters & Jaw Joint Matters",
        heroMobileHeadline:
          sanitizeText(draft.heroMobileHeadline, 180) ||
          "Specialist TMJ & Dental Care in Bandra West",
        heroDescription: sanitizeMultiline(draft.heroDescription, 800),
        heroCtaText: sanitizeText(draft.heroCtaText, 80) || "Request Appointment",
        heroCtaLink: sanitizeText(draft.heroCtaLink, 300) || "#book-appointment",
        heroSecondaryCtaText: sanitizeText(draft.heroSecondaryCtaText, 80),
        heroSecondaryCtaLink: sanitizeText(draft.heroSecondaryCtaLink, 300),
        heroDesktopImage: (draft.heroDesktopImage || "").trim(),
        heroMobileImage: (draft.heroMobileImage || "").trim(),
      });
      await onRefresh();
      onToast("Logo, clinic branding, and hero content published live.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save branding settings.");
    } finally {
      setSaving(false);
    }
  }

  const previewLightLogo = draft.logoUrl?.trim() || "/assets/img/lumora-logo-dark.svg";
  const previewDarkLogo = draft.logoUrl?.trim() || "/assets/img/lumora-logo.svg";

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-ink">Logo, Branding &amp; Hero</h2>
          <p className="text-sm text-muted">
            Customize your clinic logo, brand identity, and desktop/mobile hero banners across the live site.
          </p>
        </div>
        <button
          type="submit"
          disabled={saving || Boolean(uploadingField)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-primary-foreground text-xs font-semibold hover:opacity-95 disabled:opacity-60 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving..." : "Save Branding & Hero"}
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-missed/15 border border-missed/30 px-4 py-3 text-xs text-missed">
          {error}
        </div>
      )}

      {/* Clinic Logo Card */}
      <section className="bg-panel border border-line rounded-2xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-ink">Clinic Logo (Navbar &amp; Footer)</h3>
            <p className="text-xs text-muted mt-0.5">
              Upload a PNG/JPG/WebP logo or paste an image URL. Leave blank to use the built-in Smile Masters adaptive SVG logo.
            </p>
          </div>
          {draft.logoUrl && (
            <button
              type="button"
              onClick={() => setDraft({ ...draft, logoUrl: "" })}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line text-xs text-muted hover:text-ink cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Use Default SVG Logo
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-line bg-white p-4 flex flex-col justify-between gap-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Light Header Preview
            </div>
            <div className="h-12 flex items-center">
              <img
                src={previewLightLogo}
                alt={draft.logoAlt || draft.clinicName}
                className="max-h-10 w-auto object-contain"
              />
            </div>
          </div>
          <div className="rounded-xl border border-line bg-[#011f23] p-4 flex flex-col justify-between gap-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-teal-300/80">
              Dark Footer Preview
            </div>
            <div className="h-12 flex items-center">
              <img
                src={previewDarkLogo}
                alt={draft.logoAlt || draft.clinicName}
                className="max-h-10 w-auto object-contain"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5 text-xs">
            <span className="text-muted block">Custom Logo Image URL or Upload</span>
            <div className="flex gap-2">
              <input
                type="text"
                value={draft.logoUrl || ""}
                onChange={(e) => setDraft({ ...draft, logoUrl: e.target.value })}
                placeholder="Default adaptive logo (or paste https:// / upload)"
                className="flex-1 px-3 py-2.5 rounded-xl bg-canvas border border-line text-xs text-ink"
              />
              <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-secondary border border-line text-xs font-medium text-ink hover:border-accent cursor-pointer shrink-0">
                <Upload className="w-3.5 h-3.5" />
                {uploadingField === "logoUrl" ? "Uploading..." : "Upload Logo"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload("logoUrl", e)}
                  className="hidden"
                />
              </label>
            </div>
          </div>
          <label className="space-y-1.5 text-xs">
            <span className="text-muted">Logo Alt Text (SEO &amp; Accessibility)</span>
            <input
              type="text"
              value={draft.logoAlt || ""}
              onChange={(e) => setDraft({ ...draft, logoAlt: e.target.value })}
              placeholder="Smile Masters & Jaw Joint Matters"
              className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-sm text-ink focus:outline-none focus:border-accent"
            />
          </label>
        </div>
      </section>

      {/* Clinic Identity */}
      <section className="bg-panel border border-line rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-ink">Clinic Identity</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="space-y-1.5 text-xs md:col-span-2">
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
            <span className="text-muted">Founded Year</span>
            <input
              type="text"
              value={draft.foundedYear}
              onChange={(e) => setDraft({ ...draft, foundedYear: e.target.value })}
              placeholder="2006"
              className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-sm text-ink focus:outline-none focus:border-accent"
            />
          </label>
          <label className="space-y-1.5 text-xs md:col-span-3">
            <span className="text-muted">Clinic Tagline</span>
            <input
              type="text"
              value={draft.tagline}
              onChange={(e) => setDraft({ ...draft, tagline: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-sm text-ink focus:outline-none focus:border-accent"
            />
          </label>
        </div>
      </section>

      {/* Desktop & Mobile Hero */}
      <section className="bg-panel border border-line rounded-2xl p-6 space-y-5">
        <h3 className="text-sm font-semibold text-ink">Homepage Hero (Desktop &amp; Mobile)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="space-y-1.5 text-xs">
            <span className="text-muted">Hero Eyebrow Badge</span>
            <input
              type="text"
              value={draft.heroEyebrow}
              onChange={(e) => setDraft({ ...draft, heroEyebrow: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-sm text-ink focus:outline-none focus:border-accent"
            />
          </label>
          <label className="space-y-1.5 text-xs">
            <span className="text-muted">Primary Button Label *</span>
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
              rows={3}
              required
              value={draft.heroDescription}
              onChange={(e) => setDraft({ ...draft, heroDescription: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-sm text-ink focus:outline-none focus:border-accent"
            />
          </label>
          <label className="space-y-1.5 text-xs">
            <span className="text-muted">Primary Button Link</span>
            <input
              type="text"
              value={draft.heroCtaLink}
              onChange={(e) => setDraft({ ...draft, heroCtaLink: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-xs text-ink"
            />
          </label>
          <label className="space-y-1.5 text-xs">
            <span className="text-muted">Secondary Button Label &amp; Link</span>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={draft.heroSecondaryCtaText}
                onChange={(e) => setDraft({ ...draft, heroSecondaryCtaText: e.target.value })}
                placeholder="Explore Treatments"
                className="px-3 py-2.5 rounded-xl bg-canvas border border-line text-xs text-ink"
              />
              <input
                type="text"
                value={draft.heroSecondaryCtaLink}
                onChange={(e) => setDraft({ ...draft, heroSecondaryCtaLink: e.target.value })}
                placeholder="service.html"
                className="px-3 py-2.5 rounded-xl bg-canvas border border-line text-xs text-ink"
              />
            </div>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
          {/* Desktop Hero Image */}
          <div className="rounded-xl border border-line bg-canvas/70 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-ink">Desktop Hero Photo</span>
              <ImageIcon className="w-4 h-4 text-muted" />
            </div>
            {draft.heroDesktopImage && (
              <div className="rounded-lg overflow-hidden border border-line aspect-[16/9] bg-black/20">
                <img
                  src={
                    draft.heroDesktopImage.startsWith("assets/")
                      ? `/${draft.heroDesktopImage}`
                      : draft.heroDesktopImage
                  }
                  alt="Desktop hero preview"
                  className="w-full h-full object-cover object-top"
                />
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={draft.heroDesktopImage}
                onChange={(e) => setDraft({ ...draft, heroDesktopImage: e.target.value })}
                className="flex-1 px-3 py-2 rounded-xl bg-panel border border-line text-xs text-ink"
              />
              <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary border border-line text-xs font-medium text-ink hover:border-accent cursor-pointer shrink-0">
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

          {/* Mobile Hero Image */}
          <div className="rounded-xl border border-line bg-canvas/70 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-ink">Mobile Hero Photo</span>
              <ImageIcon className="w-4 h-4 text-muted" />
            </div>
            {draft.heroMobileImage && (
              <div className="rounded-lg overflow-hidden border border-line aspect-[16/9] bg-black/20">
                <img
                  src={
                    draft.heroMobileImage.startsWith("assets/")
                      ? `/${draft.heroMobileImage}`
                      : draft.heroMobileImage
                  }
                  alt="Mobile hero preview"
                  className="w-full h-full object-cover object-top"
                />
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={draft.heroMobileImage}
                onChange={(e) => setDraft({ ...draft, heroMobileImage: e.target.value })}
                className="flex-1 px-3 py-2 rounded-xl bg-panel border border-line text-xs text-ink"
              />
              <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary border border-line text-xs font-medium text-ink hover:border-accent cursor-pointer shrink-0">
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
    </form>
  );
}
