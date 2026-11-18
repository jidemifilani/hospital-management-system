"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Download,
  Loader2,
  Play,
  Plus,
  Save,
  Table2,
  Trash2,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";

/* ────────────────────────────── types ────────────────────────────── */

type FieldKind = "string" | "number" | "date" | "enum" | "boolean";

interface SourceFieldInfo {
  key: string;
  label: string;
  kind: FieldKind;
  groupable: boolean;
  measurable: boolean;
  filterable: boolean;
  options: string[] | null;
}

interface SourceInfo {
  key: string;
  label: string;
  description: string;
  fields: SourceFieldInfo[];
}

interface Dimension {
  field: string;
  bucket?: string;
}
interface Measure {
  fn: string;
  field?: string;
}
interface Filter {
  field: string;
  op: string;
  value?: string;
  value2?: string;
  values?: string[];
}

interface ResultColumn {
  key: string;
  label: string;
  kind: FieldKind;
  role: "dimension" | "measure";
}

interface ReportResult {
  columns: ResultColumn[];
  rows: Record<string, string | number | null>[];
  rowCount: number;
  truncated: boolean;
}

interface SavedReport {
  id: string;
  name: string;
  description: string | null;
  source: string;
  dimensions: Dimension[];
  measures: Measure[];
  filters: Filter[];
  sort: { key: string; direction: string } | null;
  limit: number | null;
  createdBy?: { firstName: string; lastName: string } | null;
}

const BUCKETS = ["day", "week", "month", "quarter", "year"];
const FUNCTIONS = [
  { value: "count", label: "Count" },
  { value: "sum", label: "Sum" },
  { value: "avg", label: "Average" },
  { value: "min", label: "Minimum" },
  { value: "max", label: "Maximum" },
];

/** Operators, and which kinds of column they make sense for. */
const OPERATORS: { value: string; label: string; kinds: FieldKind[] }[] = [
  { value: "eq", label: "is", kinds: ["string", "number", "date", "enum", "boolean"] },
  { value: "ne", label: "is not", kinds: ["string", "number", "date", "enum", "boolean"] },
  { value: "gt", label: "is after / more than", kinds: ["number", "date"] },
  { value: "gte", label: "is at least", kinds: ["number", "date"] },
  { value: "lt", label: "is before / less than", kinds: ["number", "date"] },
  { value: "lte", label: "is at most", kinds: ["number", "date"] },
  { value: "between", label: "is between", kinds: ["number", "date"] },
  { value: "in", label: "is one of", kinds: ["enum", "string"] },
  { value: "contains", label: "contains", kinds: ["string"] },
  { value: "isNull", label: "is empty", kinds: ["string", "number", "date", "enum", "boolean"] },
  { value: "notNull", label: "is not empty", kinds: ["string", "number", "date", "enum", "boolean"] },
];

const number = (v: number) =>
  v.toLocaleString("en-NG", { maximumFractionDigits: 2 });

export function ReportBuilderPage() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [sourceKey, setSourceKey] = useState<string>("");
  const [dimensions, setDimensions] = useState<Dimension[]>([]);
  const [measures, setMeasures] = useState<Measure[]>([{ fn: "count" }]);
  const [filters, setFilters] = useState<Filter[]>([]);
  const [limit, setLimit] = useState<string>("500");
  const [result, setResult] = useState<ReportResult | null>(null);
  const [resultTitle, setResultTitle] = useState<string>("");
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveDescription, setSaveDescription] = useState("");

  const { data: sources = [], isLoading: loadingSources } = useQuery<SourceInfo[]>({
    queryKey: ["report-sources"],
    queryFn: () => api.get("/report-builder/sources").then((r) => r.data),
    staleTime: 600_000,
  });

  const { data: saved = [] } = useQuery<SavedReport[]>({
    queryKey: ["saved-reports"],
    queryFn: () => api.get("/report-builder/saved").then((r) => r.data),
  });

  const source = useMemo(
    () => sources.find((s) => s.key === sourceKey),
    [sources, sourceKey],
  );

  const definition = useMemo(
    () => ({
      source: sourceKey,
      dimensions,
      measures,
      filters,
      limit: Number(limit) || 500,
    }),
    [sourceKey, dimensions, measures, filters, limit],
  );

  const run = useMutation({
    mutationFn: () => api.post("/report-builder/run", definition).then((r) => r.data),
    onSuccess: (data: ReportResult) => {
      setResult(data);
      setResultTitle("");
    },
    onError: (error: unknown) => {
      const detail =
        (error as { response?: { data?: { message?: string | string[] } } }).response?.data?.message;
      toast({
        title: "That report could not run",
        description: Array.isArray(detail) ? detail.join(", ") : detail ?? "Check the fields chosen.",
        variant: "destructive",
      });
    },
  });

  const save = useMutation({
    mutationFn: () =>
      api
        .post("/report-builder/saved", {
          ...definition,
          name: saveName,
          description: saveDescription || undefined,
        })
        .then((r) => r.data),
    onSuccess: () => {
      setSaveOpen(false);
      setSaveName("");
      setSaveDescription("");
      qc.invalidateQueries({ queryKey: ["saved-reports"] });
      toast({ title: "Report saved" });
    },
    onError: (error: unknown) => {
      const detail =
        (error as { response?: { data?: { message?: string | string[] } } }).response?.data?.message;
      toast({
        title: "Could not save",
        description: Array.isArray(detail) ? detail.join(", ") : detail ?? "Try another name.",
        variant: "destructive",
      });
    },
  });

  const runSaved = useMutation({
    mutationFn: (id: string) =>
      api.post(`/report-builder/saved/${id}/run`).then((r) => r.data),
    onSuccess: (data: ReportResult & { report: { name: string } }) => {
      setResult(data);
      setResultTitle(data.report.name);
    },
  });

  const removeSaved = useMutation({
    mutationFn: (id: string) => api.delete(`/report-builder/saved/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saved-reports"] });
      toast({ title: "Report deleted" });
    },
  });

  /* ───────────────────────── editing helpers ───────────────────────── */

  const pickSource = (key: string) => {
    // The fields belong to the source, so everything chosen is now meaningless.
    setSourceKey(key);
    setDimensions([]);
    setMeasures([{ fn: "count" }]);
    setFilters([]);
    setResult(null);
  };

  const loadSaved = (report: SavedReport) => {
    setSourceKey(report.source);
    setDimensions(report.dimensions ?? []);
    setMeasures(report.measures ?? [{ fn: "count" }]);
    setFilters(report.filters ?? []);
    setLimit(String(report.limit ?? 500));
    setResult(null);
    runSaved.mutate(report.id);
  };

  const fieldOf = (key: string) => source?.fields.find((f) => f.key === key);

  const exportCsv = () => {
    if (!result) return;
    const header = result.columns.map((c) => c.label);
    const lines = result.rows.map((row) =>
      result.columns.map((c) => {
        const value = row[c.key];
        const text = value === null || value === undefined ? "" : String(value);
        // Quote anything that could otherwise split a cell.
        return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
      }),
    );
    const csv = [header, ...lines].map((cells) => cells.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(resultTitle || sourceKey || "report").replace(/\s+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const groupable = source?.fields.filter((f) => f.groupable) ?? [];
  const measurable = source?.fields.filter((f) => f.measurable) ?? [];
  const filterable = source?.fields.filter((f) => f.filterable) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <BarChart3 className="h-6 w-6" />
            Report Builder
          </h1>
          <p className="text-sm text-muted-foreground">
            Ask a question of the data without waiting for a developer.
          </p>
        </div>
      </div>

      <Tabs defaultValue="build">
        <TabsList>
          <TabsTrigger value="build">Build</TabsTrigger>
          <TabsTrigger value="saved">Saved reports ({saved.length})</TabsTrigger>
        </TabsList>

        {/* ───────────────────────── build ───────────────────────── */}
        <TabsContent value="build" className="space-y-4 pt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">1. What to report on</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loadingSources ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Select value={sourceKey} onValueChange={pickSource}>
                  <SelectTrigger className="max-w-md" data-testid="source-select">
                    <SelectValue placeholder="Choose a subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {sources.map((s) => (
                      <SelectItem key={s.key} value={s.key}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {source && <p className="text-xs text-muted-foreground">{source.description}</p>}
            </CardContent>
          </Card>

          {source && (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">2. Group by</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {dimensions.map((dimension, index) => {
                    const field = fieldOf(dimension.field);
                    return (
                      <div key={index} className="flex flex-wrap items-center gap-2">
                        <Select
                          value={dimension.field}
                          onValueChange={(value) => {
                            const next = [...dimensions];
                            // A date needs a bucket, and the select shows
                            // "by month" by default; storing it here is what
                            // makes the screen and the request agree.
                            const picked = source.fields.find((f) => f.key === value);
                            next[index] =
                              picked?.kind === "date" ? { field: value, bucket: "month" } : { field: value };
                            setDimensions(next);
                          }}
                        >
                          <SelectTrigger className="w-56" data-testid={`dimension-field-${index}`}>
                            <SelectValue placeholder="Field" />
                          </SelectTrigger>
                          <SelectContent>
                            {groupable.map((f) => (
                              <SelectItem key={f.key} value={f.key}>
                                {f.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {field?.kind === "date" && (
                          <Select
                            value={dimension.bucket ?? "month"}
                            onValueChange={(value) => {
                              const next = [...dimensions];
                              next[index] = { ...next[index]!, bucket: value };
                              setDimensions(next);
                            }}
                          >
                            <SelectTrigger className="w-36" data-testid={`dimension-bucket-${index}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {BUCKETS.map((b) => (
                                <SelectItem key={b} value={b}>
                                  by {b}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDimensions(dimensions.filter((_, i) => i !== index))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={dimensions.length >= 4 || groupable.length === 0}
                    onClick={() =>
                      setDimensions([
                        ...dimensions,
                        groupable[0]!.kind === "date"
                          ? { field: groupable[0]!.key, bucket: "month" }
                          : { field: groupable[0]!.key },
                      ])
                    }
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Add grouping
                  </Button>
                  {dimensions.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      With no grouping you get a single total row.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">3. Measure</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {measures.map((measure, index) => (
                    <div key={index} className="flex flex-wrap items-center gap-2">
                      <Select
                        value={measure.fn}
                        onValueChange={(value) => {
                          const next = [...measures];
                          next[index] = value === "count" ? { fn: "count" } : { fn: value, field: measurable[0]?.key };
                          setMeasures(next);
                        }}
                      >
                        <SelectTrigger className="w-40" data-testid={`measure-fn-${index}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FUNCTIONS.map((f) => (
                            <SelectItem key={f.value} value={f.value}>
                              {f.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {measure.fn !== "count" && (
                        <Select
                          value={measure.field ?? ""}
                          onValueChange={(value) => {
                            const next = [...measures];
                            next[index] = { ...next[index]!, field: value };
                            setMeasures(next);
                          }}
                        >
                          <SelectTrigger className="w-56" data-testid={`measure-field-${index}`}>
                            <SelectValue placeholder="of" />
                          </SelectTrigger>
                          <SelectContent>
                            {measurable.map((f) => (
                              <SelectItem key={f.key} value={f.key}>
                                {f.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        data-testid={`measure-remove-${index}`}
                        aria-label="Remove measure"
                        disabled={measures.length === 1}
                        onClick={() => setMeasures(measures.filter((_, i) => i !== index))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={measures.length >= 6}
                    onClick={() => setMeasures([...measures, { fn: "count" }])}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Add measure
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">4. Narrow it down</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {filters.map((filter, index) => {
                    const field = fieldOf(filter.field);
                    const operators = OPERATORS.filter((o) =>
                      field ? o.kinds.includes(field.kind) : true,
                    );
                    const needsValue = !["isNull", "notNull", "in"].includes(filter.op);
                    return (
                      <div key={index} className="flex flex-wrap items-center gap-2">
                        <Select
                          value={filter.field}
                          onValueChange={(value) => {
                            const next = [...filters];
                            next[index] = { field: value, op: "eq" };
                            setFilters(next);
                          }}
                        >
                          <SelectTrigger className="w-52" data-testid={`filter-field-${index}`}>
                            <SelectValue placeholder="Field" />
                          </SelectTrigger>
                          <SelectContent>
                            {filterable.map((f) => (
                              <SelectItem key={f.key} value={f.key}>
                                {f.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Select
                          value={filter.op}
                          onValueChange={(value) => {
                            const next = [...filters];
                            next[index] = { ...next[index]!, op: value };
                            setFilters(next);
                          }}
                        >
                          <SelectTrigger className="w-48" data-testid={`filter-op-${index}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {operators.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {needsValue &&
                          (field?.options ? (
                            <Select
                              value={filter.value ?? ""}
                              onValueChange={(value) => {
                                const next = [...filters];
                                next[index] = { ...next[index]!, value };
                                setFilters(next);
                              }}
                            >
                              <SelectTrigger className="w-48">
                                <SelectValue placeholder="Value" />
                              </SelectTrigger>
                              <SelectContent>
                                {field.options.map((option) => (
                                  <SelectItem key={option} value={option}>
                                    {option.replace(/_/g, " ")}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              className="w-48"
                              type={field?.kind === "date" ? "date" : field?.kind === "number" ? "number" : "text"}
                              value={filter.value ?? ""}
                              onChange={(e) => {
                                const next = [...filters];
                                next[index] = { ...next[index]!, value: e.target.value };
                                setFilters(next);
                              }}
                            />
                          ))}

                        {filter.op === "between" && (
                          <Input
                            className="w-48"
                            type={field?.kind === "date" ? "date" : "number"}
                            value={filter.value2 ?? ""}
                            onChange={(e) => {
                              const next = [...filters];
                              next[index] = { ...next[index]!, value2: e.target.value };
                              setFilters(next);
                            }}
                          />
                        )}

                        {filter.op === "in" && field?.options && (
                          <div className="flex flex-wrap gap-1">
                            {field.options.map((option) => {
                              const chosen = filter.values?.includes(option) ?? false;
                              return (
                                <Badge
                                  key={option}
                                  variant={chosen ? "default" : "outline"}
                                  className="cursor-pointer"
                                  onClick={() => {
                                    const next = [...filters];
                                    const values = new Set(next[index]!.values ?? []);
                                    if (chosen) values.delete(option);
                                    else values.add(option);
                                    next[index] = { ...next[index]!, values: [...values] };
                                    setFilters(next);
                                  }}
                                >
                                  {option.replace(/_/g, " ")}
                                </Badge>
                              );
                            })}
                          </div>
                        )}

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setFilters(filters.filter((_, i) => i !== index))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={filters.length >= 10 || filterable.length === 0}
                      onClick={() => setFilters([...filters, { field: filterable[0]!.key, op: "eq" }])}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Add condition
                    </Button>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs" htmlFor="report-limit">
                        Max rows
                      </Label>
                      <Input
                        id="report-limit"
                        className="h-8 w-24"
                        type="number"
                        value={limit}
                        onChange={(e) => setLimit(e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex flex-wrap gap-2">
                <Button onClick={() => run.mutate()} disabled={run.isPending}>
                  {run.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="mr-2 h-4 w-4" />
                  )}
                  Run
                </Button>
                <Button variant="outline" onClick={() => setSaveOpen(true)}>
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </Button>
                <Button variant="outline" onClick={exportCsv} disabled={!result}>
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              </div>
            </>
          )}

          {result && <ResultTable result={result} title={resultTitle} />}
        </TabsContent>

        {/* ───────────────────────── saved ───────────────────────── */}
        <TabsContent value="saved" className="space-y-4 pt-4">
          {saved.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nothing saved yet. Build a report and press Save.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {saved.map((report) => (
                <Card key={report.id} data-testid={`saved-report-${report.name}`}>
                  <CardContent className="flex items-start justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{report.name}</p>
                      {report.description && (
                        <p className="mt-1 text-xs text-muted-foreground">{report.description}</p>
                      )}
                      <p className="mt-2 text-xs text-muted-foreground">
                        {report.source}
                        {report.createdBy &&
                          ` · ${report.createdBy.firstName} ${report.createdBy.lastName}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        aria-label={`Run ${report.name}`}
                        onClick={() => loadSaved(report)}
                      >
                        <Play className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`Delete ${report.name}`}
                        onClick={() => removeSaved.mutate(report.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {result && resultTitle && <ResultTable result={result} title={resultTitle} />}
        </TabsContent>
      </Tabs>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save this report</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label htmlFor="report-name">Name</Label>
              <Input
                id="report-name"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="Outstanding invoices by month"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="report-description">Description</Label>
              <Input
                id="report-description"
                value={saveDescription}
                onChange={(e) => setSaveDescription(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              data-testid="confirm-save"
              onClick={() => save.mutate()}
              disabled={!saveName || save.isPending}
            >
              {save.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ResultTable({ result, title }: { result: ReportResult; title: string }) {
  return (
    <Card data-testid="report-result">
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          <Table2 className="h-4 w-4" />
          {title || "Result"}
          <Badge variant="outline">{result.rowCount} rows</Badge>
          {result.truncated && (
            <Badge variant="destructive">
              Cut off at the row limit — raise it to see the rest
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {result.columns.map((column) => (
                  <TableHead
                    key={column.key}
                    className={column.role === "measure" ? "text-right" : ""}
                  >
                    {column.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.rows.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={result.columns.length}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    Nothing matched.
                  </TableCell>
                </TableRow>
              )}
              {result.rows.map((row, index) => (
                <TableRow key={index}>
                  {result.columns.map((column) => {
                    const value = row[column.key];
                    return (
                      <TableCell
                        key={column.key}
                        className={column.role === "measure" ? "text-right tabular-nums" : ""}
                      >
                        {value === null || value === undefined
                          ? "—"
                          : column.role === "measure"
                            ? number(Number(value))
                            : String(value).replace(/_/g, " ")}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
