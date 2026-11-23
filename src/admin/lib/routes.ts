export type AdminPageKey =
  | "overview"
  | "appointments"
  | "leads"
  | "voice"
  | "branding"
  | "about"
  | "contact"
  | "doctors"
  | "treatments"
  | "testimonials"
  | "admins";

export interface AdminRouteMeta {
  key: AdminPageKey;
  slug: string;
  label: string;
  title: string;
  subtitle: string;
  group: "desk" | "website" | "system";
}

export const ADMIN_ROUTES: AdminRouteMeta[] = [
  {
    key: "overview",
    slug: "",
    label: "Overview",
    title: "Clinic Dashboard",
    subtitle: "Live snapshot of appointments, leads, voice calls, and published clinic content.",
    group: "desk",
  },
  {
    key: "appointments",
    slug: "appointments",
    label: "Appointments",
    title: "Appointment Requests",
    subtitle: "Confirm, reschedule, or follow up on in-clinic and online TMJ requests.",
    group: "desk",
  },
  {
    key: "leads",
    slug: "leads",
    label: "Enquiries & Leads",
    title: "Patient Enquiries & Callbacks",
    subtitle: "Track website callback requests, add notes, and export CSV lists.",
    group: "desk",
  },
  {
    key: "voice",
    slug: "voice-calls",
    label: "Voice AI Calls",
    title: "Maya Voice AI Desk",
    subtitle: "Listen to live/completed voice calls, read transcripts, and refine Maya’s script.",
    group: "desk",
  },
  {
    key: "branding",
    slug: "branding",
    label: "Logo, Branding & Hero",
    title: "Logo, Branding & Hero",
    subtitle: "Upload your clinic logo, update clinic identity, and edit desktop & mobile hero banners.",
    group: "website",
  },
  {
    key: "about",
    slug: "about",
    label: "About & Sections",
    title: "About Page & Section Headings",
    subtitle: "Edit your clinic story, doctors/treatments headings, and footer copy across the site.",
    group: "website",
  },
  {
    key: "contact",
    slug: "contact",
    label: "Contact, Maps & FAQs",
    title: "Contact Details, Socials & FAQs",
    subtitle: "Update phone, WhatsApp, address, timings, Google Maps link, socials, and FAQs.",
    group: "website",
  },
  {
    key: "doctors",
    slug: "doctors",
    label: "Doctors",
    title: "Doctors & Specialists",
    subtitle: "Edit doctor bios, photos, M.D.S. credentials, specializations, and display order.",
    group: "website",
  },
  {
    key: "treatments",
    slug: "treatments",
    label: "Treatments",
    title: "Clinical Treatments",
    subtitle: "Manage TMJ care, orthodontics, implants, photos, highlights, and categories.",
    group: "website",
  },
  {
    key: "testimonials",
    slug: "testimonials",
    label: "Testimonials & Gallery",
    title: "Testimonials, Reviews & Smile Gallery",
    subtitle: "Edit existing verified reviews, add new patient testimonials, and manage transformation photos.",
    group: "website",
  },
  {
    key: "admins",
    slug: "credentials",
    label: "Admin Credentials",
    title: "Admin Credentials",
    subtitle: "Update your clinic administrator username and password.",
    group: "system",
  },
];

export function getAdminPath(key: AdminPageKey): string {
  const route = ADMIN_ROUTES.find((r) => r.key === key);
  if (!route || !route.slug) return "/admin/";
  return `/admin/${route.slug}`;
}

export function resolveAdminRoute(pathname: string): AdminPageKey {
  const cleanPath = (pathname || "").split(/[?#]/)[0];
  const normalized = cleanPath.replace(/\/+$/, "");
  const match = normalized.match(/^\/admin(?:\/(.*))?$/i);
  const tail = (match?.[1] || "").toLowerCase().trim();
  if (!tail) return "overview";
  if (tail === "content") return "branding";
  const found = ADMIN_ROUTES.find((r) => r.slug === tail || r.key === tail);
  return found ? found.key : "overview";
}

export function getAdminRouteMeta(key: AdminPageKey): AdminRouteMeta {
  return ADMIN_ROUTES.find((r) => r.key === key) || ADMIN_ROUTES[0];
}
