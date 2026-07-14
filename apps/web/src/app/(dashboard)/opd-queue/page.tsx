import type { Metadata } from "next";
import { OpdQueuePage } from "@/components/opd-queue/opd-queue-page";

export const metadata: Metadata = { title: "OPD Queue" };

export default function Page() {
  return <OpdQueuePage />;
}
