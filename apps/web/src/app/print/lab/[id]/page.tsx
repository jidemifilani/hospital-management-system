"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { apiErrorMessage } from "@/lib/api-error";

interface LabResult {
  id: string;
  testName: string;
  testCode?: string | null;
  result: string;
  unit?: string | null;
  normalRange?: string | null;
  isAbnormal: boolean;
  isCritical: boolean;
  resultedAt: string;
  notes?: string | null;
  verifiedBy?: { firstName: string; lastName: string } | null;
}

interface LabOrder {
  id: string;
  orderNumber: string;
  status: string;
  priority: string;
  sampleType?: string | null;
  clinicalInfo?: string | null;
  collectedAt?: string | null;
  createdAt: string;
  patient: {
    mrn: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
    phone?: string | null;
  };
  requestedBy?: { firstName: string; lastName: string } | null;
  results: LabResult[];
}

const shown = (v?: string | null) => (v && String(v).trim() ? v : "—");

/**
 * Formats a date, or returns a dash.
 *
 * date-fns throws RangeError on an invalid date, which took the whole report
 * down with it — a blank page instead of a printable result, because one
 * optional field was absent. A report missing a detail is still useful; a
 * report that will not render is not.
 */
const onDate = (v?: string | null, pattern = "dd MMM yyyy") => {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : format(d, pattern);
};

export default function PrintLabReport() {
  const { id } = useParams<{ id: string }>();

  const { data: order, isLoading, error } = useQuery<LabOrder>({
    queryKey: ["print-lab", id],
    queryFn: async () => (await api.get(`/lab/orders/${id}`)).data,
    enabled: Boolean(id),
  });

  // Opens the print dialog once the report is actually on screen, so nobody
  // prints a spinner.
  useEffect(() => {
    if (order) {
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
  }, [order]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <p className="p-10 text-center text-sm">
        {apiErrorMessage(error, "That lab report could not be loaded.")}
      </p>
    );
  }

  const unverified = order.results.filter((r) => !r.verifiedBy).length;

  return (
    <main className="mx-auto max-w-3xl bg-white p-8 text-black print:p-0">
      <style>{`@media print { .no-print { display: none !important; } @page { margin: 14mm; } }`}</style>

      <div className="no-print mb-6 flex justify-end">
        <button
          onClick={() => window.print()}
          className="rounded border px-3 py-1.5 text-sm"
        >
          Print
        </button>
      </div>

      <header className="border-b-2 border-black pb-3">
        <h1 className="text-xl font-bold">CareSync Hospital</h1>
        <p className="text-sm">Laboratory Report</p>
      </header>

      <section className="mt-4 grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
        <p><span className="font-semibold">Patient:</span> {order.patient.firstName} {order.patient.lastName}</p>
        <p><span className="font-semibold">MRN:</span> {order.patient.mrn}</p>
        <p>
          <span className="font-semibold">Date of birth:</span>{" "}
          {onDate(order.patient.dateOfBirth)}
        </p>
        <p><span className="font-semibold">Sex:</span> {shown(order.patient.gender)}</p>
        <p><span className="font-semibold">Order:</span> {order.orderNumber}</p>
        <p><span className="font-semibold">Priority:</span> {order.priority}</p>
        <p><span className="font-semibold">Sample:</span> {shown(order.sampleType)}</p>
        <p>
          <span className="font-semibold">Collected:</span>{" "}
          {onDate(order.collectedAt, "dd MMM yyyy HH:mm")}
        </p>
        <p>
          <span className="font-semibold">Requested by:</span>{" "}
          {order.requestedBy ? `${order.requestedBy.firstName} ${order.requestedBy.lastName}` : "—"}
        </p>
        <p><span className="font-semibold">Status:</span> {order.status}</p>
      </section>

      {order.clinicalInfo && (
        <p className="mt-3 text-sm">
          <span className="font-semibold">Clinical details:</span> {order.clinicalInfo}
        </p>
      )}

      <table className="mt-6 w-full border-collapse text-sm">
        <thead>
          <tr className="border-y border-black text-left">
            <th className="py-1 pr-2">Test</th>
            <th className="py-1 pr-2">Result</th>
            <th className="py-1 pr-2">Unit</th>
            <th className="py-1 pr-2">Reference</th>
            <th className="py-1">Flag</th>
          </tr>
        </thead>
        <tbody>
          {order.results.length === 0 && (
            <tr>
              <td colSpan={5} className="py-4 text-center">
                No results have been entered for this order yet.
              </td>
            </tr>
          )}
          {order.results.map((r) => (
            <tr key={r.id} className="border-b border-gray-300 align-top">
              <td className="py-1 pr-2">
                {r.testName}
                {r.testCode && <span className="text-gray-600"> ({r.testCode})</span>}
                {r.notes && <div className="text-xs text-gray-700">{r.notes}</div>}
              </td>
              {/* Bold, not colour: this has to survive a black-and-white printer. */}
              <td className={`py-1 pr-2 ${r.isAbnormal ? "font-bold" : ""}`}>{r.result}</td>
              <td className="py-1 pr-2">{shown(r.unit)}</td>
              <td className="py-1 pr-2">{shown(r.normalRange)}</td>
              <td className="py-1 font-bold">
                {r.isCritical ? "CRITICAL" : r.isAbnormal ? "ABNORMAL" : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {unverified > 0 && (
        <p className="mt-4 border border-black p-2 text-sm font-semibold">
          PROVISIONAL — {unverified} of {order.results.length} result(s) not yet verified by a
          pathologist. Not to be used for clinical decisions.
        </p>
      )}

      <footer className="mt-10 grid grid-cols-2 gap-8 text-sm">
        <div>
          <div className="h-10 border-b border-black" />
          <p className="mt-1">
            Verified by{" "}
            {order.results.find((r) => r.verifiedBy)
              ? `${order.results.find((r) => r.verifiedBy)!.verifiedBy!.firstName} ${
                  order.results.find((r) => r.verifiedBy)!.verifiedBy!.lastName
                }`
              : "—"}
          </p>
        </div>
        <div>
          <div className="h-10 border-b border-black" />
          <p className="mt-1">Date</p>
        </div>
      </footer>

      <p className="mt-6 text-xs text-gray-600">
        Printed {onDate(new Date().toISOString(), "dd MMM yyyy HH:mm")} · Report {order.orderNumber}
      </p>
    </main>
  );
}
