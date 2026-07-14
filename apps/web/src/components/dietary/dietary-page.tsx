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
import { Textarea } from "@/components/ui/textarea";
import { Plus, Utensils, ClipboardList, CheckCircle } from "lucide-react";
import { format } from "date-fns";

const DIET_TYPES = ["REGULAR", "DIABETIC", "LOW_SODIUM", "LOW_FAT", "VEGETARIAN", "VEGAN", "SOFT", "LIQUID", "NPO", "HIGH_PROTEIN", "RENAL"];
const MEAL_TYPES = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"];

function statusBadge(status: string) {
  const map: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-800",
    COMPLETED: "bg-blue-100 text-blue-800",
    CANCELLED: "bg-red-100 text-red-800",
  };
  return <Badge className={map[status] ?? "bg-gray-100 text-gray-800"}>{status}</Badge>;
}

function dietBadge(diet: string) {
  const color = diet === "NPO" ? "bg-red-100 text-red-800" : diet === "LIQUID" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800";
  return <Badge className={color}>{diet.replace(/_/g, " ")}</Badge>;
}

function CreateOrderDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    patientId: "", dietType: "REGULAR", startDate: "", endDate: "", allergies: "", instructions: "",
  });

  const mutation = useMutation({
    mutationFn: (data: any) => api.post("/dietary/orders", data).then((r) => r.data),
    onSuccess: () => { setOpen(false); onSuccess(); },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="mr-2 h-4 w-4" />New Diet Order</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create Diet Order</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1">
            <Label>Patient ID</Label>
            <Input value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Diet Type</Label>
            <Select value={form.dietType} onValueChange={(v) => setForm({ ...form, dietType: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{DIET_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Start Date</Label>
              <Input value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} type="date" />
            </div>
            <div className="space-y-1">
              <Label>End Date</Label>
              <Input value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} type="date" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Allergies / Contraindications</Label>
            <Input value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} placeholder="e.g. Peanuts, Lactose" />
          </div>
          <div className="space-y-1">
            <Label>Special Instructions</Label>
            <Textarea value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} rows={2} />
          </div>
          <Button
            className="w-full"
            disabled={!form.patientId || mutation.isPending}
            onClick={() => mutation.mutate(form)}
          >
            {mutation.isPending ? "Creating..." : "Create Order"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RecordMealDialog({ orders, onSuccess }: { orders: any[]; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ dietOrderId: "", mealType: "BREAKFAST", served: true, consumed: false, notes: "" });

  const mutation = useMutation({
    mutationFn: (data: any) => api.post("/dietary/meals", data).then((r) => r.data),
    onSuccess: () => { setOpen(false); onSuccess(); },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><CheckCircle className="mr-2 h-4 w-4" />Record Meal</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Record Meal</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1">
            <Label>Diet Order</Label>
            <Select value={form.dietOrderId} onValueChange={(v) => setForm({ ...form, dietOrderId: v })}>
              <SelectTrigger><SelectValue placeholder="Select order" /></SelectTrigger>
              <SelectContent>
                {orders.filter((o) => o.status === "ACTIVE").map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.patient ? `${o.patient.firstName} ${o.patient.lastName}` : "—"} — {o.dietType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Meal Type</Label>
            <Select value={form.mealType} onValueChange={(v) => setForm({ ...form, mealType: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{MEAL_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.served} onChange={(e) => setForm({ ...form, served: e.target.checked })} className="rounded" />
              Served
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.consumed} onChange={(e) => setForm({ ...form, consumed: e.target.checked })} className="rounded" />
              Consumed
            </label>
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="e.g. Patient refused dinner" />
          </div>
          <Button
            className="w-full"
            disabled={!form.dietOrderId || mutation.isPending}
            onClick={() => mutation.mutate(form)}
          >
            {mutation.isPending ? "Recording..." : "Record Meal"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function DietaryPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("ACTIVE");

  const { data: summary } = useQuery({
    queryKey: ["dietary-summary"],
    queryFn: () => api.get("/dietary/orders/summary").then((r) => r.data),
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["diet-orders", statusFilter],
    queryFn: () => api.get("/dietary/orders", { params: statusFilter !== "ALL" ? { status: statusFilter } : {} }).then((r) => r.data),
  });

  const { data: todayMeals = [] } = useQuery({
    queryKey: ["meals-today"],
    queryFn: () => api.get("/dietary/meals/today").then((r) => r.data),
  });

  const cancelOrder = useMutation({
    mutationFn: (id: string) => api.patch(`/dietary/orders/${id}/status`, { status: "CANCELLED" }).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["diet-orders"] }); qc.invalidateQueries({ queryKey: ["dietary-summary"] }); },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["diet-orders"] });
    qc.invalidateQueries({ queryKey: ["dietary-summary"] });
    qc.invalidateQueries({ queryKey: ["meals-today"] });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dietary & Nutrition</h1>
          <p className="text-muted-foreground">Patient diet orders and meal tracking</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Diet Orders</CardTitle>
            <ClipboardList className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{summary?.active ?? 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Meals Served Today</CardTitle>
            <Utensils className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{summary?.mealsServedToday ?? 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{summary?.total ?? 0}</div></CardContent>
        </Card>
      </div>

      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="orders">Diet Orders</TabsTrigger>
          <TabsTrigger value="meals">Today&apos;s Meals</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-4">
          <div className="flex items-center justify-between">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <RecordMealDialog orders={orders} onSuccess={invalidate} />
              <CreateOrderDialog onSuccess={invalidate} />
            </div>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Diet Type</TableHead>
                  <TableHead>Allergies</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No diet orders found</TableCell></TableRow>
                )}
                {orders.map((o: any) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">{o.orderNumber}</TableCell>
                    <TableCell>{o.patient ? `${o.patient.firstName} ${o.patient.lastName}` : "—"}</TableCell>
                    <TableCell>{dietBadge(o.dietType)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{o.allergies ?? "None"}</TableCell>
                    <TableCell className="text-sm">{format(new Date(o.startDate), "dd MMM yyyy")}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{o.endDate ? format(new Date(o.endDate), "dd MMM yyyy") : "—"}</TableCell>
                    <TableCell>{statusBadge(o.status)}</TableCell>
                    <TableCell>
                      {o.status === "ACTIVE" && (
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-red-600 text-xs" onClick={() => cancelOrder.mutate(o.id)}>Cancel</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="meals" className="space-y-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Diet</TableHead>
                  <TableHead>Meal</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Served</TableHead>
                  <TableHead>Consumed</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {todayMeals.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No meals recorded today</TableCell></TableRow>
                )}
                {todayMeals.map((m: any) => (
                  <TableRow key={m.id}>
                    <TableCell>{m.dietOrder?.patient ? `${m.dietOrder.patient.firstName} ${m.dietOrder.patient.lastName}` : "—"}</TableCell>
                    <TableCell>{m.dietOrder ? dietBadge(m.dietOrder.dietType) : "—"}</TableCell>
                    <TableCell>{m.mealType}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{format(new Date(m.date), "HH:mm")}</TableCell>
                    <TableCell>{m.served ? <Badge className="bg-green-100 text-green-800">Yes</Badge> : <Badge className="bg-gray-100 text-gray-800">No</Badge>}</TableCell>
                    <TableCell>{m.consumed ? <Badge className="bg-green-100 text-green-800">Yes</Badge> : <Badge className="bg-yellow-100 text-yellow-800">No</Badge>}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{m.notes ?? "—"}</TableCell>
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
