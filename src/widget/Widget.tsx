import { useEffect, useRef, useState } from "react";
import { PcmPlayer, base64ToInt16, downsampleTo16k, int16ToBase64 } from "./audio";

type Phase = "bubble" | "permission" | "mic" | "connecting" | "live" | "error";

interface CaptionLine {
  id: number;
  role: "caller" | "maya" | "system";
  text: string;
}

export function Widget() {
  const [phase, setPhase] = useState<Phase>("bubble");
  const [status, setStatus] = useState("Voice assistant is ready…");
  const [level, setLevel] = useState(0);
  const [hue, setHue] = useState(170);
  const [error, setError] = useState("");
  const [micEnabled, setMicEnabled] = useState(false);
  const [muted, setMuted] = useState(false);
  const [captions, setCaptions] = useState<CaptionLine[]>([]);
  const [textDraft, setTextDraft] = useState("");
  const [savedNotice, setSavedNotice] = useState("");

  const wsRef = useRef<WebSocket | null>(null);
  const playerRef = useRef<PcmPlayer | null>(null);
  const recRef = useRef<AudioContext | null>(null);
  const procRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mutedRef = useRef(false);
  const levelRef = useRef(0);
  const captionIdRef = useRef(1);
  const captionEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  useEffect(() => {
    captionEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [captions]);

  useEffect(() => {
    if (phase !== "live") {
      levelRef.current = 0;
      setLevel(0);
      setHue(170);
      return;
    }
    const id = window.setInterval(() => {
      const mayaLevel = playerRef.current?.isPlaying()
        ? Math.min(playerRef.current.level || 0.35, 1)
        : 0;
      const lvl = Math.max(
        Number.isFinite(levelRef.current) ? Math.max(levelRef.current, 0) : 0,
        mayaLevel
      );
      levelRef.current = lvl * 0.88;
      setLevel(lvl);
      setHue(170 - Math.min(lvl, 1) * 140);
    }, 80);
    return () => window.clearInterval(id);
  }, [phase]);

  useEffect(() => {
    const onOpenRequest = () => {
      setError("");
      setPhase("permission");
    };
    window.addEventListener("sm:open-voice-assistant", onOpenRequest);
    return () => window.removeEventListener("sm:open-voice-assistant", onOpenRequest);
  }, []);

  useEffect(() => {
    if (phase !== "permission") return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPhase("bubble");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [phase]);

  const appendCaption = (role: "caller" | "maya" | "system", text: string, finished = false) => {
    const clean = text.replace(/\s+/g, " ");
    if (!clean.trim()) return;
    setCaptions((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.role === role && role !== "system" && !finished && last.text.length < 280) {
        const nextText = (last.text + (last.text.endsWith(" ") || clean.startsWith(" ") ? "" : " ") + clean).trim();
        return [...prev.slice(0, -1), { ...last, text: nextText }];
      }
      const id = captionIdRef.current++;
      return [...prev.slice(-14), { id, role, text: clean.trim() }];
    });
  };

  const stopAll = () => {
    try {
      wsRef.current?.send(JSON.stringify({ type: "end" }));
    } catch {
      /* ignore */
    }
    wsRef.current?.close();
    wsRef.current = null;
    procRef.current?.disconnect();
    procRef.current = null;
    recRef.current?.close().catch(() => undefined);
    recRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    playerRef.current?.close();
    playerRef.current = null;
    levelRef.current = 0;
    setLevel(0);
    setMicEnabled(false);
    setMuted(false);
  };

  const openBookingFallback = () => {
    stopAll();
    setPhase("bubble");
    const ev = new CustomEvent("sm:open-appointment-modal", { cancelable: true });
    const notHandledByModal = window.dispatchEvent(ev);
    if (notHandledByModal) {
      const section = document.getElementById("book-appointment");
      if (section) {
        section.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  const startSession = async (withMic: boolean) => {
    setError("");
    setSavedNotice("");
    setCaptions([]);
    setMuted(false);
    mutedRef.current = false;

    // Unlock audio playback immediately inside the click gesture.
    let player: PcmPlayer | null = null;
    try {
      player = new PcmPlayer(24000);
      playerRef.current = player;
      await player.resume();
    } catch {
      player = null;
    }

    let stream: MediaStream | null = null;
    if (withMic) {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError(
          "Microphone access is not available in this browser context. You can still connect in Audio + Text mode below or call +91 77389 68210."
        );
        setPhase("error");
        return;
      }

      setPhase("mic");
      setStatus("Please select “Allow” in your browser’s microphone prompt.");
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
          },
        });
        setMicEnabled(true);
      } catch (err) {
        const name = err instanceof DOMException ? err.name : "";
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          setError(
            "Microphone permission was denied. Allow microphone access in your browser bar and tap Try Again, or use Audio + Text mode below."
          );
        } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
          setError(
            "No microphone was detected on this device. Connect a microphone or continue in Audio + Text mode below."
          );
        } else {
          setError(
            "Could not access microphone right now. Continue in Audio + Text mode or use the appointment form."
          );
        }
        setPhase("error");
        return;
      }
    } else {
      setMicEnabled(false);
    }

    setPhase("connecting");
    setStatus("Connecting to Maya at Smile Masters…");

    try {
      const backend =
        (window as unknown as { MOLA_BACKEND?: string }).MOLA_BACKEND || location.origin;
      const backendUrl = new URL(backend, location.origin);
      const proto = backendUrl.protocol === "https:" ? "wss" : "ws";
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
      const ws = new WebSocket(
        `${proto}://${backendUrl.host}/ws/live?timezone=${encodeURIComponent(tz)}`
      );
      wsRef.current = ws;

      if (stream) {
        streamRef.current = stream;
        const rec = new AudioContext();
        recRef.current = rec;
        if (rec.state === "suspended") {
          await rec.resume();
        }
        const src = rec.createMediaStreamSource(stream);
        const proc = rec.createScriptProcessor(4096, 1, 1);
        procRef.current = proc;
        const zeroGain = rec.createGain();
        zeroGain.gain.value = 0;
        src.connect(proc);
        proc.connect(zeroGain);
        zeroGain.connect(rec.destination);

        proc.onaudioprocess = (ev) => {
          if (ws.readyState !== WebSocket.OPEN || mutedRef.current) return;
          const input = ev.inputBuffer.getChannelData(0);
          let sum = 0;
          for (let i = 0; i < input.length; i++) {
            const s = input[i];
            if (!Number.isFinite(s)) return;
            sum += s * s;
          }
          const rms = Math.sqrt(sum / input.length);
          const next = Math.min(rms * 5.5, 1);
          levelRef.current = Math.max(levelRef.current * 0.65, next);

          const pcm = downsampleTo16k(input, rec.sampleRate);
          if (pcm.length > 0) {
            ws.send(JSON.stringify({ type: "audio", data: int16ToBase64(pcm) }));
          }
        };
      }

      ws.onmessage = (ev) => {
        let msg: Record<string, unknown>;
        try {
          msg = JSON.parse(ev.data);
        } catch {
          return;
        }

        if (msg.type === "ready") {
          setPhase("live");
          setStatus(
            withMic
              ? "Connected · Speak naturally or type below"
              : "Connected · Type below and hear Maya reply"
          );
        } else if (msg.type === "audio" && typeof msg.data === "string") {
          const mime = typeof msg.mimeType === "string" ? msg.mimeType : "";
          const rate = /rate=(\d+)/.exec(mime)?.[1];
          player?.resume().catch(() => undefined);
          player?.enqueue(base64ToInt16(msg.data), rate ? Number(rate) : 24000);
          levelRef.current = Math.max(levelRef.current, 0.55);
          setStatus("Maya is speaking…");
        } else if (msg.type === "transcript" && typeof msg.text === "string") {
          const role = msg.role === "caller" ? "caller" : "maya";
          appendCaption(role, msg.text, Boolean(msg.finished));
        } else if (msg.type === "turnComplete") {
          setStatus(
            withMic
              ? mutedRef.current
                ? "Mic muted · Type or unmute to speak"
                : "Listening · Speak naturally"
              : "Listening · Type your message below"
          );
        } else if (msg.type === "interrupted") {
          player?.interrupt();
          setStatus("Listening…");
        } else if (msg.type === "tool" && msg.name === "request_appointment_callback") {
          const res = msg.result as { ok?: boolean } | undefined;
          if (res?.ok) {
            setSavedNotice("Appointment request saved to Smile Masters desk.");
            appendCaption(
              "system",
              "Appointment request saved — our Bandra West team will contact you to confirm.",
              true
            );
          }
        } else if (msg.type === "error") {
          const errText =
            typeof msg.message === "string" && msg.message
              ? msg.message
              : "Voice assistant encountered a connection error.";
          setError(errText);
          setPhase("error");
          stopAll();
        } else if (msg.type === "ended") {
          stopAll();
          setPhase("bubble");
        }
      };

      ws.onerror = () => {
        setError(
          "Could not reach the Voice AI service right now. Please try again, use the appointment form, or call +91 77389 68210."
        );
        setPhase("error");
        stopAll();
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start voice session.");
      setPhase("error");
      stopAll();
    }
  };

  const sendTextMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = textDraft.trim();
    if (!clean || wsRef.current?.readyState !== WebSocket.OPEN) return;
    playerRef.current?.resume().catch(() => undefined);
    wsRef.current.send(JSON.stringify({ type: "text", text: clean }));
    setTextDraft("");
    setStatus("Maya is replying…");
  };

  const hangUp = () => {
    stopAll();
    setPhase("bubble");
    setStatus("Voice assistant is ready…");
  };

  if (phase === "bubble") {
    return (
      <button
        className="mola-bubble"
        type="button"
        onClick={() => {
          setError("");
          setPhase("permission");
        }}
        aria-label="Open Smile Masters Voice Assistant"
      >
        <span className="mola-orb-core" aria-hidden="true">
          <span className="mola-orb-shine" />
        </span>
        <span className="mola-orb-prompt">Talk to Maya · Voice AI</span>
      </button>
    );
  }

  if (phase === "permission") {
    return (
      <div
        className="mola-mic-backdrop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sm-mic-dialog-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) setPhase("bubble");
        }}
      >
        <div className="mola-mic-modal">
          <div className="mola-mic-icon" aria-hidden="true">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
          </div>
          <h3 id="sm-mic-dialog-title" className="mola-mic-title">
            Talk to Maya — Voice AI Receptionist
          </h3>
          <p className="mola-mic-copy">
            Ask Maya about TMJ &amp; jaw joint care, orthodontics, clear aligners, Dr. Moez &amp;
            Dr. Laila Khakiani, or request an in-clinic / online consultation in Bandra West.
          </p>
          <div className="mola-mic-note">
            Your microphone is only active while you are on a call and you can mute or end anytime.
          </div>
          <div className="mola-mic-actions">
            <button
              className="mola-btn primary"
              type="button"
              onClick={() => void startSession(true)}
            >
              Allow Microphone &amp; Talk
            </button>
            <button
              className="mola-btn ghost"
              type="button"
              onClick={() => void startSession(false)}
            >
              Start in Audio + Text Mode (No Mic)
            </button>
            <button className="mola-btn text" type="button" onClick={openBookingFallback}>
              Or Use Appointment Request Form
            </button>
            <button className="mola-btn text" type="button" onClick={() => setPhase("bubble")}>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mola-panel" role="region" aria-label="Smile Masters Voice Assistant">
      <div className="mola-panel-head">
        <div className="mola-live">
          <span className={`mola-dot ${phase === "error" ? "is-err" : ""}`} />
          {phase === "live"
            ? "Live · Maya Voice AI"
            : phase === "mic"
              ? "Requesting Mic"
              : phase === "error"
                ? "Voice Assistant"
                : "Connecting"}
        </div>
        <button
          type="button"
          className="mola-close-x"
          onClick={hangUp}
          aria-label="Close voice assistant"
        >
          ×
        </button>
      </div>

      <div className="mola-orb-wrap">
        <div
          className="vorb"
          style={
            {
              "--vorb-lvl": Math.min(level, 1).toFixed(3),
              "--vorb-hue": hue.toFixed(1),
            } as React.CSSProperties
          }
        >
          <div className="vorb-spin" />
          <div className="vorb-glow" />
        </div>
      </div>

      <div className="mola-caption">Smile Masters &amp; Jaw Joint Matters · Bandra West</div>
      <div className={`mola-status ${phase === "error" ? "is-error" : ""}`}>{error || status}</div>

      {savedNotice && <div className="mola-saved-pill">{savedNotice}</div>}

      {captions.length > 0 && (
        <div className="mola-transcript" aria-live="polite">
          {captions.map((line) => (
            <div key={line.id} className={`mola-tline is-${line.role}`}>
              <span className="mola-trole">
                {line.role === "maya" ? "Maya" : line.role === "caller" ? "You" : "Desk"}
              </span>
              <span className="mola-ttext">{line.text}</span>
            </div>
          ))}
          <div ref={captionEndRef} />
        </div>
      )}

      {phase === "live" && (
        <form className="mola-text-form" onSubmit={sendTextMessage}>
          <input
            type="text"
            className="mola-text-input"
            value={textDraft}
            onChange={(e) => setTextDraft(e.target.value)}
            placeholder="Type a question or phone number…"
            aria-label="Send a message to Maya"
          />
          <button type="submit" className="mola-text-send" disabled={!textDraft.trim()}>
            Send
          </button>
        </form>
      )}

      <div className="mola-actions">
        {phase === "error" ? (
          <>
            <button
              className="mola-btn primary"
              type="button"
              onClick={() => void startSession(true)}
            >
              Try Mic Again
            </button>
            <button
              className="mola-btn ghost"
              type="button"
              onClick={() => void startSession(false)}
            >
              Audio + Text
            </button>
            <button className="mola-btn ghost" type="button" onClick={openBookingFallback}>
              Book Form
            </button>
          </>
        ) : (
          <>
            {micEnabled && (
              <button
                className={`mola-btn ${muted ? "primary" : "ghost"}`}
                type="button"
                onClick={() => setMuted((m) => !m)}
              >
                {muted ? "Unmute Mic" : "Mute Mic"}
              </button>
            )}
            <button className="mola-btn danger" type="button" onClick={hangUp}>
              End Call
            </button>
          </>
        )}
      </div>
    </div>
  );
}
