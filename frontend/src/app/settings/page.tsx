"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";

interface UserSettings {
  base_currency: string;
  notifications_enabled: boolean;
  notifications_email: boolean;
  notifications_inapp: boolean;
}

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [settings, setSettings] = useState<UserSettings>({
    base_currency: "USD",
    notifications_enabled: true,
    notifications_email: true,
    notifications_inapp: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
      return;
    }
    if (user) loadSettings();
  }, [user, authLoading, router]);

  async function loadSettings() {
    const { data } = await supabase
      .from("profiles")
      .select("base_currency, notifications_enabled, notifications_email, notifications_inapp")
      .eq("id", user!.id)
      .single();

    if (data) {
      setSettings(data);
    }
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);

    await supabase.from("profiles").update(settings).eq("id", user!.id);

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <LoadingSkeleton variant="text" count={2} />
        <LoadingSkeleton variant="card" count={3} />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Settings</h1>

      <div className="space-y-8">
        {/* Currency */}
        <section className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Base Currency
          </h2>
          <select
            value={settings.base_currency}
            onChange={(e) =>
              setSettings({ ...settings, base_currency: e.target.value })
            }
            className="w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="USD">USD — US Dollar</option>
            <option value="EUR">EUR — Euro</option>
            <option value="GBP">GBP — British Pound</option>
            <option value="SEK">SEK — Swedish Krona</option>
            <option value="NOK">NOK — Norwegian Krone</option>
            <option value="DKK">DKK — Danish Krone</option>
            <option value="JPY">JPY — Japanese Yen</option>
            <option value="HKD">HKD — Hong Kong Dollar</option>
            <option value="CNY">CNY — Chinese Yuan</option>
          </select>
        </section>

        {/* Notifications */}
        <section className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Notifications
          </h2>

          <div className="space-y-4">
            {/* Global toggle */}
            <label className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Enable notifications
                </p>
                <p className="text-xs text-gray-500">
                  Master toggle for all notifications
                </p>
              </div>
              <button
                onClick={() =>
                  setSettings({
                    ...settings,
                    notifications_enabled: !settings.notifications_enabled,
                  })
                }
                className={`h-6 w-11 rounded-full relative transition-colors ${
                  settings.notifications_enabled ? "bg-blue-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    settings.notifications_enabled
                      ? "translate-x-5"
                      : "translate-x-0.5"
                  }`}
                />
              </button>
            </label>

            {settings.notifications_enabled && (
              <>
                <hr className="border-gray-100" />

                <label className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      In-app notifications
                    </p>
                    <p className="text-xs text-gray-500">
                      Show notifications in the app
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setSettings({
                        ...settings,
                        notifications_inapp: !settings.notifications_inapp,
                      })
                    }
                    className={`h-6 w-11 rounded-full relative transition-colors ${
                      settings.notifications_inapp
                        ? "bg-blue-600"
                        : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        settings.notifications_inapp
                          ? "translate-x-5"
                          : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </label>

                <label className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Email notifications
                    </p>
                    <p className="text-xs text-gray-500">
                      Receive signal changes via email
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setSettings({
                        ...settings,
                        notifications_email: !settings.notifications_email,
                      })
                    }
                    className={`h-6 w-11 rounded-full relative transition-colors ${
                      settings.notifications_email
                        ? "bg-blue-600"
                        : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        settings.notifications_email
                          ? "translate-x-5"
                          : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </label>
              </>
            )}
          </div>
        </section>

        {/* Save */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-blue-600 px-6 py-2 text-sm text-white font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
          {saved && (
            <span className="text-sm text-green-600">Settings saved</span>
          )}
        </div>
      </div>
    </div>
  );
}
