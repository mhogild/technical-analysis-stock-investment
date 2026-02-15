"use client";

import { useState } from "react";
import type { UserSession } from "@/types";

interface SessionListProps {
  sessions: UserSession[];
  onRevokeSession: (sessionId: string) => Promise<void>;
  isLoading?: boolean;
  className?: string;
}

function parseUserAgent(userAgent: string): { device: string; browser: string } {
  let device = "Unknown device";
  let browser = "Unknown browser";

  // Detect device
  if (/Windows/.test(userAgent)) device = "Windows PC";
  else if (/Macintosh/.test(userAgent)) device = "Mac";
  else if (/iPhone/.test(userAgent)) device = "iPhone";
  else if (/iPad/.test(userAgent)) device = "iPad";
  else if (/Android/.test(userAgent)) {
    if (/Mobile/.test(userAgent)) device = "Android Phone";
    else device = "Android Tablet";
  } else if (/Linux/.test(userAgent)) device = "Linux";

  // Detect browser
  if (/Chrome/.test(userAgent) && !/Edg/.test(userAgent)) browser = "Chrome";
  else if (/Safari/.test(userAgent) && !/Chrome/.test(userAgent)) browser = "Safari";
  else if (/Firefox/.test(userAgent)) browser = "Firefox";
  else if (/Edg/.test(userAgent)) browser = "Edge";

  return { device, browser };
}

function maskIpAddress(ip: string): string {
  if (!ip) return "Unknown";
  const parts = ip.split(".");
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.***.**`;
  }
  return ip.slice(0, 8) + "***";
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getDeviceIcon(device: string) {
  if (device.includes("iPhone") || device.includes("Android Phone")) {
    return (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
      </svg>
    );
  }
  if (device.includes("iPad") || device.includes("Tablet")) {
    return (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5h3m-6.75 2.25h10.5a2.25 2.25 0 002.25-2.25v-15a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 4.5v15a2.25 2.25 0 002.25 2.25z" />
      </svg>
    );
  }
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
    </svg>
  );
}

export default function SessionList({
  sessions,
  onRevokeSession,
  isLoading = false,
  className = "",
}: SessionListProps) {
  const [revokingId, setRevokingId] = useState<string | null>(null);

  async function handleRevoke(sessionId: string) {
    setRevokingId(sessionId);
    try {
      await onRevokeSession(sessionId);
    } finally {
      setRevokingId(null);
    }
  }

  if (isLoading) {
    return (
      <div className={`space-y-3 ${className}`}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/30 animate-pulse"
          >
            <div className="w-10 h-10 rounded-lg bg-slate-700/50" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 bg-slate-700/50 rounded" />
              <div className="h-3 w-48 bg-slate-700/30 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-slate-400">No active sessions found</p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {sessions.map((session) => {
        const { device, browser } = parseUserAgent(session.user_agent);
        const isRevoking = revokingId === session.id;

        return (
          <div
            key={session.id}
            className={`
              relative flex items-center gap-4 p-4 rounded-xl border transition-all
              ${session.is_current
                ? "bg-emerald-500/5 border-emerald-500/30"
                : "bg-slate-800/30 border-slate-700/30 hover:border-slate-600/50"
              }
            `}
          >
            {/* Device Icon */}
            <div
              className={`
                w-10 h-10 rounded-lg flex items-center justify-center
                ${session.is_current
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-slate-700/50 text-slate-400"
                }
              `}
            >
              {getDeviceIcon(device)}
            </div>

            {/* Session Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-slate-200">{device}</span>
                <span className="text-slate-500">•</span>
                <span className="text-sm text-slate-400">{browser}</span>
                {session.is_current && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium">
                    Current
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                    />
                  </svg>
                  {maskIpAddress(session.ip_address)}
                </span>
                <span className="flex items-center gap-1">
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Active {formatRelativeTime(session.last_active_at)}
                </span>
              </div>
            </div>

            {/* Revoke Button */}
            {!session.is_current && (
              <button
                onClick={() => handleRevoke(session.id)}
                disabled={isRevoking}
                className={`
                  px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                  ${isRevoking
                    ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                    : "bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 hover:border-red-500/50"
                  }
                `}
              >
                {isRevoking ? (
                  <span className="flex items-center gap-1.5">
                    <svg
                      className="w-3 h-3 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Revoking...
                  </span>
                ) : (
                  "Revoke"
                )}
              </button>
            )}
          </div>
        );
      })}

      {/* Info Note */}
      <div className="mt-4 p-3 rounded-lg bg-slate-800/30 border border-slate-700/30">
        <p className="text-xs text-slate-400">
          Revoking a session will sign out that device immediately. You cannot revoke your current session.
        </p>
      </div>
    </div>
  );
}
