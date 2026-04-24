/**
 * Staff — Staff management page for admin and consultant doctor roles.
 * Shows all registered staff with role, approval status, and basic info.
 * Admin can approve/reject pending accounts and reassign roles.
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  Clock,
  Search,
  UserCheck,
  UserX,
  Users,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useAdminAuth } from "../hooks/useAdminAuth";
import { useEmailAuth } from "../hooks/useEmailAuth";
import type { DoctorAccount } from "../hooks/useEmailAuth";
import { loadRegistry, saveRegistry } from "../hooks/useEmailAuth";
import { STAFF_ROLE_COLORS, STAFF_ROLE_LABELS } from "../types";
import type { StaffRole } from "../types";

type StatusFilter = "all" | "approved" | "pending" | "rejected";

export default function Staff() {
  const { currentDoctor } = useEmailAuth();
  const { isAdmin } = useAdminAuth();
  const [staff, setStaff] = useState<DoctorAccount[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [roleFilter, setRoleFilter] = useState<StaffRole | "all">("all");
  const [approvalRoles, setApprovalRoles] = useState<Record<string, StaffRole>>(
    {},
  );
  const [reassignRoles, setReassignRoles] = useState<Record<string, StaffRole>>(
    {},
  );

  const canManage =
    isAdmin ||
    currentDoctor?.role === "admin" ||
    currentDoctor?.role === "consultant_doctor";

  const refresh = useCallback(() => {
    setStaff(loadRegistry());
  }, []);

  useEffect(() => {
    refresh();
    const iv = setInterval(refresh, 5000);
    return () => clearInterval(iv);
  }, [refresh]);

  const approveStaff = (acc: DoctorAccount) => {
    const role = approvalRoles[acc.id] ?? acc.role ?? "doctor";
    const reg = loadRegistry();
    const idx = reg.findIndex((d) => d.id === acc.id);
    if (idx >= 0) {
      reg[idx] = { ...reg[idx], status: "approved", role };
      saveRegistry(reg);
      refresh();
      toast.success(
        `${acc.name} approved as ${STAFF_ROLE_LABELS[role as keyof typeof STAFF_ROLE_LABELS] ?? role}`,
      );
    }
  };

  const rejectStaff = (id: string) => {
    const reg = loadRegistry();
    const idx = reg.findIndex((d) => d.id === id);
    if (idx >= 0) {
      reg[idx] = { ...reg[idx], status: "rejected" };
      saveRegistry(reg);
      refresh();
      toast.success("Account rejected");
    }
  };

  const reassignRole = (id: string) => {
    const role = reassignRoles[id];
    if (!role) return;
    const reg = loadRegistry();
    const idx = reg.findIndex((d) => d.id === id);
    if (idx >= 0) {
      reg[idx] = { ...reg[idx], role };
      saveRegistry(reg);
      refresh();
      toast.success(
        `Role updated to ${STAFF_ROLE_LABELS[role as keyof typeof STAFF_ROLE_LABELS] ?? role}`,
      );
    }
  };

  const filtered = staff.filter((s) => {
    const matchSearch =
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      (s.specialization || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || s.status === statusFilter;
    const matchRole = roleFilter === "all" || s.role === roleFilter;
    return matchSearch && matchStatus && matchRole;
  });

  const counts = {
    all: staff.length,
    approved: staff.filter((s) => s.status === "approved").length,
    pending: staff.filter((s) => s.status === "pending").length,
    rejected: staff.filter((s) => s.status === "rejected").length,
  };

  const statusBadgeClass: Record<string, string> = {
    approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
    pending: "bg-amber-100 text-amber-700 border-amber-200",
    rejected: "bg-red-100 text-red-700 border-red-200",
  };

  return (
    <div
      className="max-w-5xl mx-auto px-4 py-6 space-y-6"
      data-ocid="staff.page"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">
              Staff Management
            </h1>
            <p className="text-sm text-muted-foreground">
              {counts.all} total · {counts.approved} active · {counts.pending}{" "}
              pending
            </p>
          </div>
        </div>
        {counts.pending > 0 && (
          <Badge
            variant="outline"
            className="gap-1.5 bg-amber-50 border-amber-300 text-amber-700 px-3 py-1.5 text-sm animate-pulse"
            data-ocid="staff.pending_badge"
          >
            <Clock className="w-3.5 h-3.5" />
            {counts.pending} awaiting approval
          </Badge>
        )}
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 flex-wrap" data-ocid="staff.status.tab">
        {(["all", "approved", "pending", "rejected"] as StatusFilter[]).map(
          (s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                statusFilter === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
              }`}
              data-ocid={`staff.filter.${s}`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
              <span className="ml-1.5 text-xs opacity-70">({counts[s]})</span>
            </button>
          ),
        )}
      </div>

      {/* Search & role filter */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, specialization..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-ocid="staff.search_input"
          />
        </div>
        <Select
          value={roleFilter}
          onValueChange={(v) => setRoleFilter(v as StaffRole | "all")}
        >
          <SelectTrigger className="w-48" data-ocid="staff.role.select">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {(
              Object.keys(STAFF_ROLE_LABELS) as Array<
                keyof typeof STAFF_ROLE_LABELS
              >
            ).map((r) => (
              <SelectItem key={r} value={r}>
                {STAFF_ROLE_LABELS[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Staff list */}
      {filtered.length === 0 ? (
        <div
          className="bg-card border border-border rounded-2xl p-12 text-center"
          data-ocid="staff.empty_state"
        >
          <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-semibold text-foreground mb-1">No staff found</p>
          <p className="text-sm text-muted-foreground">
            {search || statusFilter !== "all" || roleFilter !== "all"
              ? "Try adjusting your filters."
              : "No staff accounts registered yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-3" data-ocid="staff.list">
          {filtered.map((acc, idx) => {
            const roleLabel =
              STAFF_ROLE_LABELS[acc.role as keyof typeof STAFF_ROLE_LABELS] ??
              acc.role;
            const roleColor =
              STAFF_ROLE_COLORS[acc.role as keyof typeof STAFF_ROLE_COLORS] ??
              "bg-muted text-muted-foreground border-border";
            const isPending = acc.status === "pending";
            const isApproved = acc.status === "approved";

            return (
              <div
                key={acc.id}
                className={`bg-card border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 ${
                  isPending
                    ? "border-amber-200"
                    : acc.status === "rejected"
                      ? "border-red-200 opacity-60"
                      : "border-border"
                }`}
                data-ocid={`staff.item.${idx + 1}`}
              >
                {/* Avatar + info */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold text-sm">
                    {acc.name
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-foreground truncate">
                        {acc.designation ? `${acc.designation} ` : ""}
                        {acc.name}
                      </p>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${roleColor}`}
                      >
                        {roleLabel}
                      </span>
                      <span
                        className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${statusBadgeClass[acc.status] ?? "bg-muted text-muted-foreground"}`}
                      >
                        {acc.status}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {acc.email}
                    </p>
                    {(acc.degree || acc.specialization || acc.hospital) && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {[acc.degree, acc.specialization, acc.hospital]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                    {acc.createdAt && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Registered:{" "}
                        {new Date(acc.createdAt).toLocaleDateString("en-BD", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {canManage && (
                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    {isPending && (
                      <>
                        <Select
                          value={approvalRoles[acc.id] ?? acc.role ?? "doctor"}
                          onValueChange={(v) =>
                            setApprovalRoles((prev) => ({
                              ...prev,
                              [acc.id]: v as StaffRole,
                            }))
                          }
                        >
                          <SelectTrigger
                            className="h-8 text-xs w-36"
                            data-ocid="staff.approve.select"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(
                              Object.keys(STAFF_ROLE_LABELS) as Array<
                                keyof typeof STAFF_ROLE_LABELS
                              >
                            ).map((r) => (
                              <SelectItem key={r} value={r} className="text-xs">
                                {STAFF_ROLE_LABELS[r]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 gap-1"
                          onClick={() => approveStaff(acc)}
                          data-ocid="staff.approve.button"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs text-red-700 border-red-300 hover:bg-red-50 gap-1"
                          onClick={() => rejectStaff(acc.id)}
                          data-ocid="staff.reject.button"
                        >
                          <UserX className="w-3.5 h-3.5" />
                          Reject
                        </Button>
                      </>
                    )}

                    {isApproved && (
                      <div className="flex items-center gap-2">
                        <Select
                          value={reassignRoles[acc.id] ?? acc.role}
                          onValueChange={(v) =>
                            setReassignRoles((prev) => ({
                              ...prev,
                              [acc.id]: v as StaffRole,
                            }))
                          }
                        >
                          <SelectTrigger
                            className="h-8 text-xs w-36"
                            data-ocid="staff.reassign.select"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(
                              Object.keys(STAFF_ROLE_LABELS) as Array<
                                keyof typeof STAFF_ROLE_LABELS
                              >
                            ).map((r) => (
                              <SelectItem key={r} value={r} className="text-xs">
                                {STAFF_ROLE_LABELS[r]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs gap-1"
                          onClick={() => reassignRole(acc.id)}
                          disabled={
                            !reassignRoles[acc.id] ||
                            reassignRoles[acc.id] === acc.role
                          }
                          data-ocid="staff.save_button"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Update Role
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50 gap-1"
                          onClick={() => rejectStaff(acc.id)}
                          data-ocid="staff.delete_button"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Revoke
                        </Button>
                      </div>
                    )}

                    {acc.status === "rejected" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 gap-1"
                        onClick={() => approveStaff(acc)}
                        data-ocid="staff.approve.button"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        Re-approve
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
