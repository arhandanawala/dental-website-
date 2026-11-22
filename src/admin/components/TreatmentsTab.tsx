import React, { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { compressImageFileToDataUrl } from "../../lib/image-upload";
import type { Treatment } from "../../lib/types";
import {
  isSafeImageSrc,
  reorderItems,
  sanitizeMultiline,
  sanitizeText,
  slugify,
} from "../../lib/validation";
import {
  createTreatment,
  deleteTreatment,
  reorderTreatments,
  updateTreatment,
} from "../lib/api";

const CATEGORIES = [
  "TMJ & Jaw Joint Care",
  "Orthodontics & Smile Design",
  "Prosthodontics & Implants",
  "General & Family Care",
];

interface TreatmentsTabProps {
  treatments: Treatment[];
  onRefresh: () => Promise<void>;
  onToast: (msg: string) => void;
}

interface TreatmentFormState {
  id: string | null;
  title: string;
  category: string;
  shortDescription: string;
  fullDescription: string;
  highlightsText: string;
  imageUrl: string;
  published: boolean;
}

const EMPTY_FORM: TreatmentFormState = {
  id: null,
  title: "",
  category: CATEGORIES[0],
  shortDescription: "",
  fullDescription: "",
  highlightsText: "",
  imageUrl: "",
  published: true,
};

export function TreatmentsTab({ treatments, onRefresh, onToast }: TreatmentsTabProps) {
  const sorted = useMemo(
    () => [...treatments].sort((a, b) => a.sortOrder - b.sortOrder),
    [treatments]
  );

  const [categoryFilter, setCategoryFilter] = useState("All");
  const [editing, setEditing] = useState<TreatmentFormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const visibleList = useMemo(() => {
    if (categoryFilter === "All") return sorted;
    return sorted.filter((t) => t.category === categoryFilter);
  }, [sorted, categoryFilter]);

  function openNew() {
    setFormError("");
    setEditing({ ...EMPTY_FORM });
  }

  function openEdit(t: Treatment) {
    setFormError("");
    setEditing({
      id: t.id,
      title: t.title,
      category: t.category || CATEGORIES[0],
      shortDescription: t.shortDescription || "",
      fullDescription: t.fullDescription || "",
      highlightsText: (t.highlights || []).join(", "),
      imageUrl: t.imageUrl || "",
      published: t.published,
    });
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editing) return;
    setFormError("");
    setUploading(true);
    try {
      const dataUrl = await compressImageFileToDataUrl(file, 1000, 220_000);
      setEditing({ ...editing, imageUrl: dataUrl });
      onToast("Treatment image compressed and ready.");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Unable to process image.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setFormError("");

    const title = sanitizeText(editing.title, 140);
    if (title.length < 2) {
      setFormError("Treatment title must be at least 2 characters.");
      return;
    }
    const category = sanitizeText(editing.category, 100) || CATEGORIES[0];
    const imageUrl = editing.imageUrl.trim();
    if (imageUrl && !isSafeImageSrc(imageUrl)) {
      setFormError("Please upload an image or provide a valid assets/... or https:// URL.");
      return;
    }

    const highlights = editing.highlightsText
      .split(",")
      .map((h) => sanitizeText(h, 80))
      .filter(Boolean)
      .slice(0, 15);

    const payload = {
      title,
      slug: slugify(title),
      category,
      shortDescription: sanitizeText(editing.shortDescription, 500),
      fullDescription: sanitizeMultiline(editing.fullDescription, 4000),
      highlights,
      imageUrl,
      published: editing.published,
    };

    setSaving(true);
    try {
      if (editing.id) {
        await updateTreatment(editing.id, payload);
        onToast(`"${title}" updated.`);
      } else {
        await createTreatment(payload);
        onToast(`"${title}" added to treatments.`);
      }
      await onRefresh();
      setEditing(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save treatment.");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(t: Treatment) {
    try {
      await updateTreatment(t.id, { published: !t.published });
      await onRefresh();
      onToast(`"${t.title}" ${!t.published ? "published" : "hidden"}.`);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Could not toggle publish status.");
    }
  }

  async function handleReorder(id: string, direction: "up" | "down") {
    const next = reorderItems(sorted, id, direction);
    try {
      await reorderTreatments(next.map((item) => item.id));
      await onRefresh();
      onToast("Treatment order saved.");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Could not reorder treatments.");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteTreatment(id);
      setConfirmDeleteId(null);
      await onRefresh();
      onToast("Treatment deleted.");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Could not delete treatment.");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-ink">Treatments &amp; Services</h2>
          <p className="text-sm text-muted">
            Add, edit, categorize, reorder, and publish clinic treatments synced to the public website.
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-primary-foreground text-xs font-semibold hover:opacity-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Treatment
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {["All", ...CATEGORIES].map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition cursor-pointer ${
              categoryFilter === cat
                ? "bg-accent text-primary-foreground border-accent"
                : "bg-panel text-muted border-line hover:text-ink"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {editing && (
        <form onSubmit={handleSave} className="bg-panel border border-accent/40 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-ink">
              {editing.id ? "Edit Treatment" : "Add New Treatment"}
            </h3>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="p-1.5 rounded-lg text-muted hover:text-ink cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {formError && (
            <div className="rounded-xl bg-missed/15 border border-missed/30 px-4 py-2.5 text-xs text-missed">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-1.5 text-xs">
              <span className="text-muted font-medium">Treatment Title *</span>
              <input
                type="text"
                required
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                placeholder="e.g. TMJ & Jaw Joint Disorders"
                className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-sm text-ink focus:outline-none focus:border-accent"
              />
            </label>

            <label className="space-y-1.5 text-xs">
              <span className="text-muted font-medium">Category *</span>
              <select
                value={editing.category}
                onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-sm text-ink focus:outline-none focus:border-accent"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5 text-xs md:col-span-2">
              <span className="text-muted font-medium">Short Summary (shown on cards)</span>
              <input
                type="text"
                value={editing.shortDescription}
                onChange={(e) => setEditing({ ...editing, shortDescription: e.target.value })}
                placeholder="Concise, accurate clinical summary..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-sm text-ink focus:outline-none focus:border-accent"
              />
            </label>

            <label className="space-y-1.5 text-xs md:col-span-2">
              <span className="text-muted font-medium">Detailed Description</span>
              <textarea
                rows={3}
                value={editing.fullDescription}
                onChange={(e) => setEditing({ ...editing, fullDescription: e.target.value })}
                placeholder="Detailed description of evaluation and treatment process..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-sm text-ink focus:outline-none focus:border-accent"
              />
            </label>

            <label className="space-y-1.5 text-xs md:col-span-2">
              <span className="text-muted font-medium">Key Highlights (comma-separated)</span>
              <input
                type="text"
                value={editing.highlightsText}
                onChange={(e) => setEditing({ ...editing, highlightsText: e.target.value })}
                placeholder="Bite assessment, Specialist-led plan, In-clinic & online options"
                className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-sm text-ink focus:outline-none focus:border-accent"
              />
            </label>

            <div className="md:col-span-2 space-y-2">
              <span className="text-xs text-muted font-medium block">Treatment Image</span>
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                {editing.imageUrl && (
                  <img
                    src={editing.imageUrl.startsWith("assets/") ? `/${editing.imageUrl}` : editing.imageUrl}
                    alt="Preview"
                    className="w-20 h-14 rounded-xl object-cover border border-line shrink-0"
                  />
                )}
                <input
                  type="text"
                  value={editing.imageUrl}
                  onChange={(e) => setEditing({ ...editing, imageUrl: e.target.value })}
                  placeholder="assets/img/... or https://... or upload"
                  className="flex-1 w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-xs text-ink focus:outline-none focus:border-accent"
                />
                <label className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-secondary border border-line text-xs font-medium text-ink hover:border-accent cursor-pointer shrink-0">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploading ? "Compressing..." : "Upload Image"}</span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              </div>
            </div>
          </div>

          <label className="inline-flex items-center gap-2.5 text-xs text-ink cursor-pointer">
            <input
              type="checkbox"
              checked={editing.published}
              onChange={(e) => setEditing({ ...editing, published: e.target.checked })}
              className="rounded accent-accent w-4 h-4"
            />
            <span>Published (visible on the public website and appointment dropdown)</span>
          </label>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving || uploading}
              className="px-5 py-2.5 rounded-xl bg-accent text-primary-foreground text-xs font-semibold hover:opacity-95 disabled:opacity-60 cursor-pointer"
            >
              {saving ? "Saving..." : editing.id ? "Save Changes" : "Create Treatment"}
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

      {visibleList.length === 0 ? (
        <div className="bg-panel border border-line rounded-2xl p-8 text-center text-sm text-muted">
          No treatments found in this category.
        </div>
      ) : (
        <div className="space-y-2.5">
          {visibleList.map((t) => {
            const globalIdx = sorted.findIndex((item) => item.id === t.id);
            return (
              <div
                key={t.id}
                className="bg-panel border border-line rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <img
                    src={
                      t.imageUrl
                        ? t.imageUrl.startsWith("assets/")
                          ? `/${t.imageUrl}`
                          : t.imageUrl
                        : "/assets/img/699c52f336cd1c03293a16d6_service-thumbnail-image.jpg"
                    }
                    alt={t.title}
                    className="w-16 h-12 rounded-xl object-cover border border-line shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-ink">{t.title}</h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-accent/15 text-accent">
                        {t.category}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          t.published ? "bg-booked/15 text-booked" : "bg-secondary text-muted"
                        }`}
                      >
                        {t.published ? "Published" : "Hidden"}
                      </span>
                    </div>
                    <p className="text-xs text-muted mt-1 line-clamp-2">{t.shortDescription}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    disabled={globalIdx <= 0}
                    onClick={() => handleReorder(t.id, "up")}
                    className="p-2 rounded-xl border border-line text-muted hover:text-ink disabled:opacity-30 cursor-pointer"
                    title="Move up"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={globalIdx === -1 || globalIdx >= sorted.length - 1}
                    onClick={() => handleReorder(t.id, "down")}
                    className="p-2 rounded-xl border border-line text-muted hover:text-ink disabled:opacity-30 cursor-pointer"
                    title="Move down"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => togglePublish(t)}
                    className="p-2 rounded-xl border border-line text-muted hover:text-ink cursor-pointer"
                    title={t.published ? "Hide" : "Publish"}
                  >
                    {t.published ? <Eye className="w-4 h-4 text-booked" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(t)}
                    className="p-2 rounded-xl border border-line text-muted hover:text-accent cursor-pointer"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  {confirmDeleteId === t.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleDelete(t.id)}
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
                      onClick={() => setConfirmDeleteId(t.id)}
                      className="p-2 rounded-xl border border-line text-muted hover:text-missed cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
