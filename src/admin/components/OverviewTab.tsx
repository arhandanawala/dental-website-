import React from "react";
import {
  Users,
  CalendarClock,
  CheckCircle2,
  Inbox,
  Stethoscope,
  Sparkles,
  Database,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import type { Appointment, Doctor, Lead, SiteContent, Testimonial, Treatment } from "../../lib/types";
import { formatDisplayDate } from "../../lib/validation";

interface OverviewTabProps {
  siteContent: SiteContent;
  leads: Lead[];
  appointments: Appointment[];
  doctors: Doctor[];
  treatments: Treatment[];
  testimonials: Testimonial[];
  seeding: boolean;
  onSeedDefaults: () => Promise<void>;
  onNavigate: (tab: string) => void;
}

export function OverviewTab({
  siteContent,
  leads,
  appointments,
  doctors,
  treatments,
  testimonials,
  seeding,
  onSeedDefaults,
  onNavigate,
}: OverviewTabProps) {
  const newLeads = leads.filter((l) => l.status === "New").length;
  const pendingAppts = appointments.filter((a) => a.status === "Pending").length;
  const confirmedAppts = appointments.filter((a) => a.status === "Confirmed").length;
  const publishedDoctors = doctors.filter((d) => d.published).length;
  const publishedTreatments = treatments.filter((t) => t.published).length;
  const publishedTestimonials = testimonials.filter((t) => t.published && t.consentConfirmed).length;

  const stats = [
    { label: "Total Enquiries", value: leads.length, icon: Inbox, accent: "text-accent" },
    { label: "New Leads", value: newLeads, icon: Users, accent: "text-amber-300" },
    { label: "Pending Appointments", value: pendingAppts, icon: CalendarClock, accent: "text-sky-300" },
    { label: "Confirmed Appointments", value: confirmedAppts, icon: CheckCircle2, accent: "text-booked" },
  ];

  const needsSeed = doctors.length === 0 || treatments.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-ink">Clinic Dashboard Overview</h2>
          <p className="text-sm text-muted mt-0.5">
            Live Smile Masters Clinic CMS connected to {siteContent.clinicName} ({siteContent.city}).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onSeedDefaults}
            disabled={seeding}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent/15 border border-accent/35 text-accent text-xs font-semibold hover:bg-accent/25 transition disabled:opacity-60 cursor-pointer"
          >
            <Database className="w-4 h-4" />
            {seeding ? "Syncing Defaults..." : needsSeed ? "Seed Verified Clinic Defaults" : "Ensure Clinic Defaults"}
          </button>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-line text-xs text-ink hover:bg-secondary"
          >
            <span>Open Public Site</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {needsSeed && (
        <div className="rounded-2xl border border-accent/40 bg-accent/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-sm text-ink">
            <strong>First-time Firestore setup:</strong> Click{" "}
            <span className="text-accent font-semibold">Seed Verified Clinic Defaults</span> to populate verified Smile Masters clinic details, Dr. Moez Khakiani, Dr. Laila Khakiani, and all 13 verified treatments in Firestore.
          </div>
          <button
            type="button"
            onClick={onSeedDefaults}
            disabled={seeding}
            className="shrink-0 px-4 py-2 rounded-xl bg-accent text-primary-foreground text-xs font-semibold cursor-pointer"
          >
            {seeding ? "Seeding..." : "Seed Now"}
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-panel border border-line rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted">{s.label}</span>
                <Icon className={`w-4 h-4 ${s.accent}`} />
              </div>
              <div className="text-3xl font-semibold text-ink mt-2">{s.value}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-panel border border-line rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink">Website Content Overview</h3>
            <Sparkles className="w-4 h-4 text-accent" />
          </div>
          <dl className="space-y-2 text-xs">
            <div className="flex justify-between gap-2 py-1 border-b border-line/60">
              <dt className="text-muted">Published Doctors</dt>
              <dd className="font-semibold text-ink">{publishedDoctors} / {doctors.length}</dd>
            </div>
            <div className="flex justify-between gap-2 py-1 border-b border-line/60">
              <dt className="text-muted">Published Treatments</dt>
              <dd className="font-semibold text-ink">{publishedTreatments} / {treatments.length}</dd>
            </div>
            <div className="flex justify-between gap-2 py-1 border-b border-line/60">
              <dt className="text-muted">Consented Reviews</dt>
              <dd className="font-semibold text-ink">{publishedTestimonials} / {testimonials.length}</dd>
            </div>
            <div className="flex justify-between gap-2 py-1 border-b border-line/60">
              <dt className="text-muted">Clinic Phone</dt>
              <dd className="font-medium text-ink">{siteContent.phone}</dd>
            </div>
            <div className="flex justify-between gap-2 py-1">
              <dt className="text-muted">Clinic Email</dt>
              <dd className="font-medium text-ink truncate">{siteContent.email}</dd>
            </div>
          </dl>
        </div>

        <div className="lg:col-span-2 bg-panel border border-line rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-ink">Quick Website &amp; Clinic Pages</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { tab: "branding", title: "Logo, Branding & Hero", desc: "Upload logo, edit headlines & desktop/mobile hero photos" },
              { tab: "about", title: "About Page & Headings", desc: "Edit clinic story, section subtitles & footer text" },
              { tab: "contact", title: "Contact, WhatsApp & FAQs", desc: "Phone, WhatsApp, address, maps link & FAQs" },
              { tab: "testimonials", title: "Testimonials & Smile Gallery", desc: `${publishedTestimonials} live review(s) + ${(siteContent.caseGalleryImages || []).length} smile photos` },
              { tab: "doctors", title: "Edit Doctors & Bios", desc: "Upload photos, edit M.D.S. profiles & order" },
              { tab: "treatments", title: "Manage Treatments", desc: "Update TMJ, orthodontics & dental services" },
              { tab: "appointments", title: "Appointment Requests", desc: `${pendingAppts} pending patient request(s)` },
              { tab: "voice", title: "Maya Voice AI Calls", desc: "Review transcripts, audio & customize Maya script" },
            ].map((action) => (
              <button
                key={action.tab}
                type="button"
                onClick={() => onNavigate(action.tab)}
                className="text-left p-3.5 rounded-xl bg-canvas/70 border border-line hover:border-accent/50 transition flex items-center justify-between gap-3 cursor-pointer"
              >
                <div>
                  <div className="text-xs font-semibold text-ink">{action.title}</div>
                  <div className="text-[11px] text-muted mt-0.5">{action.desc}</div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-panel border border-line rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink">Recent Enquiries</h3>
            <button
              type="button"
              onClick={() => onNavigate("leads")}
              className="text-xs text-accent hover:underline cursor-pointer"
            >
              View all
            </button>
          </div>
          {leads.length === 0 ? (
            <p className="text-xs text-muted py-4">No enquiries submitted yet. Public callback forms save directly here.</p>
          ) : (
            <div className="divide-y divide-line">
              {leads.slice(0, 5).map((lead) => (
                <div key={lead.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-ink truncate">{lead.name}</div>
                    <div className="text-[11px] text-muted truncate">
                      {lead.phone} · {lead.treatment || lead.enquiryType}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent/15 text-accent">
                      {lead.status}
                    </span>
                    <div className="text-[10px] text-muted mt-0.5">{formatDisplayDate(lead.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-panel border border-line rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink">Recent Appointment Requests</h3>
            <button
              type="button"
              onClick={() => onNavigate("appointments")}
              className="text-xs text-accent hover:underline cursor-pointer"
            >
              View all
            </button>
          </div>
          {appointments.length === 0 ? (
            <p className="text-xs text-muted py-4">No appointment requests yet. Requests from the website appear here in real time.</p>
          ) : (
            <div className="divide-y divide-line">
              {appointments.slice(0, 5).map((appt) => (
                <div key={appt.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-ink truncate">{appt.name}</div>
                    <div className="text-[11px] text-muted truncate">
                      {appt.treatment} · {appt.preferredDate} ({appt.preferredTime || "Flexible"})
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-booked/15 text-booked">
                      {appt.status}
                    </span>
                    <div className="text-[10px] text-muted mt-0.5">{appt.phone}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-panel border border-line rounded-2xl p-4 flex items-center gap-3 text-xs text-muted">
        <Stethoscope className="w-4 h-4 text-accent shrink-0" />
        <span>
          All published changes to Doctors, Treatments, FAQs, Contact Details, and Hero copy sync live to the public Smile Masters website and Maya Voice AI receptionist.
        </span>
      </div>
    </div>
  );
}
