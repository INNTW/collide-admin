import React from "react";
import { BRAND } from "../constants/brand";

const NotificationsPage = ({ notifications = [] }) => {
  const displayNotifs = notifications.length > 0 ? notifications : [
    {
      id: 1,
      type: "shift",
      title: "New Shift Available",
      message: "Friday 6PM - 10PM retail shift",
      time: "2 hours ago",
      read: false,
    },
    {
      id: 2,
      type: "payroll",
      title: "Paycheck Processed",
      message: "Your paycheck has been processed",
      time: "1 day ago",
      read: false,
    },
    {
      id: 3,
      type: "schedule",
      title: "Schedule Updated",
      message: "Your availability affects 2 shifts",
      time: "3 days ago",
      read: true,
    },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold" style={{ color: BRAND.text }}>
        Notifications
      </h1>

      <div className="space-y-2">
        {displayNotifs.map((notif) => (
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
                  className="w-2 h-2 rounded-full"
                  style={{ background: BRAND.primary }}
                ></div>
              )}
            </div>
            <p className="text-xs mt-2" style={{ color: "rgba(224,230,255,0.4)" }}>
              {notif.time}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationsPage;
