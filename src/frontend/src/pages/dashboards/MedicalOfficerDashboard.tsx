import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useNavigate } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  BedDouble,
  CheckCircle2,
  ClipboardList,
  FileText,
  Loader2,
  PlusCircle,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useEmailAuth } from "../../hooks/useEmailAuth";
import type { Patient } from "../../types";

interface LocalPatient extends Patient {
  bedNumber?: string;
  ward?: string;
  isAdmitted?: boolean;
}

function loadAllPatients(): LocalPatient[] {
  const result: LocalPatient[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k?.startsWith("patients_")) continue;
    try {
      const arr = JSON.parse(localStorage.getItem(k) || "[]") as LocalPatient[];
      result.push(...arr);
    } catch {}
  }
  return result;
}

function isAdmitted(p: LocalPatient) {
  return (
    p.isAdmitted === true ||
    p.patientType === "admitted" ||
    p.patientType === "indoor" ||
    String((p as Record<string, unknown>).status ?? "")
      .toLowerCase()
      .includes("admit")
  );
}

function getPendingDrafts() {
  const results: Array<{ id: string; patientName: string; createdAt: string }> =
    [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k?.startsWith("prescriptions_")) continue;
    try {
      const arr = JSON.parse(localStorage.getItem(k) || "[]") as Array<
        Record<string, unknown>
      >;
      for (const rx of arr) {
        if (rx.status === "draft_awaiting_approval") {
          results.push({
            id: String(rx.id ?? ""),
            patientName: String(rx.patientName ?? "Unknown"),
            createdAt: String(rx.createdAt ?? ""),
          });
        }
      }
    } catch {}
  }
  return results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function getRecentActivity() {
  const logs: Array<{
    timestamp: string;
    userName: string;
    action: string;
    target: string;
  }> = [];
  try {
    const raw = localStorage.getItem("medicare_audit_log");
    if (raw) {
      const all = JSON.parse(raw) as typeof logs;
      return all.slice(-8).reverse();
    }
  } catch {}
  return logs;
}

export default function MedicalOfficerDashboard() {
  const { currentDoctor } = useEmailAuth();
  const navigate = useNavigate();
  const [patientFilter, setPatientFilter] = useState<"all" | "admitted">("all");

  const allPatients = useMemo(loadAllPatients, []);
  const pendingDrafts = useMemo(getPendingDrafts, []);
  const recentActivity = useMemo(getRecentActivity, []);

  const admittedPatients = allPatients.filter(isAdmitted);
  const opdPatients = allPatients.filter((p) => !isAdmitted(p));
  const displayedPatients =
    patientFilter === "admitted" ? admittedPatients : allPatients;

  return (
    <div
      className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6"
      data-ocid="mo.dashboard"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome, {currentDoctor?.designation} {currentDoctor?.name}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Medical Officer Dashboard
          </p>
        </div>
        <Badge className="bg-green-100 text-green-800 border-green-200 text-xs px-3 py-1">
          Medical Officer
        </Badge>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-5 pb-4 px-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground leading-none">
                {allPatients.length}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                All Patients
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-5 pb-4 px-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-green-100 text-green-700 flex items-center justify-center">
              <BedDouble className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground leading-none">
                {admittedPatients.length}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Admitted</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-5 pb-4 px-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground leading-none">
                {opdPatients.length}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">OPD</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-5 pb-4 px-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground leading-none">
                {pendingDrafts.length}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pending Approvals
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Patient list with filter tabs */}
        <Card>
          <CardHeader className="pb-3 pt-4 px-5 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-foreground text-sm">
                Patients
              </h2>
            </div>
            <div className="flex items-center gap-1">
              {/* Filter tabs */}
              <div className="flex border border-border rounded-lg overflow-hidden text-xs">
                <button
                  type="button"
                  onClick={() => setPatientFilter("all")}
                  className={`px-2.5 py-1 font-medium transition-colors ${patientFilter === "all" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}
                  data-ocid="mo.filter.all_tab"
                >
                  All ({allPatients.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPatientFilter("admitted")}
                  className={`px-2.5 py-1 font-medium transition-colors border-l border-border ${patientFilter === "admitted" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}
                  data-ocid="mo.filter.admitted_tab"
                >
                  Admitted ({admittedPatients.length})
                </button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs gap-1 ml-1"
                onClick={() => navigate({ to: "/Patients" })}
              >
                <ArrowRight className="w-3 h-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-4 space-y-2">
            {displayedPatients.length === 0 ? (
              <div
                className="text-center py-8 text-muted-foreground"
                data-ocid="mo.patients.empty_state"
              >
                <BedDouble className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">
                  {patientFilter === "admitted"
                    ? "No admitted patients"
                    : "No patients yet"}
                </p>
              </div>
            ) : (
              displayedPatients.slice(0, 6).map((p) => (
                <div
                  key={String(p.id)}
                  className="border border-border rounded-xl p-3 flex items-center gap-3"
                  data-ocid={`mo.patient_card.${String(p.id)}`}
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isAdmitted(p) ? "bg-green-100" : "bg-sky-100"}`}
                  >
                    <span
                      className={`font-bold text-sm ${isAdmitted(p) ? "text-green-700" : "text-sky-700"}`}
                    >
                      {p.fullName.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-foreground truncate">
                        {p.fullName}
                      </p>
                      {isAdmitted(p) && (
                        <Badge className="text-[10px] bg-green-100 text-green-800 border border-green-300 shrink-0">
                          🏥 Admitted
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {isAdmitted(p)
                        ? `Bed ${p.bedNumber || "—"} · ${p.ward || "General"}`
                        : "OPD Patient"}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7 px-2 gap-1 text-green-700 border-green-200 hover:bg-green-50"
                      onClick={() =>
                        navigate({
                          to: "/PatientProfile",
                          search: { id: String(p.id) },
                        })
                      }
                      data-ocid="mo.add_note.button"
                    >
                      <PlusCircle className="w-3 h-3" /> Note
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7 px-2 gap-1"
                      onClick={() =>
                        navigate({
                          to: "/PatientProfile",
                          search: { id: String(p.id) },
                        })
                      }
                      data-ocid="mo.view_patient.button"
                    >
                      View
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Right column */}
        <div className="space-y-4">
          {/* Pending drafts */}
          <Card className="border-amber-200">
            <CardHeader className="pb-3 pt-4 px-5">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-amber-600" />
                <h2 className="font-semibold text-foreground text-sm">
                  Prescriptions Awaiting Approval
                </h2>
                {pendingDrafts.length > 0 && (
                  <Badge className="ml-auto bg-amber-100 text-amber-800 border-amber-200 text-xs">
                    {pendingDrafts.length}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              {pendingDrafts.length === 0 ? (
                <div
                  className="flex items-center gap-2 text-emerald-600 py-2"
                  data-ocid="mo.drafts.empty_state"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <p className="text-sm">All prescriptions approved</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingDrafts.slice(0, 4).map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center gap-2 bg-amber-50 rounded-lg px-3 py-2"
                    >
                      <Loader2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {d.patientName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {d.createdAt
                            ? new Date(d.createdAt).toLocaleDateString()
                            : "—"}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[10px] border-amber-300 text-amber-700 shrink-0"
                      >
                        Draft
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent activity */}
          <Card>
            <CardHeader className="pb-3 pt-4 px-5">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                <h2 className="font-semibold text-foreground text-sm">
                  Recent Activity
                </h2>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              {recentActivity.length === 0 ? (
                <p
                  className="text-sm text-muted-foreground py-2"
                  data-ocid="mo.activity.empty_state"
                >
                  No recent activity
                </p>
              ) : (
                <div className="space-y-2">
                  {recentActivity.slice(0, 5).map((entry, i) => (
                    <div
                      key={`${entry.timestamp}-${i}`}
                      className="text-xs text-muted-foreground flex items-start gap-2 py-1 border-b border-border last:border-0"
                    >
                      <span className="font-medium text-foreground min-w-0 truncate">
                        {entry.userName}
                      </span>
                      <span className="shrink-0">{entry.action}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
