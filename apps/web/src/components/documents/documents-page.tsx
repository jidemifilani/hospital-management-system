"use client";

import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FolderOpen, Loader2, Upload, Download, Trash2, History, Lock, FileText, Search,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const CATEGORIES = [
  "CONSENT_FORM", "LAB_RESULT", "RADIOLOGY_IMAGE", "REFERRAL_LETTER",
  "DISCHARGE_SUMMARY", "PRESCRIPTION", "ID_DOCUMENT", "INSURANCE_CARD",
  "CLAIM_SUPPORT", "INVOICE", "POLICY", "OTHER",
];

const pretty = (c: string) => c.replace(/_/g, " ").toLowerCase().replace(/^./, (m) => m.toUpperCase());

const sizeOf = (bytes: number) =>
  bytes < 1024 ? `${bytes} B`
    : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB`
      : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/**
 * Downloads through the API so the request carries the session token — the
 * files are not on a public path, and every fetch is permission-checked and
 * audited on the server.
 */
async function downloadDocument(id: string, fileName: string) {
  const res = await api.get(`/documents/${id}/download`, { responseType: "blob" });
  const url = URL.createObjectURL(res.data as Blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function UploadDialog({ supersedes, onClose }: { supersedes?: any; onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    title: supersedes ? `${supersedes.title} (new version)` : "",
    description: "",
    category: supersedes?.category ?? "OTHER",
    confidentiality: supersedes?.confidentiality ?? "NORMAL",
    patientId: supersedes?.patientId ?? "",
  });

  const { data: patients } = useQuery({
    queryKey: ["doc-patient-search", search],
    queryFn: async () => (await api.get("/patients", { params: { search, limit: 6 } })).data,
    enabled: search.length >= 2 && !supersedes,
  });

  const upload = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append("title", form.title);
      if (form.description) fd.append("description", form.description);
      fd.append("category", form.category);
      fd.append("confidentiality", form.confidentiality);
      if (form.patientId) fd.append("patientId", form.patientId);
      if (supersedes) fd.append("supersedesId", supersedes.id);
      fd.append("file", file!);

      // Content-Type must be cleared so the browser sets the multipart
      // boundary; the client defaults to JSON for everything else.
      return api.post("/documents", fd, { headers: { "Content-Type": undefined } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["documents-summary"] });
      toast({ title: supersedes ? "New version stored" : "Document stored" });
      onClose();
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const tooBig = file ? file.size > 25 * 1024 * 1024 : false;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{supersedes ? "Replace Document" : "Upload Document"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {supersedes && (
            <p className="rounded border bg-muted/40 p-2 text-xs text-muted-foreground">
              Replacing {supersedes.documentNumber} (v{supersedes.version}). The old file is kept,
              not overwritten.
            </p>
          )}

          <div className="space-y-1">
            <Label htmlFor="doc-file" className="text-xs">File *</Label>
            <Input id="doc-file" type="file" ref={fileRef}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            {file && (
              <p className={`text-xs ${tooBig ? "text-red-600" : "text-muted-foreground"}`}>
                {file.name} · {sizeOf(file.size)}
                {tooBig && " — over the 25MB limit"}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              PDF, images, DICOM, Word, Excel or text. Up to 25MB.
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="doc-title" className="text-xs">Title *</Label>
            <Input id="doc-title" value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{pretty(c)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Confidentiality</Label>
              <Select value={form.confidentiality}
                onValueChange={(v) => setForm({ ...form, confidentiality: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NORMAL">Normal</SelectItem>
                  <SelectItem value="RESTRICTED">Restricted</SelectItem>
                </SelectContent>
              </Select>
              {form.confidentiality === "RESTRICTED" && (
                <p className="text-xs text-amber-700">
                  Only staff with the restricted-records permission will see it.
                </p>
              )}
            </div>
          </div>

          {!supersedes && (
            <div className="space-y-1">
              <Label htmlFor="doc-patient" className="text-xs">Attach to patient</Label>
              <Input id="doc-patient" placeholder="Name or MRN" value={search}
                onChange={(e) => setSearch(e.target.value)} />
              {(patients?.data ?? []).length > 0 && (
                <div className="max-h-28 overflow-y-auto rounded border">
                  {patients.data.map((p: any) => (
                    <button key={p.id} type="button"
                      onClick={() => setForm({ ...form, patientId: p.id })}
                      className={`block w-full px-3 py-1.5 text-left text-sm hover:bg-accent ${
                        form.patientId === p.id ? "bg-primary/10 font-medium" : ""
                      }`}>
                      {p.firstName} {p.lastName} · {p.mrn}
                    </button>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Leave blank for a document that is not about one patient, such as a policy.
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!file || !form.title || tooBig || upload.isPending}
            onClick={() => upload.mutate()}>
            {upload.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Upload className="mr-2 h-4 w-4" /> Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VersionsDialog({ doc, onClose }: { doc: any; onClose: () => void }) {
  const { data: versions = [], isLoading } = useQuery({
    queryKey: ["doc-versions", doc.id],
    queryFn: async () => (await api.get(`/documents/${doc.id}/versions`)).data,
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Version History</DialogTitle></DialogHeader>
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {versions.map((v: any, i: number) => (
                <TableRow key={v.id}>
                  <TableCell className="text-sm">
                    v{v.version}
                    {i === 0 && <Badge className="ml-2 bg-emerald-100 text-emerald-700">current</Badge>}
                  </TableCell>
                  <TableCell className="text-xs">{v.fileName}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(v.createdAt).toLocaleDateString("en-NG")}
                    {v.uploadedBy && ` · ${v.uploadedBy.firstName} ${v.uploadedBy.lastName}`}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost"
                      onClick={() => downloadDocument(v.id, v.fileName)}>
                      <Download className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RemoveDialog({ doc, onClose }: { doc: any; onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [reason, setReason] = useState("");

  const remove = useMutation({
    mutationFn: () => api.delete(`/documents/${doc.id}`, { data: { reason } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["documents-summary"] });
      toast({ title: "Document removed", description: "It is hidden, not destroyed." });
      onClose();
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Remove Document</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {doc.title} will be hidden from the chart. Clinical records are never destroyed —
            one that informed someone&apos;s care has to stay producible.
          </p>
          <div className="space-y-1">
            <Label htmlFor="rm-reason" className="text-xs">Reason *</Label>
            <Input id="rm-reason" placeholder="e.g. Filed against the wrong patient"
              value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" disabled={!reason.trim() || remove.isPending}
            onClick={() => remove.mutate()}>
            {remove.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Remove
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DocumentsPage() {
  const [uploading, setUploading] = useState(false);
  const [replacing, setReplacing] = useState<any>(null);
  const [versioning, setVersioning] = useState<any>(null);
  const [removing, setRemoving] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["documents", search, category],
    queryFn: async () =>
      (await api.get("/documents", {
        params: {
          ...(search ? { search } : {}),
          ...(category !== "ALL" ? { category } : {}),
        },
      })).data,
  });

  const { data: summary } = useQuery({
    queryKey: ["documents-summary"],
    queryFn: async () => (await api.get("/documents/summary")).data,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <FolderOpen className="h-6 w-6" /> Documents
          </h1>
          <p className="text-sm text-muted-foreground">
            Consent forms, results, letters and scans. Every download is recorded.
          </p>
        </div>
        <Button onClick={() => setUploading(true)}>
          <Upload className="mr-2 h-4 w-4" /> Upload Document
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Stored", value: summary?.total ?? 0 },
          { label: "Total Size", value: sizeOf(summary?.totalBytes ?? 0) },
          { label: "Restricted", value: summary?.restricted ?? 0 },
          { label: "Removed", value: summary?.deleted ?? 0 },
        ].map((s) => (
          <Card key={s.label}>
            <CardHeader className="px-4 pb-1 pt-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">{s.label}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-2xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-wrap gap-3">
            <div className="relative min-w-[240px] flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input aria-label="Search documents" placeholder="Search by title, file or number"
                className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All categories</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{pretty(c)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead className="text-right">Size</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                      Nothing stored yet.
                    </TableCell>
                  </TableRow>
                )}
                {documents.map((d: any) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                        {d.title}
                        {d.confidentiality === "RESTRICTED" && (
                          <Badge className="bg-amber-100 text-amber-800">
                            <Lock className="mr-1 h-3 w-3" /> Restricted
                          </Badge>
                        )}
                        {d.version > 1 && (
                          <Badge variant="outline" className="text-[10px]">v{d.version}</Badge>
                        )}
                      </div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {d.documentNumber} · {d.fileName}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{pretty(d.category)}</TableCell>
                    <TableCell className="text-sm">
                      {d.patient
                        ? `${d.patient.firstName} ${d.patient.lastName}`
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {sizeOf(d.sizeBytes)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(d.createdAt).toLocaleDateString("en-NG")}
                      {d.uploadedBy && (
                        <div>{d.uploadedBy.firstName} {d.uploadedBy.lastName}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" title="Download"
                          onClick={() => downloadDocument(d.id, d.fileName)}>
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" title="Version history"
                          onClick={() => setVersioning(d)}>
                          <History className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" title="Replace with a new version"
                          onClick={() => setReplacing(d)}>
                          <Upload className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" title="Remove"
                          onClick={() => setRemoving(d)}>
                          <Trash2 className="h-3.5 w-3.5 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {uploading && <UploadDialog onClose={() => setUploading(false)} />}
      {replacing && <UploadDialog supersedes={replacing} onClose={() => setReplacing(null)} />}
      {versioning && <VersionsDialog doc={versioning} onClose={() => setVersioning(null)} />}
      {removing && <RemoveDialog doc={removing} onClose={() => setRemoving(null)} />}
    </div>
  );
}
