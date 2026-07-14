"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PlayCircle, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";

interface Props {
  appointmentId: string;
  status: string;
  onUpdate?: () => void;
}

export function AppointmentActions({ appointmentId, status, onUpdate }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [cancelReason, setCancelReason] = useState("");

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["appointments"] });
    onUpdate?.();
  }

  const start = useMutation({
    mutationFn: () =>
      api.patch(`/appointments/${appointmentId}/status`, { status: "IN_PROGRESS" }),
    onSuccess: () => {
      toast({ title: "Consultation started" });
      invalidate();
    },
    onError: () => toast({ title: "Failed to update", variant: "destructive" }),
  });

  const complete = useMutation({
    mutationFn: () =>
      api.patch(`/appointments/${appointmentId}/status`, { status: "COMPLETED" }),
    onSuccess: () => {
      toast({ title: "Appointment marked as completed" });
      invalidate();
    },
    onError: () => toast({ title: "Failed to update", variant: "destructive" }),
  });

  const cancel = useMutation({
    mutationFn: (reason: string) =>
      api.patch(`/appointments/${appointmentId}/status`, {
        status: "CANCELLED",
        cancelReason: reason,
      }),
    onSuccess: () => {
      toast({ title: "Appointment cancelled" });
      invalidate();
    },
    onError: () => toast({ title: "Failed to cancel", variant: "destructive" }),
  });

  if (status === "COMPLETED" || status === "CANCELLED") {
    return (
      <span className="text-sm italic text-muted-foreground">No further actions available.</span>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status === "SCHEDULED" && (
        <Button
          size="sm"
          onClick={() => start.mutate()}
          disabled={start.isPending}
        >
          {start.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <PlayCircle className="mr-2 h-4 w-4" />
          )}
          Start Consultation
        </Button>
      )}

      {status === "IN_PROGRESS" && (
        <Button
          size="sm"
          variant="outline"
          className="border-green-500 text-green-700 hover:bg-green-50"
          onClick={() => complete.mutate()}
          disabled={complete.isPending}
        >
          {complete.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="mr-2 h-4 w-4" />
          )}
          Mark Complete
        </Button>
      )}

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size="sm" variant="outline" className="border-red-300 text-red-600 hover:bg-red-50">
            <XCircle className="mr-2 h-4 w-4" />
            Cancel
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Appointment</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for cancelling this appointment. The patient will be notified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label htmlFor="cancelReason">Reason</Label>
            <Textarea
              id="cancelReason"
              className="mt-1.5"
              placeholder="e.g. Doctor unavailable, patient requested reschedule…"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => cancel.mutate(cancelReason)}
              disabled={!cancelReason.trim() || cancel.isPending}
            >
              {cancel.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Confirm Cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
