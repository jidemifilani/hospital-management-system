"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, Loader2, Globe, CheckCircle2 } from "lucide-react";
import axios from "axios";
import { portalApi } from "@/lib/portal-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

const STATUS_COLOR: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  ISSUED: "bg-blue-100 text-blue-700",
  PARTIALLY_PAID: "bg-amber-100 text-amber-700",
  PAID: "bg-green-100 text-green-700",
  OVERDUE: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

const NGN = (n: number | string) =>
  Number(n).toLocaleString("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });

export default function PortalBillsPage() {
  const [paying, setPaying] = useState<string | null>(null);
  const { data = [], isLoading } = useQuery<any[]>({
    queryKey: ["portal-invoices"],
    queryFn: () => portalApi.get("/portal/invoices").then((r) => r.data),
  });

  const payOnline = async (invoiceId: string) => {
    setPaying(invoiceId);
    try {
      const { data: result } = await portalApi.post(`/billing/invoices/${invoiceId}/pay/initiate`);
      window.open(result.authorization_url, "_blank", "noopener,noreferrer");
    } catch {
      alert("Payment could not be initiated. Please try again or visit the billing desk.");
    } finally {
      setPaying(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Bills & Payments</h1>
        <p className="text-sm text-muted-foreground">Your invoices and payment history</p>
      </div>

      {isLoading && <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}

      <div className="space-y-4">
        {data.length === 0 && !isLoading && (
          <p className="text-sm text-muted-foreground">No invoices found.</p>
        )}
        {data.map((inv: any) => {
          const balance = Number(inv.total) - Number(inv.amountPaid);
          const isPaid = inv.status === "PAID" || inv.status === "CANCELLED";
          return (
            <Card key={inv.id}>
              <CardHeader className="pb-2 pt-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-amber-600" />
                      <CardTitle className="text-sm font-mono">{inv.invoiceNumber}</CardTitle>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatDate(inv.createdAt)}
                      {inv.dueDate && <> · Due: {formatDate(inv.dueDate)}</>}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLOR[inv.status] ?? ""}`}>
                    {inv.status.replace("_", " ")}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Items */}
                <div className="space-y-1">
                  {inv.items.slice(0, 3).map((item: any, i: number) => (
                    <div key={i} className="flex justify-between text-xs text-muted-foreground">
                      <span>{item.description} ×{item.quantity}</span>
                      <span>{NGN(item.total)}</span>
                    </div>
                  ))}
                  {inv.items.length > 3 && (
                    <p className="text-xs text-muted-foreground">+{inv.items.length - 3} more items</p>
                  )}
                </div>

                {/* Totals */}
                <div className="border-t pt-2 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-semibold">{NGN(inv.total)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Paid</span>
                    <span className="text-green-600 font-medium">{NGN(inv.amountPaid)}</span>
                  </div>
                  {balance > 0 && (
                    <div className="flex justify-between text-sm font-semibold">
                      <span>Balance</span>
                      <span className="text-amber-600">{NGN(balance)}</span>
                    </div>
                  )}
                </div>

                {/* Pay online button */}
                {!isPaid && balance > 0 && (
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => payOnline(inv.id)}
                    disabled={paying === inv.id}
                  >
                    {paying === inv.id
                      ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      : <Globe className="mr-2 h-3.5 w-3.5" />}
                    Pay Online — {NGN(balance)}
                  </Button>
                )}
                {isPaid && (
                  <div className="flex items-center justify-center gap-1.5 text-green-600 text-sm">
                    <CheckCircle2 className="h-4 w-4" /> Fully paid
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
