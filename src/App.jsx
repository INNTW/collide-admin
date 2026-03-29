/**
 * Collide Apparel Staff Manager v5.1
 * Modular architecture — thin shell with auth, routing, layout, and data loading
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Bell,
  LogOut,
  Menu,
  X,
  Search,
  ChevronDown,
} from "lucide-react";
import { supabase } from "./lib/supabase";

// Constants
import { BRAND } from "./constants/brand";
import { NAV_TREE } from "./constants/nav";

// Components
import CommandPalette from "./components/CommandPalette";
import ErrorBoundary from "./components/ErrorBoundary";

// Pages
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import EventsManagementPage from "./pages/EventsManagementPage";
import CalendarViewPage from "./pages/CalendarViewPage";
import ShiftBuilderPage from "./pages/ShiftBuilderPage";
import RoleRequirementsPage from "./pages/RoleRequirementsPage";
import DirectoryPage from "./pages/DirectoryPage";
import SkillsTagsPage from "./pages/SkillsTagsPage";
import AvailabilityPage from "./pages/AvailabilityPage";
import MyShiftsPage from "./pages/MyShiftsPage";
import PayrollPage from "./pages/PayrollPage";
import ReportsPage from "./pages/ReportsPage";
import InventoryProductsPage from "./pages/InventoryProductsPage";
import InventoryStockPage from "./pages/InventoryStockPage";
import InventoryAnalyticsPage from "./pages/InventoryAnalyticsPage";
import InventoryProjectionsPage from "./pages/InventoryProjectionsPage";
import SalesProjectionsPage from "./pages/SalesProjectionsPage";
import StaffingProjectionsPage from "./pages/StaffingProjectionsPage";
import EventPnLPage from "./pages/EventPnLPage";
import NotificationsPage from "./pages/NotificationsPage";
import UserManagementPage from "./pages/UserManagementPage";
import SettingsPage from "./pages/SettingsPage";

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

export default function App() {
  // Authentication & Data
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Navigation State
  const [currentNav, setCurrentNav] = useState(() => {
    const hash = window.location.hash.replace('#/', '');
    if (hash) {
      for (const section of NAV_TREE.sections) {
        if (section.id === hash) return { section: hash, page: null };
        const child = section.children?.find(c => c.page === hash);
        if (child) return { section: section.id, page: hash };
      }
    }
    return { section: "dashboard", page: null };
  });
  const [expandedSections, setExpandedSections] = useState(new Set());

  // Data State
  const [employees, setEmployees] = useState([]);
  const [events, setEvents] = useState([]);
  const [locations, setLocations] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [availability, setAvailability] = useState({});
  const [products, setProducts] = useState([]);
  const [stock, setStock] = useState({});
  const [distributions, setDistributions] = useState([]);
  const [historicSales, setHistoricSales] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [skills, setSkills] = useState([]);
  const [employeeSkills, setEmployeeSkills] = useState([]);
  const [roleRequirements, setRoleRequirements] = useState([]);

  // Role State — default to most restrictive until confirmed
  const [currentRole, setCurrentRole] = useState(null);
  const [roleLoaded, setRoleLoaded] = useState(false);

  // UI State
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const unsubscribeRef = useRef(new Set());

  // Reactive mobile detection (must be before any early returns to respect hooks rules)
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" && window.innerWidth < 768
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  useEffect(() => {
    if (!isMobile) setMobileMenuOpen(false);
  }, [isMobile]);

  // Hash routing - update hash when currentNav changes
  useEffect(() => {
    const page = currentNav.page || currentNav.section;
    window.location.hash = `#/${page}`;
  }, [currentNav]);

  // Hash routing - listen for back/forward navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#/', '');
      if (!hash) return;
      for (const section of NAV_TREE.sections) {
        if (section.id === hash && currentNav.section !== hash) {
          setCurrentNav({ section: hash, page: null });
          return;
        }
        const child = section.children?.find(c => c.page === hash);
        if (child && currentNav.page !== hash) {
          setCurrentNav({ section: section.id, page: hash });
          return;
        }
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [currentNav]);

  // Check auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Optimistic auth: check localStorage for cached token first
        const cachedSession = localStorage.getItem('supabase.auth.token');
        if (cachedSession) {
          try {
            const parsed = JSON.parse(cachedSession);
            if (parsed.user) {
              setUser(parsed.user);
              await loadData();
            }
          } catch (e) {
            // Invalid cached session, will verify via getSession
          }
        }

        // Verify/refresh token in background (with timeout)
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Auth session check timed out")), 8000)
        );
        const {
          data: { session },
        } = await Promise.race([sessionPromise, timeoutPromise]);
        if (session?.user) {
          setUser(session.user);
          if (!cachedSession) {
            await loadData();
          }
        }
      } catch (error) {
        if (error.message !== "Auth session check timed out" || !localStorage.getItem('supabase.auth.token')) {
          console.error("Auth check failed:", error);
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        if (event === "SIGNED_IN") {
          await loadData();
        }
      } else {
        setUser(null);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Load data from Supabase
  const loadData = async () => {
    try {
      const [empRes, evtRes, locRes, shiftRes, availRes, prodRes, stockRes, distRes, histRes, templRes, notRes, skillsRes, empSkillsRes, roleReqRes] = await Promise.all([
        supabase.from("employees").select("*"),
        supabase.from("events").select("*"),
        supabase.from("event_locations").select("*"),
        supabase.from("shifts").select("*"),
        supabase.from("employee_availability").select("*"),
        supabase.from("products").select("*"),
        supabase.from("stock_levels").select("*"),
        supabase.from("distributions").select("*"),
        supabase.from("historic_sales").select("*"),
        supabase.from("shift_templates").select("*, shift_template_entries(*)"),
        supabase.from("notifications").select("*"),
        supabase.from("skills").select("*").order("sort_order"),
        supabase.from("employee_skills").select("*, skills(*)"),
        supabase.from("role_requirements").select("*"),
      ]);
      if (empRes.data) setEmployees(empRes.data);
      if (evtRes.data) setEvents(evtRes.data);
      if (locRes.data) setLocations(locRes.data);
      if (shiftRes.data) setShifts(shiftRes.data);
      if (availRes.data) {
        const availObj = {};
        availRes.data.forEach(r => {
          if (!availObj[r.employee_id]) availObj[r.employee_id] = {};
          availObj[r.employee_id][r.avail_date] = r.status;
        });
        setAvailability(availObj);
      }
      if (prodRes.data) setProducts(prodRes.data);
      if (stockRes.data) {
        const stockObj = {};
        stockRes.data.forEach(r => { stockObj[r.product_id] = r.quantity; });
        setStock(stockObj);
      }
      if (distRes.data) setDistributions(distRes.data);
      if (histRes.data) setHistoricSales(histRes.data);
      if (templRes.data) setTemplates(templRes.data.map(t => ({ ...t, shifts: t.shift_template_entries || [] })));
      if (notRes.data) setNotifications(notRes.data);
      if (skillsRes.data) setSkills(skillsRes.data);
      if (empSkillsRes.data) setEmployeeSkills(empSkillsRes.data);
      if (roleReqRes.data) setRoleRequirements(roleReqRes.data);

      // Subscribe to realtime updates
      setupRealtimeSubscriptions();
    } catch (error) {
      console.error("Data load failed:", error);
    }
  };

  // Load current user's role — raw fetch to bypass Supabase Web Locks bug entirely
  const loadUserRole = useCallback(async () => {
    if (!user?.email) return;
    try {
      let token = null;
      try {
        const key = Object.keys(localStorage).find(k => k.startsWith("sb-") && k.endsWith("-auth-token"));
        if (key) {
          const stored = JSON.parse(localStorage.getItem(key));
          token = stored?.access_token || null;
        }
      } catch (e) { /* ignore */ }

      if (token) {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/get_my_role`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
              "Content-Type": "application/json",
            },
            body: "{}",
          }
        );
        if (res.ok) {
          const role = await res.json();
          if (role && typeof role === "string") {
            setCurrentRole(role);
            setRoleLoaded(true);
            return;
          }
        }
      }
    } catch (e) {
      console.error("Role load failed:", e);
    }
    setCurrentRole("employee");
    setRoleLoaded(true);
  }, [user]);

  useEffect(() => { loadUserRole(); }, [loadUserRole]);

  // Per-table reload functions for realtime — avoids refetching all 14 tables on every change
  const reloadTable = async (table) => {
    try {
      switch (table) {
        case "employees": {
          const { data } = await supabase.from("employees").select("*");
          if (data) setEmployees(data);
          break;
        }
        case "events": {
          const { data } = await supabase.from("events").select("*");
          if (data) setEvents(data);
          break;
        }
        case "event_locations": {
          const { data } = await supabase.from("event_locations").select("*");
          if (data) setLocations(data);
          break;
        }
        case "shifts": {
          const { data } = await supabase.from("shifts").select("*");
          if (data) setShifts(data);
          break;
        }
        case "notifications": {
          const { data } = await supabase.from("notifications").select("*");
          if (data) setNotifications(data);
          break;
        }
        case "skills": {
          const { data } = await supabase.from("skills").select("*").order("sort_order");
          if (data) setSkills(data);
          break;
        }
        case "employee_skills": {
          const { data } = await supabase.from("employee_skills").select("*, skills(*)");
          if (data) setEmployeeSkills(data);
          break;
        }
        case "role_requirements": {
          const { data } = await supabase.from("role_requirements").select("*");
          if (data) setRoleRequirements(data);
          break;
        }
        case "products": {
          const { data } = await supabase.from("products").select("*");
          if (data) setProducts(data);
          break;
        }
        case "stock_levels": {
          const { data } = await supabase.from("stock_levels").select("*");
          if (data) {
            const stockObj = {};
            data.forEach(r => { stockObj[r.product_id] = r.quantity; });
            setStock(stockObj);
          }
          break;
        }
        case "distributions": {
          const { data } = await supabase.from("distributions").select("*");
          if (data) setDistributions(data);
          break;
        }
        case "employee_availability": {
          const { data } = await supabase.from("employee_availability").select("*");
          if (data) {
            const availObj = {};
            data.forEach(r => {
              if (!availObj[r.employee_id]) availObj[r.employee_id] = {};
              availObj[r.employee_id][r.avail_date] = r.status;
            });
            setAvailability(availObj);
          }
          break;
        }
        default:
          break;
      }
    } catch (error) {
      console.error(`Realtime reload failed for ${table}:`, error);
    }
  };

  // Debounce timers for per-table realtime reloads
  const debounceTimers = useRef({});

  const debouncedReloadTable = (table) => {
    if (debounceTimers.current[table]) {
      clearTimeout(debounceTimers.current[table]);
    }
    debounceTimers.current[table] = setTimeout(() => {
      delete debounceTimers.current[table];
      reloadTable(table);
    }, 500);
  };

  // Setup Realtime subscriptions
  const setupRealtimeSubscriptions = () => {
    const tables = ["employees", "events", "event_locations", "shifts", "notifications", "skills", "employee_skills", "role_requirements", "products", "stock_levels", "distributions"];

    const subscriptions = tables.map((table) => {
      const channel = supabase
        .channel(`public:${table}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table,
          },
          () => {
            debouncedReloadTable(table);
          }
        )
        .subscribe();

      return channel;
    });

    subscriptions.forEach((channel) => {
      unsubscribeRef.current.add(channel);
    });
  };

  // Cleanup subscriptions and debounce timers
  useEffect(() => {
    return () => {
      unsubscribeRef.current.forEach((channel) => {
        supabase.removeChannel(channel);
      });
      Object.values(debounceTimers.current).forEach(clearTimeout);
    };
  }, []);

  // Handle logout — bypass supabase.auth.signOut() which triggers Web Locks bug
  const handleLogout = () => {
    try {
      const key = Object.keys(localStorage).find(k => k.startsWith("sb-") && k.endsWith("-auth-token"));
      if (key) localStorage.removeItem(key);
    } catch (e) { /* ignore */ }
    setUser(null);
    setCurrentRole(null);
    setRoleLoaded(false);
    setCurrentNav({ section: "dashboard", page: null });
  };

  // Get breadcrumb
  const getBreadcrumb = () => {
    const section = NAV_TREE.sections.find((s) => s.id === currentNav.section);
    if (!section) return "";
    if (!section.children) return section.label;
    const child = section.children.find((c) => c.page === currentNav.page);
    if (child) return `${section.label} > ${child.label}`;
    return section.label;
  };

  // Navigation handler
  const handleNavigate = (nav) => {
    setCurrentNav(nav);
    setMobileMenuOpen(false);
    const section = NAV_TREE.sections.find((s) => s.id === nav.section);
    if (section?.children) {
      setExpandedSections(new Set([...expandedSections, nav.section]));
    }
  };

  // Toggle section expansion
  const toggleSection = (sectionId) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  // Check if user has access to a page by checking NAV_TREE roles
  const hasPageAccess = (pageName) => {
    if (!currentRole) return false;
    if (!pageName || pageName === "dashboard") return true;
    for (const section of NAV_TREE.sections) {
      if (section.page === pageName) return !section.roles || section.roles.includes(currentRole);
      if (section.children) {
        const child = section.children.find(c => c.page === pageName);
        if (child) return !child.roles || child.roles.includes(currentRole);
      }
    }
    return false;
  };

  const AccessDenied = () => (
    <div style={{ padding: 40, textAlign: "center" }}>
      <div style={{
        background: BRAND.glass,
        backdropFilter: "blur(20px)",
        border: `1px solid ${BRAND.glassBorder}`,
        borderRadius: 16,
        padding: "40px 32px",
        maxWidth: 420,
        margin: "0 auto",
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h2 style={{ color: BRAND.text, marginBottom: 8, fontSize: 20 }}>Access Restricted</h2>
        <p style={{ color: "rgba(224,230,255,0.6)", fontSize: 14, lineHeight: 1.5 }}>
          You don't have permission to view this page. Contact your admin if you think this is a mistake.
        </p>
      </div>
    </div>
  );

  const renderPage = () => {
    if (!hasPageAccess(currentNav.page)) {
      return <AccessDenied />;
    }

    const pageContent = {
      dashboard: <DashboardPage employees={employees} events={events} locations={locations} shifts={shifts} availability={availability} products={products} stock={stock} historicSales={historicSales} />,
      "events-manager": <EventsManagementPage events={events} locations={locations} onRefresh={loadData} />,
      "calendar-view": <CalendarViewPage events={events} employees={employees} shifts={shifts} locations={locations} availability={availability} employeeSkills={employeeSkills} skills={skills} />,
      "shift-builder": <ShiftBuilderPage events={events} employees={employees} shifts={shifts} locations={locations} roleRequirements={roleRequirements} availability={availability} onRefresh={loadData} />,
      "role-requirements": <RoleRequirementsPage events={events} shifts={shifts} locations={locations} employees={employees} roleRequirements={roleRequirements} onRefresh={loadData} />,
      directory: <DirectoryPage employees={employees} employeeSkills={employeeSkills} skills={skills} onNavigate={handleNavigate} />,
      "skills-tags": <SkillsTagsPage employees={employees} skills={skills} employeeSkills={employeeSkills} onRefresh={loadData} />,
      availability: <AvailabilityPage employees={employees} events={events} availability={availability} onRefresh={loadData} user={user} currentRole={currentRole} />,
      "my-shifts": <MyShiftsPage employees={employees} events={events} shifts={shifts} user={user} locations={locations} />,
      payroll: <PayrollPage employees={employees} events={events} locations={locations} shifts={shifts} />,
      products: <InventoryProductsPage products={products} stock={stock} onRefresh={loadData} />,
      stock: <InventoryStockPage products={products} stock={stock} distributions={distributions} events={events} onRefresh={loadData} />,
      "inv-analytics": <InventoryAnalyticsPage historicSales={historicSales} products={products} distributions={distributions} stock={stock} events={events} />,
      "inv-projections": <InventoryProjectionsPage events={events} products={products} historicSales={historicSales} stock={stock} distributions={distributions} />,
      "sales-projections": <SalesProjectionsPage events={events} products={products} historicSales={historicSales} stock={stock} distributions={distributions} />,
      "staffing-projections": <StaffingProjectionsPage events={events} employees={employees} shifts={shifts} roleRequirements={roleRequirements} historicSales={historicSales} />,
      "event-pnl": <EventPnLPage events={events} products={products} historicSales={historicSales} employees={employees} shifts={shifts} stock={stock} roleRequirements={roleRequirements} distributions={distributions} />,
      reports: <ReportsPage employees={employees} events={events} shifts={shifts} historicSales={historicSales} products={products} />,
      notifications: <NotificationsPage notifications={notifications} onRefresh={loadData} />,
      settings: <SettingsPage user={user} />,
      "user-management": <UserManagementPage user={user} employees={employees} onRefresh={loadData} />,
    };

    if (!currentNav.page) {
      return pageContent.dashboard;
    }

    return pageContent[currentNav.page] || pageContent.dashboard;
  };

  // Loading state
  if (loading) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ background: BRAND.gradient, height: "100dvh", minHeight: "-webkit-fill-available" }}
      >
        <div className="text-center">
          <div
            className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-opacity-30 border-current"
            style={{ borderColor: BRAND.primary }}
          ></div>
          <p className="mt-4" style={{ color: BRAND.text }}>
            Loading...
          </p>
        </div>
      </div>
    );
  }

  // Login state
  if (!user) {
    return <LoginPage onLoginSuccess={setUser} />;
  }

  // Wait for role to load before rendering main UI
  if (!roleLoaded) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ background: BRAND.gradient, height: "100dvh", minHeight: "-webkit-fill-available" }}
      >
        <div className="text-center">
          <div
            className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-opacity-30 border-current"
            style={{ borderColor: BRAND.primary }}
          ></div>
          <p className="mt-4" style={{ color: BRAND.text }}>
            Loading your workspace...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col"
      style={{
        background: BRAND.gradient,
        height: "100dvh",
        minHeight: "-webkit-fill-available",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        className="flex-shrink-0 border-b px-3 py-2 md:px-4 md:py-3 flex items-center justify-between gap-2"
        style={{ borderColor: BRAND.glassBorder }}
      >
        <div className="flex items-center gap-2 flex-shrink-0">
          {isMobile && (
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 -ml-1 hover:bg-white/10 rounded-lg transition"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X size={22} style={{ color: BRAND.text }} />
              ) : (
                <Menu size={22} style={{ color: BRAND.text }} />
              )}
            </button>
          )}
          <h1 className={`font-bold ${isMobile ? "text-lg" : "text-xl"}`} style={{ color: BRAND.primary }}>
            Collide
          </h1>
          {currentRole && (
            <span className="flex-shrink-0" style={{
              fontSize: 10,
              padding: "2px 8px",
              borderRadius: 12,
              background: currentRole === "admin" ? `${BRAND.primary}30` : currentRole === "team_lead" ? "rgba(251,191,36,0.2)" : "rgba(74,222,128,0.2)",
              color: currentRole === "admin" ? BRAND.primary : currentRole === "team_lead" ? "#fbbf24" : "#4ade80",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}>
              {currentRole === "team_lead" ? "Team Lead" : currentRole}
            </span>
          )}
        </div>

        {/* Search — hidden on mobile, shown on desktop */}
        {!isMobile && (
          <div className="flex-1 max-w-md mx-4">
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="w-full px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition hover:bg-white/10"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: `1px solid ${BRAND.glassBorder}`,
                color: "rgba(224,230,255,0.7)",
              }}
            >
              <Search size={16} />
              <span>Search...</span>
              <span className="ml-auto text-xs">⌘K</span>
            </button>
          </div>
        )}

        <div className="flex items-center gap-1 flex-shrink-0">
          {isMobile && (
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="p-2.5 hover:bg-white/10 rounded-lg transition"
              aria-label="Search"
            >
              <Search size={20} style={{ color: BRAND.text }} />
            </button>
          )}
          <button
            onClick={() => handleNavigate({ section: "notifications", page: "notifications" })}
            className="p-2.5 hover:bg-white/10 rounded-lg transition"
            aria-label="Notifications"
          >
            <Bell size={20} style={{ color: BRAND.text }} />
          </button>
          <button
            onClick={handleLogout}
            className="p-2.5 hover:bg-white/10 rounded-lg transition"
            aria-label="Log out"
          >
            <LogOut size={20} style={{ color: BRAND.text }} />
          </button>
        </div>
      </div>

      {/* Breadcrumb — hide on mobile to save space */}
      {!isMobile && currentNav.page && (
        <div
          className="flex-shrink-0 px-4 py-2 text-sm border-b"
          style={{
            color: "rgba(224,230,255,0.6)",
            borderColor: BRAND.glassBorder,
          }}
        >
          {getBreadcrumb()}
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex" style={{ minHeight: 0 }}>
        {/* Desktop sidebar */}
        {!isMobile && (
          <div
            className="w-64 flex-shrink-0 overflow-y-auto border-r p-4 space-y-1"
            style={{ borderColor: BRAND.glassBorder }}
          >
            {NAV_TREE.sections.filter(section => {
              if (!currentRole) return false;
              return !section.roles || section.roles.includes(currentRole);
            }).map((section) => {
              const Icon = section.icon;
              const hasChildren = section.children && section.children.length > 0;
              const isActive = currentNav.section === section.id;
              const isExpanded = expandedSections.has(section.id);

              return (
                <div key={section.id}>
                  <button
                    onClick={() => {
                      if (hasChildren) {
                        toggleSection(section.id);
                      } else {
                        handleNavigate({
                          section: section.id,
                          page: section.page,
                        });
                      }
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg transition hover:bg-white/10 text-left text-sm"
                    style={{
                      background: isActive ? `${BRAND.primary}20` : "transparent",
                      color: isActive ? BRAND.primary : BRAND.text,
                    }}
                  >
                    <Icon size={18} />
                    <span className="flex-1">{section.label}</span>
                    {hasChildren && (
                      <ChevronDown
                        size={16}
                        style={{
                          transform: isExpanded ? "rotate(0)" : "rotate(-90deg)",
                          transition: "transform 0.2s",
                        }}
                      />
                    )}
                  </button>

                  {hasChildren && isExpanded && (
                    <div className="ml-4 space-y-1 mt-1">
                      {section.children.filter(child => {
                        if (!currentRole) return false;
                        return !child.roles || child.roles.includes(currentRole);
                      }).map((child) => {
                        const isChildActive = currentNav.page === child.page;
                        return (
                          <button
                            key={child.id}
                            onClick={() =>
                              handleNavigate({
                                section: section.id,
                                page: child.page,
                              })
                            }
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg transition hover:bg-white/10 text-left text-sm"
                            style={{
                              background: isChildActive ? `${BRAND.primary}20` : "transparent",
                              color: isChildActive ? BRAND.primary : "rgba(224,230,255,0.7)",
                            }}
                          >
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{
                                background: isChildActive ? BRAND.primary : "rgba(224,230,255,0.3)",
                              }}
                            ></div>
                            <span>{child.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Mobile sidebar overlay */}
        {isMobile && mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <div
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 z-40"
              style={{ background: "rgba(0,10,30,0.7)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
            />
            {/* Drawer */}
            <div
              className="fixed top-0 left-0 bottom-0 z-50 w-72 overflow-y-auto p-4 pt-5 space-y-1"
              style={{
                background: "linear-gradient(180deg, #001A35 0%, #00152B 100%)",
                borderRight: `1px solid ${BRAND.glassBorder}`,
                boxShadow: "4px 0 24px rgba(0,0,0,0.5)",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between mb-4 pb-3" style={{ borderBottom: `1px solid ${BRAND.glassBorder}` }}>
                <h2 className="text-lg font-bold" style={{ color: BRAND.primary }}>Menu</h2>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition"
                  aria-label="Close menu"
                >
                  <X size={22} style={{ color: BRAND.text }} />
                </button>
              </div>
              {NAV_TREE.sections.filter(section => {
                if (!currentRole) return false;
                return !section.roles || section.roles.includes(currentRole);
              }).map((section) => {
                const Icon = section.icon;
                const hasChildren = section.children && section.children.length > 0;
                const isActive = currentNav.section === section.id;
                const isExpanded = expandedSections.has(section.id);

                return (
                  <div key={section.id}>
                    <button
                      onClick={() => {
                        if (hasChildren) {
                          toggleSection(section.id);
                        } else {
                          handleNavigate({
                            section: section.id,
                            page: section.page,
                          });
                        }
                      }}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-lg transition active:bg-white/15 text-left"
                      style={{
                        background: isActive ? `${BRAND.primary}20` : "transparent",
                        color: isActive ? BRAND.primary : BRAND.text,
                        fontSize: 15,
                      }}
                    >
                      <Icon size={20} />
                      <span className="flex-1 font-medium">{section.label}</span>
                      {hasChildren && (
                        <ChevronDown
                          size={18}
                          style={{
                            transform: isExpanded ? "rotate(0)" : "rotate(-90deg)",
                            transition: "transform 0.2s",
                          }}
                        />
                      )}
                    </button>

                    {hasChildren && isExpanded && (
                      <div className="ml-5 space-y-0.5 mt-1 mb-1">
                        {section.children.filter(child => {
                          if (!currentRole) return false;
                          return !child.roles || child.roles.includes(currentRole);
                        }).map((child) => {
                          const isChildActive = currentNav.page === child.page;
                          return (
                            <button
                              key={child.id}
                              onClick={() =>
                                handleNavigate({
                                  section: section.id,
                                  page: child.page,
                                })
                              }
                              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition active:bg-white/15 text-left"
                              style={{
                                background: isChildActive ? `${BRAND.primary}20` : "transparent",
                                color: isChildActive ? BRAND.primary : "rgba(224,230,255,0.7)",
                                fontSize: 14,
                              }}
                            >
                              <div
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{
                                  background: isChildActive ? BRAND.primary : "rgba(224,230,255,0.3)",
                                }}
                              ></div>
                              <span>{child.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Page Content */}
        <div
          className="flex-1 overflow-y-auto"
          style={{
            padding: isMobile ? "16px" : "24px",
            WebkitOverflowScrolling: "touch",
          }}
        >
          <ErrorBoundary>
            {renderPage()}
          </ErrorBoundary>
        </div>
      </div>

      {/* Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        pages={[]}
        currentPage={currentNav}
        onNavigate={handleNavigate}
      />
    </div>
  );
}
