"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { api } from "@/lib/api-client";
import { Loader2 } from "lucide-react";

interface Patient {
  id: string; mrn: string; firstName: string; lastName: string;
  dateOfBirth: string; gender: string; phone: string; bloodGroup?: string;
  address?: string; nextOfKinName?: string; nextOfKinPhone?: string;
}

interface VitalSigns {
  systolicBP?: number; diastolicBP?: number; heartRate?: number;
  temperature?: number; oxygenSaturation?: number; weight?: number; height?: number;
  recordedAt: string;
}

interface Diagnosis {
  icdCode?: string; description: string; status: string; diagnosedAt: string;
  diagnosedBy?: { firstName: string; lastName: string };
}

interface ClinicalNote {
  noteType: string; content: string; createdAt: string;
  author?: { firstName: string; lastName: string };
}

interface Appointment {
  scheduledAt: string; status: string;
  doctor?: { firstName: string; lastName: string; specialization?: string };
  department?: { name: string };
}

interface Summary {
  patient: Patient & { appointments: Appointment[] };
  latestVitals: VitalSigns | null;
  activeDiagnoses: Diagnosis[];
  recentNotes: ClinicalNote[];
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <tr>
      <td className="py-1 pr-4 text-gray-500 font-medium w-40 align-top">{label}</td>
      <td className="py-1 text-gray-900">{value || "—"}</td>
    </tr>
  );
}

export default function DischargeSummaryPrint() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading } = useQuery<Summary>({
    queryKey: ["discharge-summary", id],
    queryFn: () => api.get(`/emr/${id}/summary`).then((r) => r.data),
  });

  useEffect(() => {
    if (data) {
      const timer = setTimeout(() => window.print(), 600);
      return () => clearTimeout(timer);
    }
  }, [data]);

  if (isLoading || !data) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const { patient, latestVitals, activeDiagnoses, recentNotes } = data;
  const today = format(new Date(), "dd MMMM yyyy");
  const age = patient.dateOfBirth
    ? Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;

  const lastAppt = patient.appointments?.find((a) => a.status === "COMPLETED");

  return (
    <div className="bg-white min-h-screen p-8 text-sm font-sans print:p-6">
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 16mm 14mm; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-start justify-between border-b-2 border-gray-800 pb-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 uppercase tracking-wide">CareSync HMS</h1>
          <p className="text-xs text-gray-500 mt-0.5">Hospital Management System</p>
        </div>
        <div className="text-right">
          <h2 className="text-lg font-bold text-gray-800 uppercase">Discharge Summary</h2>
          <p className="text-xs text-gray-500">Date: {today}</p>
          <p className="text-xs text-gray-500">MRN: {patient.mrn}</p>
        </div>
      </div>

      {/* Patient Information */}
      <section className="mb-6">
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 border-b pb-1">Patient Information</h3>
        <div className="grid grid-cols-2 gap-x-8">
          <table className="text-xs">
            <tbody>
              <Row label="Full Name" value={`${patient.firstName} ${patient.lastName}`} />
              <Row label="MRN" value={patient.mrn} />
              <Row label="Date of Birth" value={patient.dateOfBirth ? format(new Date(patient.dateOfBirth), "dd MMM yyyy") : undefined} />
              <Row label="Age" value={age !== null ? `${age} years` : undefined} />
              <Row label="Gender" value={patient.gender} />
              <Row label="Blood Group" value={patient.bloodGroup} />
            </tbody>
          </table>
          <table className="text-xs">
            <tbody>
              <Row label="Phone" value={patient.phone} />
              <Row label="Address" value={patient.address} />
              <Row label="Next of Kin" value={patient.nextOfKinName} />
              <Row label="NOK Phone" value={patient.nextOfKinPhone} />
              {lastAppt && (
                <>
                  <Row label="Attending Doctor" value={lastAppt.doctor ? `Dr. ${lastAppt.doctor.firstName} ${lastAppt.doctor.lastName}` : undefined} />
                  <Row label="Department" value={lastAppt.department?.name} />
                </>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Vitals */}
      {latestVitals && (
        <section className="mb-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 border-b pb-1">
            Vital Signs — {format(new Date(latestVitals.recordedAt), "dd MMM yyyy HH:mm")}
          </h3>
          <div className="grid grid-cols-4 gap-3">
            {latestVitals.systolicBP && (
              <div className="rounded border p-2 text-center">
                <p className="text-xs text-gray-500">Blood Pressure</p>
                <p className="font-bold">{latestVitals.systolicBP}/{latestVitals.diastolicBP}</p>
                <p className="text-xs text-gray-400">mmHg</p>
              </div>
            )}
            {latestVitals.heartRate && (
              <div className="rounded border p-2 text-center">
                <p className="text-xs text-gray-500">Heart Rate</p>
                <p className="font-bold">{latestVitals.heartRate}</p>
                <p className="text-xs text-gray-400">bpm</p>
              </div>
            )}
            {latestVitals.temperature && (
              <div className="rounded border p-2 text-center">
                <p className="text-xs text-gray-500">Temperature</p>
                <p className="font-bold">{latestVitals.temperature}</p>
                <p className="text-xs text-gray-400">°C</p>
              </div>
            )}
            {latestVitals.oxygenSaturation && (
              <div className="rounded border p-2 text-center">
                <p className="text-xs text-gray-500">SpO₂</p>
                <p className="font-bold">{latestVitals.oxygenSaturation}%</p>
                <p className="text-xs text-gray-400">oxygen</p>
              </div>
            )}
            {latestVitals.weight && (
              <div className="rounded border p-2 text-center">
                <p className="text-xs text-gray-500">Weight</p>
                <p className="font-bold">{latestVitals.weight}</p>
                <p className="text-xs text-gray-400">kg</p>
              </div>
            )}
            {latestVitals.height && (
              <div className="rounded border p-2 text-center">
                <p className="text-xs text-gray-500">Height</p>
                <p className="font-bold">{latestVitals.height}</p>
                <p className="text-xs text-gray-400">cm</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Active Diagnoses */}
      {activeDiagnoses.length > 0 && (
        <section className="mb-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 border-b pb-1">Diagnoses</h3>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left py-1.5 px-2 font-semibold border">ICD Code</th>
                <th className="text-left py-1.5 px-2 font-semibold border">Description</th>
                <th className="text-left py-1.5 px-2 font-semibold border">Status</th>
                <th className="text-left py-1.5 px-2 font-semibold border">Date</th>
                <th className="text-left py-1.5 px-2 font-semibold border">Clinician</th>
              </tr>
            </thead>
            <tbody>
              {activeDiagnoses.map((d, i) => (
                <tr key={i} className={i % 2 === 0 ? "" : "bg-gray-50"}>
                  <td className="py-1.5 px-2 border font-mono">{d.icdCode || "—"}</td>
                  <td className="py-1.5 px-2 border">{d.description}</td>
                  <td className="py-1.5 px-2 border capitalize">{d.status.toLowerCase()}</td>
                  <td className="py-1.5 px-2 border">{format(new Date(d.diagnosedAt), "dd MMM yyyy")}</td>
                  <td className="py-1.5 px-2 border">
                    {d.diagnosedBy ? `Dr. ${d.diagnosedBy.firstName} ${d.diagnosedBy.lastName}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Clinical Notes */}
      {recentNotes.length > 0 && (
        <section className="mb-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 border-b pb-1">
            Clinical Notes (Recent {recentNotes.length})
          </h3>
          <div className="space-y-3">
            {recentNotes.map((note, i) => (
              <div key={i} className="rounded border p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                    {note.noteType.replace(/_/g, " ")}
                  </span>
                  <span className="text-xs text-gray-400">
                    {note.author ? `${note.author.firstName} ${note.author.lastName} — ` : ""}
                    {format(new Date(note.createdAt), "dd MMM yyyy HH:mm")}
                  </span>
                </div>
                <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{note.content}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Signature */}
      <section className="mt-10 border-t pt-6">
        <div className="grid grid-cols-2 gap-12">
          <div>
            <div className="h-10 border-b border-gray-400 mb-1" />
            <p className="text-xs text-gray-500">Clinician Signature &amp; Date</p>
          </div>
          <div>
            <div className="h-10 border-b border-gray-400 mb-1" />
            <p className="text-xs text-gray-500">Department Head / Consultant Signature</p>
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-gray-400">
          Generated by CareSync HMS on {today} · This document is confidential and intended for medical use only.
        </p>
      </section>

      <button
        onClick={() => window.print()}
        className="no-print fixed bottom-6 right-6 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-lg hover:bg-gray-700"
      >
        Print
      </button>
    </div>
  );
}
