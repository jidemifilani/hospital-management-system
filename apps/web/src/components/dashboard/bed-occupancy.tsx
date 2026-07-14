"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api-client";

interface BedStats {
  ward: string;
  total: number;
  occupied: number;
  available: number;
}

export function BedOccupancy() {
  const { data = [], isError } = useQuery<BedStats[]>({
    queryKey: ["bed-occupancy"],
    queryFn: () => api.get("/dashboard/bed-occupancy").then((r) => r.data),
    refetchInterval: 60_000,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Bed Occupancy by Ward</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isError && <p className="text-sm text-destructive">Failed to load bed data.</p>}
        {!isError && data.length === 0 && (
          <p className="text-sm text-muted-foreground">No bed data available.</p>
        )}
        {data.map(({ ward, total, occupied }) => {
          const pct = total > 0 ? Math.round((occupied / total) * 100) : 0;
          return (
            <div key={ward} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{ward}</span>
                <span className="text-muted-foreground">
                  {occupied}/{total} ({pct}%)
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className={`h-full rounded-full transition-all ${
                    pct >= 90 ? "bg-destructive" : pct >= 75 ? "bg-amber-500" : "bg-primary"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}

      </CardContent>
    </Card>
  );
}
