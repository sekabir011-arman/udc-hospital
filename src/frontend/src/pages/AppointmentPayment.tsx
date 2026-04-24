/**
 * AppointmentPayment — Full-page appointment billing management.
 * Green theme. Shows all appointments with payment status, fee settings per
 * doctor, receipt generation, and date/doctor/status filters.
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BanknoteIcon,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  Filter,
  Printer,
  Receipt,
  Settings2,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  generateReceiptNumber,
  saveReceiptToStore,
} from "../components/MoneyReceipt";
import type { MoneyReceiptData } from "../types";

// ── Storage helpers ───────────────────────────────────────────────────────────

const APT_PAYMENTS_KEY = "appointmentPayments";
const APT_FEES_KEY = "appointmentFeeSettings";

interface AppointmentPayment {
  id: string;
  patientName: string;
  registerNumber: string;
  date: string;
  doctor: string;
  chamber: string;
  fee: number;
  status: "paid" | "unpaid" | "partial";
  receiptId?: string;
  partialAmount?: number;
}

interface DoctorFee {
  doctor: string;
  fee: number;
}

function loadPayments(): AppointmentPayment[] {
  try {
    return JSON.parse(localStorage.getItem(APT_PAYMENTS_KEY) || "[]");
  } catch {
    return [];
  }
}

function savePayments(data: AppointmentPayment[]) {
  localStorage.setItem(APT_PAYMENTS_KEY, JSON.stringify(data));
}

function loadFees(): DoctorFee[] {
  try {
    return JSON.parse(localStorage.getItem(APT_FEES_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveFees(data: DoctorFee[]) {
  localStorage.setItem(APT_FEES_KEY, JSON.stringify(data));
}

// Default appointment records so page looks populated
const DEFAULT_PAYMENTS: AppointmentPayment[] = [
  {
    id: "apt-001",
    patientName: "Rahima Begum",
    registerNumber: "0012/26",
    date: new Date().toISOString().split("T")[0],
    doctor: "Dr. Arman Kabir",
    chamber: "University Dental College, Dhaka",
    fee: 800,
    status: "paid",
  },
  {
    id: "apt-002",
    patientName: "Karim Uddin",
    registerNumber: "0021/26",
    date: new Date().toISOString().split("T")[0],
    doctor: "Dr. Samia Shikder",
    chamber: "Moghbazar Chamber",
    fee: 600,
    status: "unpaid",
  },
  {
    id: "apt-003",
    patientName: "Nasreen Akter",
    registerNumber: "0035/26",
    date: new Date(Date.now() - 86400000).toISOString().split("T")[0],
    doctor: "Dr. Arman Kabir",
    chamber: "University Dental College, Dhaka",
    fee: 800,
    status: "partial",
    partialAmount: 400,
  },
];

// ── Receipt Print Doc ─────────────────────────────────────────────────────────

function AppointmentReceiptDoc({
  receipt,
  printRef,
}: {
  receipt: MoneyReceiptData;
  printRef: React.RefObject<HTMLDivElement>;
}) {
  const formatted = new Date(receipt.date).toLocaleDateString("en-BD", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return (
    <div
      ref={printRef}
      className="bg-white border-2 border-gray-200 rounded-xl p-8 relative overflow-hidden"
      style={{ fontFamily: "serif", minWidth: 420 }}
    >
      {receipt.paid && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          aria-hidden="true"
        >
          <span
            className="text-emerald-200 font-black select-none"
            style={{
              fontSize: 100,
              transform: "rotate(-35deg)",
              opacity: 0.18,
            }}
          >
            PAID
          </span>
        </div>
      )}
      <div className="text-center mb-6 border-b-2 border-gray-800 pb-4">
        <div className="flex items-center justify-center gap-2 mb-1">
          <div className="w-10 h-10 bg-green-700 rounded-full flex items-center justify-center text-white font-black text-lg">
            A
          </div>
          <div>
            <h1 className="font-black text-xl text-gray-900">
              Dr. Arman Kabir's Care
            </h1>
            <p className="text-xs text-gray-600">
              Patient Management & Clinical Portal
            </p>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          University Dental College & Hospital, Moghbazar, Dhaka
        </p>
      </div>
      <div className="text-center mb-5">
        <h2 className="text-lg font-bold text-gray-800 uppercase tracking-widest">
          Appointment Receipt
        </h2>
        <p className="text-sm text-gray-500">অ্যাপয়েন্টমেন্ট রসিদ</p>
      </div>
      <div className="flex justify-between text-xs text-gray-600 mb-5">
        <div>
          <span className="font-semibold">Receipt No: </span>
          <span className="font-mono">{receipt.receiptNumber}</span>
        </div>
        <div className="text-right">
          <span className="font-semibold">Date: </span>
          <span>{formatted}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm mb-5">
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Patient / রোগী</p>
          <p className="font-semibold text-gray-800">{receipt.patientName}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Register No.</p>
          <p className="font-semibold font-mono text-gray-800">
            {receipt.registerNumber || "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Doctor / ডাক্তার</p>
          <p className="font-semibold text-gray-800">
            {receipt.doctorName || "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Service / সেবা</p>
          <p className="font-semibold text-gray-800">{receipt.service}</p>
        </div>
      </div>
      <div className="border-2 border-gray-800 rounded-lg p-4 mb-5 text-center">
        <p className="text-xs uppercase font-semibold text-gray-500 mb-1">
          Consultation Fee / পরামর্শ ফি
        </p>
        <p className="text-3xl font-black text-gray-900">
          ৳ {receipt.amount.toLocaleString("en-BD")}
        </p>
        <div className="mt-2">
          {receipt.paid ? (
            <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-700 font-bold text-sm px-4 py-1 rounded-full border border-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5" /> PAID / পরিশোধিত
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-700 font-bold text-sm px-4 py-1 rounded-full border border-amber-300">
              ⏳ UNPAID / অপরিশোধিত
            </span>
          )}
        </div>
      </div>
      <div className="flex justify-between items-end mt-6 pt-4 border-t border-gray-300">
        <div className="text-center">
          <div className="border-b border-gray-500 w-32 mb-1" />
          <p className="text-xs text-gray-500">Patient Signature</p>
        </div>
        <div className="text-center">
          <div className="border-b border-gray-500 w-32 mb-1" />
          <p className="text-xs text-gray-500">Authorized Signature</p>
        </div>
      </div>
      <p className="text-center text-xs text-gray-400 mt-4">
        Computer-generated receipt — Dr. Arman Kabir's Care
      </p>
    </div>
  );
}

// ── Receipt Modal ─────────────────────────────────────────────────────────────

function ReceiptModal({
  receipt: initial,
  onClose,
}: {
  receipt: MoneyReceiptData;
  onClose: () => void;
}) {
  const [receipt, setReceipt] = useState(initial);
  const printRef = useRef<HTMLDivElement>(null!);
  const [saving, setSaving] = useState(false);

  function handlePrint() {
    saveReceiptToStore(receipt);
    window.print();
  }

  async function handleDownload() {
    if (!printRef.current) return;
    setSaving(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `apt-receipt-${receipt.receiptNumber}.png`;
      link.click();
      saveReceiptToStore(receipt);
      toast.success("Receipt downloaded");
    } catch {
      toast.error("Could not generate download. Use Print instead.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <style>
        {
          "@media print { body > *:not(#apt-receipt-root){display:none!important} #apt-receipt-root{display:block!important;position:fixed;inset:0;z-index:9999;background:white} .apt-no-print{display:none!important} }"
        }
      </style>
      <dialog
        open
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 apt-no-print border-0 max-w-none w-full h-full m-0"
        aria-label="Appointment Receipt"
      >
        <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border apt-no-print">
            <h2 className="font-bold text-foreground text-base flex items-center gap-2">
              <Receipt className="w-4 h-4 text-green-600" /> Appointment Receipt
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground p-1 rounded-md"
              data-ocid="apt_receipt.close_button"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="overflow-y-auto flex-1 p-5 space-y-4">
            <div className="flex gap-2 apt-no-print">
              <button
                type="button"
                onClick={() => setReceipt((r) => ({ ...r, paid: true }))}
                className={`flex-1 h-9 rounded-lg text-sm font-semibold border transition-colors ${receipt.paid ? "bg-emerald-600 text-white border-emerald-600" : "bg-card text-muted-foreground border-border hover:border-emerald-400"}`}
                data-ocid="apt_receipt.paid_toggle"
              >
                ✓ Paid
              </button>
              <button
                type="button"
                onClick={() => setReceipt((r) => ({ ...r, paid: false }))}
                className={`flex-1 h-9 rounded-lg text-sm font-semibold border transition-colors ${!receipt.paid ? "bg-amber-500 text-white border-amber-500" : "bg-card text-muted-foreground border-border hover:border-amber-400"}`}
                data-ocid="apt_receipt.unpaid_toggle"
              >
                ⏳ Unpaid
              </button>
            </div>
            <div id="apt-receipt-root">
              <AppointmentReceiptDoc receipt={receipt} printRef={printRef} />
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-border apt-no-print">
            <Button
              variant="outline"
              onClick={onClose}
              data-ocid="apt_receipt.cancel_button"
            >
              Close
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="gap-1.5 border-blue-300 text-blue-700 hover:bg-blue-50"
                onClick={handleDownload}
                disabled={saving}
                data-ocid="apt_receipt.download_button"
              >
                <Download className="w-4 h-4" />
                {saving ? "Generating…" : "Download"}
              </Button>
              <Button
                className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                onClick={handlePrint}
                data-ocid="apt_receipt.print_button"
              >
                <Printer className="w-4 h-4" />
                Print
              </Button>
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}

// ── Fee Settings panel ────────────────────────────────────────────────────────

function FeeSettingsPanel({
  fees,
  onChange,
}: { fees: DoctorFee[]; onChange: (f: DoctorFee[]) => void }) {
  const [newDoctor, setNewDoctor] = useState("");
  const [newFee, setNewFee] = useState("");

  function addFee() {
    if (!newDoctor.trim() || !newFee) return;
    const updated = [
      ...fees.filter((f) => f.doctor !== newDoctor.trim()),
      { doctor: newDoctor.trim(), fee: Number(newFee) },
    ];
    onChange(updated);
    setNewDoctor("");
    setNewFee("");
    toast.success("Fee setting saved");
  }

  function removeFee(doctor: string) {
    onChange(fees.filter((f) => f.doctor !== doctor));
  }

  return (
    <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
      <p className="text-sm font-semibold text-green-900 flex items-center gap-2">
        <Settings2 className="w-4 h-4" /> Doctor Fee Settings
      </p>
      <div className="flex gap-2">
        <Input
          placeholder="Doctor name"
          value={newDoctor}
          onChange={(e) => setNewDoctor(e.target.value)}
          className="flex-1 h-8 text-sm"
          data-ocid="apt_payment.fee_doctor.input"
        />
        <Input
          type="number"
          placeholder="Fee (৳)"
          value={newFee}
          onChange={(e) => setNewFee(e.target.value)}
          className="w-28 h-8 text-sm"
          data-ocid="apt_payment.fee_amount.input"
        />
        <Button
          size="sm"
          className="h-8 bg-green-600 hover:bg-green-700 text-white px-3"
          onClick={addFee}
          data-ocid="apt_payment.add_fee.button"
        >
          Add
        </Button>
      </div>
      {fees.length > 0 && (
        <div className="space-y-1.5">
          {fees.map((f, i) => (
            <div
              key={f.doctor}
              className="flex items-center justify-between bg-card rounded-lg px-3 py-2 border border-border"
              data-ocid={`apt_payment.fee_item.${i + 1}`}
            >
              <span className="text-sm font-medium text-foreground">
                {f.doctor}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-green-700">
                  ৳ {f.fee.toLocaleString("en-BD")}
                </span>
                <button
                  type="button"
                  onClick={() => removeFee(f.doctor)}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label={`Remove fee for ${f.doctor}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AppointmentPayment() {
  const [payments, setPayments] = useState<AppointmentPayment[]>(() => {
    const saved = loadPayments();
    if (saved.length === 0) {
      savePayments(DEFAULT_PAYMENTS);
      return DEFAULT_PAYMENTS;
    }
    return saved;
  });
  const [fees, setFees] = useState<DoctorFee[]>(() => loadFees());
  const [showFeePanel, setShowFeePanel] = useState(false);
  const [filterDate, setFilterDate] = useState("");
  const [filterDoctor, setFilterDoctor] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [viewingReceipt, setViewingReceipt] = useState<MoneyReceiptData | null>(
    null,
  );

  // Add payment dialog state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPatient, setNewPatient] = useState("");
  const [newRegNo, setNewRegNo] = useState("");
  const [newDoctor, setNewDoctor] = useState("");
  const [newChamber, setNewChamber] = useState("");
  const [newFeeAmt, setNewFeeAmt] = useState("");
  const [newDate, setNewDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  function handleSaveFees(updated: DoctorFee[]) {
    saveFees(updated);
    setFees(updated);
  }

  function getStatusBadge(status: AppointmentPayment["status"]) {
    if (status === "paid")
      return (
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
          Paid
        </Badge>
      );
    if (status === "partial")
      return (
        <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
          Partial
        </Badge>
      );
    return (
      <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">
        Unpaid
      </Badge>
    );
  }

  function handleGenerateReceipt(apt: AppointmentPayment) {
    const receipt: MoneyReceiptData = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      receiptNumber: generateReceiptNumber(),
      type: "appointment",
      patientName: apt.patientName,
      registerNumber: apt.registerNumber,
      doctorName: apt.doctor,
      service: "Consultation Fee",
      amount: apt.fee,
      paid: apt.status === "paid",
      date: new Date(apt.date).toISOString(),
    };
    saveReceiptToStore(receipt);
    // Mark appointment as paid
    const updated = payments.map((p) =>
      p.id === apt.id
        ? { ...p, status: "paid" as const, receiptId: receipt.id }
        : p,
    );
    savePayments(updated);
    setPayments(updated);
    setViewingReceipt(receipt);
  }

  function addPaymentEntry() {
    if (!newPatient.trim() || !newDoctor.trim() || !newFeeAmt) {
      toast.error("Patient name, doctor, and fee are required.");
      return;
    }
    const feeMatch = fees.find((f) =>
      f.doctor.toLowerCase().includes(newDoctor.toLowerCase()),
    );
    const entry: AppointmentPayment = {
      id: `apt-${Date.now()}`,
      patientName: newPatient.trim(),
      registerNumber: newRegNo.trim(),
      date: newDate,
      doctor: newDoctor.trim(),
      chamber: newChamber.trim() || "—",
      fee: feeMatch ? feeMatch.fee : Number(newFeeAmt),
      status: "unpaid",
    };
    const updated = [entry, ...payments];
    savePayments(updated);
    setPayments(updated);
    setShowAddForm(false);
    setNewPatient("");
    setNewRegNo("");
    setNewDoctor("");
    setNewChamber("");
    setNewFeeAmt("");
    toast.success("Appointment entry added");
  }

  const doctors = [...new Set(payments.map((p) => p.doctor))];
  const today = new Date().toISOString().split("T")[0];

  const filtered = payments.filter((p) => {
    if (filterDate && !p.date.startsWith(filterDate)) return false;
    if (filterDoctor !== "all" && p.doctor !== filterDoctor) return false;
    if (filterStatus !== "all" && p.status !== filterStatus) return false;
    return true;
  });

  const todayPayments = payments.filter((p) => p.date.startsWith(today));
  const totalToday = todayPayments
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + p.fee, 0);
  const pendingToday = todayPayments
    .filter((p) => p.status !== "paid")
    .reduce((s, p) => s + p.fee, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-green-50 border-b border-green-200 px-4 md:px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-xs text-green-600 font-medium mb-0.5">
                Payment / পেমেন্ট
              </p>
              <h1 className="text-xl font-bold text-green-900 flex items-center gap-2">
                <BanknoteIcon className="w-5 h-5 text-green-600" /> Appointment
                Payment
              </h1>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="gap-1.5 border-green-300 text-green-700 hover:bg-green-100 text-sm h-8"
                onClick={() => setShowFeePanel((v) => !v)}
                data-ocid="apt_payment.fee_settings.toggle"
              >
                <Settings2 className="w-3.5 h-3.5" /> Fee Settings
                {showFeePanel ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700 text-white gap-1.5 text-sm h-8"
                onClick={() => setShowAddForm((v) => !v)}
                data-ocid="apt_payment.add_entry.button"
              >
                + Add Entry
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-5 space-y-5">
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-xl border border-green-200 p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> Collected
              Today
            </p>
            <p className="text-2xl font-black text-green-600">
              ৳ {totalToday.toLocaleString("en-BD")}
            </p>
          </div>
          <div className="bg-card rounded-xl border border-amber-200 p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-500" /> Pending Today
            </p>
            <p className="text-2xl font-black text-amber-500">
              ৳ {pendingToday.toLocaleString("en-BD")}
            </p>
          </div>
        </div>

        {/* Fee Settings panel */}
        {showFeePanel && (
          <FeeSettingsPanel fees={fees} onChange={handleSaveFees} />
        )}

        {/* Add Entry form */}
        {showAddForm && (
          <div className="bg-card rounded-xl border border-green-200 p-4 space-y-3">
            <p className="text-sm font-semibold text-foreground">
              New Appointment Entry
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Patient Name *</Label>
                <Input
                  placeholder="Patient name"
                  value={newPatient}
                  onChange={(e) => setNewPatient(e.target.value)}
                  className="h-8 text-sm"
                  data-ocid="apt_payment.new_patient.input"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Register No.</Label>
                <Input
                  placeholder="0001/26"
                  value={newRegNo}
                  onChange={(e) => setNewRegNo(e.target.value)}
                  className="h-8 text-sm font-mono"
                  data-ocid="apt_payment.new_regno.input"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Doctor *</Label>
                <Input
                  placeholder="Dr. name"
                  value={newDoctor}
                  onChange={(e) => setNewDoctor(e.target.value)}
                  className="h-8 text-sm"
                  data-ocid="apt_payment.new_doctor.input"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Chamber</Label>
                <Input
                  placeholder="Chamber or Hospital"
                  value={newChamber}
                  onChange={(e) => setNewChamber(e.target.value)}
                  className="h-8 text-sm"
                  data-ocid="apt_payment.new_chamber.input"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Fee (৳) *</Label>
                <Input
                  type="number"
                  placeholder="800"
                  value={newFeeAmt}
                  onChange={(e) => setNewFeeAmt(e.target.value)}
                  className="h-8 text-sm"
                  data-ocid="apt_payment.new_fee.input"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Date</Label>
                <Input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="h-8 text-sm"
                  data-ocid="apt_payment.new_date.input"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddForm(false)}
                data-ocid="apt_payment.add_entry_cancel.button"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={addPaymentEntry}
                data-ocid="apt_payment.add_entry_save.button"
              >
                Save Entry
              </Button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-card rounded-xl border border-border p-3">
          <div className="flex flex-wrap gap-2 items-center">
            <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <Input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="h-8 text-sm w-36"
              data-ocid="apt_payment.filter_date.input"
            />
            <Select value={filterDoctor} onValueChange={setFilterDoctor}>
              <SelectTrigger
                className="h-8 text-sm w-48"
                data-ocid="apt_payment.filter_doctor.select"
              >
                <SelectValue placeholder="All Doctors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Doctors</SelectItem>
                {doctors.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger
                className="h-8 text-sm w-36"
                data-ocid="apt_payment.filter_status.select"
              >
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
              </SelectContent>
            </Select>
            {(filterDate ||
              filterDoctor !== "all" ||
              filterStatus !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground gap-1"
                onClick={() => {
                  setFilterDate("");
                  setFilterDoctor("all");
                  setFilterStatus("all");
                }}
                data-ocid="apt_payment.clear_filters.button"
              >
                <X className="w-3 h-3" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3 text-center"
            data-ocid="apt_payment.empty_state"
          >
            <BanknoteIcon className="w-10 h-10 opacity-30" />
            <p className="font-semibold">No appointments found</p>
            <p className="text-sm">Add an entry or adjust filters.</p>
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="bg-green-50 px-4 py-2.5 border-b border-green-200">
              <p className="text-sm font-semibold text-green-900">
                {filtered.length} appointment{filtered.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                      Patient
                    </th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground hidden sm:table-cell">
                      Date
                    </th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground hidden md:table-cell">
                      Doctor
                    </th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground hidden lg:table-cell">
                      Chamber
                    </th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                      Fee (৳)
                    </th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                      Status
                    </th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                      Receipt
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((apt, idx) => (
                    <tr
                      key={apt.id}
                      className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                      data-ocid={`apt_payment.item.${idx + 1}`}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">
                          {apt.patientName}
                        </p>
                        {apt.registerNumber && (
                          <p className="text-xs font-mono text-muted-foreground">
                            {apt.registerNumber}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">
                        {new Date(apt.date).toLocaleDateString("en-BD", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3 text-xs text-foreground hidden md:table-cell">
                        {apt.doctor}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">
                        {apt.chamber}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-foreground">
                        ৳ {apt.fee.toLocaleString("en-BD")}
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(apt.status)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs gap-1 text-green-700 border-green-200 hover:bg-green-50"
                          onClick={() => handleGenerateReceipt(apt)}
                          data-ocid={`apt_payment.generate_receipt.${idx + 1}`}
                        >
                          <Receipt className="w-3 h-3" /> Receipt
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {viewingReceipt && (
        <ReceiptModal
          receipt={viewingReceipt}
          onClose={() => setViewingReceipt(null)}
        />
      )}
    </div>
  );
}
