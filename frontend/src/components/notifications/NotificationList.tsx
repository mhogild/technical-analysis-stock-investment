import Link from "next/link";
import type { Notification } from "@/types";
import { formatRelativeTime } from "@/lib/formatters";

interface NotificationListProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
}

export default function NotificationList({
  notifications,
  onMarkAsRead,
}: NotificationListProps) {
  if (notifications.length === 0) {
    return (
      <div className="px-4 py-6 text-center text-sm text-gray-400">
        No notifications
      </div>
    );
  }

  return (
    <ul className="max-h-80 overflow-y-auto">
      {notifications.map((notif) => (
        <li key={notif.id}>
          <Link
            href={`/stock/${notif.symbol}`}
            onClick={() => {
              if (notif.status !== "read") onMarkAsRead(notif.id);
            }}
            className={`block px-4 py-3 hover:bg-gray-50 border-b border-gray-50 ${
              notif.status === "pending" ? "bg-blue-50/50" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm text-gray-900">
                {notif.symbol}
              </span>
              <span className="text-xs text-gray-400">
                {formatRelativeTime(notif.created_at)}
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-0.5">
              {notif.previous_signal} → {notif.new_signal}
            </p>
            {notif.explanation && (
              <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                {notif.explanation}
              </p>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
