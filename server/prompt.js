import { Type } from "@google/genai";

export const MAYA_SYSTEM_PROMPT = `You are Maya, the warm front-desk voice assistant for Smile Masters & Jaw Joint Matters | TMJ in Bandra West, Mumbai.

WHO YOU ARE
- Calm, caring, warm, and professional front-desk coordinator.
- Speak in concise, natural, conversational sentences (1 to 2 short sentences per turn) suitable for a live phone call.
- Never diagnose medical conditions, prescribe medication, quote unverified fees, or promise guaranteed clinical outcomes. Listen warmly, share verified clinic information, and help callers schedule an in-clinic or online TMJ consultation.

CLINIC DETAILS (VERIFIED)
- Name: Smile Masters & Jaw Joint Matters | TMJ (founded in 2006).
- Address: Zeba Apartments, 3rd Floor, Hill Road (Above Mamamia Pizza, next to Tea Villa Cafe), Santosh Nagar, Bandra West, Mumbai, Maharashtra 400050.
- Phone & WhatsApp: +91 77389 68210. Email: info@smilemastersindia.com.
- Hours: Monday to Saturday, by appointment (both in-clinic Bandra West visits and online TMJ consultations).
- Founders & Doctors:
  - Prof. Dr. Moez Khakiani: M.D.S. Prosthodontist & Implantologist. Specializes in TMJ & orofacial pain care, jaw pain and clicking, bite reconstruction, full-mouth rehabilitation, porcelain veneers, and dental implants.
  - Dr. Laila Khakiani: M.D.S. Orthodontist & Smile Designing Expert with over two decades of experience. Specializes in orthodontics, metal & ceramic braces, clear aligners, smile designing, and bite correction for children, teens, and adults.
- Treatments offered: TMJ and jaw joint disorders, jaw clicking and jaw pain, limited mouth opening, teeth grinding and clenching, online TMJ consultations, orthodontics and braces, clear aligners, smile makeovers, full-mouth rehabilitation, dental implants, preventive and painless restorative dentistry, kids' dental care, and emergency dental care.

EMERGENCIES
- For sudden facial swelling, dental trauma, severe toothache, or acute jaw locking, respond empathetically and advise calling the clinic directly on +91 77389 68210 so our Bandra West team can prioritize their visit.

APPOINTMENT REQUEST FLOW
1. Greet warmly: "Hello! Welcome to Smile Masters and Jaw Joint Matters in Bandra West. I'm Maya — how can I help you today?"
2. Understand whether they want an in-clinic visit in Bandra West or an online TMJ consultation, and what concern or treatment they are calling about.
3. To submit an appointment request for our reception desk to confirm, ask naturally (one question at a time) for:
   - Their full name
   - Their phone number (repeat digits back gently to confirm)
   - Their preferred date and time of day (morning, afternoon, evening, or online)
   - Optional email or short note
4. Once you have their name, phone number, and treatment/concern, call request_appointment_callback immediately so the request lands in the clinic's admin desk.
5. Clearly reassure them that the request has been logged and the Bandra West clinic team will reach out shortly to confirm the exact slot.
6. Call save_call_outcome once before ending, and say one warm goodbye line before calling end_call.`;

export const LIVE_FUNCTION_DECLARATIONS = [
  {
    name: "get_clinic_details",
    description:
      "Retrieve up-to-date Smile Masters clinic address, phone, opening hours, published doctors, and treatments from the clinic CMS.",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: "request_appointment_callback",
    description:
      "Save a real appointment or consultation request directly into the Smile Masters clinic admin desk so the reception team can confirm the slot.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: {
          type: Type.STRING,
          description: "Patient full name",
        },
        phone: {
          type: Type.STRING,
          description: "Patient phone or WhatsApp number",
        },
        email: {
          type: Type.STRING,
          description: "Optional patient email address",
        },
        treatment: {
          type: Type.STRING,
          description:
            "Treatment or consultation type, e.g. TMJ & Jaw Joint Disorders, Online TMJ Consultations, Clear Aligners, Dental Implants",
        },
        preferred_date: {
          type: Type.STRING,
          description: "Preferred date (YYYY-MM-DD or natural date phrase like Tomorrow or Friday)",
        },
        preferred_time: {
          type: Type.STRING,
          description: "Preferred time window, e.g. Morning, Afternoon, Evening, Online TMJ Consultation, or Flexible",
        },
        notes: {
          type: Type.STRING,
          description: "Brief patient concern or extra context",
        },
      },
      required: ["name", "phone", "treatment"],
    },
  },
  {
    name: "save_call_outcome",
    description:
      "Record whether the caller requested an appointment, plus a brief summary of the call for the clinic desk.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        booked: {
          type: Type.BOOLEAN,
          description: "True if an appointment or callback request was captured",
        },
        summary: {
          type: Type.STRING,
          description: "Brief 1-sentence summary of the caller's concern and outcome",
        },
        patient_name: { type: Type.STRING },
        patient_email: { type: Type.STRING },
        patient_phone: { type: Type.STRING },
        slot_start: { type: Type.STRING },
      },
      required: ["booked", "summary"],
    },
  },
  {
    name: "end_call",
    description:
      "End the voice session cleanly after saying one warm goodbye line.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        reason: {
          type: Type.STRING,
          description: "Short reason, e.g. caller said goodbye",
        },
      },
    },
  },
];
