import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  AlertTriangle,
  BarChart3,
  Bed,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock,
  DollarSign,
  FlaskConical,
  Hospital,
  LayoutDashboard,
  Loader2,
  Menu,
  Pill,
  PlusCircle,
  RefreshCw,
  ShieldAlert,
  Siren,
  Stethoscope,
  UserCircle,
  Users,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import SyncConflictDialog from "./components/SyncConflictDialog";
import { useAdminAuth } from "./hooks/useAdminAuth";
import { useEmailAuth } from "./hooks/useEmailAuth";
import { useSyncStatus } from "./hooks/useMigration";
import { useOnlineStatus } from "./hooks/useOnlineStatus";
import { getConflictsCount } from "./lib/hybridStorage";
import { STAFF_ROLE_COLORS, STAFF_ROLE_LABELS } from "./types";
import type { StaffRole } from "./types";

// Roles that see the medication alert bell in the navbar
const MED_ALERT_ROLES: StaffRole[] = ["nurse", "intern_doctor"];

interface LayoutProps {
  children: React.ReactNode;
  currentPageName: string;
}

// Roles that can access Emergency Prescription
const EMERGENCY_RX_ROLES: StaffRole[] = [
  "consultant_doctor",
  "medical_officer",
  "doctor",
  "admin",
];
const WARD_ROUND_ROLES: StaffRole[] = [
  "doctor",
  "consultant_doctor",
  "medical_officer",
  "intern_doctor",
  "nurse",
  "admin",
];
const BED_ROLES: StaffRole[] = [
  "admin",
  "doctor",
  "consultant_doctor",
  "medical_officer",
  "staff",
];
const STAFF_MGMT_ROLES: StaffRole[] = ["admin", "consultant_doctor"];

// ── Sidebar collapse state helpers ───────────────────────────────────────────

function loadSidebarState(key: string, defaultVal: boolean): boolean {
  try {
    const val = localStorage.getItem(key);
    if (val === null) return defaultVal;
    return val === "true";
  } catch {
    return defaultVal;
  }
}
function saveSidebarState(key: string, val: boolean) {
  try {
    localStorage.setItem(key, String(val));
  } catch {}
}

export default function Layout({ children, currentPageName }: LayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSyncPopover, setShowSyncPopover] = useState(false);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflictCount, setConflictCount] = useState(0);
  const [dueMedCount, setDueMedCount] = useState(0);

  // Hospital Management group expanded state (default: open)
  const [hospitalGroupOpen, setHospitalGroupOpen] = useState(() =>
    loadSidebarState("sidebar_hospital_group_open", true),
  );
  // Payment sub-group expanded state (default: open)
  const [paymentGroupOpen, setPaymentGroupOpen] = useState(() =>
    loadSidebarState("sidebar_payment_group_open", true),
  );

  const syncPopoverRef = useRef<HTMLDivElement>(null);
  const state = useRouterState();
  const pathname = state.location.pathname;
  const { currentDoctor } = useEmailAuth();
  const { isAdmin } = useAdminAuth();
  const isOnline = useOnlineStatus();
  const syncStatus = useSyncStatus();

  const role = (currentDoctor?.role ?? "staff") as StaffRole;
  const canWardRound = WARD_ROUND_ROLES.includes(role) || isAdmin;
  const canBedManagement = BED_ROLES.includes(role) || isAdmin;
  const canEmergencyRx = EMERGENCY_RX_ROLES.includes(role) || isAdmin;
  const canStaffMgmt = STAFF_MGMT_ROLES.includes(role) || isAdmin;
  const showMedAlertBell = MED_ALERT_ROLES.includes(role);

  const toggleHospitalGroup = () => {
    const next = !hospitalGroupOpen;
    setHospitalGroupOpen(next);
    saveSidebarState("sidebar_hospital_group_open", next);
  };

  const togglePaymentGroup = () => {
    const next = !paymentGroupOpen;
    setPaymentGroupOpen(next);
    saveSidebarState("sidebar_payment_group_open", next);
  };

  // Poll conflict count every 5 seconds
  useEffect(() => {
    const refresh = () => setConflictCount(getConflictsCount());
    refresh();
    const iv = setInterval(refresh, 5000);
    return () => clearInterval(iv);
  }, []);

  // Count meds due in the next hour for nurse/intern
  useEffect(() => {
    if (!showMedAlertBell) return;
    const count = () => {
      try {
        const nowHour = new Date().getHours();
        const today = new Date().toISOString().split("T")[0];
        const allReminders: Array<{
          patientId: string;
          times: string[];
          enabled: boolean;
        }> = JSON.parse(
          localStorage.getItem("medicare_drug_reminders") || "[]",
        );
        const admittedIds = new Set<string>();
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (!k?.startsWith("patients_")) continue;
          const arr = JSON.parse(localStorage.getItem(k) || "[]") as Array<{
            id: unknown;
            isAdmitted?: boolean;
            patientType?: string;
            status?: string;
          }>;
          for (const p of arr) {
            if (
              p.isAdmitted ||
              p.patientType === "admitted" ||
              p.status === "Admitted"
            ) {
              const rawId = p.id;
              const pid =
                typeof rawId === "string" && rawId.startsWith("__bigint__")
                  ? rawId.slice(10)
                  : String(rawId);
              admittedIds.add(pid);
            }
          }
        }
        let pending = 0;
        for (const r of allReminders) {
          if (!r.enabled || !admittedIds.has(r.patientId)) continue;
          for (const t of r.times) {
            const [hh] = t.split(":").map(Number);
            if (Math.abs(hh - nowHour) <= 1) {
              const records: Array<{
                drugName?: string;
                scheduledTime?: string;
                status?: string;
              }> = (() => {
                try {
                  return JSON.parse(
                    localStorage.getItem(
                      `medAdminRecord_${r.patientId}_${today}`,
                    ) || "[]",
                  );
                } catch {
                  return [];
                }
              })();
              const alreadyDone = records.some(
                (rec) => rec.scheduledTime === t && rec.status === "given",
              );
              if (!alreadyDone) pending++;
            }
          }
        }
        setDueMedCount(pending);
      } catch {}
    };
    count();
    const iv = setInterval(count, 30000);
    return () => clearInterval(iv);
  }, [showMedAlertBell]);

  const displayName = currentDoctor
    ? `${currentDoctor.designation} ${currentDoctor.name}`.trim()
    : "Dr. Arman Kabir's Care";
  const displayDegree = currentDoctor?.degree || "Patient Management";
  const roleLabel = currentDoctor
    ? (STAFF_ROLE_LABELS[currentDoctor.role as StaffRole] ?? currentDoctor.role)
    : null;
  const roleColorClass = currentDoctor
    ? (STAFF_ROLE_COLORS[currentDoctor.role as StaffRole] ?? "")
    : "";

  const isActive = (name: string) => {
    if (name === "Dashboard") {
      return (
        currentPageName === "Dashboard" ||
        pathname === "/" ||
        pathname === "/Dashboard"
      );
    }
    if (name === "Patients") {
      return (
        currentPageName === "Patients" ||
        currentPageName === "PatientProfile" ||
        currentPageName === "PatientDashboard" ||
        pathname === "/Patients"
      );
    }
    return currentPageName === name || pathname === `/${name}`;
  };

  // Last sync time display
  const lastSyncLabel = (() => {
    if (!syncStatus.lastSyncAt) return "Never synced";
    const diffMs = Date.now() - syncStatus.lastSyncAt.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "Just now";
    if (diffMin === 1) return "1 min ago";
    if (diffMin < 60) return `${diffMin} min ago`;
    return `${Math.floor(diffMin / 60)}h ago`;
  })();

  const lastSyncTime = (() => {
    if (!syncStatus.lastSyncAt) return "";
    return syncStatus.lastSyncAt.toLocaleTimeString("en-BD", {
      hour: "2-digit",
      minute: "2-digit",
    });
  })();

  const syncIndicator = (() => {
    if (!isOnline) {
      return {
        color: "bg-amber-500",
        label: `Offline (${syncStatus.pendingChanges} pending)`,
        tooltip: `Offline — ${syncStatus.pendingChanges} item(s) pending sync. Will sync when reconnected.`,
        icon: <WifiOff className="w-3 h-3" />,
        badgeClass: "bg-amber-100 text-amber-700 border-amber-200",
      };
    }
    if (syncStatus.pendingChanges > 0) {
      return {
        color: "bg-yellow-400 animate-pulse",
        label: `Syncing... (${syncStatus.pendingChanges} pending)`,
        tooltip: `${syncStatus.pendingChanges} item(s) pending sync — last synced at ${lastSyncTime || "unknown"}`,
        icon: <RefreshCw className="w-3 h-3 animate-spin" />,
        badgeClass: "bg-yellow-100 text-yellow-700 border-yellow-200",
      };
    }
    return {
      color: "bg-green-500",
      label: "All synced",
      tooltip: `All data synced — last synced at ${lastSyncTime || lastSyncLabel}`,
      icon: <Wifi className="w-3 h-3" />,
      badgeClass: "bg-green-100 text-green-700 border-green-200",
    };
  })();

  // Close popover on outside click
  useEffect(() => {
    if (!showSyncPopover) return;
    const handler = (e: MouseEvent) => {
      if (
        syncPopoverRef.current &&
        !syncPopoverRef.current.contains(e.target as Node)
      ) {
        setShowSyncPopover(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showSyncPopover]);

  // ── Desktop nav items (flat list for header, first 4 items only) ─────────────
  const flatNavItems = [
    { name: "Dashboard", href: "/Dashboard", icon: LayoutDashboard },
    { name: "Patients", href: "/Patients", icon: Users },
    { name: "Appointments", href: "/Appointments", icon: CalendarDays },
    ...(canStaffMgmt
      ? [{ name: "Staff", href: "/Staff", icon: UserCircle, label: "Staff" }]
      : []),
    ...(canEmergencyRx
      ? [
          {
            name: "EmergencyPrescription",
            href: "/EmergencyPrescription",
            icon: Siren,
            label: "Emergency Rx",
          },
        ]
      : []),
    ...(canWardRound
      ? [
          {
            name: "WardRound",
            href: "/WardRound",
            icon: Stethoscope,
            label: "Ward Round",
          },
        ]
      : []),
    {
      name: "Settings",
      href: "/Settings",
      icon: UserCircle,
      label: "Settings",
    },
    ...(isAdmin
      ? [
          {
            name: "AuditLog",
            href: "/AuditLog",
            icon: ShieldAlert,
            label: "Audit Log",
          },
        ]
      : []),
  ];

  // ── Mobile bottom nav (4 most important) ─────────────────────────────────────
  const mobileNavItems = [
    { name: "Dashboard", href: "/Dashboard", icon: LayoutDashboard },
    { name: "Patients", href: "/Patients", icon: Users },
    { name: "Appointments", href: "/Appointments", icon: CalendarDays },
    ...(canEmergencyRx
      ? [
          {
            name: "EmergencyPrescription",
            href: "/EmergencyPrescription",
            icon: Siren,
            label: "Emergency Rx",
          },
        ]
      : [
          {
            name: "Settings",
            href: "/Settings",
            icon: UserCircle,
            label: "Settings",
          },
        ]),
  ].slice(0, 4);

  // ── Payment sub-items ─────────────────────────────────────────────────────────
  const paymentItems = [
    {
      name: "AppointmentPayment",
      href: "/AppointmentPayment",
      icon: CalendarDays,
      label: "Appointment Payment",
    },
    {
      name: "InvestigationPayment",
      href: "/InvestigationPayment",
      icon: FlaskConical,
      label: "Investigation Payment",
    },
    {
      name: "ProcedurePayment",
      href: "/ProcedurePayment",
      icon: ClipboardList,
      label: "Procedure Payment",
    },
    {
      name: "TotalIncome",
      href: "/TotalIncome",
      icon: BarChart3,
      label: "Total Income",
    },
    {
      name: "OtherPayment",
      href: "/OtherPayment",
      icon: PlusCircle,
      label: "Other Payment",
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col pb-16 md:pb-0">
      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-amber-500 text-white text-center text-sm py-2 px-4 flex items-center justify-center gap-2 sticky top-0 z-[60]">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>
            You are offline. All data is saved locally and will sync when
            reconnected.
          </span>
        </div>
      )}

      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50 shadow-subtle">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <Link
              to="/Patients"
              className="flex items-center gap-3 group"
              data-ocid="nav.patients_link"
            >
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-sm group-hover:bg-primary/90 transition-smooth">
                <Stethoscope className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="hidden sm:block">
                <p className="font-display font-bold text-foreground text-base leading-none">
                  {displayName}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-xs text-muted-foreground leading-none">
                    {displayDegree}
                  </p>
                  {roleLabel && (
                    <span
                      className={cn(
                        "text-[10px] font-semibold px-1.5 py-0.5 rounded-full border leading-none",
                        roleColorClass,
                      )}
                    >
                      {roleLabel}
                    </span>
                  )}
                </div>
              </div>
            </Link>

            {/* Desktop nav (flat, no Hospital Management group in header) */}
            <nav className="hidden md:flex items-center gap-1">
              {flatNavItems.slice(0, 5).map((item) => {
                const label = (item as { label?: string }).label || item.name;
                return (
                  <Link
                    key={item.name}
                    to={item.href as "/Patients"}
                    data-ocid={`nav.${item.name.toLowerCase()}_link`}
                  >
                    <Button
                      variant="ghost"
                      className={cn(
                        "h-9 px-3 text-sm font-medium gap-2",
                        isActive(item.name)
                          ? "bg-primary/10 text-primary hover:bg-primary/15"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <item.icon className="w-4 h-4" />
                      {label}
                    </Button>
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-2">
              {/* Medication alert bell */}
              {showMedAlertBell && (
                <a
                  href="/Patients"
                  className="relative p-1.5 rounded-lg hover:bg-rose-50 text-muted-foreground hover:text-rose-600 transition-colors"
                  title="Medications due now"
                  data-ocid="nav.med_alert_bell"
                >
                  <Pill className="w-5 h-5" />
                  {dueMedCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-rose-600 text-white text-[10px] font-bold px-1 flex items-center justify-center p-0">
                      {dueMedCount}
                    </Badge>
                  )}
                </a>
              )}

              {/* Sync conflict badge */}
              {conflictCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowConflictDialog(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full border bg-red-100 text-red-700 border-red-200 hover:bg-red-200 transition-colors animate-pulse"
                  title={`${conflictCount} sync conflict${conflictCount > 1 ? "s" : ""} — click to resolve`}
                  data-ocid="nav.sync_conflict_badge"
                >
                  <AlertTriangle className="w-3 h-3" />
                  <span className="hidden sm:inline">
                    ⚠️ {conflictCount} sync conflict
                    {conflictCount > 1 ? "s" : ""}
                  </span>
                  <span className="sm:hidden">{conflictCount}</span>
                </button>
              )}

              {/* Sync status indicator */}
              <div className="relative" ref={syncPopoverRef}>
                <button
                  type="button"
                  onClick={() => setShowSyncPopover((v) => !v)}
                  className={cn(
                    "flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full border transition-colors",
                    syncIndicator.badgeClass,
                  )}
                  title={syncIndicator.tooltip}
                  data-ocid="nav.sync_status"
                >
                  {syncIndicator.icon}
                  <span className="hidden sm:inline">
                    {syncIndicator.label}
                  </span>
                </button>
                {showSyncPopover && (
                  <div className="absolute right-0 top-full mt-2 w-72 bg-card border border-border rounded-xl shadow-lg p-3 z-50 text-sm">
                    <p className="font-semibold text-foreground mb-1 flex items-center gap-1.5">
                      {isOnline ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <WifiOff className="w-4 h-4 text-amber-500" />
                      )}
                      {isOnline ? "Online" : "Offline Mode"}
                    </p>
                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        Last synced:{" "}
                        <span className="font-medium text-foreground">
                          {lastSyncTime ? `at ${lastSyncTime}` : lastSyncLabel}
                        </span>
                      </div>
                      {syncStatus.pendingChanges > 0 ? (
                        <div className="flex items-center gap-1.5 text-amber-600">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          {syncStatus.pendingChanges} item(s) pending sync
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-green-600">
                          <CheckCircle2 className="w-3 h-3" />
                          All data synced
                        </div>
                      )}
                      {conflictCount > 0 && (
                        <button
                          type="button"
                          className="flex items-center gap-1.5 text-red-600 font-medium hover:underline w-full text-left"
                          onClick={() => {
                            setShowSyncPopover(false);
                            setShowConflictDialog(true);
                          }}
                          data-ocid="nav.sync_conflict_link"
                        >
                          <AlertTriangle className="w-3 h-3" />
                          {conflictCount} conflict{conflictCount > 1 ? "s" : ""}{" "}
                          need resolution
                        </button>
                      )}
                      {!isOnline && (
                        <p className="text-amber-600 font-medium">
                          All changes are saved locally and will sync
                          automatically when you&apos;re back online.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="md:hidden w-9 h-9"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile menu (full navigation with Hospital Management group) */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-card">
            <nav className="p-3 space-y-1 max-h-[80vh] overflow-y-auto">
              {/* Dashboard */}
              <MobileNavLink
                name="Dashboard"
                href="/Dashboard"
                icon={LayoutDashboard}
                isActive={isActive}
                onClose={() => setMobileMenuOpen(false)}
              />
              {/* Patient */}
              <MobileNavLink
                name="Patients"
                href="/Patients"
                icon={Users}
                label="Patient"
                isActive={isActive}
                onClose={() => setMobileMenuOpen(false)}
              />
              {/* Appointments */}
              <MobileNavLink
                name="Appointments"
                href="/Appointments"
                icon={CalendarDays}
                isActive={isActive}
                onClose={() => setMobileMenuOpen(false)}
              />

              {/* Hospital Management group */}
              {canBedManagement && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={toggleHospitalGroup}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                    data-ocid="nav.hospital_management.toggle"
                  >
                    <Hospital className="w-4 h-4 text-primary/70" />
                    <span className="flex-1 text-left">
                      Hospital Management
                    </span>
                    {hospitalGroupOpen ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                  {hospitalGroupOpen && (
                    <div className="ml-4 mt-1 space-y-1 border-l border-border pl-3">
                      {/* Bed Management */}
                      <MobileNavLink
                        name="BedManagement"
                        href="/BedManagement"
                        icon={Bed}
                        label="Bed Management"
                        isActive={isActive}
                        onClose={() => setMobileMenuOpen(false)}
                        indent
                      />

                      {/* Payment sub-group */}
                      <button
                        type="button"
                        onClick={togglePaymentGroup}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                        data-ocid="nav.payment_group.toggle"
                      >
                        <DollarSign className="w-4 h-4 text-emerald-600/70" />
                        <span className="flex-1 text-left">Payment</span>
                        {paymentGroupOpen ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                      </button>
                      {paymentGroupOpen && (
                        <div className="ml-3 space-y-1 border-l border-border pl-3">
                          {paymentItems.map((item) => (
                            <MobileNavLink
                              key={item.name}
                              name={item.name}
                              href={item.href}
                              icon={item.icon}
                              label={item.label}
                              isActive={isActive}
                              onClose={() => setMobileMenuOpen(false)}
                              indent
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Staff */}
              {canStaffMgmt && (
                <MobileNavLink
                  name="Staff"
                  href="/Staff"
                  icon={Users}
                  label="Staff"
                  isActive={isActive}
                  onClose={() => setMobileMenuOpen(false)}
                />
              )}

              {/* Emergency Rx */}
              {canEmergencyRx && (
                <MobileNavLink
                  name="EmergencyPrescription"
                  href="/EmergencyPrescription"
                  icon={Siren}
                  label="Emergency Rx"
                  isActive={isActive}
                  onClose={() => setMobileMenuOpen(false)}
                />
              )}

              {/* Ward Round */}
              {canWardRound && (
                <MobileNavLink
                  name="WardRound"
                  href="/WardRound"
                  icon={Stethoscope}
                  label="Ward Round"
                  isActive={isActive}
                  onClose={() => setMobileMenuOpen(false)}
                />
              )}

              {/* Settings */}
              <MobileNavLink
                name="Settings"
                href="/Settings"
                icon={UserCircle}
                label="Settings"
                isActive={isActive}
                onClose={() => setMobileMenuOpen(false)}
              />

              {/* Audit Log */}
              {isAdmin && (
                <MobileNavLink
                  name="AuditLog"
                  href="/AuditLog"
                  icon={ShieldAlert}
                  label="Audit Log"
                  isActive={isActive}
                  onClose={() => setMobileMenuOpen(false)}
                />
              )}
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="hidden md:block border-t border-border bg-card">
        <div className="max-w-6xl mx-auto px-6 py-3">
          <p className="text-xs text-muted-foreground text-center">
            © {new Date().getFullYear()}. Built with ❤ using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
            >
              caffeine.ai
            </a>
          </p>
        </div>
      </footer>

      {/* Mobile bottom nav */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-stretch h-14">
          {mobileNavItems.map((item) => {
            const label = (item as { label?: string }).label || item.name;
            return (
              <Link
                key={item.name}
                to={item.href as "/Patients"}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-smooth",
                  isActive(item.name)
                    ? "text-primary"
                    : "text-muted-foreground",
                )}
                data-ocid={`nav.${item.name.toLowerCase()}_link`}
              >
                <item.icon className="w-5 h-5" />
                <span className="truncate max-w-[60px] text-center">
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Sync Conflict Resolution Dialog */}
      <SyncConflictDialog
        open={showConflictDialog}
        onClose={() => setShowConflictDialog(false)}
        onAllResolved={() => setConflictCount(0)}
      />
    </div>
  );
}

// ── Mobile nav link helper ────────────────────────────────────────────────────

function MobileNavLink({
  name,
  href,
  icon: Icon,
  label,
  isActive,
  onClose,
  indent = false,
}: {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label?: string;
  isActive: (name: string) => boolean;
  onClose: () => void;
  indent?: boolean;
}) {
  const displayLabel = label || name;
  return (
    <Link
      to={href as "/Patients"}
      onClick={onClose}
      data-ocid={`nav.${name.toLowerCase()}_link`}
    >
      <Button
        variant="ghost"
        className={cn(
          "w-full justify-start h-10 gap-3 text-sm",
          indent && "pl-2",
          isActive(name)
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground",
        )}
      >
        <Icon className="w-4 h-4 shrink-0" />
        {displayLabel}
      </Button>
    </Link>
  );
}
