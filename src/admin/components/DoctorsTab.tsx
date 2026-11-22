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
import type { Doctor } from "../../lib/types";
import {
  isSafeImageSrc,
  reorderItems,
  sanitizeMultiline,
  sanitizeText,
} from "../../lib/validation";
import { createDoctor, deleteDoctor, reorderDoctors, updateDoctor } from "../lib/api";

interface DoctorsTabProps {
  doctors: Doctor[];
  onRefresh: () => Promise<void>;
  onToast: (msg: string) => void;
}

interface DoctorFormState {
  id: string | null;
  name: string;
  credentials: string;
  role: string;
  experience: string;
  bio: string;
  specializationsText: string;
  photoUrl: string;
  published: boolean;
}

const EMPTY_FORM: DoctorFormState = {
  id: null,
  name: "",
  credentials: "",
  role: "",
  experience: "",
  bio: "",
  specializationsText: "",
  photoUrl: "",
  published: true,
};

export function DoctorsTab({ doctors, onRefresh, onToast }: DoctorsTabProps) {
  const sortedDoctors = useMemo(
    () => [...doctors].sort((a, b) => a.sortOrder - b.sortOrder),
    [doctors]
  );

  const [editing, setEditing] = useState<DoctorFormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function openNew() {
    setFormError("");
    setEditing({ ...EMPTY_FORM });
  }

  function openEdit(doctor: Doctor) {
    setFormError("");
    setEditing({
      id: doctor.id,
      name: doctor.name,
      credentials: doctor.credentials,
      role: doctor.role,
      experience: doctor.experience,
      bio: doctor.bio,
      specializationsText: (doctor.specializations || []).join(", "),
      photoUrl: doctor.photoUrl || "",
      published: doctor.published,
    });
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editing) return;
    setFormError("");
    setUploading(true);
    try {
      const dataUrl = await compressImageFileToDataUrl(file, 900, 220_000);
      setEditing({ ...editing, photoUrl: dataUrl });
      onToast("Photo compressed and ready to save.");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not process image.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setFormError("");

    const name = sanitizeText(editing.name, 120);
    if (name.length < 2) {
      setFormError("Doctor name must be at least 2 characters.");
      return;
    }
    const photoUrl = editing.photoUrl.trim();
    if (photoUrl && !isSafeImageSrc(photoUrl)) {
      setFormError("Please use an uploaded image, local assets/... path, or https:// image URL.");
      return;
    }

    const specializations = editing.specializationsText
      .split(",")
      .map((s) => sanitizeText(s, 80))
      .filter(Boolean)
      .slice(0, 20);

    const payload = {
      name,
      credentials: sanitizeText(editing.credentials, 200),
      role: sanitizeText(editing.role, 160),
      experience: sanitizeText(editing.experience, 160),
      bio: sanitizeMultiline(editing.bio, 2500),
      specializations,
      photoUrl,
      published: editing.published,
    };

    setSaving(true);
    try {
      if (editing.id) {
        await updateDoctor(editing.id, payload);
        onToast(`${name} updated.`);
      } else {
        await createDoctor(payload);
        onToast(`${name} added to clinic profiles.`);
      }
      await onRefresh();
      setEditing(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save doctor profile.");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(doctor: Doctor) {
    try {
      await updateDoctor(doctor.id, { published: !doctor.published });
      await onRefresh();
      onToast(`${doctor.name} is now ${!doctor.published ? "visible" : "hidden"} on the website.`);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Could not update visibility.");
    }
  }

  async function handleReorder(id: string, direction: "up" | "down") {
    const next = reorderItems(sortedDoctors, id, direction);
    try {
      await reorderDoctors(next.map((item) => item.id));
      await onRefresh();
      onToast("Doctor display order updated.");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Could not reorder doctors.");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteDoctor(id);
      setConfirmDeleteId(null);
      await onRefresh();
      onToast("Doctor profile deleted.");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Could not delete doctor.");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-ink">Doctors &amp; Founders</h2>
          <p className="text-sm text-muted">
            Manage clinician profiles, photographs, qualifications, visibility, and website order.
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-primary-foreground text-xs font-semibold hover:opacity-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Doctor
        </button>
      </div>

      {editing && (
        <form onSubmit={handleSave} className="bg-panel border border-accent/40 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-ink">
              {editing.id ? "Edit Doctor Profile" : "Add New Doctor"}
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
              <span className="text-muted font-medium">Full Name *</span>
              <input
                type="text"
                required
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="e.g. Dr. Moez Khakiani"
                className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-sm text-ink focus:outline-none focus:border-accent"
              />
            </label>

            <label className="space-y-1.5 text-xs">
              <span className="text-muted font-medium">Qualifications / Credentials</span>
              <input
                type="text"
                value={editing.credentials}
                onChange={(e) => setEditing({ ...editing, credentials: e.target.value })}
                placeholder="e.g. M.D.S. Prosthodontist & Implantologist"
                className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-sm text-ink focus:outline-none focus:border-accent"
              />
            </label>

            <label className="space-y-1.5 text-xs">
              <span className="text-muted font-medium">Role / Subtitle</span>
              <input
                type="text"
                value={editing.role}
                onChange={(e) => setEditing({ ...editing, role: e.target.value })}
                placeholder="e.g. Co-Founder · TMJ & Implant Dentistry"
                className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-sm text-ink focus:outline-none focus:border-accent"
              />
            </label>

            <label className="space-y-1.5 text-xs">
              <span className="text-muted font-medium">Experience</span>
              <input
                type="text"
                value={editing.experience}
                onChange={(e) => setEditing({ ...editing, experience: e.target.value })}
                placeholder="e.g. Practicing in Bandra West since 2006"
                className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-sm text-ink focus:outline-none focus:border-accent"
              />
            </label>

            <label className="space-y-1.5 text-xs md:col-span-2">
              <span className="text-muted font-medium">Specializations (comma-separated)</span>
              <input
                type="text"
                value={editing.specializationsText}
                onChange={(e) => setEditing({ ...editing, specializationsText: e.target.value })}
                placeholder="TMJ & Jaw Joint Care, Bite Correction, Full-Mouth Rehabilitation"
                className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-sm text-ink focus:outline-none focus:border-accent"
              />
            </label>

            <label className="space-y-1.5 text-xs md:col-span-2">
              <span className="text-muted font-medium">Biography</span>
              <textarea
                rows={4}
                value={editing.bio}
                onChange={(e) => setEditing({ ...editing, bio: e.target.value })}
                placeholder="Verified clinical biography..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-sm text-ink focus:outline-none focus:border-accent"
              />
            </label>

            <div className="md:col-span-2 space-y-2">
              <span className="text-xs text-muted font-medium block">Doctor Photograph</span>
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                {editing.photoUrl && (
                  <img
                    src={editing.photoUrl.startsWith("assets/") ? `/${editing.photoUrl}` : editing.photoUrl}
                    alt="Preview"
                    className="w-16 h-16 rounded-xl object-cover border border-line shrink-0"
                  />
                )}
                <input
                  type="text"
                  value={editing.photoUrl}
                  onChange={(e) => setEditing({ ...editing, photoUrl: e.target.value })}
                  placeholder="Paste image URL, assets/img/..., or upload below"
                  className="flex-1 w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-xs text-ink focus:outline-none focus:border-accent"
                />
                <label className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-secondary border border-line text-xs font-medium text-ink hover:border-accent cursor-pointer shrink-0">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploading ? "Compressing..." : "Upload Photo"}</span>
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
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
            <span>Published (visible on the public Smile Masters website)</span>
          </label>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving || uploading}
              className="px-5 py-2.5 rounded-xl bg-accent text-primary-foreground text-xs font-semibold hover:opacity-95 disabled:opacity-60 cursor-pointer"
            >
              {saving ? "Saving..." : editing.id ? "Save Changes" : "Create Doctor"}
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

      {sortedDoctors.length === 0 ? (
        <div className="bg-panel border border-line rounded-2xl p-8 text-center text-sm text-muted">
          No doctors in Firestore yet. Seed defaults from Overview or click Add Doctor.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {sortedDoctors.map((doctor, index) => (
            <div
              key={doctor.id}
              className="bg-panel border border-line rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-4 min-w-0">
                <img
                  src={
                    doctor.photoUrl
                      ? doctor.photoUrl.startsWith("assets/")
                        ? `/${doctor.photoUrl}`
                        : doctor.photoUrl
                      : "/assets/img/69de3a2ffad0bdd1136a1bcd_team-image-1.jpg"
                  }
                  alt={doctor.name}
                  className="w-16 h-16 rounded-xl object-cover border border-line shrink-0"
                />
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-ink">{doctor.name}</h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        doctor.published
                          ? "bg-booked/15 text-booked"
                          : "bg-secondary text-muted"
                      }`}
                    >
                      {doctor.published ? "Published" : "Hidden"}
                    </span>
                  </div>
                  <div className="text-xs text-accent">{doctor.credentials}</div>
                  <div className="text-xs text-muted line-clamp-2">{doctor.bio}</div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => handleReorder(doctor.id, "up")}
                  className="p-2 rounded-xl border border-line text-muted hover:text-ink disabled:opacity-30 cursor-pointer"
                  title="Move up"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={index === sortedDoctors.length - 1}
                  onClick={() => handleReorder(doctor.id, "down")}
                  className="p-2 rounded-xl border border-line text-muted hover:text-ink disabled:opacity-30 cursor-pointer"
                  title="Move down"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => togglePublish(doctor)}
                  className="p-2 rounded-xl border border-line text-muted hover:text-ink cursor-pointer"
                  title={doctor.published ? "Hide from website" : "Publish to website"}
                >
                  {doctor.published ? <Eye className="w-4 h-4 text-booked" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(doctor)}
                  className="p-2 rounded-xl border border-line text-muted hover:text-accent cursor-pointer"
                  title="Edit doctor"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                {confirmDeleteId === doctor.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleDelete(doctor.id)}
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
                    onClick={() => setConfirmDeleteId(doctor.id)}
                    className="p-2 rounded-xl border border-line text-muted hover:text-missed cursor-pointer"
                    title="Delete doctor"
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
