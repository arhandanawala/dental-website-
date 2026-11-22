import React, { useCallback, useEffect, useState } from "react";
import {
  CalendarCheck,
  ExternalLink,
  FileEdit,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareQuote,
  Mic,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  X,
} from "lucide-react";
import { DEFAULT_SITE_CONTENT } from "../lib/defaults";
import type {
  Appointment,
  Doctor,
  Lead,
  SiteContent,
  Testimonial,
  Treatment,
} from "../lib/types";
import {
  getAdminSnapshot,
  seedAdminDefaults,
  type VoiceCallRecord,
  type VoiceCallsStats,
} from "./lib/api";
import { AdminsTab } from "./components/AdminsTab";
import { AppointmentsTab } from "./components/AppointmentsTab";
import { AuthGate, type AdminSessionUser } from "./components/AuthGate";
import { ContentTab } from "./components/ContentTab";
import { DoctorsTab } from "./components/DoctorsTab";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { LeadsTab } from "./components/LeadsTab";
import { OverviewTab } from "./components/OverviewTab";
import { TestimonialsTab } from "./components/TestimonialsTab";
import { TreatmentsTab } from "./components/TreatmentsTab";
import { VoiceCallsTab } from "./components/VoiceCallsTab";

type TabKey =
  | "overview"
  | "appointments"
  | "leads"
  | "voice"
  | "doctors"
  | "treatments"
  | "content"
  | "testimonials"
  | "admins";

function AdminShell({
  user,
  onSignOut,
}: {
  user: AdminSessionUser;
  onSignOut: () => Promise<void>;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [seeding, setSeeding] = useState(false);
  const [loading, setLoading] = useState(true);

  const [siteContent, setSiteContent] = useState<SiteContent>(DEFAULT_SITE_CONTENT);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [voiceCalls, setVoiceCalls] = useState<VoiceCallRecord[]>([]);
  const [voiceStats, setVoiceStats] = useState<VoiceCallsStats>({
    total: 0,
    live: 0,
    booked: 0,
    notBooked: 0,
    conversion: 0,
  });
  const [voiceConfig, setVoiceConfig] = useState({
    configured: false,
    model: "gemini-3.8-live",
    voice: "Zephyr",
  });

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => {
      setToast((prev) => (prev === message ? "" : prev));
    }, 3600);
  }, []);

  const refreshSnapshot = useCallback(async () => {
    try {
      const snap = await getAdminSnapshot();
      setSiteContent({ ...DEFAULT_SITE_CONTENT, ...snap.siteContent });
      setDoctors(snap.doctors || []);
      setTreatments(snap.treatments || []);
      setTestimonials(snap.testimonials || []);
      setLeads(snap.leads || []);
      setAppointments(snap.appointments || []);
      if (snap.voice) {
        setVoiceCalls(snap.voice.calls || []);
        setVoiceStats(snap.voice.stats);
        setVoiceConfig({
          configured: snap.voice.configured,
          model: snap.voice.model,
          voice: snap.voice.voice,
        });
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not refresh clinic data.");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void refreshSnapshot();
    const id = window.setInterval(() => {
      void refreshSnapshot();
    }, 15_000);
    return () => window.clearInterval(id);
  }, [refreshSnapshot]);

  async function handleSeedDefaults() {
    setSeeding(true);
    try {
      const res = await seedAdminDefaults();
      await refreshSnapshot();
      showToast(
        res.created > 0
          ? `Seeded verified Smile Masters defaults (${res.created} records added).`
          : "All verified Smile Masters clinic defaults are already in place."
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to seed defaults.");
    } finally {
      setSeeding(false);
    }
  }

  const newLeadCount = leads.filter((l) => l.status === "New").length;
  const pendingApptCount = appointments.filter((a) => a.status === "Pending").length;

  const navItems: {
    key: TabKey;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }[] = [
    { key: "overview", label: "Overview", icon: LayoutDashboard },
    { key: "appointments", label: "Appointments", icon: CalendarCheck, badge: pendingApptCount },
    { key: "leads", label: "Enquiries & Leads", icon: Inbox, badge: newLeadCount },
    { key: "voice", label: "Voice AI Calls", icon: Mic, badge: voiceStats.live || undefined },
    { key: "doctors", label: "Doctors", icon: Stethoscope },
    { key: "treatments", label: "Treatments", icon: Sparkles },
    { key: "content", label: "Site Content & FAQs", icon: FileEdit },
    { key: "testimonials", label: "Testimonials", icon: MessageSquareQuote },
    { key: "admins", label: "Admin Credentials", icon: ShieldCheck },
  ];

  function selectTab(key: TabKey) {
    setActiveTab(key);
    setMobileMenuOpen(false);
  }

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col lg:flex-row">
      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-30 bg-panel border-b border-line px-4 py-3 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-ink">Smile Masters CMS</div>
          <div className="text-[11px] text-muted">@{user.username}</div>
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen((v) => !v)}
          className="p-2 rounded-xl border border-line text-ink cursor-pointer"
          aria-label="Toggle admin menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Sidebar */}
      <aside
        className={`${
          mobileMenuOpen ? "block" : "hidden"
        } lg:flex lg:flex-col lg:w-64 lg:shrink-0 bg-panel border-b lg:border-b-0 lg:border-r border-line p-4 justify-between`}
      >
        <div className="space-y-6">
          <div className="px-2 pt-1">
            <div className="text-sm font-semibold text-ink tracking-tight">Smile Masters</div>
            <div className="text-[11px] text-accent font-medium">
              Jaw Joint Matters · Admin CMS
            </div>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => selectTab(item.key)}
                  className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                    active
                      ? "bg-accent text-primary-foreground font-semibold"
                      : "text-muted hover:text-ink hover:bg-secondary/70"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </span>
                  {item.badge ? (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        active
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-accent/20 text-accent"
                      }`}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="pt-6 mt-6 border-t border-line space-y-2">
          <div className="px-2">
            <div className="text-xs font-medium text-ink truncate">Clinic Administrator</div>
            <div className="text-[11px] text-muted truncate">@{user.username}</div>
          </div>
          <a
            href="/"
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-muted hover:text-ink hover:bg-secondary/70"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Public Website</span>
          </a>
          <button
            type="button"
            onClick={() => void onSignOut()}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-muted hover:text-missed hover:bg-missed/10 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 p-5 sm:p-8 max-w-6xl w-full mx-auto">
        {toast && (
          <div
            role="status"
            className="mb-5 rounded-xl bg-booked/15 border border-booked/35 px-4 py-3 text-xs font-medium text-booked flex items-center justify-between gap-3"
          >
            <span>{toast}</span>
            <button
              type="button"
              onClick={() => setToast("")}
              className="text-booked/80 hover:text-booked cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-sm text-muted">Loading clinic workspace…</div>
        ) : (
          <>
            {activeTab === "overview" && (
              <OverviewTab
                siteContent={siteContent}
                leads={leads}
                appointments={appointments}
                doctors={doctors}
                treatments={treatments}
                testimonials={testimonials}
                seeding={seeding}
                onSeedDefaults={handleSeedDefaults}
                onNavigate={(tab) => selectTab(tab as TabKey)}
              />
            )}
            {activeTab === "appointments" && (
              <AppointmentsTab
                appointments={appointments}
                onRefresh={refreshSnapshot}
                onToast={showToast}
              />
            )}
            {activeTab === "leads" && (
              <LeadsTab leads={leads} onRefresh={refreshSnapshot} onToast={showToast} />
            )}
            {activeTab === "voice" && (
              <VoiceCallsTab
                calls={voiceCalls}
                stats={voiceStats}
                voiceConfig={voiceConfig}
                onRefresh={refreshSnapshot}
                onToast={showToast}
              />
            )}
            {activeTab === "doctors" && (
              <DoctorsTab doctors={doctors} onRefresh={refreshSnapshot} onToast={showToast} />
            )}
            {activeTab === "treatments" && (
              <TreatmentsTab
                treatments={treatments}
                onRefresh={refreshSnapshot}
                onToast={showToast}
              />
            )}
            {activeTab === "content" && (
              <ContentTab
                siteContent={siteContent}
                onRefresh={refreshSnapshot}
                onToast={showToast}
              />
            )}
            {activeTab === "testimonials" && (
              <TestimonialsTab
                testimonials={testimonials}
                onRefresh={refreshSnapshot}
                onToast={showToast}
              />
            )}
            {activeTab === "admins" && (
              <AdminsTab currentUsername={user.username} onToast={showToast} />
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthGate>{(user, onSignOut) => <AdminShell user={user} onSignOut={onSignOut} />}</AuthGate>
    </ErrorBoundary>
  );
}
