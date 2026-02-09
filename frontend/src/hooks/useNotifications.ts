import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { Notification } from "@/types";

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadNotifications();

    // Subscribe to real-time notifications
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications((prev) => [newNotif, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadNotifications() {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return;

    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", session.session.user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) {
      setNotifications(data as Notification[]);
      setUnreadCount(data.filter((n) => n.status === "pending").length);
    }
  }

  async function markAsRead(id: string) {
    await supabase
      .from("notifications")
      .update({ status: "read" })
      .eq("id", id);

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, status: "read" as const } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }

  return { notifications, unreadCount, markAsRead };
}
