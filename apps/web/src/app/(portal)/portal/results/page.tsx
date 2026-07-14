"use client";

import { useQuery } from "@tanstack/react-query";
import { FlaskConical, Loader2, AlertTriangle } from "lucide-react";
import { portalApi } from "@/lib/portal-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export default function PortalResultsPage() {
  const { data = [], isLoading } = useQuery<any[]>({
    queryKey: ["portal-lab-results"],
    queryFn: () => portalApi.get("/portal/lab-results").then((r) => r.data),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Lab Results</h1>
        <p className="text-sm text-muted-foreground">Your laboratory test history</p>
      </div>

      {isLoading && <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}

      <div className="space-y-4">
        {data.length === 0 && !isLoading && (
          <p className="text-sm text-muted-foreground">No lab results yet.</p>
        )}
        {data.map((order: any) => (
          <Card key={order.id}>
            <CardHeader className="pb-2 pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FlaskConical className="h-4 w-4 text-violet-600" />
                  <CardTitle className="text-sm font-semibold">{order.orderNumber}</CardTitle>
                </div>
                <Badge variant={order.status === "VERIFIED" ? "secondary" : "outline"} className="text-xs">
                  {order.status.replace(/_/g, " ")}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Ordered by Dr. {order.requestedBy?.firstName} {order.requestedBy?.lastName} · {formatDate(order.createdAt)}
              </p>
            </CardHeader>
            <CardContent>
              {order.results.length === 0 ? (
                <p className="text-xs text-muted-foreground">Results pending</p>
              ) : (
                <div className="divide-y">
                  {order.results.map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between py-2 text-sm">
                      <div className="flex items-center gap-2">
                        {r.isCritical && <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
                        {r.isAbnormal && !r.isCritical && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                        <span className="font-medium">{r.testName}</span>
                      </div>
                      <div className="text-right">
                        <span className={`font-semibold ${r.isCritical ? "text-red-600" : r.isAbnormal ? "text-amber-600" : "text-green-600"}`}>
                          {r.result} {r.unit}
                        </span>
                        {r.normalRange && (
                          <p className="text-[10px] text-muted-foreground">Normal: {r.normalRange}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
