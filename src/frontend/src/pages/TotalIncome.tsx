/**
 * TotalIncome — Aggregated income dashboard from all payment sources.
 * Blue/indigo theme. Date filters, breakdown table, CSS bar chart, CSV export.
 */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarChart2, Download, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { loadReceipts } from "../components/MoneyReceipt";
import type { MoneyReceiptData } from "../types";

// ── Storage keys matching other payment pages ─────────────────────────────────

const PROC_PAYMENTS_KEY = "procedurePayments";
const APT_PAYMENTS_KEY = "appointmentPayments";
const OTHER_PAYMENTS_KEY = "otherPayments";

// ── Types ─────────────────────────────────────────────────────────────────────

interface OtherPaymentRecord {
  id: string;
  patientName?: string;
  description: string;
  amount: number;
  date: string;
  paidBy: string;
}

type DateFilter = "today" | "week" | "month" | "custom";

interface DayTotals {
  date: string;
  appointment: number;
  investigation: number;
  procedure: number;
  other: number;
  total: number;
}

// ── Load helpers ──────────────────────────────────────────────────────────────

function loadProcedurePayments(): MoneyReceiptData[] {
  try {
    return JSON.parse(localStorage.getItem(PROC_PAYMENTS_KEY) || "[]");
  } catch {
    return [];
  }
}

function loadAppointmentPayments(): Array<{
  id: string;
  amount?: number;
  fee?: number;
  date: string;
  status: string;
}> {
  try {
    return JSON.parse(localStorage.getItem(APT_PAYMENTS_KEY) || "[]");
  } catch {
    return [];
  }
}

function loadOtherPayments(): OtherPaymentRecord[] {
  try {
    return JSON.parse(localStorage.getItem(OTHER_PAYMENTS_KEY) || "[]");
  } catch {
    return [];
  }
}

// ── Date range helpers ────────────────────────────────────────────────────────

function getDateRange(
  filter: DateFilter,
  customFrom: string,
  customTo: string,
): { from: Date; to: Date } {
  const now = new Date();
  if (filter === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { from: start, to: end };
  }
  if (filter === "week") {
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { from: start, to: end };
  }
  if (filter === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { from: start, to: end };
  }
  const from = customFrom
    ? new Date(customFrom)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const to = customTo ? new Date(`${customTo}T23:59:59`) : new Date(now);
  return { from, to };
}

function inRange(dateStr: string, from: Date, to: Date): boolean {
  const d = new Date(dateStr);
  return d >= from && d <= to;
}

// ── Summary Card ──────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  labelBn,
  color,
  icon,
}: {
  label: string;
  value: number;
  labelBn: string;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-4 flex items-start gap-3">
      <div
        className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center shrink-0`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        <p className="text-xs text-muted-foreground/60 mb-1">{labelBn}</p>
        <p className="text-xl font-black text-foreground tabular-nums">
          ৳ {value.toLocaleString("en-BD")}
        </p>
      </div>
    </div>
  );
}

// ── Bar chart (CSS only) ──────────────────────────────────────────────────────

function IncomeBarChart({ data }: { data: DayTotals[] }) {
  const maxVal = Math.max(...data.map((d) => d.total), 1);
  const cats = [
    {
      key: "appointment" as const,
      color: "bg-green-500",
      label: "Appointment",
    },
    {
      key: "investigation" as const,
      color: "bg-blue-500",
      label: "Investigation",
    },
    { key: "procedure" as const, color: "bg-orange-500", label: "Procedure" },
    { key: "other" as const, color: "bg-purple-500", label: "Other" },
  ];

  return (
    <div>
      <div className="flex gap-3 mb-3 flex-wrap">
        {cats.map((c) => (
          <div
            key={c.key}
            className="flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            <div className={`w-3 h-3 rounded-sm ${c.color}`} />
            <span>{c.label}</span>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto">
        <div
          className="flex gap-2 items-end"
          style={{ minWidth: data.length * 56 }}
        >
          {data.map((day) => (
            <div
              key={day.date}
              className="flex flex-col items-center gap-1 flex-1"
              style={{ minWidth: 44 }}
            >
              <div
                className="w-full flex flex-col-reverse gap-0.5"
                style={{ height: 120 }}
              >
                {cats.map((cat) => {
                  const val = day[cat.key];
                  const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
                  return pct > 0 ? (
                    <div
                      key={cat.key}
                      className={`w-full rounded-sm ${cat.color} transition-all`}
                      style={{ height: `${pct}%` }}
                      title={`${cat.label}: ৳${val.toLocaleString("en-BD")}`}
                    />
                  ) : null;
                })}
              </div>
              <span
                className="text-xs text-muted-foreground"
                style={{ fontSize: 9 }}
              >
                {new Date(day.date).toLocaleDateString("en-BD", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function TotalIncome() {
  const [dateFilter, setDateFilter] = useState<DateFilter>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const { from, to } = getDateRange(dateFilter, customFrom, customTo);

  // Load all payment data
  const allReceipts = useMemo(() => loadReceipts(), []);
  const procPayments = useMemo(() => loadProcedurePayments(), []);
  const aptPayments = useMemo(() => loadAppointmentPayments(), []);
  const otherPayments = useMemo(() => loadOtherPayments(), []);

  // Aggregate totals
  const aptTotal = useMemo(
    () =>
      aptPayments
        .filter((p) => p.status === "paid" && inRange(p.date, from, to))
        .reduce((s, p) => s + (p.fee ?? p.amount ?? 0), 0),
    [aptPayments, from, to],
  );

  const invTotal = useMemo(
    () =>
      allReceipts
        .filter(
          (r) =>
            r.type === "investigation" && r.paid && inRange(r.date, from, to),
        )
        .reduce((s, r) => s + (r.finalAmount ?? r.amount), 0),
    [allReceipts, from, to],
  );

  const procTotal = useMemo(() => {
    const moneyReceipts = allReceipts.filter(
      (r) => r.type === "procedure" && r.paid && inRange(r.date, from, to),
    );
    const procReceipts = procPayments.filter(
      (r) => r.paid && inRange(r.date, from, to),
    );
    const combined = [...procReceipts];
    for (const m of moneyReceipts) {
      if (!combined.find((r) => r.id === m.id)) combined.push(m);
    }
    return combined.reduce((s, r) => s + (r.finalAmount ?? r.amount), 0);
  }, [allReceipts, procPayments, from, to]);

  const otherTotal = useMemo(
    () =>
      otherPayments
        .filter((p) => inRange(p.date, from, to))
        .reduce((s, p) => s + p.amount, 0),
    [otherPayments, from, to],
  );

  const grandTotal = aptTotal + invTotal + procTotal + otherTotal;

  // Build breakdown table grouped by date
  const breakdown = useMemo((): DayTotals[] => {
    const map = new Map<string, DayTotals>();

    function getDay(_rec: DayTotals, dateStr: string) {
      const day = dateStr.split("T")[0];
      if (!map.has(day))
        map.set(day, {
          date: day,
          appointment: 0,
          investigation: 0,
          procedure: 0,
          other: 0,
          total: 0,
        });
      return map.get(day)!;
    }

    for (const p of aptPayments) {
      if (p.status !== "paid" || !inRange(p.date, from, to)) continue;
      const d = getDay({} as DayTotals, p.date);
      d.appointment += p.fee ?? p.amount ?? 0;
      d.total += p.fee ?? p.amount ?? 0;
    }
    for (const r of allReceipts) {
      if (!r.paid || !inRange(r.date, from, to)) continue;
      const amt = r.finalAmount ?? r.amount;
      const d = getDay({} as DayTotals, r.date);
      if (r.type === "investigation") {
        d.investigation += amt;
        d.total += amt;
      } else if (r.type === "procedure") {
        d.procedure += amt;
        d.total += amt;
      } else if (r.type === "appointment") {
        d.appointment += amt;
        d.total += amt;
      }
    }
    for (const r of procPayments) {
      if (!r.paid || !inRange(r.date, from, to)) continue;
      if (allReceipts.find((m) => m.id === r.id)) continue;
      const amt = r.finalAmount ?? r.amount;
      const d = getDay({} as DayTotals, r.date);
      d.procedure += amt;
      d.total += amt;
    }
    for (const p of otherPayments) {
      if (!inRange(p.date, from, to)) continue;
      const d = getDay({} as DayTotals, p.date);
      d.other += p.amount;
      d.total += p.amount;
    }

    return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [aptPayments, allReceipts, procPayments, otherPayments, from, to]);

  function exportCSV() {
    const headers = [
      "Date",
      "Appointment (৳)",
      "Investigation (৳)",
      "Procedure (৳)",
      "Other (৳)",
      "Total (৳)",
    ];
    const rows = breakdown.map((d) =>
      [
        d.date,
        d.appointment,
        d.investigation,
        d.procedure,
        d.other,
        d.total,
      ].join(","),
    );
    rows.push(
      ["TOTAL", aptTotal, invTotal, procTotal, otherTotal, grandTotal].join(
        ",",
      ),
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `income-report-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const filterBtns: { label: string; value: DateFilter }[] = [
    { label: "Today", value: "today" },
    { label: "This Week", value: "week" },
    { label: "This Month", value: "month" },
    { label: "Custom", value: "custom" },
  ];

  return (
    <div className="min-h-screen bg-background" data-ocid="total_income.page">
      {/* Header */}
      <div className="bg-indigo-600 text-white px-4 sm:px-6 py-5">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <p className="text-indigo-200 text-xs mb-0.5">Finance</p>
              <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                <TrendingUp className="w-6 h-6" />
                Total Income
              </h1>
              <p className="text-indigo-200 text-sm mt-0.5">
                মোট আয়ের সারসংক্ষেপ
              </p>
            </div>
            <Button
              size="sm"
              className="bg-white text-indigo-700 hover:bg-indigo-50 font-semibold gap-1.5"
              onClick={exportCSV}
              data-ocid="total_income.export_csv.button"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>

          {/* Grand total */}
          <div className="bg-white/15 rounded-xl p-4 mt-5 backdrop-blur-sm inline-block">
            <p className="text-indigo-100 text-xs mb-1">Grand Total / মোট আয়</p>
            <p className="text-white font-black text-3xl">
              ৳ {grandTotal.toLocaleString("en-BD")}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Date filter */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-4">
          <div className="flex flex-wrap gap-2 mb-3">
            {filterBtns.map((btn) => (
              <button
                key={btn.value}
                type="button"
                onClick={() => setDateFilter(btn.value)}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${dateFilter === btn.value ? "bg-indigo-600 text-white border-indigo-600" : "bg-card text-muted-foreground border-border hover:border-indigo-300"}`}
                data-ocid={`total_income.${btn.value}_filter.tab`}
              >
                {btn.label}
              </button>
            ))}
          </div>
          {dateFilter === "custom" && (
            <div className="flex gap-3 flex-wrap">
              <div className="space-y-1">
                <Label
                  htmlFor="income-date-from"
                  className="text-xs text-muted-foreground font-medium"
                >
                  From
                </Label>
                <Input
                  id="income-date-from"
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="h-8 text-sm w-36"
                  data-ocid="total_income.date_from.input"
                />
              </div>
              <div className="space-y-1">
                <Label
                  htmlFor="income-date-to"
                  className="text-xs text-muted-foreground font-medium"
                >
                  To
                </Label>
                <Input
                  id="income-date-to"
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="h-8 text-sm w-36"
                  data-ocid="total_income.date_to.input"
                />
              </div>
            </div>
          )}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            label="Appointment"
            labelBn="অ্যাপয়েন্টমেন্ট"
            value={aptTotal}
            color="bg-green-100"
            icon={
              <span className="text-green-600 font-black text-sm">APT</span>
            }
          />
          <SummaryCard
            label="Investigation"
            labelBn="তদন্ত"
            value={invTotal}
            color="bg-blue-100"
            icon={<span className="text-blue-600 font-black text-sm">INV</span>}
          />
          <SummaryCard
            label="Procedure"
            labelBn="পদ্ধতি"
            value={procTotal}
            color="bg-orange-100"
            icon={
              <span className="text-orange-600 font-black text-sm">PRO</span>
            }
          />
          <SummaryCard
            label="Other Income"
            labelBn="অন্যান্য"
            value={otherTotal}
            color="bg-purple-100"
            icon={
              <span className="text-purple-600 font-black text-sm">OTH</span>
            }
          />
        </div>

        {/* Bar chart */}
        {breakdown.length > 0 && (
          <div className="bg-card rounded-xl border border-border shadow-sm p-4">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-indigo-600" />
              Income by Day
            </h3>
            <IncomeBarChart data={breakdown} />
          </div>
        )}

        {/* Breakdown table */}
        <div
          className="bg-card rounded-xl border border-border shadow-sm overflow-hidden"
          data-ocid="total_income.breakdown.table"
        >
          <div className="bg-indigo-50 border-b border-indigo-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-indigo-800">
              Daily Breakdown
            </h3>
          </div>
          {breakdown.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3"
              data-ocid="total_income.empty_state"
            >
              <TrendingUp className="w-10 h-10 opacity-30" />
              <p className="font-semibold">No income data for this period</p>
              <p className="text-sm">Try a different date range.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 border-b border-border">
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground text-xs">
                      Date
                    </th>
                    <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground text-xs text-green-700 hidden sm:table-cell">
                      Appt
                    </th>
                    <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground text-xs text-blue-700 hidden sm:table-cell">
                      Invest.
                    </th>
                    <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground text-xs text-orange-700 hidden md:table-cell">
                      Proc.
                    </th>
                    <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground text-xs text-purple-700 hidden md:table-cell">
                      Other
                    </th>
                    <th className="text-right px-4 py-2.5 font-semibold text-foreground text-xs">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {breakdown.map((d, idx) => (
                    <tr
                      key={d.date}
                      className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                      data-ocid={`total_income.row.${idx + 1}`}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-foreground">
                        {new Date(d.date).toLocaleDateString("en-BD", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-green-700 hidden sm:table-cell">
                        {d.appointment > 0
                          ? `৳ ${d.appointment.toLocaleString("en-BD")}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-blue-700 hidden sm:table-cell">
                        {d.investigation > 0
                          ? `৳ ${d.investigation.toLocaleString("en-BD")}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-orange-700 hidden md:table-cell">
                        {d.procedure > 0
                          ? `৳ ${d.procedure.toLocaleString("en-BD")}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-purple-700 hidden md:table-cell">
                        {d.other > 0
                          ? `৳ ${d.other.toLocaleString("en-BD")}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-foreground">
                        ৳ {d.total.toLocaleString("en-BD")}
                      </td>
                    </tr>
                  ))}
                  {/* Totals row */}
                  <tr className="bg-indigo-50 border-t-2 border-indigo-200 font-bold">
                    <td className="px-4 py-3 text-sm text-indigo-800 font-black">
                      TOTAL
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-green-700 hidden sm:table-cell">
                      ৳ {aptTotal.toLocaleString("en-BD")}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-blue-700 hidden sm:table-cell">
                      ৳ {invTotal.toLocaleString("en-BD")}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-orange-700 hidden md:table-cell">
                      ৳ {procTotal.toLocaleString("en-BD")}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-purple-700 hidden md:table-cell">
                      ৳ {otherTotal.toLocaleString("en-BD")}
                    </td>
                    <td className="px-4 py-3 text-right text-indigo-800 font-black">
                      ৳ {grandTotal.toLocaleString("en-BD")}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
