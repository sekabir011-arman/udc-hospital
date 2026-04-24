/**
 * InvestigationPaymentPage — Standalone page for investigation billing.
 * Allows selecting a patient and generating investigation payment receipts.
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FlaskConical, Search, User, X } from "lucide-react";
import { useState } from "react";
import InvestigationPaymentComponent from "../components/InvestigationPayment";
import { useEmailAuth } from "../hooks/useEmailAuth";

interface PatientEntry {
  id: unknown;
  fullName?: string;
  name?: string;
  registerNumber?: string;
  phone?: string;
  mobileNumber?: string;
}

function loadAllPatients(): PatientEntry[] {
  const results: PatientEntry[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k?.startsWith("patients_")) continue;
      const arr: PatientEntry[] = JSON.parse(localStorage.getItem(k) || "[]");
      results.push(...arr);
    }
  } catch {}
  return results;
}

function getPatientIdStr(p: PatientEntry): string {
  const rawId = p.id;
  return typeof rawId === "string" && rawId.startsWith("__bigint__")
    ? rawId.slice(10)
    : String(rawId);
}

export default function InvestigationPaymentPage() {
  const { currentDoctor } = useEmailAuth();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<PatientEntry | null>(null);

  const patients = loadAllPatients();
  const filtered = search.trim()
    ? patients.filter((p) => {
        const name = (p.fullName ?? p.name ?? "").toLowerCase();
        const reg = (p.registerNumber ?? "").toLowerCase();
        const q = search.toLowerCase();
        return name.includes(q) || reg.includes(q);
      })
    : [];

  return (
    <div
      className="max-w-5xl mx-auto px-4 py-6 space-y-6"
      data-ocid="inv_payment.page"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
          <FlaskConical className="w-5 h-5 text-blue-700" />
        </div>
        <div>
          <h1 className="text-xl font-bold font-display text-foreground">
            Investigation Payment
          </h1>
          <p className="text-sm text-muted-foreground">
            Generate investigation billing receipts for patients
          </p>
        </div>
      </div>

      {/* Patient selector */}
      {!selected ? (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <p className="text-sm font-semibold text-foreground">
            Select a patient to generate an investigation receipt
          </p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search patient by name or register number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-ocid="inv_payment.search_input"
            />
          </div>
          {search.trim() && filtered.length === 0 && (
            <p
              className="text-sm text-muted-foreground text-center py-4"
              data-ocid="inv_payment.empty_state"
            >
              No patients found. Try a different name or register number.
            </p>
          )}
          {filtered.length > 0 && (
            <div
              className="space-y-2 max-h-80 overflow-y-auto"
              data-ocid="inv_payment.list"
            >
              {filtered.map((p, idx) => {
                const name = p.fullName ?? p.name ?? "Unknown";
                return (
                  <button
                    key={getPatientIdStr(p)}
                    type="button"
                    onClick={() => {
                      setSelected(p);
                      setSearch("");
                    }}
                    className="w-full flex items-center gap-3 p-3 bg-background border border-border rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-colors text-left"
                    data-ocid={`inv_payment.item.${idx + 1}`}
                  >
                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
                      {name
                        .split(" ")
                        .map((n: string) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {name}
                      </p>
                      {p.registerNumber && (
                        <p className="text-xs text-muted-foreground font-mono">
                          {p.registerNumber}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      Select
                    </Badge>
                  </button>
                );
              })}
            </div>
          )}
          {!search.trim() && (
            <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
              <User className="w-8 h-8 opacity-30" />
              <p className="text-sm">Type to search for a patient</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Selected patient banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center text-blue-800 font-bold text-sm shrink-0">
              {(selected.fullName ?? selected.name ?? "?")
                .split(" ")
                .map((n: string) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-blue-900 truncate">
                {selected.fullName ?? selected.name}
              </p>
              {selected.registerNumber && (
                <p className="text-xs text-blue-700 font-mono">
                  {selected.registerNumber}
                </p>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs border-blue-300 text-blue-700 hover:bg-blue-100"
              onClick={() => setSelected(null)}
              data-ocid="inv_payment.close_button"
            >
              <X className="w-3.5 h-3.5" />
              Change
            </Button>
          </div>

          {/* Investigation payment component */}
          <InvestigationPaymentComponent
            patientId={getPatientIdStr(selected)}
            patientName={selected.fullName ?? selected.name ?? ""}
            registerNumber={selected.registerNumber}
            phone={selected.phone ?? selected.mobileNumber}
            doctorName={
              currentDoctor
                ? `${currentDoctor.designation ?? ""} ${currentDoctor.name}`.trim()
                : undefined
            }
          />
        </div>
      )}
    </div>
  );
}
