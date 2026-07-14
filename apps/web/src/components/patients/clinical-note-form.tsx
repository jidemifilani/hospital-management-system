"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

interface Props {
  patientId: string;
  appointmentId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ClinicalNoteForm({ patientId, appointmentId, onSuccess, onCancel }: Props) {
  const { toast } = useToast();
  const [noteType, setNoteType] = useState<"SOAP" | "PROGRESS">("SOAP");
  const [isDraft, setIsDraft] = useState(false);
  const [soap, setSoap] = useState({ subjective: "", objective: "", assessment: "", plan: "" });
  const [content, setContent] = useState("");

  const save = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post("/emr/notes", data),
    onSuccess: () => { toast({ title: "Note saved" }); onSuccess(); },
    onError:   () => toast({ title: "Failed to save note", variant: "destructive" }),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: Record<string, unknown> = { patientId, appointmentId, noteType, isDraft };
    if (noteType === "SOAP") Object.assign(payload, soap);
    else payload.content = content;
    save.mutate(payload);
  }

  return (
    <Card className="border-primary/20 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span>Clinical Note</span>
          <div className="flex items-center gap-2 text-sm font-normal">
            <span className="text-muted-foreground">Save as draft</span>
            <Switch checked={isDraft} onCheckedChange={setIsDraft} />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs value={noteType} onValueChange={(v) => setNoteType(v as "SOAP" | "PROGRESS")}>
            <TabsList>
              <TabsTrigger value="SOAP">SOAP Note</TabsTrigger>
              <TabsTrigger value="PROGRESS">Progress Note</TabsTrigger>
            </TabsList>
            <TabsContent value="SOAP" className="mt-3 space-y-3">
              {(["subjective", "objective", "assessment", "plan"] as const).map((field) => (
                <div key={field} className="space-y-1">
                  <Label className="text-xs capitalize text-muted-foreground">
                    {field === "subjective" ? "S — Subjective (patient's complaint)"
                      : field === "objective" ? "O — Objective (examination findings)"
                      : field === "assessment" ? "A — Assessment (diagnosis / impression)"
                      : "P — Plan (treatment plan)"}
                  </Label>
                  <Textarea
                    placeholder={`Enter ${field}…`}
                    rows={2}
                    value={soap[field]}
                    onChange={(e) => setSoap((prev) => ({ ...prev, [field]: e.target.value }))}
                  />
                </div>
              ))}
            </TabsContent>
            <TabsContent value="PROGRESS" className="mt-3">
              <Textarea placeholder="Enter progress note…" rows={6} value={content} onChange={(e) => setContent(e.target.value)} />
            </TabsContent>
          </Tabs>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
            <Button type="submit" size="sm" disabled={save.isPending}>
              {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isDraft ? "Save Draft" : "Save Note"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
