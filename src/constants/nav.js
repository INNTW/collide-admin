import {
  Home,
  Calendar,
  Users,
  Package,
  TrendingUp,
  BarChart3,
  Bell,
  Settings,
} from "lucide-react";

// Navigation tree structure
// Role hierarchy: admin > team_lead > employee
// Each nav item specifies which roles can see it
export const NAV_TREE = {
  sections: [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: Home,
      page: null,
      roles: ["admin", "team_lead", "employee"],
    },
    {
      id: "scheduling",
      label: "Scheduling",
      icon: Calendar,
      roles: ["admin", "team_lead", "employee"],
      children: [
        { id: "events-manager", label: "Events Manager", page: "events-manager", roles: ["admin", "team_lead"] },
        { id: "calendar", label: "Calendar View", page: "calendar-view", roles: ["admin", "team_lead"] },
        { id: "shift-builder", label: "Shift Builder", page: "shift-builder", roles: ["admin", "team_lead"] },
        { id: "role-requirements", label: "Role Requirements", page: "role-requirements", roles: ["admin", "team_lead"] },
        { id: "availability", label: "Availability", page: "availability", roles: ["admin", "team_lead", "employee"] },
        { id: "my-shifts", label: "My Shifts", page: "my-shifts", roles: ["admin", "team_lead", "employee"] },
      ],
    },
    {
      id: "employees",
      label: "Employees",
      icon: Users,
      roles: ["admin", "team_lead"],
      children: [
        { id: "directory", label: "Directory", page: "directory", roles: ["admin", "team_lead"] },
        { id: "skills-tags", label: "Skills & Tags", page: "skills-tags", roles: ["admin", "team_lead"] },
        { id: "payroll", label: "Payroll & T4", page: "payroll", roles: ["admin"] },
      ],
    },
    {
      id: "inventory",
      label: "Inventory",
      icon: Package,
      roles: ["admin", "team_lead"],
      children: [
        { id: "products", label: "Products", page: "products", roles: ["admin", "team_lead"] },
        { id: "stock", label: "Stock & Distribution", page: "stock", roles: ["admin", "team_lead"] },
        { id: "inv-analytics", label: "Analytics", page: "inv-analytics", roles: ["admin"] },
        { id: "inv-projections", label: "Projections", page: "inv-projections", roles: ["admin"] },
      ],
    },
    {
      id: "projections",
      label: "Projections",
      icon: TrendingUp,
      roles: ["admin"],
      children: [
        { id: "sales-projections", label: "Sales Forecast", page: "sales-projections", roles: ["admin"] },
        { id: "staffing-projections", label: "Staffing Needs", page: "staffing-projections", roles: ["admin"] },
        { id: "event-pnl", label: "Event P&L", page: "event-pnl", roles: ["admin"] },
      ],
    },
    {
      id: "reports",
      label: "Reports",
      icon: BarChart3,
      page: "reports",
      roles: ["admin", "team_lead"],
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: Bell,
      page: "notifications",
      roles: ["admin", "team_lead", "employee"],
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      roles: ["admin"],
      children: [
        { id: "general-settings", label: "General", page: "settings", roles: ["admin"] },
        { id: "user-management", label: "User Management", page: "user-management", roles: ["admin"] },
      ],
    },
  ],
};
