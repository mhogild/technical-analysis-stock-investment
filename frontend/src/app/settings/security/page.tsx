"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import PasswordStrength, { validatePassword } from "@/components/security/PasswordStrength";
import SessionList from "@/components/security/SessionList";
import TwoFactorSetup from "@/components/security/TwoFactorSetup";
import type { UserSession, SecuritySettings } from "@/types";

export default function SecuritySettingsPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    email_verified: false,
    email_verified_at: null,
    two_factor_enabled: false,
    last_password_change: null,
  });

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      router.push("/auth/login");
    }
  }, [user, router]);

  // Fetch sessions
  useEffect(() => {
    async function fetchSessions() {
      try {
        // In real implementation, fetch from API
        // Mock data for now
        setSessions([
          {
            id: "1",
            created_at: new Date().toISOString(),
            last_active_at: new Date().toISOString(),
            ip_address: "192.168.1.100",
            user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0",
            is_current: true,
          },
          {
            id: "2",
            created_at: new Date(Date.now() - 86400000).toISOString(),
            last_active_at: new Date(Date.now() - 3600000).toISOString(),
            ip_address: "10.0.0.50",
            user_agent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1",
            is_current: false,
          },
        ]);
      } catch (err) {
        console.error("Failed to fetch sessions:", err);
      } finally {
        setSessionsLoading(false);
      }
    }

    if (user) {
      fetchSessions();
    }
  }, [user]);

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (!currentPassword) {
      setPasswordError("Please enter your current password");
      return;
    }

    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      setPasswordError("New password does not meet requirements");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    setIsChangingPassword(true);
    try {
      // In real implementation, call API to change password
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError("Failed to change password. Please try again.");
    } finally {
      setIsChangingPassword(false);
    }
  }

  async function handleRevokeSession(sessionId: string) {
    // In real implementation, call API to revoke session
    await new Promise((resolve) => setTimeout(resolve, 500));
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
  }

  async function handleEnable2FA(code: string) {
    // In real implementation, call API to enable 2FA
    await new Promise((resolve) => setTimeout(resolve, 1000));
    // Simulate success
    if (code === "123456") {
      setSecuritySettings((prev) => ({ ...prev, two_factor_enabled: true }));
      return {
        success: true,
        backupCodes: [
          "ABC12-DEF34",
          "GHI56-JKL78",
          "MNO90-PQR12",
          "STU34-VWX56",
          "YZA78-BCD90",
          "EFG12-HIJ34",
          "KLM56-NOP78",
          "QRS90-TUV12",
        ],
      };
    }
    return { success: false };
  }

  async function handleDisable2FA(code: string) {
    // In real implementation, call API to disable 2FA
    await new Promise((resolve) => setTimeout(resolve, 1000));
    if (code === "123456") {
      setSecuritySettings((prev) => ({ ...prev, two_factor_enabled: false }));
      return true;
    }
    return false;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-grid py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push("/settings")}
            className="flex items-center gap-1 text-sm text-slate-400 hover:text-white mb-4 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Back to Settings
          </button>
          <h1 className="text-3xl font-bold text-slate-100 mb-2">Security</h1>
          <p className="text-slate-400">
            Manage your account security settings, password, and active sessions.
          </p>
        </div>

        <div className="space-y-6">
          {/* Email Verification Status */}
          <div className="card p-6">
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                securitySettings.email_verified
                  ? "bg-emerald-500/10 border border-emerald-500/30"
                  : "bg-amber-500/10 border border-amber-500/30"
              }`}>
                <svg
                  className={`w-6 h-6 ${securitySettings.email_verified ? "text-emerald-400" : "text-amber-400"}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-semibold text-slate-100">Email Verification</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    securitySettings.email_verified
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-amber-500/10 text-amber-400"
                  }`}>
                    {securitySettings.email_verified ? "Verified" : "Not Verified"}
                  </span>
                </div>
                <p className="text-sm text-slate-400">
                  {securitySettings.email_verified
                    ? `Your email was verified on ${new Date(securitySettings.email_verified_at!).toLocaleDateString()}`
                    : "Please verify your email to access all features."}
                </p>
                {!securitySettings.email_verified && (
                  <button className="mt-3 px-4 py-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 text-sm font-medium hover:bg-amber-500/20 transition-colors">
                    Resend Verification Email
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Password Change */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">Change Password</h3>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:border-blue-500 transition-colors"
                  placeholder="Enter current password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:border-blue-500 transition-colors"
                  placeholder="Enter new password"
                />
                {newPassword && (
                  <PasswordStrength password={newPassword} className="mt-3" />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:border-blue-500 transition-colors"
                  placeholder="Confirm new password"
                />
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="mt-1.5 text-xs text-red-400">Passwords do not match</p>
                )}
              </div>

              {passwordError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                  <p className="text-sm text-red-400">{passwordError}</p>
                </div>
              )}

              {passwordSuccess && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                  <p className="text-sm text-emerald-400">Password changed successfully!</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isChangingPassword || !currentPassword || !newPassword || newPassword !== confirmPassword}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isChangingPassword ? "Changing Password..." : "Change Password"}
              </button>
            </form>
          </div>

          {/* Two-Factor Authentication */}
          <TwoFactorSetup
            isEnabled={securitySettings.two_factor_enabled}
            onEnable={handleEnable2FA}
            onDisable={handleDisable2FA}
          />

          {/* Active Sessions */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-100">Active Sessions</h3>
              <span className="text-xs text-slate-500">
                {sessions.length} device{sessions.length !== 1 ? "s" : ""}
              </span>
            </div>
            <SessionList
              sessions={sessions}
              onRevokeSession={handleRevokeSession}
              isLoading={sessionsLoading}
            />
          </div>

          {/* Danger Zone */}
          <div className="card p-6 border-red-500/30">
            <h3 className="text-lg font-semibold text-red-400 mb-2">Danger Zone</h3>
            <p className="text-sm text-slate-400 mb-4">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            <button className="px-4 py-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 text-sm font-medium hover:bg-red-500/20 transition-colors">
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
