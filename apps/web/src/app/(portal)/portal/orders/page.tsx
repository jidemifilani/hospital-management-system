"use client";

import { useQuery } from "@tanstack/react-query";
import { portalApi } from "@/lib/portal-api";
import { Loader2, ShoppingBag, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { format } from "date-fns";

const NGN = (n: number | string) =>
  Number(n).toLocaleString("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });

const STATUS_COLOR: Record<string, string> = {
  PENDING_PAYMENT: "bg-amber-100 text-amber-700",
  PAID:            "bg-blue-100 text-blue-700",
  PROCESSING:      "bg-purple-100 text-purple-700",
  FULFILLED:       "bg-green-100 text-green-700",
  CANCELLED:       "bg-gray-100 text-gray-600",
};

export default function PortalOrdersPage() {
  const { data = [], isLoading } = useQuery<any[]>({
    queryKey: ["portal-orders"],
    queryFn: () => portalApi.get("/shop/orders").then((r) => r.data),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">My Orders</h1>
          <p className="text-sm text-muted-foreground">Your online pharmacy order history</p>
        </div>
        <Button asChild>
          <Link href="/portal/shop"><ShoppingBag className="mr-2 h-4 w-4" />Shop Again</Link>
        </Button>
      </div>

      {isLoading && <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}

      {!isLoading && data.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <Package className="h-10 w-10" />
          <p className="text-sm">You haven&apos;t placed any orders yet.</p>
          <Button asChild variant="outline"><Link href="/portal/shop">Browse the pharmacy</Link></Button>
        </div>
      )}

      <div className="space-y-4">
        {data.map((order: any) => (
          <Card key={order.id}>
            <CardHeader className="pb-2 pt-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-mono">{order.orderNumber}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {format(new Date(order.createdAt), "dd MMM yyyy, HH:mm")} · {order.deliveryMethod}
                  </p>
                </div>
                <Badge className={`shrink-0 text-xs ${STATUS_COLOR[order.status] ?? "bg-gray-100"}`}>
                  {order.status.replace(/_/g, " ")}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {order.items.slice(0, 4).map((item: any) => (
                <div key={item.id} className="flex justify-between text-xs text-muted-foreground">
                  <span>{item.item.name} × {item.quantity} {item.item.unit}</span>
                  <span>{NGN(item.total)}</span>
                </div>
              ))}
              {order.items.length > 4 && (
                <p className="text-xs text-muted-foreground">+{order.items.length - 4} more items</p>
              )}
              <div className="flex justify-between border-t pt-2 text-sm font-semibold">
                <span>Total</span>
                <span>{NGN(order.invoice.total)}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
