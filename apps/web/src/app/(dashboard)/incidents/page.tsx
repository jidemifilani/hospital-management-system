import type { Metadata } from "next";
import { IncidentsPage } from "@/components/incidents/incidents-page";

export const metadata: Metadata = { title: "Incident Reports" };

export default function Page() {
  return <IncidentsPage />;
}
