import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Target as TargetIcon, TrendingUp, Calculator } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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
import { api, formatRupiah, type Employee, type PerformanceResult } from "@/lib/api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Performance Dashboard — Employee Performance Tracker" },
      { name: "description", content: "Track sales targets and achievements per employee." },
    ],
  }),
  component: DashboardPage,
});

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function DashboardPage() {
  const now = new Date();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeId, setEmployeeId] = useState<string>("");
  const [month, setMonth] = useState<string>(String(now.getMonth() + 1));
  const [year, setYear] = useState<string>(String(now.getFullYear()));
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState<PerformanceResult | null>(null);

  useEffect(() => {
    let mounted = true;
    api
      .getEmployees()
      .then((data) => {
        if (!mounted) return;
        setEmployees(data || []);
      })
      .catch((err: Error) => {
        toast.error("Failed to load employees", { description: err.message });
      })
      .finally(() => mounted && setLoadingEmployees(false));
    return () => {
      mounted = false;
    };
  }, []);

  const handleCalculate = async (silent = false) => {
    if (!employeeId) {
      if (!silent) toast.error("Please select an employee");
      return;
    }
    if (!month || !year) {
      if (!silent) toast.error("Please select month and year");
      return;
    }
    setCalculating(true);
    try {
      const data = await api.getPerformance(employeeId, Number(month), Number(year));
      setResult(data);
      if (!silent) toast.success("Performance calculated");
    } catch (err) {
      if (!silent) toast.error("Failed to calculate performance", { description: (err as Error).message });
      setResult(null);
    } finally {
      setCalculating(false);
    }
  };

  // Auto-refresh chart data when filters change
  useEffect(() => {
    if (employeeId) handleCalculate(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, month, year]);

  const rawPct = result?.percentage ?? 0;
  const percentage = Math.max(0, Math.min(100, rawPct));
  const pctTone = rawPct > 100 ? "text-success" : rawPct < 50 ? "text-destructive" : "text-warning";

  const barData = useMemo(
    () =>
      (result?.details || []).map((d) => ({
        name: d.product_name,
        Target: d.nominal_target,
        Achievement: d.total_achievement,
      })),
    [result],
  );

  const pieData = useMemo(() => {
    const achieved = Math.min(100, rawPct);
    return [
      { name: "Achieved", value: achieved },
      { name: "Remaining", value: Math.max(0, 100 - achieved) },
    ];
  }, [rawPct]);

  const COLOR_TARGET = "#6366f1"; // indigo-500
  const COLOR_ACHIEVEMENT = "#10b981"; // emerald-500
  const COLOR_REMAINING = "#cbd5e1"; // slate-300
  const PIE_COLORS = [COLOR_ACHIEVEMENT, COLOR_REMAINING];
  const compactRp = (n: number) => {
    if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}B`;
    if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)}k`;
    return `Rp ${n}`;
  };

  return (
    <DashboardLayout title="Performance Dashboard" subtitle="Calculate sales achievements by employee and period.">
      <Card className="mb-6 border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="employee">Employee</Label>
              <Select value={employeeId} onValueChange={setEmployeeId} disabled={loadingEmployees}>
                <SelectTrigger id="employee">
                  <SelectValue placeholder={loadingEmployees ? "Loading..." : "Select employee"} />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={String(e.id)} value={String(e.id)}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="month">Month</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger id="month">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                type="number"
                min={2000}
                max={2100}
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={() => handleCalculate(false)} disabled={calculating} className="w-full">
                {calculating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Calculator className="mr-2 h-4 w-4" />
                )}
                Calculate Performance
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {result ? (
        <>
          <div className="mb-6 grid gap-4 md:grid-cols-3">
            <MetricCard
              label="Total Target"
              value={formatRupiah(result.total_target)}
              icon={<TargetIcon className="h-5 w-5" />}
              tone="indigo"
            />
            <MetricCard
              label="Total Achievement"
              value={formatRupiah(result.total_achievement)}
              icon={<TrendingUp className="h-5 w-5" />}
              tone="emerald"
            />
            <Card className="relative overflow-hidden border-border/60 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Achievement %
                    </p>
                    <p className={`mt-1 text-3xl font-bold tabular-nums ${pctTone}`}>
                      {rawPct.toFixed(1)}%
                    </p>
                  </div>
                  <CircularProgress value={percentage} />
                </div>
                <Progress value={percentage} className="mt-4 h-2" />
              </CardContent>
            </Card>
          </div>

          <div className="mb-6 grid gap-4 lg:grid-cols-3">
            <Card className="border-border/60 shadow-sm lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Target vs Achievement</CardTitle>
              </CardHeader>
              <CardContent>
                {barData.length === 0 ? (
                  <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
                    No data for this period.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={barData} margin={{ top: 10, right: 16, bottom: 8, left: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={barData.length > 4 ? -15 : 0} textAnchor={barData.length > 4 ? "end" : "middle"} height={50} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={compactRp} width={70} />
                      <Tooltip
                        formatter={(v: number) => formatRupiah(v)}
                        contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="Target" fill={COLOR_TARGET} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Achievement" fill={COLOR_ACHIEVEMENT} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Overall Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <p className={`mt-2 text-center text-2xl font-bold tabular-nums ${pctTone}`}>
                  {rawPct.toFixed(1)}%
                </p>
                <p className="text-center text-xs text-muted-foreground">Overall achievement</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Target Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Nominal Target</TableHead>
                    <TableHead className="text-right">Total Achievement</TableHead>
                    <TableHead className="text-right">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(result.details || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                        No target details for this period.
                      </TableCell>
                    </TableRow>
                  ) : (
                    result.details.map((d, idx) => {
                      const pct = d.nominal_target > 0
                        ? (d.total_achievement / d.nominal_target) * 100
                        : 0;
                      return (
                        <TableRow key={String(d.target_id ?? idx)}>
                          <TableCell className="font-medium">{d.product_name}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatRupiah(d.nominal_target)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatRupiah(d.total_achievement)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            <span
                              className={
                                pct >= 100
                                  ? "text-success"
                                  : pct >= 50
                                    ? "text-warning"
                                    : "text-destructive"
                              }
                            >
                              {pct.toFixed(1)}%
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <Calculator className="h-6 w-6" />
            </div>
            <p className="mt-4 text-sm font-medium">No data yet</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Select an employee and period, then click "Calculate Performance" to see results.
            </p>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
}

function MetricCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: "indigo" | "emerald";
}) {
  const tones = {
    indigo: "bg-primary/10 text-primary",
    emerald: "bg-success/15 text-success",
  };
  return (
    <Card className="border-border/60 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <div className={`flex h-9 w-9 items-center justify-center rounded-md ${tones[tone]}`}>
            {icon}
          </div>
        </div>
        <p className="mt-3 text-2xl font-bold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

function CircularProgress({ value }: { value: number }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" className="-rotate-90">
      <circle cx="30" cy="30" r={r} stroke="currentColor" strokeWidth="6" fill="none" className="text-muted" />
      <circle
        cx="30"
        cy="30"
        r={r}
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
        strokeDasharray={c}
        strokeDashoffset={offset}
        className="text-primary transition-all"
      />
    </svg>
  );
}
