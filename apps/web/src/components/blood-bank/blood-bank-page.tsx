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
import { Droplets, Plus, AlertTriangle, Users, ClipboardList } from "lucide-react";
import { format } from "date-fns";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

function statusBadge(status: string) {
  const map: Record<string, string> = {
    AVAILABLE: "bg-green-100 text-green-800",
    ISSUED: "bg-blue-100 text-blue-800",
    EXPIRED: "bg-red-100 text-red-800",
    DISCARDED: "bg-gray-100 text-gray-800",
    QUARANTINED: "bg-yellow-100 text-yellow-800",
    PENDING: "bg-yellow-100 text-yellow-800",
    CROSSMATCHED: "bg-blue-100 text-blue-800",
    APPROVED: "bg-green-100 text-green-800",
    REJECTED: "bg-red-100 text-red-800",
  };
  return (
    <Badge className={map[status] ?? "bg-gray-100 text-gray-800"}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

function AddUnitDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    bloodGroup: "", expiresAt: "", volume: "450", donorName: "", notes: "",
  });

  const mutation = useMutation({
    mutationFn: (data: any) => api.post("/blood-bank/inventory", data).then((r) => r.data),
    onSuccess: () => { setOpen(false); onSuccess(); },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="mr-2 h-4 w-4" />Add Unit</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Blood Unit</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1">
            <Label>Blood Group</Label>
            <Select value={form.bloodGroup} onValueChange={(v) => setForm({ ...form, bloodGroup: v })}>
              <SelectTrigger><SelectValue placeholder="Select group" /></SelectTrigger>
              <SelectContent>{BLOOD_GROUPS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Volume (mL)</Label>
            <Input value={form.volume} onChange={(e) => setForm({ ...form, volume: e.target.value })} type="number" />
          </div>
          <div className="space-y-1">
            <Label>Expiry Date</Label>
            <Input value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} type="date" />
          </div>
          <div className="space-y-1">
            <Label>Donor Name (optional)</Label>
            <Input value={form.donorName} onChange={(e) => setForm({ ...form, donorName: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <Button
            className="w-full"
            disabled={!form.bloodGroup || !form.expiresAt || mutation.isPending}
            onClick={() => mutation.mutate({ ...form, volume: Number(form.volume) })}
          >
            {mutation.isPending ? "Adding..." : "Add Unit"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddDonorDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", bloodGroup: "", phone: "", email: "", dateOfBirth: "" });

  const mutation = useMutation({
    mutationFn: (data: any) => api.post("/blood-bank/donors", data).then((r) => r.data),
    onSuccess: () => { setOpen(false); onSuccess(); },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="mr-2 h-4 w-4" />Add Donor</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Register Donor</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>First Name</Label>
              <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Last Name</Label>
              <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Blood Group</Label>
            <Select value={form.bloodGroup} onValueChange={(v) => setForm({ ...form, bloodGroup: v })}>
              <SelectTrigger><SelectValue placeholder="Select group" /></SelectTrigger>
              <SelectContent>{BLOOD_GROUPS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Date of Birth</Label>
            <Input value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} type="date" />
          </div>
          <Button
            className="w-full"
            disabled={!form.firstName || !form.lastName || !form.bloodGroup || mutation.isPending}
            onClick={() => mutation.mutate(form)}
          >
            {mutation.isPending ? "Registering..." : "Register Donor"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreateRequestDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ patientId: "", bloodGroup: "", units: "1", urgency: "ROUTINE", notes: "" });

  const mutation = useMutation({
    mutationFn: (data: any) => api.post("/blood-bank/requests", data).then((r) => r.data),
    onSuccess: () => { setOpen(false); onSuccess(); },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="mr-2 h-4 w-4" />New Request</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Blood Request</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1">
            <Label>Patient ID</Label>
            <Input value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })} placeholder="Patient ID" />
          </div>
          <div className="space-y-1">
            <Label>Blood Group</Label>
            <Select value={form.bloodGroup} onValueChange={(v) => setForm({ ...form, bloodGroup: v })}>
              <SelectTrigger><SelectValue placeholder="Select group" /></SelectTrigger>
              <SelectContent>{BLOOD_GROUPS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Units Required</Label>
            <Input value={form.units} onChange={(e) => setForm({ ...form, units: e.target.value })} type="number" min="1" />
          </div>
          <div className="space-y-1">
            <Label>Urgency</Label>
            <Select value={form.urgency} onValueChange={(v) => setForm({ ...form, urgency: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ROUTINE">Routine</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
                <SelectItem value="EMERGENCY">Emergency</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <Button
            className="w-full"
            disabled={!form.patientId || !form.bloodGroup || mutation.isPending}
            onClick={() => mutation.mutate({ ...form, units: Number(form.units) })}
          >
            {mutation.isPending ? "Submitting..." : "Submit Request"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function BloodBankPage() {
  const qc = useQueryClient();
  const [inventoryFilter, setInventoryFilter] = useState("ALL");

  const { data: summary } = useQuery({
    queryKey: ["blood-bank-summary"],
    queryFn: () => api.get("/blood-bank/inventory/summary").then((r) => r.data),
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ["blood-bank-inventory", inventoryFilter],
    queryFn: () => api.get("/blood-bank/inventory", { params: inventoryFilter !== "ALL" ? { bloodGroup: inventoryFilter } : {} }).then((r) => r.data),
  });

  const { data: donors = [] } = useQuery({
    queryKey: ["blood-bank-donors"],
    queryFn: () => api.get("/blood-bank/donors").then((r) => r.data),
  });

  const { data: requests = [] } = useQuery({
    queryKey: ["blood-bank-requests"],
    queryFn: () => api.get("/blood-bank/requests").then((r) => r.data),
  });

  const discard = useMutation({
    mutationFn: (id: string) => api.patch(`/blood-bank/inventory/${id}/discard`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["blood-bank-inventory"] }),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["blood-bank-inventory"] });
    qc.invalidateQueries({ queryKey: ["blood-bank-summary"] });
    qc.invalidateQueries({ queryKey: ["blood-bank-donors"] });
    qc.invalidateQueries({ queryKey: ["blood-bank-requests"] });
  };

  const byGroup: Record<string, { available: number }> = summary?.byGroup ?? {};
  const totalAvailable = Object.values(byGroup).reduce((s: number, g: any) => s + (g.available ?? 0), 0);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Blood Bank</h1>
          <p className="text-muted-foreground">Inventory, donors and transfusion requests</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Available</CardTitle>
            <Droplets className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{totalAvailable}</div><p className="text-xs text-muted-foreground">units ready</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-yellow-600">{summary?.expiringSoon ?? 0}</div><p className="text-xs text-muted-foreground">within 7 days</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Donors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{donors.length}</div><p className="text-xs text-muted-foreground">registered</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requests.filter((r: any) => r.status === "PENDING").length}</div>
            <p className="text-xs text-muted-foreground">awaiting processing</p>
          </CardContent>
        </Card>
      </div>

      {/* Blood Group Summary */}
      {Object.keys(byGroup).length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Stock by Blood Group</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {BLOOD_GROUPS.map((g) => (
                <div key={g} className="flex flex-col items-center rounded-lg border p-3 min-w-[60px]">
                  <span className="font-bold text-red-600">{g}</span>
                  <span className="text-xl font-bold">{byGroup[g]?.available ?? 0}</span>
                  <span className="text-xs text-muted-foreground">units</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="inventory">
        <TabsList>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="donors">Donors</TabsTrigger>
          <TabsTrigger value="requests">Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          <div className="flex items-center justify-between">
            <Select value={inventoryFilter} onValueChange={setInventoryFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Groups</SelectItem>
                {BLOOD_GROUPS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
            <AddUnitDialog onSuccess={invalidate} />
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unit #</TableHead>
                  <TableHead>Blood Group</TableHead>
                  <TableHead>Volume</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Donor</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventory.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No units found</TableCell></TableRow>
                )}
                {inventory.map((u: any) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-mono text-xs">{u.unitNumber}</TableCell>
                    <TableCell><span className="font-bold text-red-600">{u.bloodGroup}</span></TableCell>
                    <TableCell>{u.volume} mL</TableCell>
                    <TableCell>{statusBadge(u.status)}</TableCell>
                    <TableCell>{u.expiresAt ? format(new Date(u.expiresAt), "dd MMM yyyy") : "—"}</TableCell>
                    <TableCell>{u.donor ? `${u.donor.firstName} ${u.donor.lastName}` : "—"}</TableCell>
                    <TableCell>
                      {u.status === "AVAILABLE" && (
                        <Button size="sm" variant="ghost" className="text-red-600 h-7 px-2" onClick={() => discard.mutate(u.id)}>
                          Discard
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="donors" className="space-y-4">
          <div className="flex justify-end">
            <AddDonorDialog onSuccess={invalidate} />
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Donor #</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Blood Group</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Last Donation</TableHead>
                  <TableHead>Eligible</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {donors.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No donors registered</TableCell></TableRow>
                )}
                {donors.map((d: any) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-mono text-xs">{d.donorNumber}</TableCell>
                    <TableCell>{d.firstName} {d.lastName}</TableCell>
                    <TableCell><span className="font-bold text-red-600">{d.bloodGroup}</span></TableCell>
                    <TableCell>{d.phone ?? "—"}</TableCell>
                    <TableCell>{d.lastDonationDate ? format(new Date(d.lastDonationDate), "dd MMM yyyy") : "Never"}</TableCell>
                    <TableCell>{d.isEligible ? <Badge className="bg-green-100 text-green-800">Eligible</Badge> : <Badge className="bg-red-100 text-red-800">Ineligible</Badge>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          <div className="flex justify-end">
            <CreateRequestDialog onSuccess={invalidate} />
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request #</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Blood Group</TableHead>
                  <TableHead>Units</TableHead>
                  <TableHead>Urgency</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No requests</TableCell></TableRow>
                )}
                {requests.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.requestNumber}</TableCell>
                    <TableCell>{r.patient ? `${r.patient.firstName} ${r.patient.lastName}` : "—"}</TableCell>
                    <TableCell><span className="font-bold text-red-600">{r.bloodGroup}</span></TableCell>
                    <TableCell>{r.units}</TableCell>
                    <TableCell>
                      <Badge className={r.urgency === "EMERGENCY" ? "bg-red-100 text-red-800" : r.urgency === "URGENT" ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-800"}>
                        {r.urgency}
                      </Badge>
                    </TableCell>
                    <TableCell>{statusBadge(r.status)}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{format(new Date(r.createdAt), "dd MMM yyyy")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
