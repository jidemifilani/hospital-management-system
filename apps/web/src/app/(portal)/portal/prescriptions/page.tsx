"use client";

import { useQuery } from "@tanstack/react-query";
import { Pill, Loader2, CheckCircle2 } from "lucide-react";
import { portalApi } from "@/lib/portal-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  DISPENSED: "bg-green-100 text-green-700",
  CANCELLED: "bg-gray-100 text-gray-600",
};

export default function PortalPrescriptionsPage() {
  const { data = [], isLoading } = useQuery<any[]>({
    queryKey: ["portal-prescriptions"],
    queryFn: () => portalApi.get("/portal/prescriptions").then((r) => r.data),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Prescriptions</h1>
        <p className="text-sm text-muted-foreground">Your medication history</p>
      </div>

      {isLoading && <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}

      <div className="space-y-4">
        {data.length === 0 && !isLoading && (
          <p className="text-sm text-muted-foreground">No prescriptions found.</p>
        )}
        {data.map((rx: any) => (
          <Card key={rx.id}>
            <CardHeader className="pb-2 pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Pill className="h-4 w-4 text-green-600" />
                  <CardTitle className="text-sm">{rx.prescriptionNo}</CardTitle>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLOR[rx.status] ?? "bg-gray-100 text-gray-600"}`}>
                  {rx.status}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Dr. {rx.prescribedBy?.firstName} {rx.prescribedBy?.lastName} · {formatDate(rx.createdAt)}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {rx.items.map((item: any) => (
                  <div key={item.id} className="rounded-lg bg-muted/50 p-3">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{item.drugItem?.name}</p>
                      {item.dispensedQty > 0 && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.dosage} · {item.frequency} · {item.duration}
                    </p>
                    {item.instructions && (
                      <p className="text-xs text-muted-foreground italic mt-0.5">{item.instructions}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
