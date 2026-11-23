import test from "node:test";
import assert from "node:assert/strict";
import {
  validateLeadInput,
  validateAppointmentInput,
  createCooldownGuard,
  escapeCsvCell,
  formatLeadsToCsv,
  isSafeHref,
  isSafeImageSrc,
  reorderItems,
  slugify,
} from "./validation.ts";

test("validateLeadInput accepts valid enquiry and rejects invalid fields or honeypot", () => {
  const ok = validateLeadInput({
    name: "Aarav Mehta",
    phone: "+91 98201 12345",
    email: "aarav@example.com",
    enquiryType: "Callback",
    message: "Looking for a TMJ evaluation.",
  });
  assert.equal(ok.valid, true);
  assert.deepEqual(ok.errors, {});

  const badPhone = validateLeadInput({
    name: "Aarav Mehta",
    phone: "123",
    email: "not-an-email",
  });
  assert.equal(badPhone.valid, false);
  assert.ok(badPhone.errors.phone);
  assert.ok(badPhone.errors.email);

  const bot = validateLeadInput({
    name: "Bot",
    phone: "+91 98201 12345",
    honeypot: "http://spam.example",
  });
  assert.equal(bot.valid, false);
  assert.ok(bot.errors.form);
});

test("validateAppointmentInput enforces required name, phone, treatment, and date", () => {
  const missing = validateAppointmentInput({
    name: "R",
    phone: "12",
    treatment: "",
    preferredDate: "",
  });
  assert.equal(missing.valid, false);
  assert.ok(missing.errors.name);
  assert.ok(missing.errors.phone);
  assert.ok(missing.errors.treatment);
  assert.ok(missing.errors.preferredDate);

  const valid = validateAppointmentInput({
    name: "Riya Sharma",
    phone: "+91 77389 68210",
    email: "riya@example.com",
    treatment: "TMJ & Jaw Joint Disorders",
    preferredDate: "2026-12-01",
    preferredTime: "Morning",
  });
  assert.equal(valid.valid, true);
});

test("createCooldownGuard prevents duplicate rapid submissions", () => {
  const guard = createCooldownGuard(10_000);
  assert.equal(guard("riya|+917738968210", 1000), true);
  assert.equal(guard("riya|+917738968210", 5000), false);
  assert.equal(guard("riya|+917738968210", 12000), true);
});

test("escapeCsvCell neutralizes spreadsheet formula injection", () => {
  assert.equal(escapeCsvCell("=CMD|' /C calc'!A0"), "'=CMD|' /C calc'!A0");
  assert.equal(escapeCsvCell("+91 77389 68210"), "'+91 77389 68210");
  assert.equal(escapeCsvCell('Hello, "World"'), '"Hello, ""World"""');

  const csv = formatLeadsToCsv([
    {
      id: "lead_1",
      name: "Meera Nair",
      phone: "+91 98200 00001",
      email: "meera@example.com",
      enquiryType: "Callback",
      treatment: "Clear Aligners",
      preferredContact: "Phone",
      message: "Morning call preferred, please",
      status: "New",
      notes: "",
      sourcePage: "/",
      createdAt: "2026-11-22T10:00:00.000Z",
    },
  ]);
  assert.match(csv, /^ID,Name,Phone,Email/);
  assert.match(csv, /Meera Nair/);
  assert.match(csv, /'\+91 98200 00001/);
});

test("isSafeHref and isSafeImageSrc block javascript: and traversal", () => {
  assert.equal(isSafeHref("javascript:alert(1)"), false);
  assert.equal(isSafeHref("#book-appointment"), true);
  assert.equal(isSafeHref("service.html"), true);
  assert.equal(isSafeHref("https://smilemastersindia.com"), true);

  assert.equal(isSafeImageSrc("assets/img/photo.webp"), true);
  assert.equal(isSafeImageSrc("../secret.png"), false);
  assert.equal(isSafeImageSrc("data:image/svg+xml;base64,PHN2Zz4="), false);
  assert.equal(isSafeImageSrc("data:image/webp;base64,UklGRh4AAABXRUJQ"), true);
});

test("reorderItems moves items up and down and normalizes sortOrder", () => {
  const list = [
    { id: "a", sortOrder: 1 },
    { id: "b", sortOrder: 2 },
    { id: "c", sortOrder: 3 },
  ];
  const movedUp = reorderItems(list, "c", "up");
  assert.deepEqual(
    movedUp.map((i) => [i.id, i.sortOrder]),
    [
      ["a", 1],
      ["c", 2],
      ["b", 3],
    ]
  );

  const movedDown = reorderItems(list, "a", "down");
  assert.deepEqual(
    movedDown.map((i) => [i.id, i.sortOrder]),
    [
      ["b", 1],
      ["a", 2],
      ["c", 3],
    ]
  );
  assert.equal(slugify("TMJ & Jaw Joint Disorders!"), "tmj-jaw-joint-disorders");
});

test("Admin multi-page router resolves and builds dedicated /admin/* paths", async () => {
  const { ADMIN_ROUTES, getAdminPath, resolveAdminRoute, getAdminRouteMeta } = await import(
    "../admin/lib/routes.ts"
  );

  assert.equal(getAdminPath("overview"), "/admin/");
  assert.equal(getAdminPath("branding"), "/admin/branding");
  assert.equal(getAdminPath("about"), "/admin/about");
  assert.equal(getAdminPath("contact"), "/admin/contact");
  assert.equal(getAdminPath("testimonials"), "/admin/testimonials");
  assert.equal(getAdminPath("admins"), "/admin/credentials");

  assert.equal(resolveAdminRoute("/admin"), "overview");
  assert.equal(resolveAdminRoute("/admin/"), "overview");
  assert.equal(resolveAdminRoute("/admin/branding"), "branding");
  assert.equal(resolveAdminRoute("/admin/branding/"), "branding");
  assert.equal(resolveAdminRoute("/admin/testimonials?foo=1"), "testimonials");
  assert.equal(resolveAdminRoute("/admin/credentials"), "admins");
  assert.equal(resolveAdminRoute("/admin/unknown-page"), "overview");

  for (const route of ADMIN_ROUTES) {
    const path = getAdminPath(route.key);
    assert.equal(resolveAdminRoute(path), route.key);
    assert.equal(getAdminRouteMeta(route.key).key, route.key);
  }
});

