import React, { useEffect, useState } from "react";
import {
  Mic,
  PhoneCall,
  RefreshCw,
  RotateCcw,
  Save,
  Sparkles,
  Volume2,
} from "lucide-react";
import {
  getRecordingUrl,
  getVoicePrompt,
  resetVoicePrompt,
  saveVoicePrompt,
  type VoiceCallRecord,
  type VoiceCallsStats,
} from "../lib/api";

interface VoiceCallsTabProps {
  calls: VoiceCallRecord[];
  stats: VoiceCallsStats;
  voiceConfig: { configured: boolean; model: string; voice: string };
  onRefresh: () => Promise<void>;
  onToast: (msg: string) => void;
}

export function VoiceCallsTab({
  calls,
  stats,
  voiceConfig,
  onRefresh,
  onToast,
}: VoiceCallsTabProps) {
  const [selectedId, setSelectedId] = useState<string | null>(calls[0]?.id || null);
  const [promptOpen, setPromptOpen] = useState(false);
  const [promptText, setPromptText] = useState("");
  const [promptOverridden, setPromptOverridden] = useState(false);
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!selectedId && calls.length > 0) {
      setSelectedId(calls[0].id);
    }
  }, [calls, selectedId]);

  useEffect(() => {
    if (!promptOpen) return;
    void getVoicePrompt()
      .then((res) => {
        setPromptText(res.prompt);
        setPromptOverridden(res.overridden);
      })
      .catch(() => undefined);
  }, [promptOpen]);

  const selected = calls.find((c) => c.id === selectedId) || calls[0] || null;

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }

  async function handleSavePrompt(e: React.FormEvent) {
    e.preventDefault();
    setSavingPrompt(true);
    try {
      await saveVoicePrompt(promptText);
      setPromptOverridden(true);
      onToast("Maya Voice AI instructions updated for future calls.");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Could not save prompt.");
    } finally {
      setSavingPrompt(false);
    }
  }

  async function handleResetPrompt() {
    setSavingPrompt(true);
    try {
      await resetVoicePrompt();
      const fresh = await getVoicePrompt();
      setPromptText(fresh.prompt);
      setPromptOverridden(false);
      onToast("Maya Voice AI instructions reset to verified clinic default.");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Could not reset prompt.");
    } finally {
      setSavingPrompt(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-ink">Maya Voice AI Calls &amp; Transcripts</h2>
          <p className="text-sm text-muted">
            Real-time Gemini Live voice receptionist ({voiceConfig.model} · voice{" "}
            {voiceConfig.voice}).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setPromptOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-secondary border border-line text-xs font-medium text-ink hover:border-accent cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            {promptOpen ? "Hide Maya Script" : "Customize Maya Script"}
          </button>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-accent text-primary-foreground text-xs font-semibold hover:opacity-95 disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-panel border border-line rounded-2xl p-4">
          <div className="text-xs text-muted">Voice AI Engine</div>
          <div className="text-base font-semibold text-ink mt-1 flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                voiceConfig.configured ? "bg-booked" : "bg-missed"
              }`}
            />
            {voiceConfig.configured ? "Ready" : "Key Missing"}
          </div>
          <div className="text-[11px] text-muted mt-1 truncate">{voiceConfig.model}</div>
        </div>
        <div className="bg-panel border border-line rounded-2xl p-4">
          <div className="text-xs text-muted">Total Voice Calls</div>
          <div className="text-2xl font-semibold text-ink mt-1">{stats.total}</div>
          <div className="text-[11px] text-muted mt-0.5">{stats.live} active right now</div>
        </div>
        <div className="bg-panel border border-line rounded-2xl p-4">
          <div className="text-xs text-muted">Appointments Captured</div>
          <div className="text-2xl font-semibold text-booked mt-1">{stats.booked}</div>
          <div className="text-[11px] text-muted mt-0.5">Synced to Appointments tab</div>
        </div>
        <div className="bg-panel border border-line rounded-2xl p-4">
          <div className="text-xs text-muted">Capture Rate</div>
          <div className="text-2xl font-semibold text-accent mt-1">{stats.conversion}%</div>
          <div className="text-[11px] text-muted mt-0.5">Of all voice sessions</div>
        </div>
      </div>

      {promptOpen && (
        <form
          onSubmit={handleSavePrompt}
          className="bg-panel border border-accent/40 rounded-2xl p-5 space-y-3"
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-ink">Maya Receptionist Instructions</h3>
              <p className="text-xs text-muted">
                Live clinic hours, Bandra West address, doctors, and treatments are appended automatically from your CMS.
              </p>
            </div>
            {promptOverridden && (
              <button
                type="button"
                onClick={handleResetPrompt}
                disabled={savingPrompt}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-line text-xs text-muted hover:text-ink cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Default
              </button>
            )}
          </div>
          <textarea
            rows={9}
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-xs text-ink font-mono leading-relaxed focus:outline-none focus:border-accent"
          />
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={savingPrompt}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-primary-foreground text-xs font-semibold cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              {savingPrompt ? "Saving…" : "Save Maya Instructions"}
            </button>
          </div>
        </form>
      )}

      {calls.length === 0 ? (
        <div className="bg-panel border border-line rounded-2xl p-10 text-center space-y-2">
          <div className="w-11 h-11 rounded-2xl bg-accent/15 text-accent flex items-center justify-center mx-auto">
            <Mic className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-ink">No Voice AI calls recorded yet</h3>
          <p className="text-xs text-muted max-w-md mx-auto">
            Open the public website and tap the glowing bottom-right orb (“Talk to Maya · Voice AI”) to start a live voice or audio+text conversation. Transcripts and bookings appear here automatically.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-panel border border-line rounded-2xl p-3 space-y-2 max-h-[560px] overflow-y-auto">
            {calls.map((c) => {
              const active = selected?.id === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  className={`w-full text-left p-3 rounded-xl border transition cursor-pointer ${
                    active
                      ? "bg-accent/15 border-accent/50"
                      : "bg-canvas/50 border-line hover:border-accent/30"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-ink truncate">
                      {c.patientName || "Website Visitor"}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        c.status === "live"
                          ? "bg-booked/20 text-booked"
                          : c.outcome === "booked"
                            ? "bg-accent/20 text-accent"
                            : "bg-secondary text-muted"
                      }`}
                    >
                      {c.status === "live" ? "Live" : c.outcome}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted mt-1 flex items-center gap-2">
                    <PhoneCall className="w-3 h-3 shrink-0" />
                    <span>{new Date(c.startedAt).toLocaleString()}</span>
                  </div>
                  {c.summary && (
                    <p className="text-[11px] text-muted mt-1 line-clamp-2">{c.summary}</p>
                  )}
                </button>
              );
            })}
          </div>

          <div className="lg:col-span-2 bg-panel border border-line rounded-2xl p-5 space-y-4">
            {selected ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-line">
                  <div>
                    <h3 className="text-base font-semibold text-ink">
                      {selected.patientName || "Website Visitor"}
                    </h3>
                    <div className="text-xs text-muted mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
                      <span>Started: {new Date(selected.startedAt).toLocaleString()}</span>
                      {selected.patientPhone && <span>Phone: {selected.patientPhone}</span>}
                      {selected.slotStart && <span>Preferred: {selected.slotStart}</span>}
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-accent/15 text-accent">
                    {selected.model}
                  </span>
                </div>

                {selected.recording && (
                  <div className="rounded-xl bg-canvas border border-line p-3 space-y-1.5">
                    <div className="text-[11px] text-muted flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5 text-accent" />
                      <span>Call Audio Recording (Stereo WAV)</span>
                    </div>
                    <audio
                      controls
                      src={getRecordingUrl(selected.id)}
                      className="w-full h-9"
                    />
                  </div>
                )}

                <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                  {selected.transcript.length === 0 ? (
                    <p className="text-xs text-muted py-4">
                      No transcript entries captured for this session.
                    </p>
                  ) : (
                    selected.transcript.map((entry, idx) => (
                      <div
                        key={idx}
                        className={`rounded-xl p-3 text-xs leading-relaxed ${
                          entry.role === "maya"
                            ? "bg-accent/10 border border-accent/20 text-ink"
                            : "bg-canvas border border-line text-ink"
                        }`}
                      >
                        <div className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
                          {entry.role === "maya" ? "Maya · Voice AI" : "Caller"}
                        </div>
                        <div>{entry.text}</div>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
