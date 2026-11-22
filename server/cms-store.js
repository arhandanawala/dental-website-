import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const dataDir = path.join(process.cwd(), "data");
const cmsPath = path.join(dataDir, "cms.json");

export const DEFAULT_SITE_CONTENT = {
  clinicName: "Smile Masters & Jaw Joint Matters",
  tagline: "TMJ Care, Orthodontics & Comprehensive Dentistry in Bandra West, Mumbai",
  foundedYear: "2006",
  phone: "+91 77389 68210",
  email: "info@smilemastersindia.com",
  address:
    "Zeba Apartments, 3rd Floor, Hill Road (Above Mamamia Pizza, next to Tea Villa Cafe), Santosh Nagar, Bandra West, Mumbai, Maharashtra 400050",
  city: "Bandra West, Mumbai",
  openingHours: "Monday – Saturday · By Appointment (In-Clinic & Online TMJ Consultations)",
  heroEyebrow: "Bandra West, Mumbai · Est. 2006",
  heroHeadline: "Smile Masters & Jaw Joint Matters",
  heroMobileHeadline: "Specialist TMJ & Dental Care in Bandra West",
  heroDescription:
    "40+ years of combined expertise by Prof. Dr. Moez Khakiani and Dr. Laila Khakiani — dedicated to TMJ & jaw joint pain relief, smile design, dental implants, full-mouth rehabilitation, and braces & aligners.",
  heroCtaText: "Request Appointment",
  heroCtaLink: "#book-appointment",
  heroSecondaryCtaText: "Explore Treatments",
  heroSecondaryCtaLink: "service.html",
  heroDesktopImage: "assets/img/smilemasters/dr-laila-dr-moez.jpg",
  heroMobileImage: "assets/img/smilemasters/dr-laila-dr-moez.jpg",
  aboutEyebrow: "About Smile Masters",
  aboutHeadline: "Patients First, Always — Mastering Smiles & Jaw Joint Harmony Since 2006",
  aboutDescription:
    "Started in 2006 on Hill Road, Bandra West by Prof. Dr. Moez Khakiani (M.D.S. Prosthodontist & Implantologist) and Dr. Laila Khakiani (M.D.S. Orthodontist & Smile Designing Expert), Smile Masters & Jaw Joint Matters brings together 40 years of combined clinical expertise across TMJ pain management, orthodontics, clear aligners, dental implants, and full-mouth rehabilitation.",
  doctorsSectionTitle: "Meet The Smile Masters",
  doctorsSectionSubtitle:
    "Prof. Dr. Moez Khakiani and Dr. Laila Khakiani — uniting prosthodontics, TMJ & orofacial pain care, implantology, and orthodontics under one roof in Bandra West.",
  treatmentsSectionTitle: "Our Clinical Treatments",
  treatmentsSectionSubtitle:
    "Whether you are seeking relief from jaw joint pain, a natural smile makeover, orthodontic bite correction, or full-mouth rehabilitation, every treatment begins with thorough computer-aided diagnosis.",
  bookingNotice:
    "Submitting a request does not automatically confirm a slot — our Bandra West clinic desk will contact you promptly to confirm your appointment.",
  footerDescription:
    "Smile Masters & Jaw Joint Matters | TMJ — Founded in 2006 in Bandra West, Mumbai by Prof. Dr. Moez Khakiani and Dr. Laila Khakiani.",
  socialInstagram: "https://www.instagram.com/smilemastersindia/",
  socialFacebook: "https://www.facebook.com/smilemastersindia/",
  socialYoutube: "https://www.youtube.com/@DrMoezKhakianiMDSMumbai",
  socialLinkedin: "https://maps.app.goo.gl/J5YAuRDmQN1JFxho7",
  notificationEmail: "info@smilemastersindia.com",
  notifyOnNewLead: true,
  notifyOnNewAppointment: true,
  faqs: [
    {
      question: "Where is Smile Masters & Jaw Joint Matters located?",
      answer:
        "We are located at Zeba Apartments, 3rd Floor, Hill Road (Landmarks: Above Mamamia Pizza, next to Tea Villa Cafe), Santosh Nagar, Bandra West, Mumbai, Maharashtra 400050.",
    },
    {
      question: "How do I book an in-clinic or online TMJ consultation?",
      answer:
        "Submit the appointment request form on this page, message us on WhatsApp, or call +91 77389 68210. Our Bandra West reception team will review your preferred date and confirm your slot directly.",
    },
    {
      question: "What TMJ and jaw joint concerns does Dr. Moez Khakiani treat?",
      answer:
        "Prof. Dr. Moez Khakiani offers non-surgical, non-invasive TMJ care using computer-aided diagnostics for jaw pain, clicking or popping, limited mouth opening, jaw locking, teeth grinding (bruxism), clenching, and bite-related headaches.",
    },
    {
      question: "Does Dr. Laila Khakiani treat both children and adults with braces and aligners?",
      answer:
        "Yes. Dr. Laila Khakiani (M.D.S. Orthodontist & Smile Designing Expert) treats children, teens, and adults using metal and ceramic braces, clear aligners, and myofunctional appliances to guide healthy jaw growth and bite correction.",
    },
  ],
};

export const DEFAULT_DOCTORS = [
  {
    id: "dr-moez-khakiani",
    name: "Prof. Dr. Moez Khakiani",
    credentials: "M.D.S. Prosthodontist & Implantologist",
    role: "Co-Founder · TMJ, Bite Reconstruction & Implant Dentistry",
    bio: "A Smile and Bite Reconstruction Specialist — TMJ Care, Full-Mouth Rehabilitation, Dental Implants, and Porcelain Veneer Master. Internationally acclaimed author, speaker, and mentor with fellowship training in TMD, Orofacial Pain, and Dental Sleep Medicine, trusted by fellow clinicians across Mumbai for complex jaw pain and rehabilitation cases.",
    specializations: [
      "TMJ & Orofacial Pain Care",
      "Full-Mouth Rehabilitation",
      "Bite Reconstruction",
      "Dental Implants",
      "Porcelain Veneers",
    ],
    experience: "Practicing in Bandra West since 2006 · Author, Speaker & Mentor",
    photoUrl: "assets/img/smilemasters/dr-moez-khakiani.jpg",
    published: true,
    sortOrder: 1,
  },
  {
    id: "dr-laila-khakiani",
    name: "Dr. Laila Khakiani",
    credentials: "M.D.S. Orthodontist & Smile Designing Expert",
    role: "Co-Founder · Orthodontics, Clear Aligners & Bite Correction",
    bio: "Highly skilled orthodontist with over two decades of experience transforming smiles and improving oral health. Completed her Master’s in Orthodontics in 2010 from Sri Sai College of Dental Surgery, dedicating her practice to exclusive orthodontics, braces, clear aligners, myofunctional appliances for growing children, and functional bite harmony.",
    specializations: [
      "Orthodontics & Braces",
      "Clear Aligners",
      "Smile Designing",
      "Bite Correction",
      "Myofunctional Appliances",
    ],
    experience: "Over two decades of clinical experience · M.D.S. Orthodontics (2010)",
    photoUrl: "assets/img/smilemasters/dr-laila-khakiani.jpg",
    published: true,
    sortOrder: 2,
  },
];

export const DEFAULT_TREATMENTS = [
  {
    id: "tmj-jaw-joint-disorders",
    title: "TMJ & Jaw Joint Disorders",
    slug: "tmj-jaw-joint-disorders",
    category: "TMJ & Jaw Joint Care",
    shortDescription:
      "Non-surgical, computer-aided diagnosis and individualized therapy for temporomandibular joint disorders and bite imbalance.",
    fullDescription:
      "Led by Prof. Dr. Moez Khakiani, our TMJ clinic evaluates temporomandibular joint mechanics, occlusal forces, and muscular tension to address root-cause jaw discomfort and restore natural jaw harmony.",
    highlights: [
      "Non-surgical, non-invasive TMJ care",
      "Computer-aided joint & bite diagnostics",
      "In-clinic & online consultation options",
    ],
    imageUrl: "assets/img/smilemasters/tmj-treatment.jpg",
    published: true,
    sortOrder: 1,
  },
  {
    id: "jaw-clicking-jaw-pain",
    title: "Jaw Clicking & Jaw Pain",
    slug: "jaw-clicking-jaw-pain",
    category: "TMJ & Jaw Joint Care",
    shortDescription:
      "Focused assessment for clicking, popping sounds, facial tenderness, ear discomfort, or pain while chewing and speaking.",
    fullDescription:
      "Targeted functional examination of joint disc movement, bite contacts, and masticatory muscles to identify why your jaw clicks or aches and plan structured relief.",
    highlights: [
      "Joint sound & movement analysis",
      "Root-cause bite evaluation",
      "Structured follow-up care",
    ],
    imageUrl: "assets/img/smilemasters/tmd-care.jpg",
    published: true,
    sortOrder: 2,
  },
  {
    id: "limited-mouth-opening",
    title: "Limited Mouth Opening",
    slug: "limited-mouth-opening",
    category: "TMJ & Jaw Joint Care",
    shortDescription:
      "Clinical evaluation for jaw stiffness, morning tightness, locking episodes, or restricted mouth opening.",
    fullDescription:
      "Detailed screening of temporomandibular joint range of motion and neuromuscular tension to safely unlock restricted jaw movement and restore everyday comfort.",
    highlights: [
      "Joint mobility & range screening",
      "Muscular & disc-lock assessment",
      "Conservative functional therapy",
    ],
    imageUrl: "assets/img/smilemasters/clinic-dental-chair.jpg",
    published: true,
    sortOrder: 3,
  },
  {
    id: "teeth-grinding-clenching",
    title: "Teeth Grinding & Clenching",
    slug: "teeth-grinding-clenching",
    category: "TMJ & Jaw Joint Care",
    shortDescription:
      "Precision care for bruxism, daytime or night-time clenching, enamel wear, and morning headaches.",
    fullDescription:
      "Comprehensive evaluation of tooth wear patterns, night-time clenching forces, and sleep-related jaw strain with custom orthotic appliances tailored to protect teeth and joints.",
    highlights: [
      "Tooth wear & occlusal analysis",
      "Custom protective orthotics",
      "Headache & morning soreness relief",
    ],
    imageUrl: "assets/img/smilemasters/clinic-why-choose-us.jpg",
    published: true,
    sortOrder: 4,
  },
  {
    id: "online-tmj-consultations",
    title: "Online TMJ Consultations",
    slug: "online-tmj-consultations",
    category: "TMJ & Jaw Joint Care",
    shortDescription:
      "Expert TMJ guidance from Prof. Dr. Moez Khakiani for patients outside Mumbai or seeking a specialist second opinion.",
    fullDescription:
      "Structured online video consultation covering symptom history, existing scans or reports, and clear next-step guidance before travelling to Bandra West.",
    highlights: [
      "Initial TMJ evaluation & report review",
      "Ideal for outstation & international patients",
      "Clear roadmap before in-clinic visits",
    ],
    imageUrl: "assets/img/smilemasters/online-tmj-consultation.jpg",
    published: true,
    sortOrder: 5,
  },
  {
    id: "orthodontics-and-braces",
    title: "Orthodontics & Braces",
    slug: "orthodontics-and-braces",
    category: "Orthodontics & Smile Design",
    shortDescription:
      "Metal, ceramic, and growth-guided orthodontic treatment for children, teens, and adults by Dr. Laila Khakiani.",
    fullDescription:
      "Exclusive specialist orthodontic care addressing crowded or crooked teeth, bite irregularities, and skeletal growth guidance using myofunctional appliances and fixed mechanotherapy.",
    highlights: [
      "Led by Dr. Laila Khakiani (M.D.S.)",
      "Metal, ceramic & myofunctional options",
      "Functional bite harmony for all ages",
    ],
    imageUrl: "assets/img/smilemasters/braces-treatment.jpg",
    published: true,
    sortOrder: 6,
  },
  {
    id: "clear-aligners",
    title: "Clear Aligners",
    slug: "clear-aligners",
    category: "Orthodontics & Smile Design",
    shortDescription:
      "Discreet, removable invisible braces digitally planned and supervised by an experienced M.D.S. Orthodontist.",
    fullDescription:
      "Specialist-directed clear aligner therapy engineered around both natural smile aesthetics and long-term bite stability rather than unsupervised trays.",
    highlights: [
      "Orthodontist-planned invisible braces",
      "Removable & comfortable daily wear",
      "Regular specialist progress checks",
    ],
    imageUrl: "assets/img/smilemasters/invisible-braces.jpg",
    published: true,
    sortOrder: 7,
  },
  {
    id: "smile-makeovers",
    title: "Smile Makeovers",
    slug: "smile-makeovers",
    category: "Orthodontics & Smile Design",
    shortDescription:
      "Digital smile designing and porcelain veneers crafted to complement your facial harmony and natural bite.",
    fullDescription:
      "Collaborative aesthetic planning uniting Dr. Moez Khakiani’s prosthodontic artistry with Dr. Laila Khakiani’s orthodontic precision for natural, radiant, durable smiles.",
    highlights: [
      "Digital Smile Designing preview",
      "Porcelain veneers & aesthetic restorations",
      "Built for long-term bite comfort",
    ],
    imageUrl: "assets/img/smilemasters/smile-makeover.jpg",
    published: true,
    sortOrder: 8,
  },
  {
    id: "full-mouth-rehabilitation",
    title: "Full-Mouth Rehabilitation",
    slug: "full-mouth-rehabilitation",
    category: "Prosthodontics & Implants",
    shortDescription:
      "Holistic reconstruction of worn, broken, or missing teeth to regain comfortable chewing, bite height, and confidence.",
    fullDescription:
      "Prosthodontist-led full-mouth rehabilitation designed to rebuild vertical dimension, harmonize jaw joints, and restore natural aesthetics in a carefully sequenced plan.",
    highlights: [
      "Prosthodontist-led bite reconstruction",
      "TMJ & neuromuscular harmony",
      "Restores natural chewing & aesthetics",
    ],
    imageUrl: "assets/img/smilemasters/fmr-treatment.jpg",
    published: true,
    sortOrder: 9,
  },
  {
    id: "dental-implants",
    title: "Dental Implants",
    slug: "dental-implants",
    category: "Prosthodontics & Implants",
    shortDescription:
      "Biocompatible implant tooth replacements engineered for lasting stability, natural appearance, and balanced bite forces.",
    fullDescription:
      "Precision implantology and prosthodontic crown placement for single or multiple missing teeth, carefully planned around bone health and bite mechanics.",
    highlights: [
      "Prosthodontist & Implantologist care",
      "Single-tooth & full-arch solutions",
      "Natural look and chewing function",
    ],
    imageUrl: "assets/img/smilemasters/dental-implants.jpg",
    published: true,
    sortOrder: 10,
  },
  {
    id: "preventive-restorative-dentistry",
    title: "Preventive & Painless Restorative Care",
    slug: "preventive-restorative-dentistry",
    category: "General & Family Care",
    shortDescription:
      "Gentle, painless dental check-ups, cleanings, tooth-colored fillings, and conservative restorations.",
    fullDescription:
      "Comfort-first preventive dentistry and conservative restorative care designed to detect concerns early, minimize discomfort, and preserve your natural teeth for life.",
    highlights: [
      "Comfort-first, painless protocols",
      "Digital imaging & early detection",
      "Natural tooth-colored restorations",
    ],
    imageUrl: "assets/img/smilemasters/painless-dental-treatment.jpg",
    published: true,
    sortOrder: 11,
  },
  {
    id: "kids-dental-care",
    title: "Kids' Dental Care",
    slug: "kids-dental-care",
    category: "General & Family Care",
    shortDescription:
      "Warm, fear-free dental visits, cavity prevention, and early jaw growth guidance for growing children.",
    fullDescription:
      "Child-friendly preventive dentistry paired with early orthodontic growth monitoring so children build healthy habits and optimal jaw development from their very first visits.",
    highlights: [
      "Gentle, anxiety-free environment",
      "Preventive cavity protection",
      "Early jaw & orthodontic screening",
    ],
    imageUrl: "assets/img/smilemasters/kids-dental-care.jpg",
    published: true,
    sortOrder: 12,
  },
  {
    id: "emergency-dental-care",
    title: "Emergency Dental Care",
    slug: "emergency-dental-care",
    category: "General & Family Care",
    shortDescription:
      "Prompt Bandra West clinical attention for sudden toothache, fractured teeth, swelling, or acute jaw locking.",
    fullDescription:
      "Call our clinic desk on +91 77389 68210 for urgent dental trauma, acute tooth pain, or sudden jaw locking so our team can prioritize your assessment.",
    highlights: [
      "Direct phone & WhatsApp triage",
      "Toothache & fracture management",
      "Acute jaw pain & locking relief",
    ],
    imageUrl: "assets/img/smilemasters/emergency-dental-care.jpg",
    published: true,
    sortOrder: 13,
  },
];

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
  if (s.startsWith("#") || s.startsWith("/") || /^[a-z0-9._/-]+$/i.test(s)) return true;
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
  if (s.startsWith("data:image/")) return s.length <= 450_000;
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
    testimonials: [],
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
    return {
      siteContent: { ...DEFAULT_SITE_CONTENT, ...(parsed.siteContent || {}) },
      doctors: Array.isArray(parsed.doctors) ? parsed.doctors : [],
      treatments: Array.isArray(parsed.treatments) ? parsed.treatments : [],
      testimonials: Array.isArray(parsed.testimonials) ? parsed.testimonials : [],
      leads: Array.isArray(parsed.leads) ? parsed.leads : [],
      appointments: Array.isArray(parsed.appointments) ? parsed.appointments : [],
    };
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

  state.siteContent = {
    ...prev,
    clinicName: cleanText(input.clinicName ?? prev.clinicName, 160) || prev.clinicName,
    tagline: cleanText(input.tagline ?? prev.tagline, 240),
    foundedYear: cleanText(input.foundedYear ?? prev.foundedYear, 20),
    phone: cleanText(input.phone ?? prev.phone, 40) || prev.phone,
    email: cleanText(input.email ?? prev.email, 160) || prev.email,
    address: cleanText(input.address ?? prev.address, 400) || prev.address,
    city: cleanText(input.city ?? prev.city, 120),
    openingHours: cleanText(input.openingHours ?? prev.openingHours, 300),
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
  const quote = cleanMultiline(input.quote ?? prev?.quote, 1500);
  if (!reviewerName) throw new Error("Reviewer name is required.");
  if (quote.length < 5) throw new Error("Testimonial quote must be at least 5 characters.");

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

  const now = new Date().toISOString();
  const record = {
    id,
    reviewerName,
    reviewerContext: cleanText(input.reviewerContext ?? prev?.reviewerContext, 160),
    quote,
    consentConfirmed,
    published,
    sortOrder: input.sortOrder !== undefined ? Number(input.sortOrder) : nextOrder,
    createdAt: prev?.createdAt || now,
    updatedAt: now,
  };

  if (idx >= 0) state.testimonials[idx] = record;
  else state.testimonials.push(record);
  save(state);
  return record;
}

export function deleteTestimonial(id) {
  const state = load();
  const before = state.testimonials.length;
  state.testimonials = state.testimonials.filter((t) => t.id !== id);
  if (state.testimonials.length === before) return false;
  save(state);
  return true;
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

  state.siteContent = { ...DEFAULT_SITE_CONTENT, ...state.siteContent, updatedAt: now };

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

  save(state);
  return { created };
}
