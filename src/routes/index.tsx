import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Target as TargetIcon, TrendingUp, Percent, Calculator } from "lucide-react";
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

  const handleCalculate = async () => {
    if (!employeeId) return toast.error("Please select an employee");
    if (!month || !year) return toast.error("Please select month and year");
    setCalculating(true);
    setResult(null);
    try {
      const data = await api.getPerformance(Number(employeeId), Number(month), Number(year));
      setResult(data);
      toast.success("Performance calculated");
    } catch (err) {
      toast.error("Failed to calculate performance", { description: (err as Error).message });
    } finally {
      setCalculating(false);
    }
  };

  const percentage = result ? Math.min(100, Math.max(0, result.percentage ?? 0)) : 0;

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
                    <SelectItem key={e.id} value={String(e.id)}>
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
              <Button onClick={handleCalculate} disabled={calculating} className="w-full">
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
                    <p className="mt-1 text-3xl font-bold tabular-nums">
                      {percentage.toFixed(1)}%
                    </p>
                  </div>
                  <CircularProgress value={percentage} />
                </div>
                <Progress value={percentage} className="mt-4 h-2" />
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
                        <TableRow key={d.target_id ?? idx}>
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
