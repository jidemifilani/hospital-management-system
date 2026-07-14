"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  User, Phone, Mail, MapPin, Heart, FlaskConical, FileText,
  Stethoscope, CalendarDays, CreditCard, Pill, AlertTriangle,
  CheckCircle2, Clock, Plus, ArrowLeft, Activity, FileDown, Receipt,
} from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { VitalsForm } from "./vitals-form";
import { ClinicalNoteForm } from "./clinical-note-form";
import { DiagnosisForm } from "./diagnosis-form";

// ── Types ──────────────────────────────────────────────────────────────────────
interface VitalSigns {
  id: string; recordedAt: string;
  temperature?: number; systolicBP?: number; diastolicBP?: number;
  heartRate?: number; respiratoryRate?: number; oxygenSaturation?: number;
  weight?: number; height?: number; bmi?: number; bloodGlucose?: number; pain?: number;
  recordedBy: { firstName: string; lastName: string };
}

interface ClinicalNote {
  id: string; noteType: string; createdAt: string; isDraft: boolean;
  subjective?: string; objective?: string; assessment?: string; plan?: string; content?: string;
  author: { firstName: string; lastName: string; specialization?: string };
}

interface Diagnosis {
  id: string; description: string; icdCode?: string;
  diagnosisType: string; status: string; diagnosedAt: string;
  diagnosedBy: { firstName: string; lastName: string };
}

interface Appointment {
  id: string; scheduledAt: string; type: string; status: string;
  doctor: { firstName: string; lastName: string; specialization?: string };
  department: { name: string };
}

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "bg-red-100 text-red-700",
  RESOLVED: "bg-green-100 text-green-700",
  CHRONIC: "bg-amber-100 text-amber-700",
  RULED_OUT: "bg-gray-100 text-gray-600",
};

const APPT_COLOR: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
};

// ── Component ─────────────────────────────────────────────────────────────────
export function PatientDetail({ patientId }: { patientId: string }) {
  const [showVitalsForm, setShowVitalsForm] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [showDxForm, setShowDxForm] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: summary, isLoading } = useQuery({
    queryKey: ["patient-summary", patientId],
    queryFn: () => api.get(`/emr/patients/${patientId}/summary`).then((r) => r.data),
  });

  const { data: vitals = [] } = useQuery<VitalSigns[]>({
    queryKey: ["patient-vitals", patientId],
    queryFn: () => api.get(`/emr/patients/${patientId}/vitals`, { params: { limit: 20 } }).then((r) => r.data),
    enabled: !!summary,
  });

  const { data: notes = [] } = useQuery<ClinicalNote[]>({
    queryKey: ["patient-notes", patientId],
    queryFn: () => api.get(`/emr/patients/${patientId}/notes`).then((r) => r.data),
    enabled: !!summary,
  });

  const { data: diagnoses = [] } = useQuery<Diagnosis[]>({
    queryKey: ["patient-diagnoses", patientId],
    queryFn: () => api.get(`/emr/patients/${patientId}/diagnoses`).then((r) => r.data),
    enabled: !!summary,
  });

  const { data: invoices = [] } = useQuery<any[]>({
    queryKey: ["patient-invoices", patientId],
    queryFn: () =>
      api.get("/billing/invoices", { params: { patientId, limit: 20 } }).then((r) => r.data.data ?? []),
    enabled: !!summary,
  });

  const resolveDx = useMutation({
    mutationFn: (id: string) =>
      api.patch(`/emr/diagnoses/${id}`, { status: "RESOLVED", resolvedAt: new Date().toISOString() }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["patient-diagnoses"] }); toast({ title: "Diagnosis resolved" }); },
  });

  if (isLoading) return (
    <div className="flex h-64 items-center justify-center text-muted-foreground">
      <Activity className="mr-2 h-5 w-5 animate-pulse" /> Loading EMR…
    </div>
  );
  if (!summary) return <div className="p-8 text-center text-muted-foreground">Patient not found.</div>;

  const { patient, latestVitals, activeDiagnoses, recentNotes } = summary;
  const appointments: Appointment[] = patient.appointments ?? [];

  function invalidateAll() {
    qc.invalidateQueries({ queryKey: ["patient-summary", patientId] });
    qc.invalidateQueries({ queryKey: ["patient-vitals", patientId] });
    qc.invalidateQueries({ queryKey: ["patient-notes", patientId] });
    qc.invalidateQueries({ queryKey: ["patient-diagnoses", patientId] });
  }

  async function generateDischargeSummary() {
    setGeneratingPdf(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      const today = new Date().toLocaleDateString("en-NG");
      const age = new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear();

      let y = 20;
      const lm = 14;
      const rw = 182;

      // Header
      doc.setFontSize(18).setFont("helvetica", "bold");
      doc.text("DISCHARGE SUMMARY", 105, y, { align: "center" }); y += 6;
      doc.setFontSize(10).setFont("helvetica", "normal").setTextColor(100);
      doc.text("CareSync Hospital Management System", 105, y, { align: "center" }); y += 4;
      doc.text(`Generated: ${today}`, 105, y, { align: "center" }); y += 10;
      doc.setTextColor(0);

      // Patient info box
      doc.setDrawColor(200).rect(lm, y, rw, 28, "S");
      doc.setFontSize(11).setFont("helvetica", "bold");
      doc.text("PATIENT INFORMATION", lm + 3, y + 7);
      doc.setFontSize(9).setFont("helvetica", "normal");
      doc.text(`Name: ${patient.firstName} ${patient.lastName}`, lm + 3, y + 14);
      doc.text(`MRN: ${patient.mrn}`, lm + 3, y + 20);
      doc.text(`DOB: ${format(new Date(patient.dateOfBirth), "dd MMM yyyy")} (${age} yrs)`, lm + 3, y + 26);
      doc.text(`Gender: ${patient.gender}`, lm + 95, y + 14);
      doc.text(`Blood Group: ${patient.bloodGroup ?? "Unknown"}`, lm + 95, y + 20);
      doc.text(`Phone: ${patient.phone ?? "—"}`, lm + 95, y + 26);
      y += 34;

      // Diagnoses
      if (diagnoses.length > 0) {
        doc.setFontSize(11).setFont("helvetica", "bold");
        doc.text("DIAGNOSES", lm, y); y += 5;
        doc.setFontSize(9).setFont("helvetica", "normal");
        diagnoses.forEach((dx) => {
          doc.text(`• ${dx.description}${dx.icdCode ? ` (${dx.icdCode})` : ""} — ${dx.status}`, lm + 3, y);
          y += 5;
        });
        y += 4;
      }

      // Latest vitals
      if (latestVitals) {
        doc.setFontSize(11).setFont("helvetica", "bold");
        doc.text("LATEST VITAL SIGNS", lm, y); y += 5;
        doc.setFontSize(9).setFont("helvetica", "normal");
        if (latestVitals.systolicBP) doc.text(`BP: ${latestVitals.systolicBP}/${latestVitals.diastolicBP} mmHg`, lm + 3, y);
        if (latestVitals.heartRate) doc.text(`HR: ${latestVitals.heartRate} bpm`, lm + 55, y);
        if (latestVitals.temperature) doc.text(`Temp: ${latestVitals.temperature}°C`, lm + 100, y);
        y += 5;
        if (latestVitals.oxygenSaturation) doc.text(`SpO₂: ${latestVitals.oxygenSaturation}%`, lm + 3, y);
        if (latestVitals.weight) doc.text(`Weight: ${latestVitals.weight} kg`, lm + 55, y);
        y += 9;
      }

      // Discharge notes
      const dischargeNotes = notes.filter((n) => n.noteType === "DISCHARGE");
      if (dischargeNotes.length > 0) {
        doc.setFontSize(11).setFont("helvetica", "bold");
        doc.text("DISCHARGE NOTES", lm, y); y += 5;
        doc.setFontSize(9).setFont("helvetica", "normal");
        dischargeNotes.slice(0, 2).forEach((n) => {
          if (n.plan) {
            const lines = doc.splitTextToSize(`Plan: ${n.plan}`, rw - 6);
            doc.text(lines, lm + 3, y);
            y += lines.length * 5;
          }
        });
        y += 4;
      }

      // Footer
      doc.setFontSize(8).setTextColor(130);
      doc.text("This document was auto-generated from CareSync HMS and is for clinical reference only.", lm, 285);

      doc.save(`discharge-summary-${patient.mrn}-${today.replace(/\//g, "-")}.pdf`);
      toast({ title: "Discharge summary downloaded" });
    } catch {
      toast({ title: "Failed to generate PDF", variant: "destructive" });
    } finally {
      setGeneratingPdf(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/patients"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
            {patient.firstName[0]}{patient.lastName[0]}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{patient.firstName} {patient.lastName}</h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="font-mono">{patient.mrn}</span>
              <span>·</span>
              <span>{patient.gender}</span>
              <span>·</span>
              <span>{format(new Date(patient.dateOfBirth), "dd MMM yyyy")} ({new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()} yrs)</span>
              {patient.bloodGroup && <><span>·</span><Badge variant="outline" className="text-xs">{patient.bloodGroup}</Badge></>}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" asChild>
            <a href={`/print/discharge/${patientId}`} target="_blank" rel="noopener noreferrer">
              <FileDown className="mr-2 h-4 w-4" />Discharge Summary
            </a>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href={`/appointments/new?patientId=${patientId}`}>
              <CalendarDays className="mr-2 h-4 w-4" /> Book Appointment
            </Link>
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowVitalsForm(true)}>
            <Activity className="mr-2 h-4 w-4" /> Record Vitals
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowNoteForm(true)}>
            <FileText className="mr-2 h-4 w-4" /> Add Note
          </Button>
          <Button size="sm" onClick={() => setShowDxForm(true)}>
            <Plus className="mr-2 h-4 w-4" /> Diagnosis
          </Button>
        </div>
      </div>

      {/* Inline forms */}
      {showVitalsForm && (
        <VitalsForm patientId={patientId} onSuccess={() => { setShowVitalsForm(false); invalidateAll(); }} onCancel={() => setShowVitalsForm(false)} />
      )}
      {showNoteForm && (
        <ClinicalNoteForm patientId={patientId} onSuccess={() => { setShowNoteForm(false); invalidateAll(); }} onCancel={() => setShowNoteForm(false)} />
      )}
      {showDxForm && (
        <DiagnosisForm patientId={patientId} onSuccess={() => { setShowDxForm(false); invalidateAll(); }} onCancel={() => setShowDxForm(false)} />
      )}

      {/* Alerts */}
      {patient.allergies && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span><strong>Allergies:</strong> {patient.allergies}</span>
        </div>
      )}

      <Tabs defaultValue="overview">
        <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:grid-cols-none lg:flex">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="vitals">Vitals</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="diagnoses">Diagnoses</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        {/* ── OVERVIEW ───────────────────────────────────────────────────────── */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {/* Demographics */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm"><User className="h-4 w-4" />Demographics</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Phone"><a href={`tel:${patient.phone}`} className="text-primary hover:underline">{patient.phone}</a></Row>
                {patient.email && <Row label="Email"><a href={`mailto:${patient.email}`} className="text-primary hover:underline">{patient.email}</a></Row>}
                {patient.address && <Row label="Address">{patient.address}</Row>}
                {patient.nhisNumber && <Row label="NHIS No">{patient.nhisNumber}</Row>}
                {patient.hmoProvider && <Row label="HMO">{patient.hmoProvider} {patient.hmoNumber ? `(${patient.hmoNumber})` : ""}</Row>}
              </CardContent>
            </Card>

            {/* Emergency Contact */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4" />Emergency Contact</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Name">{patient.emergencyContactName}</Row>
                <Row label="Phone"><a href={`tel:${patient.emergencyContactPhone}`} className="text-primary hover:underline">{patient.emergencyContactPhone}</a></Row>
                <Row label="Relation">{patient.emergencyContactRelation}</Row>
              </CardContent>
            </Card>

            {/* Latest Vitals */}
            {latestVitals && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm"><Heart className="h-4 w-4" />Last Vitals <span className="ml-auto text-xs font-normal text-muted-foreground">{format(new Date(latestVitals.recordedAt), "dd MMM HH:mm")}</span></CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-2 text-sm">
                  {latestVitals.systolicBP && <Vital label="BP" value={`${latestVitals.systolicBP}/${latestVitals.diastolicBP}`} unit="mmHg" />}
                  {latestVitals.heartRate && <Vital label="HR" value={String(latestVitals.heartRate)} unit="bpm" />}
                  {latestVitals.temperature && <Vital label="Temp" value={String(latestVitals.temperature)} unit="°C" />}
                  {latestVitals.oxygenSaturation && <Vital label="SpO₂" value={String(latestVitals.oxygenSaturation)} unit="%" />}
                  {latestVitals.weight && <Vital label="Weight" value={String(latestVitals.weight)} unit="kg" />}
                  {latestVitals.bmi && <Vital label="BMI" value={String(latestVitals.bmi)} unit="" />}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Active diagnoses */}
          {activeDiagnoses.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3"><CardTitle className="text-sm">Active Diagnoses</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {activeDiagnoses.map((dx: Diagnosis) => (
                  <div key={dx.id} className="flex items-center gap-3 text-sm">
                    <Badge className={STATUS_COLOR[dx.status]}>{dx.status}</Badge>
                    <span className="font-medium">{dx.description}</span>
                    {dx.icdCode && <span className="font-mono text-xs text-muted-foreground">{dx.icdCode}</span>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Recent notes */}
          {recentNotes.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3"><CardTitle className="text-sm">Recent Notes</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {recentNotes.slice(0, 3).map((n: ClinicalNote) => (
                  <div key={n.id} className="rounded-lg border bg-gray-50 p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{n.author.firstName} {n.author.lastName}</span>
                      <span className="text-xs text-muted-foreground">{format(new Date(n.createdAt), "dd MMM yyyy HH:mm")}</span>
                    </div>
                    {n.noteType === "SOAP" ? (
                      <div className="mt-2 space-y-1">
                        {n.subjective && <p><span className="font-medium text-muted-foreground">S:</span> {n.subjective}</p>}
                        {n.assessment && <p><span className="font-medium text-muted-foreground">A:</span> {n.assessment}</p>}
                        {n.plan && <p><span className="font-medium text-muted-foreground">P:</span> {n.plan}</p>}
                      </div>
                    ) : (
                      <p className="mt-1 text-muted-foreground">{n.content}</p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── VITALS ─────────────────────────────────────────────────────────── */}
        <TabsContent value="vitals" className="mt-6">
          <div className="space-y-4">
            {vitals.length === 0 ? (
              <EmptyState icon={Activity} label="No vitals recorded yet" action={{ label: "Record Vitals", onClick: () => setShowVitalsForm(true) }} />
            ) : (
              <>
                {/* Trend Chart */}
                {vitals.length >= 2 && (
                  <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Vitals Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={240}>
                        <LineChart
                          data={[...vitals].reverse().map((v) => ({
                            date: format(new Date(v.recordedAt), "dd MMM HH:mm"),
                            BP: v.systolicBP ?? null,
                            HR: v.heartRate ?? null,
                            "SpO₂": v.oxygenSaturation ?? null,
                            Temp: v.temperature ?? null,
                          }))}
                          margin={{ top: 4, right: 12, left: -20, bottom: 4 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip contentStyle={{ fontSize: 12 }} />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          <Line type="monotone" dataKey="BP" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                          <Line type="monotone" dataKey="HR" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                          <Line type="monotone" dataKey="SpO₂" stroke="#9333ea" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                          <Line type="monotone" dataKey="Temp" stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                {/* Individual records */}
                {vitals.map((v) => (
                  <Card key={v.id} className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
                        <span>{v.recordedBy.firstName} {v.recordedBy.lastName}</span>
                        <span>{format(new Date(v.recordedAt), "dd MMM yyyy HH:mm")}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                        {v.systolicBP && <Vital label="BP" value={`${v.systolicBP}/${v.diastolicBP}`} unit="mmHg" />}
                        {v.heartRate && <Vital label="HR" value={String(v.heartRate)} unit="bpm" />}
                        {v.temperature && <Vital label="Temp" value={String(v.temperature)} unit="°C" />}
                        {v.oxygenSaturation && <Vital label="SpO₂" value={String(v.oxygenSaturation)} unit="%" />}
                        {v.respiratoryRate && <Vital label="RR" value={String(v.respiratoryRate)} unit="/min" />}
                        {v.weight && <Vital label="Weight" value={String(v.weight)} unit="kg" />}
                        {v.height && <Vital label="Height" value={String(v.height)} unit="cm" />}
                        {v.bmi && <Vital label="BMI" value={String(v.bmi)} unit="" />}
                        {v.bloodGlucose && <Vital label="Glucose" value={String(v.bloodGlucose)} unit="mmol/L" />}
                        {v.pain !== undefined && v.pain !== null && <Vital label="Pain" value={`${v.pain}/10`} unit="" />}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
          </div>
        </TabsContent>

        {/* ── CLINICAL NOTES ─────────────────────────────────────────────────── */}
        <TabsContent value="notes" className="mt-6">
          <div className="space-y-4">
            {notes.length === 0 ? (
              <EmptyState icon={FileText} label="No clinical notes yet" action={{ label: "Add Note", onClick: () => setShowNoteForm(true) }} />
            ) : notes.map((n) => (
              <Card key={n.id} className="border-0 shadow-sm">
                <CardContent className="p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{n.noteType}</Badge>
                      {n.isDraft && <Badge variant="secondary" className="text-xs">Draft</Badge>}
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p>{n.author.firstName} {n.author.lastName}</p>
                      <p>{format(new Date(n.createdAt), "dd MMM yyyy HH:mm")}</p>
                    </div>
                  </div>
                  {n.noteType === "SOAP" ? (
                    <div className="space-y-2 text-sm">
                      {[["S — Subjective", n.subjective], ["O — Objective", n.objective], ["A — Assessment", n.assessment], ["P — Plan", n.plan]].map(([label, val]) =>
                        val ? (
                          <div key={label as string}>
                            <p className="font-medium text-muted-foreground">{label}</p>
                            <p className="mt-0.5">{val}</p>
                            <Separator className="mt-2" />
                          </div>
                        ) : null
                      )}
                    </div>
                  ) : (
                    <p className="text-sm">{n.content}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── DIAGNOSES ──────────────────────────────────────────────────────── */}
        <TabsContent value="diagnoses" className="mt-6">
          <div className="space-y-3">
            {diagnoses.length === 0 ? (
              <EmptyState icon={Stethoscope} label="No diagnoses recorded" action={{ label: "Add Diagnosis", onClick: () => setShowDxForm(true) }} />
            ) : diagnoses.map((dx) => (
              <Card key={dx.id} className="border-0 shadow-sm">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className={STATUS_COLOR[dx.status]}>{dx.status}</Badge>
                      <Badge variant="outline" className="text-xs">{dx.diagnosisType}</Badge>
                    </div>
                    <p className="font-medium">{dx.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {dx.icdCode ? `ICD: ${dx.icdCode} · ` : ""}
                      {dx.diagnosedBy.firstName} {dx.diagnosedBy.lastName} · {format(new Date(dx.diagnosedAt), "dd MMM yyyy")}
                    </p>
                  </div>
                  {dx.status === "ACTIVE" && (
                    <Button size="sm" variant="outline" onClick={() => resolveDx.mutate(dx.id)}>
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Resolve
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── APPOINTMENTS ───────────────────────────────────────────────────── */}
        <TabsContent value="appointments" className="mt-6">
          <div className="space-y-3">
            {appointments.length === 0 ? (
              <EmptyState icon={CalendarDays} label="No appointments yet" action={{ label: "Book Appointment", href: `/appointments/new?patientId=${patientId}` }} />
            ) : appointments.map((a) => (
              <Card key={a.id} className="border-0 shadow-sm">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className={APPT_COLOR[a.status] ?? "bg-gray-100"}>{a.status}</Badge>
                      <Badge variant="outline" className="text-xs">{a.type}</Badge>
                    </div>
                    <p className="text-sm font-medium">Dr. {a.doctor.firstName} {a.doctor.lastName}</p>
                    <p className="text-xs text-muted-foreground">{a.department.name} · {format(new Date(a.scheduledAt), "dd MMM yyyy, HH:mm")}</p>
                  </div>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="billing" className="mt-6">
          <div className="space-y-3">
            {invoices.length === 0 ? (
              <EmptyState icon={CreditCard} label="No invoices yet" />
            ) : invoices.map((inv: any) => {
              const outstanding = Number(inv.total) - Number(inv.amountPaid);
              const statusColor: Record<string, string> = {
                PAID: "bg-green-100 text-green-700",
                ISSUED: "bg-blue-100 text-blue-700",
                PARTIALLY_PAID: "bg-amber-100 text-amber-800",
                OVERDUE: "bg-red-100 text-red-700",
                CANCELLED: "bg-gray-100 text-gray-500",
              };
              return (
                <Card key={inv.id} className="border-0 shadow-sm">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono text-sm font-medium">{inv.invoiceNumber}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColor[inv.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {inv.status.replace("_", " ")}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{format(new Date(inv.createdAt), "dd MMM yyyy")}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">₦{Number(inv.total).toLocaleString()}</p>
                      {outstanding > 0 && inv.status !== "CANCELLED" && (
                        <p className="text-xs text-amber-600">₦{outstanding.toLocaleString()} outstanding</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

function Vital({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-lg bg-gray-50 p-2 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-bold">{value}</p>
      {unit && <p className="text-xs text-muted-foreground">{unit}</p>}
    </div>
  );
}

function EmptyState({ icon: Icon, label, action }: {
  icon: React.ElementType;
  label: string;
  action?: { label: string; onClick?: () => void; href?: string };
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12 text-center">
      <Icon className="mb-3 h-10 w-10 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">{label}</p>
      {action && (
        action.href ? (
          <Button size="sm" variant="outline" className="mt-4" asChild>
            <Link href={action.href}>{action.label}</Link>
          </Button>
        ) : (
          <Button size="sm" variant="outline" className="mt-4" onClick={action.onClick}>{action.label}</Button>
        )
      )}
    </div>
  );
}
