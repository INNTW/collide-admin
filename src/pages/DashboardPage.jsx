import React from "react";
import { Users, Calendar, DollarSign, TrendingUp } from "lucide-react";
import { StatCard, SectionCard, EmptyState, Badge } from "../components";
import { BRAND } from "../constants/brand";
import { formatDate, currency } from "../utils/formatters";

const DashboardPage = ({ employees = [], events = [], locations = [], shifts = [], availability = {}, products = [], stock = {}, historicSales = [] }) => {
  const today = new Date().toISOString().split("T")[0];
  const upcomingEvents = (events || [])
    .filter((e) => e.end_date >= today)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
    .slice(0, 5);

  const totalStaff = (employees || []).length;
  const activeEvents = (events || []).filter(e => e.status === "active").length;

  // Payroll summary — pay_records not yet loaded in this phase, show placeholder
  const payrollThisMonth = 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2" style={{ color: BRAND.text }}>
          Dashboard
        </h1>
        <p style={{ color: "rgba(224,230,255,0.7)" }}>
          Welcome back! Here's your team overview.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Total Staff"
          value={totalStaff}
          color="primary"
        />
        <StatCard
          icon={Calendar}
          label="Upcoming Events"
          value={upcomingEvents.length}
          color="warning"
        />
        <StatCard
          icon={DollarSign}
          label="Payroll This Month"
          value={currency(payrollThisMonth)}
          color="success"
        />
        <StatCard
          icon={TrendingUp}
          label="Avg Shift Duration"
          value="6.5h"
          trend={{ positive: true, value: 5 }}
          color="warning"
        />
      </div>

      <SectionCard title="Upcoming Events" icon={Calendar}>
        {upcomingEvents.length === 0 ? (
          <EmptyState title="No events" message="All upcoming shifts are scheduled" />
        ) : (
          <div className="space-y-2">
            {upcomingEvents.map((event) => (
              <div
                key={event.id}
                className="p-3 rounded-lg"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium" style={{ color: BRAND.text }}>
                      {event.name}
                    </p>
                    <p className="text-sm" style={{ color: "rgba(224,230,255,0.6)" }}>
                      {formatDate(event.start_date)} — {formatDate(event.end_date)}
                    </p>
                  </div>
                  <Badge color={event.status === "active" ? "success" : event.status === "upcoming" ? "primary" : "gray"}>{event.status || "upcoming"}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
};

export default DashboardPage;
