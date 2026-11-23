import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Pencil,
  Plus,
  Save,
  ShieldCheck,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { compressImageFileToDataUrl } from "../../lib/image-upload";
import type { CaseGalleryItem, SiteContent, Testimonial } from "../../lib/types";
import {
  generateSafeId,
  isSafeHref,
  isSafeImageSrc,
  reorderItems,
  sanitizeMultiline,
  sanitizeText,
} from "../../lib/validation";
import {
  createTestimonial,
  deleteTestimonial,
  reorderTestimonials,
  saveSiteContent,
  updateTestimonial,
} from "../lib/api";

interface TestimonialsTabProps {
  testimonials: Testimonial[];
  siteContent: SiteContent;
  onRefresh: () => Promise<void>;
  onToast: (msg: string) => void;
}

interface TestimonialFormState {
  id: string | null;
  reviewerName: string;
  reviewerContext: string;
  source: string;
  rating: number;
  quote: string;
  imageUrl: string;
  consentConfirmed: boolean;
  published: boolean;
}

const EMPTY_FORM: TestimonialFormState = {
  id: null,
  reviewerName: "",
  reviewerContext: "",
  source: "Google Review",
  rating: 5,
  quote: "",
  imageUrl: "",
  consentConfirmed: true,
  published: true,
};

function previewSrc(src?: string) {
  if (!src) return "";
  return src.startsWith("assets/") ? `/${src}` : src;
}

export function TestimonialsTab({
  testimonials,
  siteContent,
  onRefresh,
  onToast,
}: TestimonialsTabProps) {
  const sorted = useMemo(
    () => [...testimonials].sort((a, b) => a.sortOrder - b.sortOrder),
    [testimonials]
  );

  const [editing, setEditing] = useState<TestimonialFormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingReviewImg, setUploadingReviewImg] = useState(false);
  const [error, setError] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Gallery & section metadata editor state
  const [gallery, setGallery] = useState<CaseGalleryItem[]>(siteContent.caseGalleryImages || []);
  const [sectionEyebrow, setSectionEyebrow] = useState(siteContent.testimonialsSectionEyebrow || "");
  const [sectionTitle, setSectionTitle] = useState(siteContent.testimonialsSectionTitle || "");
  const [sectionNote, setSectionNote] = useState(siteContent.testimonialsSectionNote || "");
  const [googleMapsUrl, setGoogleMapsUrl] = useState(siteContent.googleMapsUrl || "");
  const [savingGallery, setSavingGallery] = useState(false);
  const [uploadingCaseId, setUploadingCaseId] = useState<string | null>(null);

  useEffect(() => {
    setGallery(siteContent.caseGalleryImages || []);
    setSectionEyebrow(siteContent.testimonialsSectionEyebrow || "");
    setSectionTitle(siteContent.testimonialsSectionTitle || "");
    setSectionNote(siteContent.testimonialsSectionNote || "");
    setGoogleMapsUrl(siteContent.googleMapsUrl || "");
  }, [siteContent]);

  function openNew() {
    setError("");
    setEditing({ ...EMPTY_FORM });
  }

  function openEdit(item: Testimonial) {
    setError("");
    setEditing({
      id: item.id,
      reviewerName: item.reviewerName,
      reviewerContext: item.reviewerContext || "",
      source: item.source || "Google Review",
      rating: item.rating ?? 5,
      quote: item.quote || "",
      imageUrl: item.imageUrl || "",
      consentConfirmed: item.consentConfirmed,
      published: item.published,
    });
  }

  async function handleReviewImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editing) return;
    setError("");
    setUploadingReviewImg(true);
    try {
      const dataUrl = await compressImageFileToDataUrl(file, 1100, 220_000);
      setEditing((prev) => (prev ? { ...prev, imageUrl: dataUrl } : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not process review image.");
    } finally {
      setUploadingReviewImg(false);
      e.target.value = "";
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setError("");

    const reviewerName = sanitizeText(editing.reviewerName, 120);
    const quote = sanitizeMultiline(editing.quote, 1500);
    const imageUrl = editing.imageUrl.trim();
    if (!reviewerName) {
      setError("Please enter the patient's name or review title.");
      return;
    }
    if (quote.length < 5 && !imageUrl) {
      setError("Please enter a review quote (at least 5 characters) or upload a review screenshot.");
      return;
    }
    if (imageUrl && !isSafeImageSrc(imageUrl)) {
      setError("Review image must be an uploaded file, assets/... path, or https:// URL.");
      return;
    }
    if (editing.published && !editing.consentConfirmed) {
      setError("Please confirm consent before publishing this review live.");
      return;
    }

    const payload: Partial<Testimonial> = {
      reviewerName,
      reviewerContext: sanitizeText(editing.reviewerContext, 160),
      source: sanitizeText(editing.source, 80) || "Verified Patient",
      rating: editing.rating,
      quote,
      imageUrl,
      consentConfirmed: editing.consentConfirmed,
      published: editing.consentConfirmed ? editing.published : false,
    };

    setSaving(true);
    try {
      if (editing.id) {
        await updateTestimonial(editing.id, payload);
        onToast("Testimonial updated and synced live.");
      } else {
        await createTestimonial(payload);
        onToast("New testimonial added and published.");
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
      onToast("Edit this review to confirm consent before publishing.");
      return;
    }
    try {
      await updateTestimonial(item.id, { published: !item.published });
      await onRefresh();
      onToast(`Review ${!item.published ? "published live" : "hidden from site"}.`);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Could not update review.");
    }
  }

  async function handleReorder(id: string, direction: "up" | "down") {
    const next = reorderItems(sorted, id, direction);
    try {
      await reorderTestimonials(next.map((t) => t.id));
      await onRefresh();
      onToast("Testimonials order updated.");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Could not reorder testimonials.");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteTestimonial(id);
      setConfirmDeleteId(null);
      await onRefresh();
      onToast("Review deleted.");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Could not delete review.");
    }
  }

  // ---- Transformation Gallery helpers ----
  async function handleCaseUpload(id: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCaseId(id);
    try {
      const dataUrl = await compressImageFileToDataUrl(file, 900, 180_000);
      setGallery((prev) => prev.map((g) => (g.id === id ? { ...g, imageUrl: dataUrl } : g)));
      onToast("Photo ready. Click Save Gallery & Section Settings to publish.");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Could not process photo.");
    } finally {
      setUploadingCaseId(null);
      e.target.value = "";
    }
  }

  async function handleAddNewGalleryPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCaseId("new");
    try {
      const dataUrl = await compressImageFileToDataUrl(file, 900, 180_000);
      setGallery((prev) => [
        ...prev,
        {
          id: generateSafeId("case"),
          imageUrl: dataUrl,
          caption: `Smile Masters patient transformation ${prev.length + 1}`,
        },
      ]);
      onToast("Photo added to gallery. Click Save Gallery & Section Settings to publish.");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Could not upload photo.");
    } finally {
      setUploadingCaseId(null);
      e.target.value = "";
    }
  }

  function moveGallery(idx: number, dir: -1 | 1) {
    setGallery((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  function removeGallery(id: string) {
    setGallery((prev) => prev.filter((g) => g.id !== id));
  }

  async function handleSaveGalleryAndMeta(e: React.FormEvent) {
    e.preventDefault();
    if (googleMapsUrl && !isSafeHref(googleMapsUrl)) {
      onToast("Google Reviews link must be a valid https:// URL.");
      return;
    }
    setSavingGallery(true);
    try {
      await saveSiteContent({
        testimonialsSectionEyebrow: sanitizeText(sectionEyebrow, 120),
        testimonialsSectionTitle: sanitizeText(sectionTitle, 200),
        testimonialsSectionNote: sanitizeText(sectionNote, 300),
        googleMapsUrl: sanitizeText(googleMapsUrl, 400),
        caseGalleryImages: gallery.map((g, i) => ({
          id: g.id || `case-${i + 1}`,
          imageUrl: g.imageUrl.trim(),
          caption: sanitizeText(g.caption, 180) || `Smile transformation ${i + 1}`,
        })),
      });
      await onRefresh();
      onToast("Testimonials heading and smile transformation gallery published live.");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Could not save gallery changes.");
    } finally {
      setSavingGallery(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* SECTION 1: Patient Reviews & Testimonials */}
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-ink">
              Patient Testimonials &amp; Verified Reviews ({sorted.length})
            </h2>
            <p className="text-sm text-muted">
              Edit existing clinic Google reviews, replace screenshots, add written patient stories, or hide/reorder anytime.
            </p>
          </div>
          <button
            type="button"
            onClick={openNew}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-primary-foreground text-xs font-semibold hover:opacity-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Testimonial / Review
          </button>
        </div>

        {editing && (
          <form
            onSubmit={handleSave}
            className="bg-panel border border-accent/40 rounded-2xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-ink">
                {editing.id ? "Edit Testimonial / Review" : "Add New Patient Testimonial"}
              </h3>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="p-1.5 text-muted hover:text-ink cursor-pointer"
              >
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
                <span className="text-muted">Patient Name or Review Title *</span>
                <input
                  type="text"
                  required
                  value={editing.reviewerName}
                  onChange={(e) => setEditing({ ...editing, reviewerName: e.target.value })}
                  placeholder="e.g. Priya S. or Verified Google Review"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-sm text-ink"
                />
              </label>
              <label className="space-y-1.5 text-xs">
                <span className="text-muted">Treatment / Visit Context</span>
                <input
                  type="text"
                  value={editing.reviewerContext}
                  onChange={(e) => setEditing({ ...editing, reviewerContext: e.target.value })}
                  placeholder="e.g. TMJ Care · Bandra West"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-sm text-ink"
                />
              </label>
              <label className="space-y-1.5 text-xs">
                <span className="text-muted">Review Source</span>
                <select
                  value={editing.source}
                  onChange={(e) => setEditing({ ...editing, source: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-sm text-ink"
                >
                  <option value="Google Review">Google Review</option>
                  <option value="Verified Patient">Verified Patient</option>
                  <option value="Online TMJ Patient">Online TMJ Patient</option>
                  <option value="WhatsApp Feedback">WhatsApp Feedback</option>
                </select>
              </label>
              <div className="space-y-1.5 text-xs">
                <span className="text-muted block">Star Rating</span>
                <div className="flex items-center gap-1.5 h-[42px]">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setEditing({ ...editing, rating: star })}
                      className="p-1.5 rounded-lg border border-line bg-canvas hover:border-accent cursor-pointer"
                      aria-label={`${star} stars`}
                    >
                      <Star
                        className={`w-4 h-4 ${
                          star <= editing.rating
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted/40"
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs text-muted ml-2">{editing.rating} / 5</span>
                </div>
              </div>

              <label className="space-y-1.5 text-xs md:col-span-2">
                <span className="text-muted">
                  Patient Review Text (required unless a review screenshot image is uploaded below)
                </span>
                <textarea
                  rows={3}
                  value={editing.quote}
                  onChange={(e) => setEditing({ ...editing, quote: e.target.value })}
                  placeholder="Write or paste the patient's review verbatim..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-sm text-ink"
                />
              </label>

              <div className="space-y-2 text-xs md:col-span-2">
                <span className="text-muted block">
                  Optional Review Screenshot or Patient Smile Photo
                </span>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="text"
                    value={editing.imageUrl}
                    onChange={(e) => setEditing({ ...editing, imageUrl: e.target.value })}
                    placeholder="Optional image URL or upload screenshot..."
                    className="flex-1 min-w-[220px] px-3 py-2 rounded-xl bg-canvas border border-line text-xs text-ink"
                  />
                  <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-secondary border border-line text-xs font-medium text-ink hover:border-accent cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    {uploadingReviewImg ? "Uploading..." : "Upload Image"}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleReviewImageUpload}
                      className="hidden"
                    />
                  </label>
                  {editing.imageUrl && (
                    <button
                      type="button"
                      onClick={() => setEditing({ ...editing, imageUrl: "" })}
                      className="px-3 py-2 rounded-xl border border-line text-xs text-muted hover:text-missed cursor-pointer"
                    >
                      Remove Image
                    </button>
                  )}
                </div>
                {editing.imageUrl && (
                  <div className="mt-2 max-w-md rounded-xl overflow-hidden border border-line bg-white p-2">
                    <img
                      src={previewSrc(editing.imageUrl)}
                      alt="Review preview"
                      className="w-full h-auto max-h-48 object-contain rounded"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2 pt-1">
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
                <span>Patient / public Google review consent confirmed for website display</span>
              </label>
              <label className="flex items-center gap-2.5 text-xs text-ink cursor-pointer">
                <input
                  type="checkbox"
                  checked={editing.published}
                  disabled={!editing.consentConfirmed}
                  onChange={(e) => setEditing({ ...editing, published: e.target.checked })}
                  className="accent-accent w-4 h-4 disabled:opacity-40"
                />
                <span>Show live on the public website</span>
              </label>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={saving || uploadingReviewImg}
                className="px-5 py-2.5 rounded-xl bg-accent text-primary-foreground text-xs font-semibold cursor-pointer disabled:opacity-60"
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
            No reviews currently listed. Click <strong>Add Testimonial / Review</strong> to publish one.
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((item, idx) => (
              <div
                key={item.id}
                className="bg-panel border border-line rounded-2xl p-5 flex flex-col md:flex-row justify-between gap-4"
              >
                <div className="flex flex-col sm:flex-row gap-4 min-w-0 flex-1">
                  {item.imageUrl && (
                    <div className="w-full sm:w-44 shrink-0 rounded-xl overflow-hidden border border-line bg-white p-1.5 self-start">
                      <img
                        src={previewSrc(item.imageUrl)}
                        alt={item.reviewerName}
                        className="w-full h-auto max-h-28 object-contain"
                      />
                    </div>
                  )}
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-ink">{item.reviewerName}</span>
                      {item.reviewerContext && (
                        <span className="text-xs text-muted">· {item.reviewerContext}</span>
                      )}
                      {item.source && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-secondary border border-line text-muted">
                          {item.source}
                        </span>
                      )}
                      {item.consentConfirmed && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-booked/15 text-booked">
                          <ShieldCheck className="w-3 h-3" /> Verified
                        </span>
                      )}
                      {!item.published && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/15 text-amber-300">
                          Hidden
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: item.rating ?? 5 }).map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    {item.quote ? (
                      <p className="text-xs text-ink/90 leading-relaxed">“{item.quote}”</p>
                    ) : (
                      <p className="text-xs text-muted italic">
                        Image-based verified review card (click Edit to replace image or add caption text).
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 self-start">
                  <button
                    type="button"
                    onClick={() => handleReorder(item.id, "up")}
                    disabled={idx === 0}
                    className="p-2 rounded-xl border border-line text-muted hover:text-ink disabled:opacity-30 cursor-pointer"
                    title="Move up"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReorder(item.id, "down")}
                    disabled={idx === sorted.length - 1}
                    className="p-2 rounded-xl border border-line text-muted hover:text-ink disabled:opacity-30 cursor-pointer"
                    title="Move down"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => togglePublish(item)}
                    className="p-2 rounded-xl border border-line text-muted hover:text-ink cursor-pointer"
                    title={item.published ? "Hide from site" : "Publish live"}
                  >
                    {item.published ? (
                      <Eye className="w-4 h-4 text-booked" />
                    ) : (
                      <EyeOff className="w-4 h-4" />
                    )}
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

      {/* SECTION 2: Existing Smile Transformation Photo Gallery + Section Headings */}
      <form
        onSubmit={handleSaveGalleryAndMeta}
        className="bg-panel border border-line rounded-2xl p-6 space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-ink">
              Patient Smile Gallery &amp; Reviews Section Heading ({gallery.length} photos)
            </h3>
            <p className="text-xs text-muted mt-0.5">
              Edit, replace, reorder, add, or delete the existing patient smile transformation photos shown above reviews.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-secondary border border-line text-xs font-semibold text-ink hover:border-accent cursor-pointer">
              <ImageIcon className="w-3.5 h-3.5" />
              {uploadingCaseId === "new" ? "Adding..." : "Add Smile Photo"}
              <input
                type="file"
                accept="image/*"
                onChange={handleAddNewGalleryPhoto}
                className="hidden"
              />
            </label>
            <button
              type="submit"
              disabled={savingGallery || Boolean(uploadingCaseId)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-primary-foreground text-xs font-semibold hover:opacity-95 disabled:opacity-60 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              {savingGallery ? "Saving..." : "Save Gallery & Headings"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="space-y-1.5 text-xs">
            <span className="text-muted">Section Eyebrow</span>
            <input
              type="text"
              value={sectionEyebrow}
              onChange={(e) => setSectionEyebrow(e.target.value)}
              placeholder="Real Stories, Real Smiles"
              className="w-full px-3.5 py-2 rounded-xl bg-canvas border border-line text-sm text-ink"
            />
          </label>
          <label className="space-y-1.5 text-xs">
            <span className="text-muted">Section Headline</span>
            <input
              type="text"
              value={sectionTitle}
              onChange={(e) => setSectionTitle(e.target.value)}
              placeholder="What Our Patients Say & Experience"
              className="w-full px-3.5 py-2 rounded-xl bg-canvas border border-line text-sm text-ink"
            />
          </label>
          <label className="space-y-1.5 text-xs">
            <span className="text-muted">Bottom Verification Note</span>
            <input
              type="text"
              value={sectionNote}
              onChange={(e) => setSectionNote(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-canvas border border-line text-xs text-ink"
            />
          </label>
          <label className="space-y-1.5 text-xs">
            <span className="text-muted">“Read More Reviews on Google” Link</span>
            <input
              type="url"
              value={googleMapsUrl}
              onChange={(e) => setGoogleMapsUrl(e.target.value)}
              placeholder="https://maps.app.goo.gl/..."
              className="w-full px-3.5 py-2 rounded-xl bg-canvas border border-line text-xs text-ink"
            />
          </label>
        </div>

        {gallery.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
            {gallery.map((item, idx) => (
              <div
                key={item.id}
                className="rounded-xl border border-line bg-canvas/80 overflow-hidden flex flex-col"
              >
                <div className="aspect-[4/3] bg-black/20 overflow-hidden">
                  <img
                    src={previewSrc(item.imageUrl)}
                    alt={item.caption}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-3 space-y-2.5 flex-1 flex flex-col justify-between">
                  <input
                    type="text"
                    value={item.caption}
                    onChange={(e) =>
                      setGallery((prev) =>
                        prev.map((g) => (g.id === item.id ? { ...g, caption: e.target.value } : g))
                      )
                    }
                    placeholder="Photo caption / alt text"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-panel border border-line text-xs text-ink"
                  />
                  <div className="flex items-center justify-between gap-1.5">
                    <label className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-secondary border border-line text-[11px] font-medium text-ink hover:border-accent cursor-pointer">
                      <Upload className="w-3 h-3" />
                      {uploadingCaseId === item.id ? "..." : "Replace"}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleCaseUpload(item.id, e)}
                        className="hidden"
                      />
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveGallery(idx, -1)}
                        disabled={idx === 0}
                        className="p-1.5 rounded-lg border border-line text-muted hover:text-ink disabled:opacity-30 cursor-pointer"
                        title="Move earlier"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveGallery(idx, 1)}
                        disabled={idx === gallery.length - 1}
                        className="p-1.5 rounded-lg border border-line text-muted hover:text-ink disabled:opacity-30 cursor-pointer"
                        title="Move later"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeGallery(item.id)}
                        className="p-1.5 rounded-lg border border-line text-muted hover:text-missed cursor-pointer"
                        title="Remove photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </form>
    </div>
  );
}
