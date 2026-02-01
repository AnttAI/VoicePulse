"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { useRealtimeSession } from "@/app/hooks/useRealtimeSession";
import { useHandleSessionHistory } from "@/app/hooks/useHandleSessionHistory";
import { useTranscript } from "@/app/contexts/TranscriptContext";
import { createModerationGuardrail } from "@/app/agentConfigs/guardrails";
import { allAgentSets, defaultAgentSetKey } from "@/app/agentConfigs";
import { chatSupervisorCompanyName } from "@/app/agentConfigs/chatSupervisor";
import { customerServiceRetailCompanyName } from "@/app/agentConfigs/customerServiceRetail";
import type { RealtimeAgent } from "@openai/agents/realtime";
import type { SessionStatus } from "@/app/types";

const DEFAULT_TITLE = "Voice Assistant";

function resolveAgentSetKey(agentSetKey: string | null) {
  if (agentSetKey && allAgentSets[agentSetKey]) return agentSetKey;
  if (agentSetKey) {
    const needle = agentSetKey.toLowerCase();
    const match = Object.keys(allAgentSets).find(
      (key) => key.toLowerCase() === needle,
    );
    if (match) return match;
  }
  return defaultAgentSetKey;
}

function pickAgentSet(
  agentSetKey: string,
  agentName: string | null,
): RealtimeAgent[] {
  const agents = [...allAgentSets[agentSetKey]];

  if (agentName) {
    const idx = agents.findIndex((a) => a.name === agentName);
    if (idx > 0) {
      const [agent] = agents.splice(idx, 1);
      agents.unshift(agent);
    }
  }

  return agents;
}

function pickCompanyName(agentSetKey: string) {
  if (agentSetKey === "customerServiceRetail") return customerServiceRetailCompanyName;
  return chatSupervisorCompanyName;
}

export default function Widget() {
  const searchParams = useSearchParams();
  const title = searchParams.get("title") || DEFAULT_TITLE;
  const agentSetKey = searchParams.get("agentConfig");
  const agentName = searchParams.get("agentName");
  const resolvedAgentSetKey = useMemo(
    () => resolveAgentSetKey(agentSetKey),
    [agentSetKey],
  );

  const [sessionStatus, setSessionStatus] = useState<SessionStatus>("DISCONNECTED");
  const [isMuted, setIsMuted] = useState(false);
  const [isResponding, setIsResponding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const { addTranscriptBreadcrumb } = useTranscript();

  const sdkAudioElement = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    const el = document.createElement("audio");
    el.autoplay = true;
    el.style.display = "none";
    document.body.appendChild(el);
    return el;
  }, []);

  useEffect(() => {
    if (sdkAudioElement && !audioElementRef.current) {
      audioElementRef.current = sdkAudioElement;
    }
  }, [sdkAudioElement]);

  const { connect, disconnect, mute, sendEvent } =
    useRealtimeSession({
      onConnectionChange: (s) => setSessionStatus(s as SessionStatus),
      onTransportEvent: (event) => {
        const type = event?.type || "";
        if (
          type === "response.created" ||
          type === "response.output_audio.delta" ||
          type === "response.audio.delta" ||
          type === "response.output_audio.start" ||
          type === "response.audio.start"
        ) {
          setIsResponding(true);
          return;
        }
        if (
          type === "response.completed" ||
          type === "response.done" ||
          type === "response.output_audio.done" ||
          type === "response.audio.done" ||
          type === "response.output_audio.end" ||
          type === "response.audio.end"
        ) {
          setIsResponding(false);
        }
      },
    });

  useHandleSessionHistory();

  const fetchEphemeralKey = async (): Promise<string | null> => {
    const tokenResponse = await fetch("/api/session");
    const data = await tokenResponse.json();
    return data.value ?? data.client_secret?.value ?? null;
  };

  const triggerInitialGreeting = () => {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `vp-${Date.now()}`;

    sendEvent({
      type: "conversation.item.create",
      item: {
        id,
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: "hi" }],
      },
    });
    sendEvent({
      type: "response.create",
      response: { output_modalities: ["audio"] },
    });
  };

  const connectToRealtime = async () => {
    if (sessionStatus !== "DISCONNECTED") return;
    setSessionStatus("CONNECTING");
    setError(null);

    try {
      const key = await fetchEphemeralKey();
      if (!key) {
        setError("Missing ephemeral key");
        setSessionStatus("DISCONNECTED");
        return;
      }

      const agents = pickAgentSet(resolvedAgentSetKey, agentName);
      const guardrail = createModerationGuardrail(
        pickCompanyName(resolvedAgentSetKey),
      );

      await connect({
        getEphemeralKey: async () => key,
        initialAgents: agents,
        audioElement: sdkAudioElement,
        outputGuardrails: [guardrail],
        extraContext: {
          addTranscriptBreadcrumb,
        },
      });
      triggerInitialGreeting();
    } catch (err) {
      console.error("Widget connect error:", err);
      setError("Failed to connect");
      setSessionStatus("DISCONNECTED");
    }
  };

  const disconnectFromRealtime = () => {
    disconnect();
    setError(null);
    setIsResponding(false);
  };

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "voicepulse.connect") {
        connectToRealtime();
      }
      if (event.data?.type === "voicepulse.disconnect") {
        disconnectFromRealtime();
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [sessionStatus, agentSetKey, agentName]);

  useEffect(() => {
    if (!audioElementRef.current) return;
    audioElementRef.current.muted = isMuted;
    audioElementRef.current.volume = isMuted ? 0 : 1;
    if (!isMuted) {
      audioElementRef.current.play().catch(() => {
        // Autoplay can be blocked; user interaction will resolve.
      });
    }
    try {
      mute(isMuted);
    } catch {
      // best-effort
    }
  }, [isMuted]);

  useEffect(() => {
    if (sessionStatus !== "CONNECTED") {
      setIsResponding(false);
    }
  }, [sessionStatus]);

  const toggleMute = () => {
    if (sessionStatus !== "CONNECTED") return;
    setIsMuted((m) => !m);
  };

  const showTranscript = false;

  const statusLabel =
    sessionStatus === "CONNECTED"
      ? isResponding
        ? "Processing…"
        : isMuted
        ? "Tap the mic to answer"
        : "Listening…"
      : sessionStatus === "CONNECTING"
      ? "Connecting…"
      : "Connect to begin";

  return (
    <div className="vp-widget h-screen w-screen text-gray-900 flex flex-col bg-gradient-to-b from-emerald-50 via-white to-white">
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600&display=swap");
        .vp-widget {
          font-family: "Space Grotesk", ui-sans-serif, system-ui, -apple-system,
            BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
      `}</style>

      <header className="px-4 py-3 flex items-center justify-between">
        <div className="text-sm font-semibold tracking-wide">{title}</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={
              sessionStatus === "CONNECTED"
                ? "Disconnect"
                : sessionStatus === "CONNECTING"
                ? "Connecting"
                : "Connect"
            }
            title={
              sessionStatus === "CONNECTED"
                ? "Disconnect"
                : sessionStatus === "CONNECTING"
                ? "Connecting…"
                : "Connect"
            }
            disabled={sessionStatus === "CONNECTING"}
            onClick={() => {
              if (sessionStatus === "CONNECTED") {
                disconnectFromRealtime();
              } else if (sessionStatus === "DISCONNECTED") {
                connectToRealtime();
              }
            }}
            className="inline-flex items-center justify-center"
          >
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ring-4 ring-white transition ${
                sessionStatus === "CONNECTED" ? "bg-emerald-500" : "bg-rose-500"
              }`}
            />
          </button>
        </div>
      </header>

      <div className="flex-1 px-5 pb-4 flex flex-col items-center justify-center text-center gap-4">
        <div className="text-xs uppercase tracking-[0.3em] text-emerald-700/70">
          Voice Agent
        </div>
        <div className="text-lg font-semibold text-gray-900">
          {sessionStatus === "CONNECTED"
            ? "You’re live"
            : sessionStatus === "CONNECTING"
            ? "Connecting…"
            : "Ready when you are"}
        </div>
        <div className="text-xs text-gray-500 max-w-[240px]">{statusLabel}</div>

        <button
          className={`relative mt-2 h-20 w-20 rounded-full flex items-center justify-center text-white shadow-lg transition ${
            sessionStatus !== "CONNECTED"
              ? "bg-gray-300 cursor-not-allowed"
              : isMuted
              ? "bg-rose-600"
              : "bg-emerald-600 hover:bg-emerald-700"
          }`}
          onClick={toggleMute}
          disabled={sessionStatus !== "CONNECTED"}
          aria-label="Toggle mute"
        >
          <span
            className={`absolute -inset-3 rounded-full ${
              isResponding && !isMuted ? "animate-ping bg-emerald-400/30" : "hidden"
            }`}
          />
          <span
            className={`absolute -inset-2 rounded-full ${
              isResponding && !isMuted ? "animate-pulse bg-emerald-500/20" : "hidden"
            }`}
          />
          <span className="text-2xl">🎙️</span>
        </button>

        {showTranscript ? (
          <div className="text-xs text-gray-400">Transcript hidden.</div>
        ) : null}
      </div>

      {error ? (
        <div className="px-4 pb-2 text-xs text-rose-600">{error}</div>
      ) : null}

      <div className="px-4 py-3 border-t border-gray-100 text-[11px] text-gray-400">
        Your voice is recorded to complete this survey.
      </div>
    </div>
  );
}
