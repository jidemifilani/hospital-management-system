"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Search, Pill, AlertTriangle, CheckCircle2, Loader2, MoreHorizontal, Package } from "lucide-react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { useToast } from "@/components/ui/use-toast";
import { DrugCatalogue } from "./drug-catalogue";

interface Prescription {
  id: string; prescriptionNo: string; status: string; createdAt: string;
  patient: { firstName: string; lastName: string; mrn: string };
  prescribedBy: { firstName: string; lastName: string };
  _count: { items: number };
}

interface PrescriptionDetail extends Prescription {
  notes?: string;
  items: {
    id: string; dosage: string; frequency: string; duration: string;
    quantity: number; dispensedQty: number; instructions?: string;
    drugItem: { name: string; unit: string };
  }[];
}

interface DrugAlert {
  id: string; name: string; code: string; totalStock: number; reorderLevel: number; unit: string;
}

const STATUS_COLOR: Record<string, string> = {
  PENDING:             "bg-amber-100 text-amber-700",
  DISPENSING:          "bg-blue-100 text-blue-700",
  DISPENSED:           "bg-green-100 text-green-700",
  PARTIALLY_DISPENSED: "bg-purple-100 text-purple-700",
  CANCELLED:           "bg-gray-100 text-gray-600",
};

export function PharmacyDashboard() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<PrescriptionDetail | null>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: rxData, isLoading } = useQuery<{ data: Prescription[]; meta: { total: number } }>({
    queryKey: ["prescriptions", "PENDING"],
    queryFn: () => api.get("/pharmacy/prescriptions", { params: { status: "PENDING", limit: 50 } }).then((r) => r.data),
  });

  const { data: lowStock = [] } = useQuery<DrugAlert[]>({
    queryKey: ["low-stock"],
    queryFn: () => api.get("/pharmacy/drugs/low-stock").then((r) => r.data),
  });

  const loadDetail = async (id: string) => {
    const res = await api.get(`/pharmacy/prescriptions/${id}`);
    setSelected(res.data);
  };

  const dispense = useMutation({
    mutationFn: (id: string) => api.patch(`/pharmacy/prescriptions/${id}/dispense`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prescriptions"] });
      toast({ title: "Prescription dispensed" });
      setSelected(null);
    },
    onError: () => toast({ title: "Failed to dispense", variant: "destructive" }),
  });

  const pending = (rxData?.data ?? []).filter((r) =>
    search
      ? `${r.patient.firstName} ${r.patient.lastName} ${r.patient.mrn} ${r.prescriptionNo}`.toLowerCase().includes(search.toLowerCase())
      : true
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pharmacy</h1>
        <p className="text-sm text-muted-foreground">Prescription dispensing and drug inventory.</p>
      </div>

      {lowStock.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">{lowStock.length} drug{lowStock.length > 1 ? "s" : ""} at or below reorder level</p>
            <p className="mt-1">{lowStock.slice(0, 4).map((d) => `${d.name} (${d.totalStock} ${d.unit})`).join(", ")}{lowStock.length > 4 ? "…" : ""}</p>
          </div>
        </div>
      )}

      <Tabs defaultValue="prescriptions">
        <TabsList>
          <TabsTrigger value="prescriptions">Pending Prescriptions</TabsTrigger>
          <TabsTrigger value="catalogue"><Package className="mr-1 h-3.5 w-3.5 inline" />Drug Catalogue</TabsTrigger>
          <TabsTrigger value="inventory">Low Stock</TabsTrigger>
        </TabsList>

        <TabsContent value="prescriptions" className="mt-4 space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search patient or Rx no…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
          </div>

          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rx #</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Prescribed By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}><div className="h-4 animate-pulse rounded bg-muted" /></TableCell>
                      ))}</TableRow>
                    ))
                  : pending.length === 0
                  ? <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">No pending prescriptions.</TableCell></TableRow>
                  : pending.map((rx) => (
                      <TableRow key={rx.id} className="cursor-pointer hover:bg-muted/40" onClick={() => loadDetail(rx.id)}>
                        <TableCell className="font-mono text-sm">{rx.prescriptionNo}</TableCell>
                        <TableCell>
                          <p className="font-medium text-sm">{rx.patient.firstName} {rx.patient.lastName}</p>
                          <p className="text-xs text-muted-foreground">{rx.patient.mrn}</p>
                        </TableCell>
                        <TableCell className="text-sm">{rx._count.items} item{rx._count.items !== 1 ? "s" : ""}</TableCell>
                        <TableCell className="text-sm">{rx.prescribedBy.firstName} {rx.prescribedBy.lastName}</TableCell>
                        <TableCell><Badge className={STATUS_COLOR[rx.status] ?? "bg-gray-100"}>{rx.status}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{format(new Date(rx.createdAt), "dd MMM HH:mm")}</TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => dispense.mutate(rx.id)} disabled={rx.status !== "PENDING"}>
                                <CheckCircle2 className="mr-2 h-4 w-4" />Dispense
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="catalogue" className="mt-4">
          <DrugCatalogue />
        </TabsContent>

        <TabsContent value="inventory" className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {lowStock.length === 0 ? (
              <p className="col-span-3 py-10 text-center text-muted-foreground">All stock levels are adequate.</p>
            ) : lowStock.map((d) => (
              <Card key={d.id} className={`border-0 shadow-sm ${d.totalStock === 0 ? "border-l-4 border-l-red-500" : "border-l-4 border-l-amber-400"}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{d.name}</p>
                      <p className="text-xs text-muted-foreground">{d.code}</p>
                    </div>
                    <Badge className={d.totalStock === 0 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}>
                      {d.totalStock === 0 ? "OUT OF STOCK" : "LOW STOCK"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-2xl font-bold">{d.totalStock} <span className="text-sm font-normal text-muted-foreground">{d.unit}s remaining</span></p>
                  <p className="text-xs text-muted-foreground">Reorder at: {d.reorderLevel}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Prescription Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>Prescription — {selected.prescriptionNo}</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <Badge className={STATUS_COLOR[selected.status] ?? "bg-gray-100"}>{selected.status}</Badge>
                <div className="text-sm space-y-1">
                  <p><span className="text-muted-foreground">Patient: </span>{selected.patient.firstName} {selected.patient.lastName} ({selected.patient.mrn})</p>
                  <p><span className="text-muted-foreground">Prescribed by: </span>{selected.prescribedBy.firstName} {selected.prescribedBy.lastName}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Medications</p>
                  {selected.items.map((item) => (
                    <div key={item.id} className="rounded-lg border p-3 text-sm">
                      <p className="font-medium">{item.drugItem.name}</p>
                      <p className="text-muted-foreground">{item.dosage} — {item.frequency} for {item.duration}</p>
                      <p className="text-xs mt-1">Qty: {item.quantity} {item.drugItem.unit}{item.dispensedQty > 0 ? ` (${item.dispensedQty} dispensed)` : ""}</p>
                      {item.instructions && <p className="text-xs text-amber-700 mt-1">{item.instructions}</p>}
                    </div>
                  ))}
                </div>
                {selected.status === "PENDING" && (
                  <Button className="w-full" onClick={() => dispense.mutate(selected.id)} disabled={dispense.isPending}>
                    {dispense.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Dispense All Items
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
