import React from "react";
import { Bell, CheckCheck } from "lucide-react";
import { EmptyState, Btn } from "../components";
import { BRAND } from "../constants/brand";

const formatRelativeTime = (dateStr) => {
  if (!dateStr) return "";
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? "s" : ""} ago`;
  if (diffHr < 24) return `${diffHr} hour${diffHr !== 1 ? "s" : ""} ago`;
  if (diffDay < 30) return `${diffDay} day${diffDay !== 1 ? "s" : ""} ago`;
  return date.toLocaleDateString();
};

const NotificationsPage = ({ notifications = [], onRefresh }) => {
  const hasUnread = notifications.some((n) => !n.read);

  const handleMarkAllRead = async () => {
    // Attempt to mark all as read via Supabase if onRefresh is available
    try {
      const tokenKey = Object.keys(localStorage).find(
        (k) => k.startsWith("sb-") && k.endsWith("-auth-token")
      );
      if (tokenKey) {
        const token = JSON.parse(localStorage.getItem(tokenKey))?.access_token;
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        if (token && supabaseUrl) {
          await fetch(`${supabaseUrl}/rest/v1/notifications?read=eq.false`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
              Authorization: `Bearer ${token}`,
              Prefer: "return=minimal",
            },
            body: JSON.stringify({ read: true }),
          });
          onRefresh?.();
        }
      }
    } catch (err) {
      console.error("Failed to mark notifications read:", err);
    }
  };

  if (notifications.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold" style={{ color: BRAND.text }}>
          Notifications
        </h1>
        <EmptyState
          icon={Bell}
          title="No notifications"
          message="You're all caught up!"
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: BRAND.text }}>
          Notifications
        </h1>
        {hasUnread && (
          <Btn
            icon={CheckCheck}
            size="sm"
            variant="secondary"
            onClick={handleMarkAllRead}
          >
            Mark all read
          </Btn>
        )}
      </div>

      <div className="space-y-2">
        {notifications.map((notif) => (
          <div
            key={notif.id}
            className="p-4 rounded-lg cursor-pointer transition hover:bg-white/10"
            style={{
              background: notif.read ? "rgba(255,255,255,0.02)" : "rgba(84,205,249,0.1)",
              border: `1px solid ${notif.read ? BRAND.glassBorder : BRAND.primary}`,
            }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium" style={{ color: BRAND.text }}>
                  {notif.title}
                </p>
                <p className="text-sm mt-1" style={{ color: "rgba(224,230,255,0.6)" }}>
                  {notif.message}
                </p>
              </div>
              {!notif.read && (
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0 mt-2"
                  style={{ background: BRAND.primary }}
                ></div>
              )}
            </div>
            <p className="text-xs mt-2" style={{ color: "rgba(224,230,255,0.4)" }}>
              {formatRelativeTime(notif.created_at)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationsPage;
