"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { TrendingUp, Users, CalendarCheck, Banknote, Loader2, BookOpen } from "lucide-react";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";

interface MonthData {
  label: string;
  newPatients: number;
  totalAppointments: number;
  completedAppointments: number;
  revenue: number;
  billed: number;
}

interface DeptData { department: string; count: number; }
interface InvoiceStatus { status: string; count: number; total: number; }

interface Reports {
  byMonth: MonthData[];
  byDepartment: DeptData[];
  invoiceStatus: InvoiceStatus[];
}

interface AccountLine { accountId: string; code: string; name: string; balance: string; }
interface ProfitAndLoss {
  from: string; to: string;
  income: AccountLine[]; expense: AccountLine[];
  totals: { income: string; expense: string; netProfit: string };
}

const STATUS_COLOR: Record<string, string> = {
  PAID: "#22c55e",
  ISSUED: "#3b82f6",
  PARTIALLY_PAID: "#f59e0b",
  OVERDUE: "#ef4444",
  CANCELLED: "#94a3b8",
};

const DEPT_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316", "#ec4899"];

function fmt(n: number) {
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `₦${(n / 1_000).toFixed(0)}K`;
  return `₦${n.toFixed(0)}`;
}

function SummaryCard({ icon: Icon, label, value, sub, color }: { icon: React.ElementType; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function plPeriod(months: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to.getFullYear(), to.getMonth() - (months - 1), 1);
  return {
    from: from.toISOString().slice(0, 10),
    to:   to.toISOString().slice(0, 10),
  };
}

export function ReportsPage() {
  const [months, setMonths] = useState(6);
  const [plMonths, setPlMonths] = useState("3");

  const { data, isLoading } = useQuery<Reports>({
    queryKey: ["reports", months],
    queryFn: () => api.get(`/dashboard/reports?months=${months}`).then((r) => r.data),
  });

  const { from: plFrom, to: plTo } = plPeriod(Number(plMonths));
  const { data: pl, isLoading: plLoading } = useQuery<ProfitAndLoss>({
    queryKey: ["pl", plMonths],
    queryFn: () =>
      api.get("/accounting/profit-and-loss", { params: { from: plFrom, to: plTo } })
         .then((r) => r.data),
    staleTime: 120_000,
  });

  const totalRevenue = data?.byMonth.reduce((s, m) => s + m.revenue, 0) ?? 0;
  const totalBilled = data?.byMonth.reduce((s, m) => s + m.billed, 0) ?? 0;
  const totalPatients = data?.byMonth.reduce((s, m) => s + m.newPatients, 0) ?? 0;
  const totalAppts = data?.byMonth.reduce((s, m) => s + m.totalAppointments, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports & Analytics</h1>
        <p className="text-sm text-muted-foreground">Operational and financial overview</p>
      </div>

      <Tabs defaultValue="operations">
        <TabsList>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="financials">
            <BookOpen className="mr-1 h-3.5 w-3.5 inline" />
            Financial Statements
          </TabsTrigger>
        </TabsList>

        {/* ── Financial Statements (ledger-sourced) ── */}
        <TabsContent value="financials" className="mt-6 space-y-6">
          <div className="flex items-center gap-3">
            <p className="text-sm font-medium">Period:</p>
            <Select value={plMonths} onValueChange={setPlMonths}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">This month</SelectItem>
                <SelectItem value="3">Last 3 months</SelectItem>
                <SelectItem value="6">Last 6 months</SelectItem>
                <SelectItem value="12">Last 12 months</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">
              {plFrom} → {plTo}
            </span>
          </div>

          {plLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : pl ? (
            <>
              {/* Net profit banner */}
              <div className={`rounded-lg p-5 ${Number(pl.totals.netProfit) >= 0 ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
                <p className="text-sm font-medium text-muted-foreground">Net Profit / (Loss)</p>
                <p className={`text-3xl font-bold mt-1 ${Number(pl.totals.netProfit) >= 0 ? "text-green-700" : "text-red-600"}`}>
                  {formatCurrency(Number(pl.totals.netProfit))}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Income {formatCurrency(Number(pl.totals.income))} — Expenses {formatCurrency(Number(pl.totals.expense))}
                </p>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                {/* Income */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Income</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {pl.income.length === 0 ? (
                      <p className="py-4 text-center text-sm text-muted-foreground">No income postings in this period.</p>
                    ) : (
                      <table className="w-full text-sm">
                        <tbody>
                          {pl.income.map((r) => (
                            <tr key={r.accountId} className="border-b last:border-0">
                              <td className="py-2 text-muted-foreground font-mono text-xs w-16">{r.code}</td>
                              <td className="py-2">{r.name}</td>
                              <td className="py-2 text-right tabular-nums font-medium">{formatCurrency(Number(r.balance))}</td>
                            </tr>
                          ))}
                          <tr className="font-semibold">
                            <td colSpan={2} className="pt-3">Total income</td>
                            <td className="pt-3 text-right tabular-nums text-green-700">{formatCurrency(Number(pl.totals.income))}</td>
                          </tr>
                        </tbody>
                      </table>
                    )}
                  </CardContent>
                </Card>

                {/* Expenses */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Expenses</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {pl.expense.length === 0 ? (
                      <p className="py-4 text-center text-sm text-muted-foreground">No expense postings in this period.</p>
                    ) : (
                      <table className="w-full text-sm">
                        <tbody>
                          {pl.expense.map((r) => (
                            <tr key={r.accountId} className="border-b last:border-0">
                              <td className="py-2 text-muted-foreground font-mono text-xs w-16">{r.code}</td>
                              <td className="py-2">{r.name}</td>
                              <td className="py-2 text-right tabular-nums font-medium">{formatCurrency(Number(r.balance))}</td>
                            </tr>
                          ))}
                          <tr className="font-semibold">
                            <td colSpan={2} className="pt-3">Total expenses</td>
                            <td className="pt-3 text-right tabular-nums text-red-600">{formatCurrency(Number(pl.totals.expense))}</td>
                          </tr>
                        </tbody>
                      </table>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No ledger data yet. Post journal entries or raise invoices to see a P&amp;L statement.
            </p>
          )}
        </TabsContent>

        {/* ── Operations ── */}
        <TabsContent value="operations" className="mt-6 space-y-6">
          <div className="flex justify-end">
            <div className="flex gap-1 rounded-lg border p-1">
              {[3, 6, 12].map((m) => (
                <button
                  key={m}
                  onClick={() => setMonths(m)}
                  className={`rounded px-3 py-1 text-xs font-medium transition-colors ${months === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {m}M
                </button>
              ))}
            </div>
          </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard icon={Banknote}      label="Total Revenue"     value={fmt(totalRevenue)} sub={`${fmt(totalBilled)} billed`} color="bg-green-500" />
            <SummaryCard icon={Users}         label="New Patients"      value={totalPatients}     sub={`last ${months} months`}     color="bg-blue-500" />
            <SummaryCard icon={CalendarCheck} label="Appointments"      value={totalAppts}        sub={`last ${months} months`}     color="bg-violet-500" />
            <SummaryCard icon={TrendingUp}    label="Collection Rate"   value={totalBilled > 0 ? `${Math.round((totalRevenue / totalBilled) * 100)}%` : "—"} sub="revenue / billed" color="bg-amber-500" />
          </div>

          {/* Patient growth + Appointments */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">New Patient Registrations</CardTitle>
                <CardDescription>Monthly new patients over {months} months</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data?.byMonth} barSize={28}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="newPatients" name="New Patients" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Appointments</CardTitle>
                <CardDescription>Total vs completed by month</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={data?.byMonth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="totalAppointments" name="Total" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="completedAppointments" name="Completed" stroke="#22c55e" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Revenue trend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Revenue vs Billed</CardTitle>
              <CardDescription>Monthly billing and collection trend</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data?.byMonth} barSize={20} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => fmt(v)} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="billed" name="Billed" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="revenue" name="Collected" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Department breakdown + Invoice status */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Appointments by Department</CardTitle>
                <CardDescription>Top departments — {months} month period</CardDescription>
              </CardHeader>
              <CardContent>
                {data?.byDepartment && data.byDepartment.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={data.byDepartment} layout="vertical" barSize={18}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="department" tick={{ fontSize: 11 }} width={110} />
                      <Tooltip />
                      <Bar dataKey="count" name="Appointments" radius={[0, 4, 4, 0]}>
                        {data.byDepartment.map((_, i) => (
                          <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">No appointment data yet</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Invoice Status Breakdown</CardTitle>
                <CardDescription>By count — {months} month period</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-center">
                {data?.invoiceStatus && data.invoiceStatus.length > 0 ? (
                  <div className="flex w-full items-center gap-6">
                    <ResponsiveContainer width="50%" height={200}>
                      <PieChart>
                        <Pie
                          data={data.invoiceStatus}
                          dataKey="count"
                          nameKey="status"
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={80}
                        >
                          {data.invoiceStatus.map((entry) => (
                            <Cell key={entry.status} fill={STATUS_COLOR[entry.status] ?? "#94a3b8"} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-2">
                      {data.invoiceStatus.map((s) => (
                        <div key={s.status} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLOR[s.status] ?? "#94a3b8" }} />
                            <span className="capitalize">{s.status.replace("_", " ").toLowerCase()}</span>
                          </div>
                          <span className="font-medium">{s.count} ({fmt(s.total)})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">No invoice data yet</p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
