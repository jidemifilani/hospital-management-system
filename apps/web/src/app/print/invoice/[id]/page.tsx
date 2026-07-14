"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { Loader2 } from "lucide-react";

const NGN = (n: number | string) =>
  Number(n).toLocaleString("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });

export default function InvoicePrintPage() {
  const { id } = useParams<{ id: string }>();

  const { data: inv, isLoading } = useQuery({
    queryKey: ["invoice-print", id],
    queryFn: () => api.get(`/billing/invoices/${id}`).then((r) => r.data),
  });

  useEffect(() => {
    if (inv) {
      const timer = setTimeout(() => window.print(), 500);
      return () => clearTimeout(timer);
    }
  }, [inv]);

  if (isLoading) return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  );
  if (!inv) return <div className="p-8 text-center">Invoice not found.</div>;

  const outstanding = Number(inv.total) - Number(inv.amountPaid);

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { margin: 15mm; size: A4; }
        }
        body { font-family: Arial, sans-serif; color: #111; background: white; }
      `}</style>

      <div className="no-print mb-4 p-4 flex gap-3 bg-gray-100 border-b">
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
        >Print Invoice</button>
        <button
          onClick={() => window.close()}
          className="px-4 py-2 border rounded text-sm hover:bg-gray-50"
        >Close</button>
      </div>

      <div className="max-w-2xl mx-auto p-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "#2563eb" }}>CareSync HMS</h1>
            <p className="text-sm text-gray-500 mt-1">Hospital Management System</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold">INVOICE</h2>
            <p className="text-sm font-mono mt-1">{inv.invoiceNumber}</p>
            <span style={{
              display: "inline-block", marginTop: 4, padding: "2px 8px",
              fontSize: 11, fontWeight: 700, borderRadius: 99,
              background: inv.status === "PAID" ? "#dcfce7" : inv.status === "OVERDUE" ? "#fee2e2" : "#dbeafe",
              color: inv.status === "PAID" ? "#15803d" : inv.status === "OVERDUE" ? "#b91c1c" : "#1d4ed8",
            }}>{inv.status}</span>
          </div>
        </div>

        {/* Patient / Dates */}
        <div className="grid grid-cols-2 gap-6 mb-8 p-4 rounded-lg" style={{ background: "#f9fafb" }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#6b7280", marginBottom: 4 }}>Bill To</p>
            <p style={{ fontWeight: 600 }}>{inv.patient.firstName} {inv.patient.lastName}</p>
            <p style={{ fontSize: 13, color: "#4b5563" }}>MRN: {inv.patient.mrn}</p>
            {inv.patient.phone && <p style={{ fontSize: 13, color: "#4b5563" }}>{inv.patient.phone}</p>}
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#6b7280", marginBottom: 4 }}>Invoice Details</p>
            <p style={{ fontSize: 13 }}>Date: {new Date(inv.createdAt).toLocaleDateString("en-NG")}</p>
            {inv.dueDate && <p style={{ fontSize: 13 }}>Due: {new Date(inv.dueDate).toLocaleDateString("en-NG")}</p>}
            {inv.appointment && <p style={{ fontSize: 13 }}>Visit: {new Date(inv.appointment.scheduledAt).toLocaleDateString("en-NG")}</p>}
          </div>
        </div>

        {/* Line items */}
        <table style={{ width: "100%", marginBottom: 24, fontSize: 13, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #d1d5db" }}>
              <th style={{ textAlign: "left", paddingBottom: 8, fontWeight: 600, color: "#6b7280" }}>Description</th>
              <th style={{ textAlign: "center", paddingBottom: 8, fontWeight: 600, color: "#6b7280" }}>Qty</th>
              <th style={{ textAlign: "right", paddingBottom: 8, fontWeight: 600, color: "#6b7280" }}>Unit Price</th>
              <th style={{ textAlign: "right", paddingBottom: 8, fontWeight: 600, color: "#6b7280" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {inv.items.map((item: any) => (
              <tr key={item.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: "8px 0" }}>
                  <p>{item.description}</p>
                  {item.category && <p style={{ fontSize: 11, color: "#9ca3af" }}>{item.category}</p>}
                </td>
                <td style={{ textAlign: "center", padding: "8px 0" }}>{item.quantity}</td>
                <td style={{ textAlign: "right", padding: "8px 0" }}>{NGN(item.unitPrice)}</td>
                <td style={{ textAlign: "right", padding: "8px 0", fontWeight: 600 }}>{NGN(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 32 }}>
          <div style={{ width: 224, fontSize: 13 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ color: "#6b7280" }}>Subtotal</span><span>{NGN(inv.subtotal)}</span>
            </div>
            {Number(inv.discount) > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, color: "#15803d" }}>
                <span>Discount</span><span>-{NGN(inv.discount)}</span>
              </div>
            )}
            {Number(inv.tax) > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ color: "#6b7280" }}>Tax</span><span>{NGN(inv.tax)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #d1d5db", paddingTop: 8, fontWeight: 700, fontSize: 15 }}>
              <span>Total</span><span>{NGN(inv.total)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#15803d", marginTop: 4 }}>
              <span>Amount Paid</span><span>{NGN(inv.amountPaid)}</span>
            </div>
            {outstanding > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #d1d5db", paddingTop: 8, fontWeight: 700, color: "#b45309", marginTop: 4 }}>
                <span>Balance Due</span><span>{NGN(outstanding)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Payments received */}
        {inv.payments?.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#6b7280", marginBottom: 8 }}>Payment History</p>
            {inv.payments.map((p: any, i: number) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#4b5563", marginBottom: 4 }}>
                <span>{new Date(p.paidAt).toLocaleDateString("en-NG")} · {p.method.replace("_", " ")}</span>
                <span style={{ fontWeight: 600 }}>{NGN(p.amount)}</span>
              </div>
            ))}
          </div>
        )}

        {inv.notes && (
          <div style={{ background: "#f9fafb", borderRadius: 6, padding: 12, marginBottom: 24 }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "#6b7280", marginBottom: 4 }}>Notes</p>
            <p style={{ fontSize: 13, color: "#374151" }}>{inv.notes}</p>
          </div>
        )}

        <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 16, textAlign: "center", fontSize: 11, color: "#9ca3af" }}>
          Thank you for choosing CareSync HMS · {new Date().toLocaleDateString("en-NG")}
        </div>
      </div>
    </>
  );
}
