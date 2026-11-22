import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  DEFAULT_DOCTORS,
  DEFAULT_SITE_CONTENT,
  DEFAULT_TREATMENTS,
} from "../lib/defaults";
import type { Doctor, SiteContent, Testimonial, Treatment } from "../lib/types";
import {
  createCooldownGuard,
  generateSafeId,
  isSafeHref,
  isSafeImageSrc,
  sanitizeMultiline,
  sanitizeText,
  validateAppointmentInput,
  validateLeadInput,
} from "../lib/validation";

const submitGuard = createCooldownGuard(12_000);

let currentContent: SiteContent = { ...DEFAULT_SITE_CONTENT };
let currentDoctors: Doctor[] = DEFAULT_DOCTORS.map((d) => ({ ...d }));
let currentTreatments: Treatment[] = DEFAULT_TREATMENTS.map((t) => ({ ...t }));
let currentTestimonials: Testimonial[] = [];
let activeCategory = "All";

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function phoneToTel(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, "");
  return cleaned ? `tel:${cleaned}` : "tel:+917738968210";
}

function hydrateTextAndLinks(content: SiteContent) {
  const map: Record<string, string> = {
    clinicName: content.clinicName,
    tagline: content.tagline,
    foundedYear: content.foundedYear,
    phone: content.phone,
    email: content.email,
    address: content.address,
    city: content.city,
    openingHours: content.openingHours,
    heroEyebrow: content.heroEyebrow,
    heroHeadline: content.heroHeadline,
    heroMobileHeadline: content.heroMobileHeadline,
    heroDescription: content.heroDescription,
    heroCtaText: content.heroCtaText,
    heroSecondaryCtaText: content.heroSecondaryCtaText,
    aboutEyebrow: content.aboutEyebrow,
    aboutHeadline: content.aboutHeadline,
    aboutDescription: content.aboutDescription,
    doctorsSectionTitle: content.doctorsSectionTitle,
    doctorsSectionSubtitle: content.doctorsSectionSubtitle,
    treatmentsSectionTitle: content.treatmentsSectionTitle,
    treatmentsSectionSubtitle: content.treatmentsSectionSubtitle,
    bookingNotice: content.bookingNotice,
    footerDescription: content.footerDescription,
  };

  document.querySelectorAll<HTMLElement>("[data-cms]").forEach((node) => {
    const key = node.dataset.cms;
    if (!key || !(key in map)) return;
    const val = map[key];
    if (val) node.textContent = val;
  });

  document.querySelectorAll<HTMLAnchorElement>("[data-cms-href]").forEach((anchor) => {
    const key = anchor.dataset.cmsHref;
    if (!key) return;
    if (key === "phone") {
      anchor.href = phoneToTel(content.phone);
    } else if (key === "email") {
      anchor.href = `mailto:${content.email}`;
    } else if (key === "heroCtaLink" && isSafeHref(content.heroCtaLink)) {
      anchor.href = content.heroCtaLink;
    } else if (key === "heroSecondaryCtaLink" && isSafeHref(content.heroSecondaryCtaLink)) {
      anchor.href = content.heroSecondaryCtaLink;
    } else if (key.startsWith("social")) {
      const socialVal = (content as unknown as Record<string, string>)[key] || "";
      if (socialVal && isSafeHref(socialVal)) {
        anchor.href = socialVal;
        anchor.style.display = "";
      } else {
        anchor.style.display = "none";
      }
    }
  });

  document.querySelectorAll<HTMLImageElement>("[data-cms-img]").forEach((img) => {
    const key = img.dataset.cmsImg;
    if (key === "heroDesktopImage" && content.heroDesktopImage && isSafeImageSrc(content.heroDesktopImage)) {
      img.src = content.heroDesktopImage;
      img.removeAttribute("srcset");
    } else if (key === "heroMobileImage" && content.heroMobileImage && isSafeImageSrc(content.heroMobileImage)) {
      img.src = content.heroMobileImage;
      img.removeAttribute("srcset");
    }
  });
}

function renderDoctors(doctors: Doctor[]) {
  const containers = document.querySelectorAll<HTMLElement>("[data-cms-doctors]");
  if (!containers.length) return;

  const sorted = [...doctors]
    .filter((d) => d.published)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  containers.forEach((container) => {
    container.replaceChildren();
    if (!sorted.length) {
      container.appendChild(
        el("p", "sm-cms-empty", "Doctor profiles are currently being updated by the clinic team.")
      );
      return;
    }

    sorted.forEach((docItem) => {
      const card = el("article", "sm-doctor-card");
      card.setAttribute("data-maya", `${docItem.name}. ${docItem.credentials}. ${docItem.bio}`);

      const media = el("div", "sm-doctor-media");
      const img = el("img", "sm-doctor-photo");
      img.src = isSafeImageSrc(docItem.photoUrl) && docItem.photoUrl
        ? docItem.photoUrl
        : "assets/img/smilemasters/dr-moez-khakiani.jpg";
      img.alt = `${docItem.name} — ${docItem.credentials}`;
      img.loading = "lazy";
      media.appendChild(img);

      const body = el("div", "sm-doctor-body");
      body.appendChild(el("div", "sm-doctor-creds", docItem.credentials));
      body.appendChild(el("h3", "sm-doctor-name", docItem.name));
      if (docItem.role) {
        body.appendChild(el("div", "sm-doctor-role", docItem.role));
      }
      if (docItem.experience) {
        body.appendChild(el("div", "sm-doctor-exp", docItem.experience));
      }
      body.appendChild(el("p", "sm-doctor-bio", docItem.bio));

      if (docItem.specializations?.length) {
        const list = el("ul", "sm-spec-list");
        docItem.specializations.forEach((spec) => {
          list.appendChild(el("li", "sm-spec-item", spec));
        });
        body.appendChild(list);
      }

      const cta = el("button", "sm-card-btn", `Request Consultation with ${docItem.name.split(" ")[0]} ${docItem.name.split(" ")[1] || ""}`.trim());
      cta.type = "button";
      cta.addEventListener("click", () => openBookingModal(""));
      body.appendChild(cta);

      card.appendChild(media);
      card.appendChild(body);
      container.appendChild(card);
    });
  });
}

function renderTreatments(treatments: Treatment[]) {
  const sorted = [...treatments]
    .filter((t) => t.published)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  // Update treatment dropdowns in all forms
  document.querySelectorAll<HTMLSelectElement>("[data-sm-treatment-select]").forEach((select) => {
    const prev = select.value;
    select.replaceChildren();
    const placeholder = el("option", "", "Select a treatment or consultation...");
    placeholder.value = "";
    select.appendChild(placeholder);
    sorted.forEach((t) => {
      const opt = el("option", "", t.title);
      opt.value = t.title;
      select.appendChild(opt);
    });
    const otherOpt = el("option", "", "General Consultation / Enquiry");
    otherOpt.value = "General Consultation / Enquiry";
    select.appendChild(otherOpt);
    if (prev) select.value = prev;
  });

  // Render filter tabs if present
  const filterBar = document.querySelector<HTMLElement>("[data-cms-treatment-filters]");
  if (filterBar) {
    const categories = ["All", ...Array.from(new Set(sorted.map((t) => t.category).filter(Boolean)))];
    filterBar.replaceChildren();
    categories.forEach((cat) => {
      const btn = el("button", cat === activeCategory ? "sm-filter-btn is-active" : "sm-filter-btn", cat);
      btn.type = "button";
      btn.addEventListener("click", () => {
        activeCategory = cat;
        renderTreatments(currentTreatments);
      });
      filterBar.appendChild(btn);
    });
  }

  document.querySelectorAll<HTMLElement>("[data-cms-treatments]").forEach((container) => {
    const limit = Number(container.dataset.cmsLimit || 0);
    const filtered =
      activeCategory === "All" || limit > 0
        ? sorted
        : sorted.filter((t) => t.category === activeCategory);
    const list = limit > 0 ? filtered.slice(0, limit) : filtered;

    container.replaceChildren();
    if (!list.length) {
      container.appendChild(el("p", "sm-cms-empty", "No treatments found in this category."));
      return;
    }

    list.forEach((item) => {
      const card = el("article", "sm-treatment-card");
      card.id = `treatment-${item.slug}`;
      card.setAttribute("data-maya", `${item.title}. ${item.shortDescription}`);

      const media = el("div", "sm-treatment-media");
      const img = el("img", "sm-treatment-img");
      img.src =
        isSafeImageSrc(item.imageUrl) && item.imageUrl
          ? item.imageUrl
          : "assets/img/smilemasters/tmj-treatment.jpg";
      img.alt = `${item.title} at Smile Masters & Jaw Joint Matters`;
      img.loading = "lazy";
      media.appendChild(img);

      const body = el("div", "sm-treatment-body");
      body.appendChild(el("span", "sm-treatment-cat", item.category));
      body.appendChild(el("h3", "sm-treatment-title", item.title));
      body.appendChild(el("p", "sm-treatment-desc", item.shortDescription));

      if (limit === 0 && item.fullDescription && item.fullDescription !== item.shortDescription) {
        body.appendChild(el("p", "sm-treatment-full", item.fullDescription));
      }

      if (item.highlights?.length) {
        const ul = el("ul", "sm-highlight-list");
        item.highlights.slice(0, 3).forEach((hl) => {
          ul.appendChild(el("li", "", hl));
        });
        body.appendChild(ul);
      }

      const btn = el("button", "sm-card-btn", "Request Consultation");
      btn.type = "button";
      btn.addEventListener("click", () => openBookingModal(item.title));
      body.appendChild(btn);

      card.appendChild(media);
      card.appendChild(body);
      container.appendChild(card);
    });
  });
}

function renderFaqs(content: SiteContent) {
  const containers = document.querySelectorAll<HTMLElement>("[data-cms-faqs]");
  if (!containers.length) return;
  const faqs = content.faqs || [];

  containers.forEach((container) => {
    container.replaceChildren();
    faqs.forEach((faq, index) => {
      const details = el("details", "sm-faq-item");
      if (index === 0) details.open = true;
      const summary = el("summary", "sm-faq-q", faq.question);
      const ans = el("div", "sm-faq-a", faq.answer);
      details.appendChild(summary);
      details.appendChild(ans);
      container.appendChild(details);
    });
  });
}

function renderTestimonials(items: Testimonial[]) {
  const containers = document.querySelectorAll<HTMLElement>("[data-cms-testimonials]");
  if (!containers.length) return;
  const visible = [...items]
    .filter((t) => t.published && t.consentConfirmed)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  containers.forEach((container) => {
    if (!visible.length) {
      // Preserve curated static verified review cards if already present in HTML
      if (container.querySelector(".sm-verified-reviews-shell")) return;
      container.replaceChildren();
      const notice = el("div", "sm-testimonial-placeholder");
      notice.appendChild(
        el(
          "h3",
          "sm-placeholder-title",
          "Patient Stories Published Only With Explicit Consent"
        )
      );
      notice.appendChild(
        el(
          "p",
          "sm-placeholder-copy",
          "Verified patient feedback added with permission by the clinic team in the Admin CMS will appear here."
        )
      );
      container.appendChild(notice);
      return;
    }

    let extraWrap = container.querySelector<HTMLElement>("[data-cms-testimonials-live]");
    if (!extraWrap) {
      if (!container.querySelector(".sm-verified-reviews-shell")) {
        container.replaceChildren();
      }
      extraWrap = el("div", "sm-testimonials-grid");
      extraWrap.setAttribute("data-cms-testimonials-live", "true");
      container.appendChild(extraWrap);
    } else {
      extraWrap.replaceChildren();
    }

    visible.forEach((t) => {
      const card = el("blockquote", "sm-testimonial-card");
      card.appendChild(el("p", "sm-testimonial-quote", `“${t.quote}”`));
      const footer = el("footer", "sm-testimonial-author");
      footer.appendChild(el("strong", "", t.reviewerName));
      if (t.reviewerContext) {
        footer.appendChild(el("span", "", ` · ${t.reviewerContext}`));
      }
      card.appendChild(footer);
      extraWrap.appendChild(card);
    });
  });
}

function showFormFeedback(
  form: HTMLFormElement,
  kind: "success" | "error" | "clear",
  message?: string
) {
  let box = form.querySelector<HTMLElement>("[data-sm-form-status], [data-sm-status]");
  if (!box) {
    box = el("div", "sm-form-status");
    box.setAttribute("data-sm-form-status", "true");
    box.setAttribute("role", "status");
    box.setAttribute("aria-live", "polite");
    form.appendChild(box);
  }
  if (kind === "clear") {
    box.textContent = "";
    box.className = "sm-form-status";
    return;
  }
  box.textContent = message || "";
  box.className = `sm-form-status is-${kind}`;
}

async function handleLeadFormSubmit(form: HTMLFormElement, e: Event) {
  e.preventDefault();
  if (form.dataset.submitting === "true") return;

  const fd = new FormData(form);
  const name = sanitizeText(fd.get("name"), 120);
  const phone = sanitizeText(fd.get("phone"), 32);
  const email = sanitizeText(fd.get("email"), 160);
  const enquiryType = sanitizeText(fd.get("enquiryType") || "Callback Request", 80);
  const treatment = sanitizeText(fd.get("treatment"), 140);
  const preferredContact = sanitizeText(fd.get("preferredContact") || "Phone", 40);
  const message = sanitizeMultiline(fd.get("message"), 1200);
  const honeypot = sanitizeText(fd.get("company_website"), 100);

  const check = validateLeadInput({
    name,
    phone,
    email,
    enquiryType,
    treatment,
    preferredContact,
    message,
    honeypot,
  });

  if (!check.valid) {
    const firstErr = Object.values(check.errors)[0] || "Please check the required fields.";
    showFormFeedback(form, "error", firstErr);
    return;
  }

  const fp = `lead|${name}|${phone}|${enquiryType}`;
  if (!submitGuard(fp)) {
    showFormFeedback(
      form,
      "error",
      "Your request was just submitted. Please wait a moment before submitting again."
    );
    return;
  }

  const submitBtn = form.querySelector<HTMLButtonElement | HTMLInputElement>(
    'button[type="submit"], input[type="submit"]'
  );
  const prevText =
    submitBtn instanceof HTMLButtonElement
      ? submitBtn.textContent || "Submit"
      : submitBtn?.value || "Submit";

  form.dataset.submitting = "true";
  if (submitBtn) {
    submitBtn.disabled = true;
    if (submitBtn instanceof HTMLButtonElement) submitBtn.textContent = "Submitting…";
    else submitBtn.value = "Submitting…";
  }
  showFormFeedback(form, "clear");

  try {
    const id = generateSafeId("lead");
    const payload = {
      id,
      name,
      phone,
      email,
      enquiryType,
      treatment,
      preferredContact,
      message,
      sourcePage: window.location.pathname || "/",
    };

    const apiRes = await fetch("/api/public/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!apiRes.ok) {
      const errData = await apiRes.json().catch(() => ({}));
      throw new Error(errData.error || "Could not submit enquiry.");
    }

    // Best-effort mirror to Firestore when available
    void setDoc(doc(db, "leads", id), {
      name,
      phone,
      email,
      enquiryType,
      treatment,
      preferredContact,
      message,
      status: "New",
      notes: "",
      sourcePage: window.location.pathname || "/",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }).catch(() => undefined);

    form.reset();
    showFormFeedback(
      form,
      "success",
      "Thank you — your enquiry has been received by Smile Masters. Our Bandra West team will reach out to you shortly."
    );
  } catch (err) {
    console.error("Lead submission failed:", err);
    showFormFeedback(
      form,
      "error",
      `We could not save your enquiry right now. Please try again or call us directly at ${currentContent.phone}.`
    );
  } finally {
    form.dataset.submitting = "false";
    if (submitBtn) {
      submitBtn.disabled = false;
      if (submitBtn instanceof HTMLButtonElement) submitBtn.textContent = prevText;
      else submitBtn.value = prevText;
    }
  }
}

async function handleAppointmentFormSubmit(form: HTMLFormElement, e: Event) {
  e.preventDefault();
  if (form.dataset.submitting === "true") return;

  const fd = new FormData(form);
  const name = sanitizeText(fd.get("name") || fd.get("patientName"), 120);
  const phone = sanitizeText(fd.get("phone"), 32);
  const email = sanitizeText(fd.get("email"), 160);
  const treatment = sanitizeText(fd.get("treatment"), 140);
  const preferredDate = sanitizeText(fd.get("preferredDate"), 40);
  const visitMode = sanitizeText(fd.get("visitMode"), 32);
  const rawTime = sanitizeText(fd.get("preferredTime") || "Flexible", 40);
  const preferredTime = visitMode === "Online TMJ" && !rawTime.toLowerCase().includes("online")
    ? sanitizeText(`Online · ${rawTime}`, 40)
    : rawTime;
  const preferredContact = sanitizeText(fd.get("preferredContact") || "Phone Call", 40);
  const message = sanitizeMultiline(fd.get("message"), 1200);
  const honeypot = sanitizeText(fd.get("company_website") || fd.get("website"), 100);

  const check = validateAppointmentInput({
    name,
    phone,
    email,
    treatment,
    preferredDate,
    preferredTime,
    preferredContact,
    message,
    honeypot,
  });

  if (!check.valid) {
    const firstErr = Object.values(check.errors)[0] || "Please complete all required fields.";
    showFormFeedback(form, "error", firstErr);
    return;
  }

  const fp = `appt|${name}|${phone}|${treatment}|${preferredDate}`;
  if (!submitGuard(fp)) {
    showFormFeedback(
      form,
      "error",
      "This appointment request was just submitted. Please wait a moment before trying again."
    );
    return;
  }

  const submitBtn = form.querySelector<HTMLButtonElement | HTMLInputElement>(
    'button[type="submit"], input[type="submit"]'
  );
  const prevText =
    submitBtn instanceof HTMLButtonElement
      ? submitBtn.textContent || "Request Appointment"
      : submitBtn?.value || "Request Appointment";

  form.dataset.submitting = "true";
  if (submitBtn) {
    submitBtn.disabled = true;
    if (submitBtn instanceof HTMLButtonElement) submitBtn.textContent = "Sending Request…";
    else submitBtn.value = "Sending Request…";
  }
  showFormFeedback(form, "clear");

  try {
    const id = generateSafeId("appt");
    const payload = {
      id,
      name,
      phone,
      email,
      treatment,
      preferredDate,
      preferredTime,
      preferredContact,
      message,
      sourcePage: window.location.pathname || "/",
    };

    const apiRes = await fetch("/api/public/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!apiRes.ok) {
      const errData = await apiRes.json().catch(() => ({}));
      throw new Error(errData.error || "Could not submit appointment request.");
    }

    // Best-effort mirror to Firestore when available
    void setDoc(doc(db, "appointments", id), {
      name,
      phone,
      email,
      treatment,
      preferredDate,
      preferredTime,
      preferredContact,
      message,
      status: "Pending",
      notes: "",
      sourcePage: window.location.pathname || "/",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }).catch(() => undefined);

    form.reset();
    showFormFeedback(
      form,
      "success",
      `Appointment request received. Please note this does not automatically confirm a slot — our Bandra West clinic team will contact you to confirm your appointment.`
    );
  } catch (err) {
    console.error("Appointment submission failed:", err);
    showFormFeedback(
      form,
      "error",
      `Unable to submit your appointment request right now. Please try again or call ${currentContent.phone}.`
    );
  } finally {
    form.dataset.submitting = "false";
    if (submitBtn) {
      submitBtn.disabled = false;
      if (submitBtn instanceof HTMLButtonElement) submitBtn.textContent = prevText;
      else submitBtn.value = prevText;
    }
  }
}

let bookingModalEl: HTMLElement | null = null;

function ensureBookingModal(): HTMLElement {
  if (bookingModalEl) return bookingModalEl;

  const backdrop = el("div", "sm-modal-backdrop");
  backdrop.id = "sm-appointment-modal";
  backdrop.setAttribute("role", "dialog");
  backdrop.setAttribute("aria-modal", "true");
  backdrop.setAttribute("aria-labelledby", "sm-modal-title");
  backdrop.hidden = true;

  const dialog = el("div", "sm-modal-card");
  const header = el("div", "sm-modal-header");
  const titleWrap = el("div");
  titleWrap.appendChild(el("div", "sm-modal-eyebrow", "Smile Masters & Jaw Joint Matters · Bandra West"));
  const heading = el("h2", "sm-modal-title", "Request an Appointment");
  heading.id = "sm-modal-title";
  titleWrap.appendChild(heading);

  const closeBtn = el("button", "sm-modal-close", "×");
  closeBtn.type = "button";
  closeBtn.setAttribute("aria-label", "Close appointment request form");
  closeBtn.addEventListener("click", closeBookingModal);
  header.appendChild(titleWrap);
  header.appendChild(closeBtn);

  const notice = el("p", "sm-modal-notice", currentContent.bookingNotice);
  notice.setAttribute("data-cms", "bookingNotice");

  const form = el("form", "sm-booking-form");
  form.setAttribute("data-sm-appointment-form", "modal");
  form.noValidate = true;

  const grid = el("div", "sm-form-grid");

  const makeField = (labelText: string, inputEl: HTMLElement, fullWidth = false) => {
    const wrap = el("label", fullWidth ? "sm-field sm-field-full" : "sm-field");
    wrap.appendChild(el("span", "sm-field-label", labelText));
    wrap.appendChild(inputEl);
    return wrap;
  };

  const nameInput = el("input", "sm-input");
  nameInput.name = "name";
  nameInput.type = "text";
  nameInput.required = true;
  nameInput.placeholder = "Your full name";
  nameInput.autocomplete = "name";

  const phoneInput = el("input", "sm-input");
  phoneInput.name = "phone";
  phoneInput.type = "tel";
  phoneInput.required = true;
  phoneInput.placeholder = "+91 98XXX XXXXX";
  phoneInput.autocomplete = "tel";

  const emailInput = el("input", "sm-input");
  emailInput.name = "email";
  emailInput.type = "email";
  emailInput.placeholder = "Optional email address";
  emailInput.autocomplete = "email";

  const treatmentSelect = el("select", "sm-input");
  treatmentSelect.name = "treatment";
  treatmentSelect.required = true;
  treatmentSelect.setAttribute("data-sm-treatment-select", "true");

  const dateInput = el("input", "sm-input");
  dateInput.name = "preferredDate";
  dateInput.type = "date";
  dateInput.required = true;
  dateInput.min = new Date().toISOString().split("T")[0];

  const timeSelect = el("select", "sm-input");
  timeSelect.name = "preferredTime";
  ["Morning", "Afternoon", "Evening", "Online TMJ Consultation", "Flexible"].forEach((slot) => {
    const opt = el("option", "", slot);
    opt.value = slot;
    timeSelect.appendChild(opt);
  });

  const contactSelect = el("select", "sm-input");
  contactSelect.name = "preferredContact";
  ["Phone Call", "WhatsApp / SMS", "Email"].forEach((m) => {
    const opt = el("option", "", m);
    opt.value = m;
    contactSelect.appendChild(opt);
  });

  const messageArea = el("textarea", "sm-input sm-textarea");
  messageArea.name = "message";
  messageArea.rows = 3;
  messageArea.placeholder =
    "Optional brief note (please do not share sensitive medical records here)";

  const honeypot = el("input", "sm-honeypot");
  honeypot.name = "company_website";
  honeypot.type = "text";
  honeypot.tabIndex = -1;
  honeypot.autocomplete = "off";
  honeypot.setAttribute("aria-hidden", "true");

  grid.appendChild(makeField("Full Name *", nameInput));
  grid.appendChild(makeField("Phone Number *", phoneInput));
  grid.appendChild(makeField("Email (Optional)", emailInput));
  grid.appendChild(makeField("Treatment / Consultation *", treatmentSelect));
  grid.appendChild(makeField("Preferred Date *", dateInput));
  grid.appendChild(makeField("Preferred Time", timeSelect));
  grid.appendChild(makeField("Preferred Contact Method", contactSelect, true));
  grid.appendChild(makeField("Brief Enquiry (Optional)", messageArea, true));

  form.appendChild(honeypot);
  form.appendChild(grid);

  const actions = el("div", "sm-modal-actions");
  const submit = el("button", "sm-submit-btn", "Submit Appointment Request");
  submit.type = "submit";
  actions.appendChild(submit);

  const callLink = el("a", "sm-call-link", `Or call ${currentContent.phone}`);
  callLink.href = phoneToTel(currentContent.phone);
  callLink.setAttribute("data-cms-href", "phone");
  actions.appendChild(callLink);

  form.appendChild(actions);
  form.addEventListener("submit", (e) => handleAppointmentFormSubmit(form, e));

  dialog.appendChild(header);
  dialog.appendChild(notice);
  dialog.appendChild(form);
  backdrop.appendChild(dialog);

  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) closeBookingModal();
  });

  document.body.appendChild(backdrop);
  bookingModalEl = backdrop;
  renderTreatments(currentTreatments);
  return backdrop;
}

function openBookingModal(preselectedTreatment?: string) {
  const modal = ensureBookingModal();
  modal.hidden = false;
  modal.removeAttribute("hidden");
  modal.classList.add("is-open");
  document.body.style.overflow = "hidden";
  if (preselectedTreatment) {
    const select = modal.querySelector<HTMLSelectElement>('select[name="treatment"]');
    if (select) select.value = preselectedTreatment;
  }
  const firstInput = modal.querySelector<HTMLInputElement>('input[name="name"]');
  firstInput?.focus();
}

function closeBookingModal() {
  if (!bookingModalEl) return;
  bookingModalEl.hidden = true;
  bookingModalEl.setAttribute("hidden", "");
  bookingModalEl.classList.remove("is-open");
  document.body.style.overflow = "";
}

function bindExistingFormsAndTriggers() {
  document.querySelectorAll<HTMLFormElement>("[data-sm-lead-form]").forEach((form) => {
    if (form.dataset.smBound === "true") return;
    form.dataset.smBound = "true";
    form.noValidate = true;
    form.addEventListener("submit", (e) => handleLeadFormSubmit(form, e));
  });

  document.querySelectorAll<HTMLFormElement>("[data-sm-appointment-form]").forEach((form) => {
    if (form.dataset.smBound === "true") return;
    form.dataset.smBound = "true";
    form.noValidate = true;
    const dateEl = form.querySelector<HTMLInputElement>('input[type="date"]');
    if (dateEl && !dateEl.min) {
      dateEl.min = new Date().toISOString().split("T")[0];
    }
    const modeBtns = form.querySelectorAll<HTMLButtonElement>("[data-sm-mode-btn]");
    const modeInput = form.querySelector<HTMLInputElement>('input[name="visitMode"]');
    const treatSelect = form.querySelector<HTMLSelectElement>('select[name="treatment"]');
    modeBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const mode = btn.dataset.smModeBtn || "In-Clinic";
        modeBtns.forEach((b) => {
          const active = b === btn;
          b.classList.toggle("is-active", active);
          b.setAttribute("aria-pressed", active ? "true" : "false");
        });
        if (modeInput) modeInput.value = mode;
        if (mode === "Online TMJ" && treatSelect && !treatSelect.value) {
          treatSelect.value = "Online TMJ Consultations";
        }
      });
    });
    form.addEventListener("submit", (e) => handleAppointmentFormSubmit(form, e));
  });

  document.querySelectorAll<HTMLElement>("[data-open-booking]").forEach((trigger) => {
    if (trigger.dataset.smBound === "true") return;
    trigger.dataset.smBound = "true";
    trigger.addEventListener("click", (e) => {
      e.preventDefault();
      openBookingModal(trigger.dataset.openBooking || "");
    });
  });

  document.querySelectorAll<HTMLElement>("[data-open-voice]").forEach((trigger) => {
    if (trigger.dataset.smBound === "true") return;
    trigger.dataset.smBound = "true";
    trigger.addEventListener("click", (e) => {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent("sm:open-voice-assistant"));
    });
  });

  window.addEventListener("sm:open-appointment-modal", (e) => {
    e.preventDefault();
    openBookingModal();
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeBookingModal();
  });
}

async function loadLiveCmsData() {
  try {
    const res = await fetch("/api/cms/public", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (data.siteContent) {
        currentContent = { ...DEFAULT_SITE_CONTENT, ...data.siteContent };
      }
      if (Array.isArray(data.doctors) && data.doctors.length > 0) {
        currentDoctors = data.doctors;
      }
      if (Array.isArray(data.treatments) && data.treatments.length > 0) {
        currentTreatments = data.treatments;
      }
      if (Array.isArray(data.testimonials)) {
        currentTestimonials = data.testimonials;
      }
      hydrateTextAndLinks(currentContent);
      renderDoctors(currentDoctors);
      renderTreatments(currentTreatments);
      renderFaqs(currentContent);
      renderTestimonials(currentTestimonials);
      return;
    }
  } catch {
    /* fall through to Firestore */
  }

  try {
    const [siteSnap, doctorsSnap, treatmentsSnap, testimonialsSnap] = await Promise.all([
      getDoc(doc(db, "siteContent", "main")).catch(() => null),
      getDocs(query(collection(db, "doctors"), where("published", "==", true))).catch(() => null),
      getDocs(query(collection(db, "treatments"), where("published", "==", true))).catch(() => null),
      getDocs(query(collection(db, "testimonials"), where("published", "==", true))).catch(() => null),
    ]);

    if (siteSnap && siteSnap.exists()) {
      currentContent = { ...DEFAULT_SITE_CONTENT, ...(siteSnap.data() as Partial<SiteContent>) };
    }
    if (doctorsSnap && !doctorsSnap.empty) {
      currentDoctors = doctorsSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Doctor, "id">),
      }));
    }
    if (treatmentsSnap && !treatmentsSnap.empty) {
      currentTreatments = treatmentsSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Treatment, "id">),
      }));
    }
    if (testimonialsSnap && !testimonialsSnap.empty) {
      currentTestimonials = testimonialsSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Testimonial, "id">),
      }));
    }

    hydrateTextAndLinks(currentContent);
    renderDoctors(currentDoctors);
    renderTreatments(currentTreatments);
    renderFaqs(currentContent);
    renderTestimonials(currentTestimonials);
  } catch (err) {
    console.warn("Using verified static defaults while live CMS sync initializes:", err);
  }
}

function init() {
  hydrateTextAndLinks(currentContent);
  renderDoctors(currentDoctors);
  renderTreatments(currentTreatments);
  renderFaqs(currentContent);
  renderTestimonials(currentTestimonials);
  bindExistingFormsAndTriggers();
  void loadLiveCmsData();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
