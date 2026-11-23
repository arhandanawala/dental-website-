import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  CalendarCheck,
  ExternalLink,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareQuote,
  Mic,
  Palette,
  PhoneCall,
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
import {
  ADMIN_ROUTES,
  getAdminPath,
  getAdminRouteMeta,
  resolveAdminRoute,
  type AdminPageKey,
} from "./lib/routes";
import { AboutTab } from "./components/AboutTab";
import { AdminsTab } from "./components/AdminsTab";
import { AppointmentsTab } from "./components/AppointmentsTab";
import { AuthGate, type AdminSessionUser } from "./components/AuthGate";
import { BrandingTab } from "./components/BrandingTab";
import { ContactTab } from "./components/ContactTab";
import { DoctorsTab } from "./components/DoctorsTab";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { LeadsTab } from "./components/LeadsTab";
import { OverviewTab } from "./components/OverviewTab";
import { TestimonialsTab } from "./components/TestimonialsTab";
import { TreatmentsTab } from "./components/TreatmentsTab";
import { VoiceCallsTab } from "./components/VoiceCallsTab";

const ROUTE_ICONS: Record<AdminPageKey, React.ComponentType<{ className?: string }>> = {
  overview: LayoutDashboard,
  appointments: CalendarCheck,
  leads: Inbox,
  voice: Mic,
  branding: Palette,
  about: BookOpen,
  contact: PhoneCall,
  doctors: Stethoscope,
  treatments: Sparkles,
  testimonials: MessageSquareQuote,
  admins: ShieldCheck,
};

function AdminShell({
  user,
  onSignOut,
}: {
  user: AdminSessionUser;
  onSignOut: () => Promise<void>;
}) {
  const [activePage, setActivePage] = useState<AdminPageKey>(() =>
    resolveAdminRoute(window.location.pathname)
  );
  const internalNavDepthRef = useRef(0);
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

  // Normalize initial /admin URL and sync browser Back / Forward across Admin pages
  useEffect(() => {
    const initialPage = resolveAdminRoute(window.location.pathname);
    const canonicalPath = getAdminPath(initialPage);
    if (window.location.pathname !== canonicalPath) {
      window.history.replaceState({ adminPage: initialPage, depth: 0 }, "", canonicalPath);
    } else if (!window.history.state?.adminPage) {
      window.history.replaceState({ adminPage: initialPage, depth: 0 }, "", canonicalPath);
    }

    const handlePopState = () => {
      const nextPage = resolveAdminRoute(window.location.pathname);
      setActivePage(nextPage);
      setMobileMenuOpen(false);
      const depth = typeof window.history.state?.depth === "number" ? window.history.state.depth : 0;
      internalNavDepthRef.current = depth;
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    const meta = getAdminRouteMeta(activePage);
    document.title = `${meta.label} · Smile Masters Admin`;
  }, [activePage]);

  const navigateTo = useCallback((page: AdminPageKey) => {
    const targetPath = getAdminPath(page);
    setActivePage(page);
    setMobileMenuOpen(false);
    if (window.location.pathname !== targetPath) {
      internalNavDepthRef.current += 1;
      window.history.pushState(
        { adminPage: page, depth: internalNavDepthRef.current },
        "",
        targetPath
      );
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleBack = useCallback(() => {
    if (internalNavDepthRef.current > 0) {
      window.history.back();
      return;
    }
    navigateTo("overview");
  }, [navigateTo]);

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

  const badgeFor = (key: AdminPageKey): number | undefined => {
    if (key === "appointments") return pendingApptCount || undefined;
    if (key === "leads") return newLeadCount || undefined;
    if (key === "voice") return voiceStats.live || undefined;
    return undefined;
  };

  const routeMeta = getAdminRouteMeta(activePage);
  const groups: { id: "desk" | "website" | "system"; title: string }[] = [
    { id: "desk", title: "Clinic Desk" },
    { id: "website", title: "Website Editor" },
    { id: "system", title: "Security" },
  ];

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col lg:flex-row">
      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-30 bg-panel border-b border-line px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {activePage !== "overview" && (
            <button
              type="button"
              onClick={handleBack}
              className="p-2 rounded-xl border border-line text-ink hover:border-accent cursor-pointer shrink-0"
              aria-label="Go back to previous admin page"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="min-w-0">
            <div className="text-sm font-semibold text-ink truncate">{routeMeta.label}</div>
            <div className="text-[11px] text-muted truncate">Smile Masters CMS · @{user.username}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen((v) => !v)}
          className="p-2 rounded-xl border border-line text-ink cursor-pointer shrink-0"
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
        <div className="space-y-5">
          <div className="px-2 pt-1">
            <div className="text-sm font-semibold text-ink tracking-tight">Smile Masters</div>
            <div className="text-[11px] text-accent font-medium">
              Jaw Joint Matters · Admin CMS
            </div>
          </div>

          <nav className="space-y-4" aria-label="Admin sections">
            {groups.map((grp) => (
              <div key={grp.id} className="space-y-1">
                <div className="px-3 text-[10px] font-semibold uppercase tracking-wider text-muted/80">
                  {grp.title}
                </div>
                {ADMIN_ROUTES.filter((r) => r.group === grp.id).map((item) => {
                  const Icon = ROUTE_ICONS[item.key];
                  const active = activePage === item.key;
                  const badge = badgeFor(item.key);
                  return (
                    <a
                      key={item.key}
                      href={getAdminPath(item.key)}
                      onClick={(e) => {
                        e.preventDefault();
                        navigateTo(item.key);
                      }}
                      className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${
                        active
                          ? "bg-accent text-primary-foreground font-semibold"
                          : "text-muted hover:text-ink hover:bg-secondary/70"
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{item.label}</span>
                      </span>
                      {badge ? (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            active
                              ? "bg-primary-foreground/20 text-primary-foreground"
                              : "bg-accent/20 text-accent"
                          }`}
                        >
                          {badge}
                        </span>
                      ) : null}
                    </a>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        <div className="pt-5 mt-5 border-t border-line space-y-2">
          <div className="px-2">
            <div className="text-xs font-medium text-ink truncate">Clinic Administrator</div>
            <div className="text-[11px] text-muted truncate">@{user.username}</div>
          </div>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-muted hover:text-ink hover:bg-secondary/70"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open Public Website</span>
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
        {/* Multi-page Admin breadcrumb & Back bar on sub-pages */}
        {activePage !== "overview" && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-line/70">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-panel border border-line text-xs font-semibold text-ink hover:border-accent transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
              <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted">
                <a
                  href="/admin/"
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo("overview");
                  }}
                  className="hover:text-ink transition"
                >
                  Admin
                </a>
                <span>/</span>
                <span className="text-ink font-medium">{routeMeta.label}</span>
              </nav>
            </div>
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-line text-xs text-muted hover:text-ink hover:border-accent transition"
            >
              <span>View Live Site</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

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
            {activePage === "overview" && (
              <OverviewTab
                siteContent={siteContent}
                leads={leads}
                appointments={appointments}
                doctors={doctors}
                treatments={treatments}
                testimonials={testimonials}
                seeding={seeding}
                onSeedDefaults={handleSeedDefaults}
                onNavigate={(tab) => navigateTo(tab as AdminPageKey)}
              />
            )}
            {activePage === "appointments" && (
              <AppointmentsTab
                appointments={appointments}
                onRefresh={refreshSnapshot}
                onToast={showToast}
              />
            )}
            {activePage === "leads" && (
              <LeadsTab leads={leads} onRefresh={refreshSnapshot} onToast={showToast} />
            )}
            {activePage === "voice" && (
              <VoiceCallsTab
                calls={voiceCalls}
                stats={voiceStats}
                voiceConfig={voiceConfig}
                onRefresh={refreshSnapshot}
                onToast={showToast}
              />
            )}
            {activePage === "branding" && (
              <BrandingTab
                siteContent={siteContent}
                onRefresh={refreshSnapshot}
                onToast={showToast}
              />
            )}
            {activePage === "about" && (
              <AboutTab
                siteContent={siteContent}
                onRefresh={refreshSnapshot}
                onToast={showToast}
              />
            )}
            {activePage === "contact" && (
              <ContactTab
                siteContent={siteContent}
                onRefresh={refreshSnapshot}
                onToast={showToast}
              />
            )}
            {activePage === "doctors" && (
              <DoctorsTab doctors={doctors} onRefresh={refreshSnapshot} onToast={showToast} />
            )}
            {activePage === "treatments" && (
              <TreatmentsTab
                treatments={treatments}
                onRefresh={refreshSnapshot}
                onToast={showToast}
              />
            )}
            {activePage === "testimonials" && (
              <TestimonialsTab
                testimonials={testimonials}
                siteContent={siteContent}
                onRefresh={refreshSnapshot}
                onToast={showToast}
              />
            )}
            {activePage === "admins" && (
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
