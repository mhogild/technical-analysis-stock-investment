"use client";

import { useMemo } from "react";

interface PasswordStrengthProps {
  password: string;
  showRequirements?: boolean;
  className?: string;
}

interface Requirement {
  id: string;
  label: string;
  test: (password: string) => boolean;
}

const requirements: Requirement[] = [
  {
    id: "length",
    label: "At least 8 characters",
    test: (p) => p.length >= 8,
  },
  {
    id: "uppercase",
    label: "One uppercase letter",
    test: (p) => /[A-Z]/.test(p),
  },
  {
    id: "lowercase",
    label: "One lowercase letter",
    test: (p) => /[a-z]/.test(p),
  },
  {
    id: "number",
    label: "One number",
    test: (p) => /[0-9]/.test(p),
  },
  {
    id: "special",
    label: "One special character",
    test: (p) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p),
  },
];

type StrengthLevel = "empty" | "weak" | "fair" | "good" | "strong";

function getStrengthLevel(score: number): StrengthLevel {
  if (score === 0) return "empty";
  if (score <= 2) return "weak";
  if (score <= 3) return "fair";
  if (score <= 4) return "good";
  return "strong";
}

const strengthConfig: Record<StrengthLevel, { label: string; color: string; bgColor: string; width: string }> = {
  empty: { label: "", color: "text-slate-500", bgColor: "bg-slate-700", width: "0%" },
  weak: { label: "Weak", color: "text-red-400", bgColor: "bg-red-500", width: "25%" },
  fair: { label: "Fair", color: "text-orange-400", bgColor: "bg-orange-500", width: "50%" },
  good: { label: "Good", color: "text-amber-400", bgColor: "bg-amber-500", width: "75%" },
  strong: { label: "Strong", color: "text-emerald-400", bgColor: "bg-emerald-500", width: "100%" },
};

export function validatePassword(password: string): { isValid: boolean; score: number; metRequirements: string[] } {
  const metRequirements = requirements
    .filter((req) => req.test(password))
    .map((req) => req.id);

  return {
    isValid: metRequirements.length === requirements.length,
    score: metRequirements.length,
    metRequirements,
  };
}

export default function PasswordStrength({
  password,
  showRequirements = true,
  className = "",
}: PasswordStrengthProps) {
  const { score, metRequirements } = useMemo(() => validatePassword(password), [password]);
  const strengthLevel = getStrengthLevel(score);
  const config = strengthConfig[strengthLevel];

  return (
    <div className={className}>
      {/* Strength Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-slate-400">Password strength</span>
          {strengthLevel !== "empty" && (
            <span className={`text-xs font-medium ${config.color}`}>
              {config.label}
            </span>
          )}
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ease-out ${config.bgColor}`}
            style={{ width: config.width }}
          />
        </div>
      </div>

      {/* Requirements List */}
      {showRequirements && (
        <div className="space-y-2">
          {requirements.map((req) => {
            const isMet = metRequirements.includes(req.id);
            return (
              <div
                key={req.id}
                className={`flex items-center gap-2 text-xs transition-colors ${
                  isMet ? "text-emerald-400" : "text-slate-500"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center transition-all ${
                    isMet
                      ? "bg-emerald-500/20 border border-emerald-500/50"
                      : "bg-slate-800 border border-slate-700"
                  }`}
                >
                  {isMet ? (
                    <svg
                      className="w-2.5 h-2.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={3}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                  )}
                </div>
                <span>{req.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
