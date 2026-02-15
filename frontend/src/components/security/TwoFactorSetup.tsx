"use client";

import { useState } from "react";

interface TwoFactorSetupProps {
  isEnabled: boolean;
  onEnable: (code: string) => Promise<{ success: boolean; backupCodes?: string[] }>;
  onDisable: (code: string) => Promise<boolean>;
  className?: string;
}

export default function TwoFactorSetup({
  isEnabled,
  onEnable,
  onDisable,
  className = "",
}: TwoFactorSetupProps) {
  const [step, setStep] = useState<"idle" | "setup" | "verify" | "backup" | "disable">("idle");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function startSetup() {
    setIsLoading(true);
    setError(null);
    try {
      // In real implementation, this would call an API to generate the TOTP secret
      // For now, we'll simulate it
      const mockSecret = "JBSWY3DPEHPK3PXP";
      const mockQrCode = `otpauth://totp/StockSignal:user@example.com?secret=${mockSecret}&issuer=StockSignal`;

      setSecret(mockSecret);
      setQrCode(mockQrCode);
      setStep("setup");
    } catch (err) {
      setError("Failed to start 2FA setup. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function verifyAndEnable() {
    if (verificationCode.length !== 6) {
      setError("Please enter a 6-digit code");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await onEnable(verificationCode);
      if (result.success && result.backupCodes) {
        setBackupCodes(result.backupCodes);
        setStep("backup");
      } else {
        setError("Invalid verification code. Please try again.");
      }
    } catch (err) {
      setError("Failed to enable 2FA. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDisable() {
    if (verificationCode.length !== 6) {
      setError("Please enter a 6-digit code");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const success = await onDisable(verificationCode);
      if (success) {
        setStep("idle");
        setVerificationCode("");
      } else {
        setError("Invalid verification code. Please try again.");
      }
    } catch (err) {
      setError("Failed to disable 2FA. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  function copyBackupCodes() {
    navigator.clipboard.writeText(backupCodes.join("\n"));
  }

  function finishSetup() {
    setStep("idle");
    setVerificationCode("");
    setBackupCodes([]);
    setQrCode(null);
    setSecret(null);
  }

  // Idle state - Show enable/disable button
  if (step === "idle") {
    return (
      <div className={`card p-6 ${className}`}>
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            isEnabled
              ? "bg-emerald-500/10 border border-emerald-500/30"
              : "bg-slate-800 border border-slate-700"
          }`}>
            <svg
              className={`w-6 h-6 ${isEnabled ? "text-emerald-400" : "text-slate-400"}`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold text-slate-100">
                Two-Factor Authentication
              </h3>
              {isEnabled && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium">
                  Enabled
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400 mb-4">
              {isEnabled
                ? "Your account is protected with two-factor authentication using an authenticator app."
                : "Add an extra layer of security to your account by requiring a code from your authenticator app when signing in."}
            </p>
            {isEnabled ? (
              <button
                onClick={() => setStep("disable")}
                className="px-4 py-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 text-sm font-medium hover:bg-red-500/20 transition-colors"
              >
                Disable 2FA
              </button>
            ) : (
              <button
                onClick={startSetup}
                disabled={isLoading}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 transition-colors disabled:opacity-50"
              >
                {isLoading ? "Setting up..." : "Enable 2FA"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Setup step - Show QR code
  if (step === "setup") {
    return (
      <div className={`card p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-slate-100 mb-4">
          Set up Two-Factor Authentication
        </h3>

        <div className="space-y-6">
          {/* Step 1 */}
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-blue-400">1</span>
            </div>
            <div>
              <h4 className="font-medium text-slate-200 mb-1">
                Install an authenticator app
              </h4>
              <p className="text-sm text-slate-400">
                Download Google Authenticator, Authy, or any TOTP-compatible app on your phone.
              </p>
            </div>
          </div>

          {/* Step 2 - QR Code */}
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-blue-400">2</span>
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-slate-200 mb-3">
                Scan this QR code
              </h4>
              {/* QR Code placeholder - in real implementation, use a QR code library */}
              <div className="w-48 h-48 bg-white rounded-xl p-4 mb-3">
                <div className="w-full h-full bg-slate-200 rounded flex items-center justify-center">
                  <span className="text-xs text-slate-500 text-center px-2">
                    [QR Code would render here]
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-500 mb-2">
                Or enter this code manually:
              </p>
              <code className="block px-3 py-2 bg-slate-800 rounded-lg text-sm font-mono text-slate-300 select-all">
                {secret}
              </code>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-blue-400">3</span>
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-slate-200 mb-1">
                Enter verification code
              </h4>
              <p className="text-sm text-slate-400 mb-3">
                Enter the 6-digit code from your authenticator app.
              </p>
            </div>
          </div>

          {/* Verification Input */}
          <div className="pl-12">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="w-full max-w-[200px] px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-center text-2xl font-mono tracking-widest text-slate-100 placeholder:text-slate-600 focus:border-blue-500 transition-colors"
            />
            {error && (
              <p className="mt-2 text-sm text-red-400">{error}</p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pl-12">
            <button
              onClick={() => {
                setStep("idle");
                setVerificationCode("");
                setError(null);
              }}
              className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-sm font-medium hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={verifyAndEnable}
              disabled={isLoading || verificationCode.length !== 6}
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 transition-colors disabled:opacity-50"
            >
              {isLoading ? "Verifying..." : "Verify & Enable"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Backup codes step
  if (step === "backup") {
    return (
      <div className={`card p-6 ${className}`}>
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-emerald-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-slate-100 mb-2">
            Two-Factor Authentication Enabled!
          </h3>
          <p className="text-slate-400">
            Save these backup codes in a secure place. You can use them to access your account if you lose your phone.
          </p>
        </div>

        {/* Backup Codes */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 mb-4">
          <div className="grid grid-cols-2 gap-2">
            {backupCodes.map((code, index) => (
              <div
                key={index}
                className="px-3 py-2 bg-slate-900/50 rounded-lg font-mono text-sm text-slate-300 text-center"
              >
                {code}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-center gap-3 mb-6">
          <button
            onClick={copyBackupCodes}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-sm font-medium hover:bg-slate-700 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
              />
            </svg>
            Copy codes
          </button>
        </div>

        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 mb-6">
          <p className="text-xs text-amber-400 text-center">
            Each backup code can only be used once. Store them securely.
          </p>
        </div>

        <button
          onClick={finishSetup}
          className="w-full py-3 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-500 transition-colors"
        >
          Done
        </button>
      </div>
    );
  }

  // Disable step
  if (step === "disable") {
    return (
      <div className={`card p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-slate-100 mb-2">
          Disable Two-Factor Authentication
        </h3>
        <p className="text-sm text-slate-400 mb-6">
          Enter your 6-digit code from your authenticator app to disable 2FA.
        </p>

        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          value={verificationCode}
          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
          placeholder="000000"
          className="w-full max-w-[200px] px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-center text-2xl font-mono tracking-widest text-slate-100 placeholder:text-slate-600 focus:border-red-500 transition-colors mb-4"
        />

        {error && (
          <p className="mb-4 text-sm text-red-400">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => {
              setStep("idle");
              setVerificationCode("");
              setError(null);
            }}
            className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-sm font-medium hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDisable}
            disabled={isLoading || verificationCode.length !== 6}
            className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-500 transition-colors disabled:opacity-50"
          >
            {isLoading ? "Disabling..." : "Disable 2FA"}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
