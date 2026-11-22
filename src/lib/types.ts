export type LeadStatus = "New" | "Contacted" | "Follow-up" | "Converted" | "Closed";
export type AppointmentStatus = "Pending" | "Confirmed" | "Rescheduled" | "Rejected" | "Completed";

export interface FaqItem {
  question: string;
  answer: string;
}

export interface SiteContent {
  clinicName: string;
  tagline: string;
  foundedYear: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  openingHours: string;
  heroEyebrow: string;
  heroHeadline: string;
  heroMobileHeadline: string;
  heroDescription: string;
  heroCtaText: string;
  heroCtaLink: string;
  heroSecondaryCtaText: string;
  heroSecondaryCtaLink: string;
  heroDesktopImage: string;
  heroMobileImage: string;
  aboutEyebrow: string;
  aboutHeadline: string;
  aboutDescription: string;
  doctorsSectionTitle: string;
  doctorsSectionSubtitle: string;
  treatmentsSectionTitle: string;
  treatmentsSectionSubtitle: string;
  bookingNotice: string;
  footerDescription: string;
  socialInstagram: string;
  socialFacebook: string;
  socialYoutube: string;
  socialLinkedin: string;
  notificationEmail: string;
  notifyOnNewLead: boolean;
  notifyOnNewAppointment: boolean;
  faqs: FaqItem[];
  updatedAt?: unknown;
}

export interface Doctor {
  id: string;
  name: string;
  credentials: string;
  role: string;
  bio: string;
  specializations: string[];
  experience: string;
  photoUrl: string;
  published: boolean;
  sortOrder: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Treatment {
  id: string;
  title: string;
  slug: string;
  category: string;
  shortDescription: string;
  fullDescription: string;
  highlights: string[];
  imageUrl: string;
  published: boolean;
  sortOrder: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Testimonial {
  id: string;
  reviewerName: string;
  reviewerContext: string;
  quote: string;
  consentConfirmed: boolean;
  published: boolean;
  sortOrder: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  enquiryType: string;
  treatment: string;
  preferredContact: string;
  message: string;
  status: LeadStatus;
  notes: string;
  sourcePage: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Appointment {
  id: string;
  name: string;
  phone: string;
  email: string;
  treatment: string;
  preferredDate: string;
  preferredTime: string;
  preferredContact: string;
  message: string;
  status: AppointmentStatus;
  notes: string;
  sourcePage: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AdminUser {
  email: string;
  displayName: string;
  role: "admin" | "super_admin";
  addedBy: string;
  createdAt?: unknown;
}
