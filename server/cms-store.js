import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {
  DEFAULT_CASE_GALLERY,
  DEFAULT_DOCTORS,
  DEFAULT_SITE_CONTENT,
  DEFAULT_TESTIMONIALS,
  DEFAULT_TREATMENTS,
} from "./cms-defaults.js";

export {
  DEFAULT_CASE_GALLERY,
  DEFAULT_DOCTORS,
  DEFAULT_SITE_CONTENT,
  DEFAULT_TESTIMONIALS,
  DEFAULT_TREATMENTS,
};

const dataDir = path.join(process.cwd(), "data");
const cmsPath = path.join(dataDir, "cms.json");

const LEAD_STATUSES = new Set(["New", "Contacted", "Follow-up", "Converted", "Closed"]);
const APPT_STATUSES = new Set(["Pending", "Confirmed", "Rescheduled", "Rejected", "Completed"]);

function cleanText(val, maxLen = 500) {
  return String(val ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}

function cleanMultiline(val, maxLen = 3000) {
  return String(val ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLen);
}

function isSafeHref(url) {
  const s = String(url ?? "").trim();
  if (!s) return true;
  if (s.startsWith("#") || s.startsWith("/") || /^[a-z0-9._/-]+(#.*)?$/i.test(s)) return true;
  try {
    const u = new URL(s);
    return ["https:", "http:", "mailto:", "tel:"].includes(u.protocol);
  } catch {
    return false;
  }
}

function isSafeImageSrc(src) {
  const s = String(src ?? "").trim();
  if (!s) return true;
  if (/^data:image\/(png|jpe?g|webp|gif|avif);base64,[a-z0-9+/=]+$/i.test(s)) {
    return s.length <= 1_800_000;
  }
  if (s.startsWith("/") || s.startsWith("assets/")) return !s.includes("..");
  try {
    const u = new URL(s);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

function slugify(val) {
  return (
    cleanText(val, 140)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "item"
  );
}

function safeId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`;
}

function initialState() {
  const now = new Date().toISOString();
  return {
    siteContent: { ...DEFAULT_SITE_CONTENT, updatedAt: now },
    doctors: DEFAULT_DOCTORS.map((d) => ({ ...d, createdAt: now, updatedAt: now })),
    treatments: DEFAULT_TREATMENTS.map((t) => ({ ...t, createdAt: now, updatedAt: now })),
    testimonials: DEFAULT_TESTIMONIALS.map((r) => ({ ...r, createdAt: now, updatedAt: now })),
    testimonialsInitialized: true,
    leads: [],
    appointments: [],
  };
}

function load() {
  if (!fs.existsSync(cmsPath)) {
    const state = initialState();
    save(state);
    return state;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(cmsPath, "utf8"));
    const now = new Date().toISOString();
    const rawTestimonials = Array.isArray(parsed.testimonials) ? parsed.testimonials : [];
    const needsDefaultTestimonials = !parsed.testimonialsInitialized && rawTestimonials.length === 0;
    const testimonials = needsDefaultTestimonials
      ? DEFAULT_TESTIMONIALS.map((r) => ({ ...r, createdAt: now, updatedAt: now }))
      : rawTestimonials;

    const mergedSiteContent = {
      ...DEFAULT_SITE_CONTENT,
      ...(parsed.siteContent || {}),
      caseGalleryImages: Array.isArray(parsed.siteContent?.caseGalleryImages)
        ? parsed.siteContent.caseGalleryImages
        : DEFAULT_CASE_GALLERY,
    };

    const nextState = {
      siteContent: mergedSiteContent,
      doctors: Array.isArray(parsed.doctors) ? parsed.doctors : [],
      treatments: Array.isArray(parsed.treatments) ? parsed.treatments : [],
      testimonials,
      testimonialsInitialized: true,
      leads: Array.isArray(parsed.leads) ? parsed.leads : [],
      appointments: Array.isArray(parsed.appointments) ? parsed.appointments : [],
    };
    if (needsDefaultTestimonials) {
      save(nextState);
    }
    return nextState;
  } catch {
    const state = initialState();
    save(state);
    return state;
  }
}

function save(state) {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(cmsPath, JSON.stringify(state, null, 2));
}

export function getPublicSnapshot() {
  const state = load();
  return {
    siteContent: state.siteContent,
    doctors: state.doctors
      .filter((d) => d.published)
      .sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999)),
    treatments: state.treatments
      .filter((t) => t.published)
      .sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999)),
    testimonials: state.testimonials
      .filter((t) => t.published && t.consentConfirmed)
      .sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999)),
  };
}

export function getAdminSnapshot() {
  const state = load();
  return {
    siteContent: state.siteContent,
    doctors: [...state.doctors].sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999)),
    treatments: [...state.treatments].sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999)),
    testimonials: [...state.testimonials].sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999)),
    leads: state.leads,
    appointments: state.appointments,
  };
}

export function updateSiteContent(input = {}) {
  const state = load();
  const prev = state.siteContent;
  const hrefFields = [
    "heroCtaLink",
    "heroSecondaryCtaLink",
    "googleMapsUrl",
    "socialInstagram",
    "socialFacebook",
    "socialYoutube",
    "socialLinkedin",
  ];
  for (const k of hrefFields) {
    if (input[k] !== undefined && !isSafeHref(input[k])) {
      throw new Error(`Unsafe URL provided for ${k}`);
    }
  }
  if (input.logoUrl !== undefined && !isSafeImageSrc(input.logoUrl)) {
    throw new Error("Invalid clinic logo image source");
  }
  if (input.heroDesktopImage !== undefined && !isSafeImageSrc(input.heroDesktopImage)) {
    throw new Error("Invalid desktop hero image source");
  }
  if (input.heroMobileImage !== undefined && !isSafeImageSrc(input.heroMobileImage)) {
    throw new Error("Invalid mobile hero image source");
  }

  const faqs = Array.isArray(input.faqs)
    ? input.faqs
        .map((f) => ({
          question: cleanText(f?.question, 240),
          answer: cleanMultiline(f?.answer, 1200),
        }))
        .filter((f) => f.question && f.answer)
        .slice(0, 30)
    : prev.faqs;

  const caseGalleryImages = Array.isArray(input.caseGalleryImages)
    ? input.caseGalleryImages
        .map((item, idx) => ({
          id: cleanText(item?.id, 80) || `case-${idx + 1}`,
          imageUrl: String(item?.imageUrl ?? "").trim(),
          caption: cleanText(item?.caption, 180) || `Smile transformation ${idx + 1}`,
        }))
        .filter((item) => item.imageUrl && isSafeImageSrc(item.imageUrl))
        .slice(0, 18)
    : prev.caseGalleryImages;

  state.siteContent = {
    ...prev,
    clinicName: cleanText(input.clinicName ?? prev.clinicName, 160) || prev.clinicName,
    tagline: cleanText(input.tagline ?? prev.tagline, 240),
    foundedYear: cleanText(input.foundedYear ?? prev.foundedYear, 20),
    logoUrl:
      input.logoUrl !== undefined ? String(input.logoUrl ?? "").trim() : (prev.logoUrl ?? ""),
    logoAlt: cleanText(input.logoAlt ?? prev.logoAlt, 160) || prev.clinicName,
    phone: cleanText(input.phone ?? prev.phone, 40) || prev.phone,
    whatsappNumber: cleanText(input.whatsappNumber ?? prev.whatsappNumber, 40),
    email: cleanText(input.email ?? prev.email, 160) || prev.email,
    address: cleanText(input.address ?? prev.address, 400) || prev.address,
    city: cleanText(input.city ?? prev.city, 120),
    openingHours: cleanText(input.openingHours ?? prev.openingHours, 300),
    googleMapsUrl: cleanText(input.googleMapsUrl ?? prev.googleMapsUrl, 400),
    heroEyebrow: cleanText(input.heroEyebrow ?? prev.heroEyebrow, 120),
    heroHeadline: cleanText(input.heroHeadline ?? prev.heroHeadline, 240) || prev.heroHeadline,
    heroMobileHeadline:
      cleanText(input.heroMobileHeadline ?? prev.heroMobileHeadline, 180) ||
      prev.heroMobileHeadline,
    heroDescription:
      cleanMultiline(input.heroDescription ?? prev.heroDescription, 800) || prev.heroDescription,
    heroCtaText: cleanText(input.heroCtaText ?? prev.heroCtaText, 80) || prev.heroCtaText,
    heroCtaLink: cleanText(input.heroCtaLink ?? prev.heroCtaLink, 300) || "#book-appointment",
    heroSecondaryCtaText: cleanText(input.heroSecondaryCtaText ?? prev.heroSecondaryCtaText, 80),
    heroSecondaryCtaLink: cleanText(input.heroSecondaryCtaLink ?? prev.heroSecondaryCtaLink, 300),
    heroDesktopImage: String(input.heroDesktopImage ?? prev.heroDesktopImage ?? "").trim(),
    heroMobileImage: String(input.heroMobileImage ?? prev.heroMobileImage ?? "").trim(),
    aboutEyebrow: cleanText(input.aboutEyebrow ?? prev.aboutEyebrow, 120),
    aboutHeadline: cleanText(input.aboutHeadline ?? prev.aboutHeadline, 240),
    aboutDescription: cleanMultiline(input.aboutDescription ?? prev.aboutDescription, 2000),
    doctorsSectionTitle: cleanText(input.doctorsSectionTitle ?? prev.doctorsSectionTitle, 200),
    doctorsSectionSubtitle: cleanText(
      input.doctorsSectionSubtitle ?? prev.doctorsSectionSubtitle,
      500
    ),
    treatmentsSectionTitle: cleanText(
      input.treatmentsSectionTitle ?? prev.treatmentsSectionTitle,
      200
    ),
    treatmentsSectionSubtitle: cleanText(
      input.treatmentsSectionSubtitle ?? prev.treatmentsSectionSubtitle,
      500
    ),
    testimonialsSectionEyebrow: cleanText(
      input.testimonialsSectionEyebrow ?? prev.testimonialsSectionEyebrow,
      120
    ),
    testimonialsSectionTitle: cleanText(
      input.testimonialsSectionTitle ?? prev.testimonialsSectionTitle,
      200
    ),
    testimonialsSectionNote: cleanText(
      input.testimonialsSectionNote ?? prev.testimonialsSectionNote,
      300
    ),
    bookingNotice: cleanText(input.bookingNotice ?? prev.bookingNotice, 500),
    footerDescription: cleanText(input.footerDescription ?? prev.footerDescription, 600),
    socialInstagram: cleanText(input.socialInstagram ?? prev.socialInstagram, 300),
    socialFacebook: cleanText(input.socialFacebook ?? prev.socialFacebook, 300),
    socialYoutube: cleanText(input.socialYoutube ?? prev.socialYoutube, 300),
    socialLinkedin: cleanText(input.socialLinkedin ?? prev.socialLinkedin, 300),
    notificationEmail: cleanText(input.notificationEmail ?? prev.notificationEmail, 160),
    notifyOnNewLead:
      input.notifyOnNewLead !== undefined ? Boolean(input.notifyOnNewLead) : prev.notifyOnNewLead,
    notifyOnNewAppointment:
      input.notifyOnNewAppointment !== undefined
        ? Boolean(input.notifyOnNewAppointment)
        : prev.notifyOnNewAppointment,
    faqs,
    caseGalleryImages,
    updatedAt: new Date().toISOString(),
  };

  save(state);
  return state.siteContent;
}

export function upsertDoctor(input = {}, existingId = null) {
  const state = load();
  const id = existingId || cleanText(input.id, 80) || safeId("doc");
  const idx = state.doctors.findIndex((d) => d.id === id);
  const prev = idx >= 0 ? state.doctors[idx] : null;

  const name = cleanText(input.name ?? prev?.name, 120);
  if (name.length < 2) throw new Error("Doctor name must be at least 2 characters.");
  const photoUrl = String(input.photoUrl ?? prev?.photoUrl ?? "").trim();
  if (photoUrl && !isSafeImageSrc(photoUrl)) {
    throw new Error("Doctor photo must be an uploaded image, assets/... path, or https:// URL.");
  }

  const specializations = Array.isArray(input.specializations)
    ? input.specializations.map((s) => cleanText(s, 80)).filter(Boolean).slice(0, 20)
    : prev?.specializations || [];

  const nextOrder =
    prev?.sortOrder ??
    (state.doctors.length > 0
      ? Math.max(...state.doctors.map((d) => Number(d.sortOrder || 0))) + 1
      : 1);

  const now = new Date().toISOString();
  const record = {
    id,
    name,
    credentials: cleanText(input.credentials ?? prev?.credentials, 200),
    role: cleanText(input.role ?? prev?.role, 160),
    experience: cleanText(input.experience ?? prev?.experience, 160),
    bio: cleanMultiline(input.bio ?? prev?.bio, 2500),
    specializations,
    photoUrl,
    published: input.published !== undefined ? Boolean(input.published) : (prev?.published ?? true),
    sortOrder: input.sortOrder !== undefined ? Number(input.sortOrder) : nextOrder,
    createdAt: prev?.createdAt || now,
    updatedAt: now,
  };

  if (idx >= 0) state.doctors[idx] = record;
  else state.doctors.push(record);
  save(state);
  return record;
}

export function deleteDoctor(id) {
  const state = load();
  const before = state.doctors.length;
  state.doctors = state.doctors.filter((d) => d.id !== id);
  if (state.doctors.length === before) return false;
  save(state);
  return true;
}

export function reorderDoctors(orderedIds) {
  const state = load();
  const map = new Map(orderedIds.map((id, i) => [id, i + 1]));
  const now = new Date().toISOString();
  state.doctors = state.doctors.map((d) =>
    map.has(d.id) ? { ...d, sortOrder: map.get(d.id), updatedAt: now } : d
  );
  save(state);
  return state.doctors.sort((a, b) => a.sortOrder - b.sortOrder);
}

export function upsertTreatment(input = {}, existingId = null) {
  const state = load();
  const id = existingId || cleanText(input.id, 80) || safeId("trt");
  const idx = state.treatments.findIndex((t) => t.id === id);
  const prev = idx >= 0 ? state.treatments[idx] : null;

  const title = cleanText(input.title ?? prev?.title, 140);
  if (title.length < 2) throw new Error("Treatment title must be at least 2 characters.");
  const imageUrl = String(input.imageUrl ?? prev?.imageUrl ?? "").trim();
  if (imageUrl && !isSafeImageSrc(imageUrl)) {
    throw new Error("Treatment image must be an uploaded image, assets/... path, or https:// URL.");
  }

  const highlights = Array.isArray(input.highlights)
    ? input.highlights.map((h) => cleanText(h, 80)).filter(Boolean).slice(0, 15)
    : prev?.highlights || [];

  const nextOrder =
    prev?.sortOrder ??
    (state.treatments.length > 0
      ? Math.max(...state.treatments.map((t) => Number(t.sortOrder || 0))) + 1
      : 1);

  const now = new Date().toISOString();
  const record = {
    id,
    title,
    slug: cleanText(input.slug, 140) || slugify(title),
    category: cleanText(input.category ?? prev?.category, 100) || "TMJ & Jaw Joint Care",
    shortDescription: cleanText(input.shortDescription ?? prev?.shortDescription, 500),
    fullDescription: cleanMultiline(input.fullDescription ?? prev?.fullDescription, 4000),
    highlights,
    imageUrl,
    published: input.published !== undefined ? Boolean(input.published) : (prev?.published ?? true),
    sortOrder: input.sortOrder !== undefined ? Number(input.sortOrder) : nextOrder,
    createdAt: prev?.createdAt || now,
    updatedAt: now,
  };

  if (idx >= 0) state.treatments[idx] = record;
  else state.treatments.push(record);
  save(state);
  return record;
}

export function deleteTreatment(id) {
  const state = load();
  const before = state.treatments.length;
  state.treatments = state.treatments.filter((t) => t.id !== id);
  if (state.treatments.length === before) return false;
  save(state);
  return true;
}

export function reorderTreatments(orderedIds) {
  const state = load();
  const map = new Map(orderedIds.map((id, i) => [id, i + 1]));
  const now = new Date().toISOString();
  state.treatments = state.treatments.map((t) =>
    map.has(t.id) ? { ...t, sortOrder: map.get(t.id), updatedAt: now } : t
  );
  save(state);
  return state.treatments.sort((a, b) => a.sortOrder - b.sortOrder);
}

export function upsertTestimonial(input = {}, existingId = null) {
  const state = load();
  const id = existingId || cleanText(input.id, 80) || safeId("rev");
  const idx = state.testimonials.findIndex((t) => t.id === id);
  const prev = idx >= 0 ? state.testimonials[idx] : null;

  const reviewerName = cleanText(input.reviewerName ?? prev?.reviewerName, 120);
  const quote = cleanMultiline(input.quote ?? prev?.quote ?? "", 1500);
  const imageUrl = String(input.imageUrl ?? prev?.imageUrl ?? "").trim();
  if (imageUrl && !isSafeImageSrc(imageUrl)) {
    throw new Error("Review image must be an uploaded image, assets/... path, or https:// URL.");
  }
  if (!reviewerName) throw new Error("Reviewer name or title is required.");
  if (quote.length < 5 && !imageUrl) {
    throw new Error("Please enter a testimonial quote (at least 5 characters) or upload a review image.");
  }

  const consentConfirmed =
    input.consentConfirmed !== undefined
      ? Boolean(input.consentConfirmed)
      : Boolean(prev?.consentConfirmed);
  const published =
    consentConfirmed &&
    (input.published !== undefined ? Boolean(input.published) : Boolean(prev?.published));

  const nextOrder =
    prev?.sortOrder ??
    (state.testimonials.length > 0
      ? Math.max(...state.testimonials.map((t) => Number(t.sortOrder || 0))) + 1
      : 1);

  const ratingRaw = input.rating !== undefined ? Number(input.rating) : Number(prev?.rating ?? 5);
  const rating = Math.min(5, Math.max(1, Number.isFinite(ratingRaw) ? Math.round(ratingRaw) : 5));

  const now = new Date().toISOString();
  const record = {
    id,
    reviewerName,
    reviewerContext: cleanText(input.reviewerContext ?? prev?.reviewerContext, 160),
    quote,
    rating,
    source: cleanText(input.source ?? prev?.source ?? "Verified Patient", 80),
    imageUrl,
    consentConfirmed,
    published,
    sortOrder: input.sortOrder !== undefined ? Number(input.sortOrder) : nextOrder,
    createdAt: prev?.createdAt || now,
    updatedAt: now,
  };

  if (idx >= 0) state.testimonials[idx] = record;
  else state.testimonials.push(record);
  state.testimonialsInitialized = true;
  save(state);
  return record;
}

export function deleteTestimonial(id) {
  const state = load();
  const before = state.testimonials.length;
  state.testimonials = state.testimonials.filter((t) => t.id !== id);
  if (state.testimonials.length === before) return false;
  state.testimonialsInitialized = true;
  save(state);
  return true;
}

export function reorderTestimonials(orderedIds) {
  const state = load();
  const map = new Map(orderedIds.map((id, i) => [id, i + 1]));
  const now = new Date().toISOString();
  state.testimonials = state.testimonials.map((t) =>
    map.has(t.id) ? { ...t, sortOrder: map.get(t.id), updatedAt: now } : t
  );
  save(state);
  return state.testimonials.sort((a, b) => a.sortOrder - b.sortOrder);
}

export function createLead(input = {}) {
  const name = cleanText(input.name, 120);
  const phone = cleanText(input.phone, 32);
  const email = cleanText(input.email, 160);
  if (name.length < 2) throw new Error("Please enter your full name.");
  if (phone.replace(/\D/g, "").length < 7) throw new Error("Please enter a valid phone number.");

  const state = load();
  const now = new Date().toISOString();
  const lead = {
    id: cleanText(input.id, 80) || safeId("lead"),
    name,
    phone,
    email,
    enquiryType: cleanText(input.enquiryType || "Callback Request", 80),
    treatment: cleanText(input.treatment, 140),
    preferredContact: cleanText(input.preferredContact || "Phone", 40),
    message: cleanMultiline(input.message, 1200),
    status: "New",
    notes: "",
    sourcePage: cleanText(input.sourcePage || "/", 120),
    createdAt: now,
    updatedAt: now,
  };
  state.leads.unshift(lead);
  save(state);
  return lead;
}

export function updateLead(id, patch = {}) {
  const state = load();
  const idx = state.leads.findIndex((l) => l.id === id);
  if (idx === -1) return null;
  const cur = state.leads[idx];
  const nextStatus = patch.status !== undefined ? String(patch.status) : cur.status;
  if (!LEAD_STATUSES.has(nextStatus)) throw new Error("Invalid lead status.");
  state.leads[idx] = {
    ...cur,
    status: nextStatus,
    notes: patch.notes !== undefined ? cleanMultiline(patch.notes, 2000) : cur.notes,
    updatedAt: new Date().toISOString(),
  };
  save(state);
  return state.leads[idx];
}

export function deleteLead(id) {
  const state = load();
  const before = state.leads.length;
  state.leads = state.leads.filter((l) => l.id !== id);
  if (state.leads.length === before) return false;
  save(state);
  return true;
}

export function createAppointment(input = {}) {
  const name = cleanText(input.name, 120);
  const phone = cleanText(input.phone, 32);
  const email = cleanText(input.email, 160);
  const treatment = cleanText(input.treatment || "General Consultation", 140);
  if (name.length < 2) throw new Error("Please enter patient full name.");
  if (phone.replace(/\D/g, "").length < 7 && !email) {
    throw new Error("Please provide a valid phone number or email.");
  }

  const state = load();
  const now = new Date().toISOString();
  const appt = {
    id: cleanText(input.id, 80) || safeId("appt"),
    name,
    phone,
    email,
    treatment,
    preferredDate: cleanText(input.preferredDate, 40),
    preferredTime: cleanText(input.preferredTime || "Flexible", 60),
    preferredContact: cleanText(input.preferredContact || "Phone Call", 40),
    message: cleanMultiline(input.message, 1200),
    status: "Pending",
    notes: cleanMultiline(input.notes, 2000),
    sourcePage: cleanText(input.sourcePage || "/", 120),
    createdAt: now,
    updatedAt: now,
  };
  state.appointments.unshift(appt);
  save(state);
  return appt;
}

export function updateAppointment(id, patch = {}) {
  const state = load();
  const idx = state.appointments.findIndex((a) => a.id === id);
  if (idx === -1) return null;
  const cur = state.appointments[idx];
  const nextStatus = patch.status !== undefined ? String(patch.status) : cur.status;
  if (!APPT_STATUSES.has(nextStatus)) throw new Error("Invalid appointment status.");
  state.appointments[idx] = {
    ...cur,
    status: nextStatus,
    notes: patch.notes !== undefined ? cleanMultiline(patch.notes, 2000) : cur.notes,
    updatedAt: new Date().toISOString(),
  };
  save(state);
  return state.appointments[idx];
}

export function deleteAppointment(id) {
  const state = load();
  const before = state.appointments.length;
  state.appointments = state.appointments.filter((a) => a.id !== id);
  if (state.appointments.length === before) return false;
  save(state);
  return true;
}

export function seedDefaults() {
  const state = load();
  const now = new Date().toISOString();
  let created = 0;

  state.siteContent = {
    ...DEFAULT_SITE_CONTENT,
    ...state.siteContent,
    caseGalleryImages:
      Array.isArray(state.siteContent?.caseGalleryImages) &&
      state.siteContent.caseGalleryImages.length > 0
        ? state.siteContent.caseGalleryImages
        : DEFAULT_CASE_GALLERY,
    updatedAt: now,
  };

  const existingDocIds = new Set(state.doctors.map((d) => d.id));
  for (const d of DEFAULT_DOCTORS) {
    if (!existingDocIds.has(d.id)) {
      state.doctors.push({ ...d, createdAt: now, updatedAt: now });
      created++;
    }
  }

  const existingTrtIds = new Set(state.treatments.map((t) => t.id));
  for (const t of DEFAULT_TREATMENTS) {
    if (!existingTrtIds.has(t.id)) {
      state.treatments.push({ ...t, createdAt: now, updatedAt: now });
      created++;
    }
  }

  const existingRevIds = new Set(state.testimonials.map((r) => r.id));
  for (const r of DEFAULT_TESTIMONIALS) {
    if (!existingRevIds.has(r.id)) {
      state.testimonials.push({ ...r, createdAt: now, updatedAt: now });
      created++;
    }
  }
  state.testimonialsInitialized = true;

  save(state);
  return { created };
}
