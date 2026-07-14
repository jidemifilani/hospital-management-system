"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Building2, Users, Bed, CalendarDays, Plus, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { api } from "@/lib/api-client";

interface Department {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  _count: { staff: number; appointments: number; beds: number };
}

function CreateDepartmentDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      api.post("/departments", {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description.trim() || undefined,
      }).then((r) => r.data),
    onSuccess: () => {
      setOpen(false);
      setName("");
      setCode("");
      setDescription("");
      onSuccess();
      toast.success("Department created successfully");
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })
        ?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg.join(", ") : (msg ?? "Failed to create department"));
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          New Department
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Create Department</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1">
            <Label htmlFor="dept-name">Name <span className="text-destructive">*</span></Label>
            <Input
              id="dept-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Cardiology"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="dept-code">Code <span className="text-destructive">*</span></Label>
            <Input
              id="dept-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. CARD"
              maxLength={10}
            />
            <p className="text-xs text-muted-foreground">Short unique identifier (auto-uppercased)</p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="dept-desc">Description</Label>
            <Textarea
              id="dept-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Optional description…"
            />
          </div>
          <Button
            className="w-full"
            disabled={!name.trim() || !code.trim() || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Department
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function DepartmentsGrid() {
  const qc = useQueryClient();
  const { data: departments = [], isLoading } = useQuery<Department[]>({
    queryKey: ["departments"],
    queryFn: () => api.get("/departments").then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <div className="h-9 w-36 animate-pulse rounded-md bg-muted" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <CreateDepartmentDialog onSuccess={() => qc.invalidateQueries({ queryKey: ["departments"] })} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {departments.length === 0 && (
          <p className="col-span-full py-12 text-center text-muted-foreground">
            No departments yet. Click "New Department" to add one.
          </p>
        )}
        {departments.map((dept) => (
          <Link key={dept.id} href={`/departments/${dept.id}`}>
            <Card className="h-full cursor-pointer transition-shadow hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{dept.name}</CardTitle>
                      <p className="text-xs font-mono text-muted-foreground">{dept.code}</p>
                    </div>
                  </div>
                  <Badge variant={dept.isActive ? "success" : "secondary"}>
                    {dept.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {dept.description && (
                  <p className="mb-3 text-sm text-muted-foreground line-clamp-2">
                    {dept.description}
                  </p>
                )}
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {dept._count.staff} staff
                  </span>
                  <span className="flex items-center gap-1">
                    <Bed className="h-3.5 w-3.5" />
                    {dept._count.beds} beds
                  </span>
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {dept._count.appointments}
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
