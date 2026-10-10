import type { Metadata } from "next";
import { DebtWorklist } from "@/components/billing/debt-worklist";

export const metadata: Metadata = { title: "Debt Worklist — CareSync HMS" };

export default function DebtWorklistPage() {
  return <DebtWorklist />;
}
