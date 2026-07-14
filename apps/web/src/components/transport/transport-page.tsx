"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Ambulance, MapPin, CheckCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";

const AMBULANCE_STATUSES = ["AVAILABLE","DISPATCHED","AT_SCENE","EN_ROUTE","MAINTENANCE","OUT_OF_SERVICE"];
const TRANSPORT_TYPES = ["EMERGENCY","SCHEDULED","TRANSFER","DISCHARGE"];

function ambulanceStatusBadge(status: string) {
  const map: Record<string, string> = {
    AVAILABLE: "bg-green-100 text-green-800",
    DISPATCHED: "bg-blue-100 text-blue-800",
    AT_SCENE: "bg-purple-100 text-purple-800",
    EN_ROUTE: "bg-yellow-100 text-yellow-800",
    MAINTENANCE: "bg-orange-100 text-orange-800",
    OUT_OF_SERVICE: "bg-red-100 text-red-800",
  };
  return <Badge className={map[status] ?? "bg-gray-100 text-gray-800"}>{status.replace(/_/g, " ")}</Badge>;
}

function transportStatusBadge(status: string) {
  const map: Record<string, string> = {
    REQUESTED: "bg-gray-100 text-gray-800",
    ASSIGNED: "bg-blue-100 text-blue-800",
    DISPATCHED: "bg-indigo-100 text-indigo-800",
    AT_SCENE: "bg-purple-100 text-purple-800",
    EN_ROUTE_TO_HOSPITAL: "bg-yellow-100 text-yellow-800",
    COMPLETED: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-800",
  };
  return <Badge className={map[status] ?? "bg-gray-100 text-gray-800"}>{status.replace(/_/g, " ")}</Badge>;
}

function typeBadge(type: string) {
  const map: Record<string, string> = {
    EMERGENCY: "bg-red-100 text-red-800",
    SCHEDULED: "bg-blue-100 text-blue-800",
    TRANSFER: "bg-purple-100 text-purple-800",
    DISCHARGE: "bg-green-100 text-green-800",
  };
  return <Badge className={map[type] ?? "bg-gray-100 text-gray-800"}>{type}</Badge>;
}

function AddAmbulanceDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ plateNumber: "", vehicleType: "Basic", driverName: "", driverPhone: "", currentLocation: "" });

  const mutation = useMutation({
    mutationFn: (data: any) => api.post("/transport/ambulances", data).then((r) => r.data),
    onSuccess: () => { setOpen(false); onSuccess(); },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Plus className="mr-2 h-4 w-4" />Add Ambulance</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Register Ambulance</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Plate Number</Label>
              <Input value={form.plateNumber} onChange={(e) => setForm({ ...form, plateNumber: e.target.value })} placeholder="e.g. LAG-123AB" />
            </div>
            <div className="space-y-1">
              <Label>Vehicle Type</Label>
              <Select value={form.vehicleType} onValueChange={(v) => setForm({ ...form, vehicleType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Basic">Basic</SelectItem>
                  <SelectItem value="Advanced">Advanced (ALS)</SelectItem>
                  <SelectItem value="Neonatal">Neonatal</SelectItem>
                  <SelectItem value="Bariatric">Bariatric</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Driver Name</Label>
              <Input value={form.driverName} onChange={(e) => setForm({ ...form, driverName: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Driver Phone</Label>
              <Input value={form.driverPhone} onChange={(e) => setForm({ ...form, driverPhone: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Current Location</Label>
            <Input value={form.currentLocation} onChange={(e) => setForm({ ...form, currentLocation: e.target.value })} placeholder="e.g. Bay 1" />
          </div>
          <Button className="w-full" disabled={!form.plateNumber || mutation.isPending} onClick={() => mutation.mutate(form)}>
            {mutation.isPending ? "Adding..." : "Add Ambulance"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RequestTransportDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ patientId: "", type: "EMERGENCY", pickupLocation: "", destination: "", patientCondition: "", notes: "" });

  const mutation = useMutation({
    mutationFn: (data: typeof form) => api.post("/transport", {
      ...data,
      patientId: data.patientId || undefined,
      notes: data.notes || undefined,
      patientCondition: data.patientCondition || undefined,
    }).then((r) => r.data),
    onSuccess: () => { setOpen(false); onSuccess(); },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="mr-2 h-4 w-4" />Request Transport</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Transport Request</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Patient ID <span className="text-xs text-muted-foreground">(optional)</span></Label>
              <Input value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Transport Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TRANSPORT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Pickup Location</Label>
            <Input value={form.pickupLocation} onChange={(e) => setForm({ ...form, pickupLocation: e.target.value })} placeholder="e.g. Ward 3 / Street address" />
          </div>
          <div className="space-y-1">
            <Label>Destination</Label>
            <Input value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} placeholder="e.g. A&E / General Hospital" />
          </div>
          <div className="space-y-1">
            <Label>Patient Condition</Label>
            <Input value={form.patientCondition} onChange={(e) => setForm({ ...form, patientCondition: e.target.value })} placeholder="e.g. Stable, Critical" />
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
          </div>
          <Button className="w-full" disabled={!form.pickupLocation || !form.destination || mutation.isPending} onClick={() => mutation.mutate(form)}>
            {mutation.isPending ? "Requesting..." : "Submit Request"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TransportDetailSheet({ transport, ambulances, open, onClose, onRefresh }: { transport: any; ambulances: any[]; open: boolean; onClose: () => void; onRefresh: () => void }) {
  const [selectedAmb, setSelectedAmb] = useState("");
  const qc = useQueryClient();

  const dispatch = useMutation({
    mutationFn: () => api.patch(`/transport/${transport.id}/dispatch`, { ambulanceId: selectedAmb }).then((r) => r.data),
    onSuccess: () => { onRefresh(); qc.invalidateQueries({ queryKey: ["transport-summary"] }); },
  });

  const updateStatus = useMutation({
    mutationFn: (status: string) => api.patch(`/transport/${transport.id}/status`, { status }).then((r) => r.data),
    onSuccess: () => { onRefresh(); qc.invalidateQueries({ queryKey: ["transport-summary"] }); },
  });

  if (!transport) return null;

  const progressStatuses = ["AT_SCENE", "EN_ROUTE_TO_HOSPITAL", "COMPLETED"];
  const showProgress = ["DISPATCHED", "AT_SCENE", "EN_ROUTE_TO_HOSPITAL"].includes(transport.status);

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader><SheetTitle>{transport.transportNumber}</SheetTitle></SheetHeader>
        <div className="mt-4 space-y-4">
          <div className="flex gap-2">{typeBadge(transport.type)}{transportStatusBadge(transport.status)}</div>
          <div className="rounded-md bg-muted p-3 text-sm space-y-2">
            {transport.patient && <div className="flex gap-2"><span className="text-muted-foreground w-24">Patient</span><span>{transport.patient.firstName} {transport.patient.lastName}</span></div>}
            <div className="flex gap-2"><MapPin className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" /><span>{transport.pickupLocation} → {transport.destination}</span></div>
            {transport.patientCondition && <div className="flex gap-2"><span className="text-muted-foreground w-24">Condition</span><span>{transport.patientCondition}</span></div>}
            {transport.ambulance && <div className="flex gap-2"><span className="text-muted-foreground w-24">Ambulance</span><span>{transport.ambulance.vehicleNumber} ({transport.ambulance.plateNumber})</span></div>}
            {transport.ambulance?.driverName && <div className="flex gap-2"><span className="text-muted-foreground w-24">Driver</span><span>{transport.ambulance.driverName}</span></div>}
            <div className="flex gap-2"><span className="text-muted-foreground w-24">Requested</span><span>{format(new Date(transport.requestedAt), "dd MMM yyyy HH:mm")}</span></div>
            {transport.dispatchedAt && <div className="flex gap-2"><span className="text-muted-foreground w-24">Dispatched</span><span>{format(new Date(transport.dispatchedAt), "HH:mm")}</span></div>}
            {transport.arrivedAt && <div className="flex gap-2"><span className="text-muted-foreground w-24">At Scene</span><span>{format(new Date(transport.arrivedAt), "HH:mm")}</span></div>}
            {transport.completedAt && <div className="flex gap-2"><span className="text-muted-foreground w-24">Completed</span><span>{format(new Date(transport.completedAt), "HH:mm")}</span></div>}
          </div>

          {transport.status === "REQUESTED" && (
            <div className="space-y-2">
              <Label className="text-sm">Assign Ambulance</Label>
              <Select value={selectedAmb} onValueChange={setSelectedAmb}>
                <SelectTrigger><SelectValue placeholder="Select available ambulance" /></SelectTrigger>
                <SelectContent>
                  {ambulances.filter((a) => a.status === "AVAILABLE").map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.vehicleNumber} — {a.driverName ?? "No driver"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" disabled={!selectedAmb || dispatch.isPending} onClick={() => dispatch.mutate()}>
                Dispatch Ambulance
              </Button>
            </div>
          )}

          {showProgress && (
            <div className="flex gap-2 flex-wrap">
              {progressStatuses.map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={transport.status === s ? "default" : "outline"}
                  disabled={updateStatus.isPending}
                  onClick={() => updateStatus.mutate(s)}
                >
                  {s.replace(/_/g, " ")}
                </Button>
              ))}
            </div>
          )}
          {!["COMPLETED","CANCELLED"].includes(transport.status) && (
            <Button size="sm" variant="destructive" onClick={() => updateStatus.mutate("CANCELLED")} disabled={updateStatus.isPending}>Cancel</Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function TransportPage() {
  const qc = useQueryClient();
  const [transportStatusFilter, setTransportStatusFilter] = useState("ALL");
  const [selectedTransport, setSelectedTransport] = useState<any>(null);

  const { data: summary } = useQuery({
    queryKey: ["transport-summary"],
    queryFn: () => api.get("/transport/summary").then((r) => r.data),
    refetchInterval: 30_000,
  });

  const { data: ambulances = [], refetch: refetchAmbs } = useQuery({
    queryKey: ["ambulances"],
    queryFn: () => api.get("/transport/ambulances").then((r) => r.data),
    refetchInterval: 30_000,
  });

  const { data: transports = [], refetch: refetchTransports } = useQuery({
    queryKey: ["transports", transportStatusFilter],
    queryFn: () => api.get("/transport", { params: transportStatusFilter !== "ALL" ? { status: transportStatusFilter } : {} }).then((r) => r.data),
  });

  const updateAmbulanceStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/transport/ambulances/${id}/status`, { status }).then((r) => r.data),
    onSuccess: () => { refetchAmbs(); qc.invalidateQueries({ queryKey: ["transport-summary"] }); },
  });

  const invalidate = () => { refetchAmbs(); refetchTransports(); qc.invalidateQueries({ queryKey: ["transport-summary"] }); };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ambulance & Transport</h1>
          <p className="text-muted-foreground">Fleet management and patient transport dispatch</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <Ambulance className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summary?.availableAmbulances ?? 0}</div>
            <p className="text-xs text-muted-foreground">of {summary?.totalAmbulances ?? 0} total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Dispatches</CardTitle>
            <MapPin className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{summary?.activeTransports ?? 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Today Total</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{summary?.todayTotal ?? 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Emergencies Today</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-red-600">{summary?.emergency ?? 0}</div></CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transports">
        <TabsList>
          <TabsTrigger value="transports">Transport Requests</TabsTrigger>
          <TabsTrigger value="fleet">Fleet ({ambulances.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="transports" className="space-y-4">
          <div className="flex items-center gap-3">
            <Select value={transportStatusFilter} onValueChange={setTransportStatusFilter}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="REQUESTED">Requested</SelectItem>
                <SelectItem value="DISPATCHED">Dispatched</SelectItem>
                <SelectItem value="AT_SCENE">At Scene</SelectItem>
                <SelectItem value="EN_ROUTE_TO_HOSPITAL">En Route</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <div className="ml-auto">
              <RequestTransportDialog onSuccess={invalidate} />
            </div>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request #</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Pickup → Destination</TableHead>
                  <TableHead>Ambulance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transports.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No transport requests</TableCell></TableRow>
                )}
                {transports.map((t: any) => (
                  <TableRow key={t.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedTransport(t)}>
                    <TableCell className="font-mono text-xs">{t.transportNumber}</TableCell>
                    <TableCell>{typeBadge(t.type)}</TableCell>
                    <TableCell className="text-sm">{t.patient ? `${t.patient.firstName} ${t.patient.lastName}` : "—"}</TableCell>
                    <TableCell className="text-sm max-w-[200px]"><span className="truncate block">{t.pickupLocation} → {t.destination}</span></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t.ambulance?.vehicleNumber ?? "—"}</TableCell>
                    <TableCell>{transportStatusBadge(t.status)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{format(new Date(t.requestedAt), "dd MMM HH:mm")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="fleet" className="space-y-4">
          <div className="flex justify-end">
            <AddAmbulanceDialog onSuccess={invalidate} />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {ambulances.length === 0 && <p className="text-muted-foreground text-sm col-span-full text-center py-8">No ambulances registered</p>}
            {ambulances.map((a: any) => (
              <Card key={a.id} className={a.status === "AVAILABLE" ? "border-green-200 dark:border-green-900" : a.status === "OUT_OF_SERVICE" ? "border-red-200 dark:border-red-900" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{a.vehicleNumber}</CardTitle>
                    {ambulanceStatusBadge(a.status)}
                  </div>
                  <p className="text-xs text-muted-foreground">{a.plateNumber} · {a.vehicleType}</p>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {a.driverName && <div className="flex gap-1 text-muted-foreground text-xs"><span>Driver:</span><span className="text-foreground">{a.driverName}</span></div>}
                  {a.driverPhone && <div className="text-xs text-muted-foreground">{a.driverPhone}</div>}
                  {a.currentLocation && <div className="flex gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3 shrink-0 mt-0.5" /><span>{a.currentLocation}</span></div>}
                  <div className="flex gap-2 flex-wrap pt-1">
                    {a.status !== "AVAILABLE" && (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateAmbulanceStatus.mutate({ id: a.id, status: "AVAILABLE" })}>
                        Set Available
                      </Button>
                    )}
                    {a.status !== "MAINTENANCE" && a.status !== "OUT_OF_SERVICE" && (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateAmbulanceStatus.mutate({ id: a.id, status: "MAINTENANCE" })}>
                        Maintenance
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {selectedTransport && (
        <TransportDetailSheet
          transport={selectedTransport}
          ambulances={ambulances}
          open={!!selectedTransport}
          onClose={() => setSelectedTransport(null)}
          onRefresh={invalidate}
        />
      )}
    </div>
  );
}
