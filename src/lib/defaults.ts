import type { Doctor, SiteContent, Testimonial, Treatment } from "./types";

export const PRIMARY_ADMIN_EMAIL = "arhandanawala@gmail.com";

export const DEFAULT_CASE_GALLERY = [
  {
    id: "case-1",
    imageUrl: "assets/img/smilemasters/case-review-1.jpg",
    caption: "Smile Masters patient smile transformation story 1",
  },
  {
    id: "case-2",
    imageUrl: "assets/img/smilemasters/case-review-2.jpg",
    caption: "Smile Masters patient smile transformation story 2",
  },
  {
    id: "case-3",
    imageUrl: "assets/img/smilemasters/case-review-3.jpg",
    caption: "Smile Masters patient smile transformation story 3",
  },
  {
    id: "case-4",
    imageUrl: "assets/img/smilemasters/case-review-4.jpg",
    caption: "Smile Masters patient smile transformation story 4",
  },
  {
    id: "case-5",
    imageUrl: "assets/img/smilemasters/case-review-5.jpg",
    caption: "Smile Masters patient smile transformation story 5",
  },
  {
    id: "case-6",
    imageUrl: "assets/img/smilemasters/case-review-6.jpg",
    caption: "Smile Masters patient smile transformation story 6",
  },
];

export const DEFAULT_TESTIMONIALS: Omit<Testimonial, "createdAt" | "updatedAt">[] = [
  {
    id: "google-review-bandra-1",
    reviewerName: "Verified Google Review · Bandra West",
    reviewerContext: "Smile Masters & Jaw Joint Matters",
    quote: "",
    rating: 5,
    source: "Google Review",
    imageUrl: "assets/img/smilemasters/patient-review-1.png",
    consentConfirmed: true,
    published: true,
    sortOrder: 1,
  },
  {
    id: "google-review-tmj-2",
    reviewerName: "Verified Google Review · TMJ & Dental Care",
    reviewerContext: "Smile Masters Mumbai",
    quote: "",
    rating: 5,
    source: "Google Review",
    imageUrl: "assets/img/smilemasters/patient-review-2.png",
    consentConfirmed: true,
    published: true,
    sortOrder: 2,
  },
];

export const DEFAULT_SITE_CONTENT: SiteContent = {
  clinicName: "Smile Masters & Jaw Joint Matters",
  tagline: "TMJ Care, Orthodontics & Comprehensive Dentistry in Bandra West, Mumbai",
  foundedYear: "2006",
  logoUrl: "",
  logoAlt: "Smile Masters & Jaw Joint Matters",
  phone: "+91 77389 68210",
  whatsappNumber: "+91 77389 68210",
  email: "info@smilemastersindia.com",
  address:
    "Zeba Apartments, 3rd Floor, Hill Road (Above Mamamia Pizza, next to Tea Villa Cafe), Santosh Nagar, Bandra West, Mumbai, Maharashtra 400050",
  city: "Bandra West, Mumbai",
  openingHours: "Monday – Saturday · By Appointment (In-Clinic & Online TMJ Consultations)",
  googleMapsUrl: "https://maps.app.goo.gl/J5YAuRDmQN1JFxho7",
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
  testimonialsSectionEyebrow: "Real Stories, Real Smiles",
  testimonialsSectionTitle: "What Our Patients Say & Experience",
  testimonialsSectionNote:
    "Real patient feedback published directly from Smile Masters & Google Reviews.",
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
  caseGalleryImages: DEFAULT_CASE_GALLERY,
};

export const DEFAULT_DOCTORS: Omit<Doctor, "createdAt" | "updatedAt">[] = [
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

export const DEFAULT_TREATMENTS: Omit<Treatment, "createdAt" | "updatedAt">[] = [
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
