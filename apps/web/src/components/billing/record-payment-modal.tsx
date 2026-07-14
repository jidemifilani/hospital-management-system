"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

const METHODS = ["CASH","POS_CARD","BANK_TRANSFER","NHIS","HMO","INSURANCE","MOBILE_MONEY"];
const NGN = (n: number | string) =>
  Number(n).toLocaleString("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });

interface Props {
  invoice: { id: string; invoiceNumber: string; total: string; amountPaid: string };
  onClose: () => void;
}

export function RecordPaymentModal({ invoice, onClose }: Props) {
  const balance = Number(invoice.total) - Number(invoice.amountPaid);
  const [amount, setAmount] = useState(String(balance));
  const [method, setMethod] = useState("CASH");
  const [reference, setReference] = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();

  const save = useMutation({
    mutationFn: () => api.post(`/billing/invoices/${invoice.id}/payments`, {
      amount: Number(amount), method, reference: reference || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["billing-summary"] });
      toast({ title: "Payment recorded" });
      onClose();
    },
    onError: () => toast({ title: "Failed to record payment", variant: "destructive" }),
  });

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <p className="text-sm text-muted-foreground">{invoice.invoiceNumber} · Balance: {NGN(balance)}</p>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Amount (₦)</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} min={1} max={balance} />
          </div>
          <div className="space-y-1">
            <Label>Payment Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {METHODS.map((m) => <SelectItem key={m} value={m}>{m.replace("_"," ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Reference / Receipt No (optional)</Label>
            <Input placeholder="e.g. TRX-00123" value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !amount || Number(amount) <= 0}>
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirm Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
