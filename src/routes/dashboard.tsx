import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Target as TargetIcon, TrendingUp, Trophy } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { api, fetchTargets, formatRupiah, type Product, type TargetRow } from "@/lib/api";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Performance Dashboard — Bank Galuh" },
      { name: "description", content: "Company-wide performance overview." },
    ],
  }),
  component: DashboardPage,
});

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 7 }, (_, i) => CURRENT_YEAR - 3 + i);

function compactRp(n: number) {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)}k`;
  return `Rp ${n}`;
}

function DashboardPage() {
  const now = new Date();
  const [month, setMonth] = useState<string>(String(now.getMonth() + 1));
  const [year, setYear] = useState<string>(String(now.getFullYear()));
  const [products, setProducts] = useState<Product[]>([]);
  const [leaderProductId, setLeaderProductId] = useState<string>("all");
  const [targets, setTargets] = useState<TargetRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getProducts().then((p) => setProducts(p || [])).catch(() => {});
  }, []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchTargets({ limit: 1000, month: Number(month), year: Number(year) })
      .then((res) => { if (mounted) setTargets(res.items); })
      .catch((err: Error) => toast.error("Failed to load dashboard", { description: err.message }))
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [month, year]);

  const stats = useMemo(() => {
    let totalTarget = 0;
    let totalAchievement = 0;
    const byProduct = new Map<string, { target: number; achievement: number }>();
    targets.forEach((t) => {
      const nominal = Number(t.nominal || 0);
      const ach = Number(t.total_achievement || 0);
      totalTarget += nominal;
      totalAchievement += ach;
      const pname = t.product?.name || "Unknown";
      const cur = byProduct.get(pname) || { target: 0, achievement: 0 };
      byProduct.set(pname, { target: cur.target + nominal, achievement: cur.achievement + ach });
    });
    const productStats = Array.from(byProduct.entries()).map(([name, v]) => ({
      name, Target: v.target, Achievement: v.achievement,
    }));
    const percentage = totalTarget > 0 ? (totalAchievement / totalTarget) * 100 : 0;
    return { totalTarget, totalAchievement, percentage, productStats };
  }, [targets]);

  const leaderboards = useMemo(() => {
    const filtered = leaderProductId === "all"
      ? targets
      : targets.filter((t) => String(t.product?.id ?? t.product_id) === leaderProductId);
    const byEmp = new Map<string, { name: string; target: number; achievement: number }>();
    filtered.forEach((t) => {
      const id = String(t.employee?.id ?? t.employee_id ?? "?");
      const name = t.employee?.name ?? "Unknown";
      const cur = byEmp.get(id) || { name, target: 0, achievement: 0 };
      cur.target += Number(t.nominal || 0);
      cur.achievement += Number(t.total_achievement || 0);
      byEmp.set(id, cur);
    });
    const all = Array.from(byEmp.values());
    const topPct = [...all]
      .map((e) => ({ ...e, pct: e.target > 0 ? (e.achievement / e.target) * 100 : 0 }))
      .filter((e) => e.target > 0)
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 5);
    const topVol = [...all].sort((a, b) => b.achievement - a.achievement).slice(0, 5);
    return { topPct, topVol };
  }, [targets, leaderProductId]);

  const pctTone = stats.percentage >= 100 ? "text-emerald-600" : stats.percentage < 50 ? "text-destructive" : "text-amber-500";

  return (
    <DashboardLayout title="Company Performance Overview" subtitle="Targets, achievements, and leaderboards.">
      {/* Filters */}
      <Card className="mb-6 border-border/60 shadow-sm">
        <CardContent className="grid gap-4 p-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Month</Label>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">All-Time</SelectItem>
                {MONTHS.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Year</Label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">All-Time</SelectItem>
                {YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* KPI cards */}
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <KpiCard label="Total Company Target" value={formatRupiah(stats.totalTarget)} icon={<TargetIcon className="h-5 w-5" />} tone="indigo" />
        <KpiCard label="Total Achieved" value={formatRupiah(stats.totalAchievement)} icon={<TrendingUp className="h-5 w-5" />} tone="emerald" />
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-6">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Overall Progress</p>
            <p className={`mt-3 text-2xl font-bold tabular-nums ${pctTone}`}>{stats.percentage.toFixed(1)}%</p>
            <Progress value={Math.min(100, stats.percentage)} className="mt-3 h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Bar chart */}
      <Card className="mb-6 border-border/60 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Target vs Achievement by Product</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-[360px] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : stats.productStats.length === 0 ? (
            <div className="flex h-[360px] items-center justify-center text-sm text-muted-foreground">No data for the selected period.</div>
          ) : (
            <ResponsiveContainer width="100%" height={360}>
              <BarChart data={stats.productStats} margin={{ top: 10, right: 20, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} angle={-30} textAnchor="end" interval={0} height={70} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={compactRp} width={80} />
                <Tooltip formatter={(v: number) => formatRupiah(v)} contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 8px 20px rgba(0,0,0,0.08)", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Target" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Achievement" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Leaderboards */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            <CardTitle className="text-base font-semibold">Leaderboards</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Filter by product</Label>
            <Select value={leaderProductId} onValueChange={setLeaderProductId}>
              <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                {products.map((p) => <SelectItem key={String(p.id)} value={String(p.id)}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Top 5 Achievers (%)</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Rank</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead className="text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboards.topPct.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="py-6 text-center text-sm text-muted-foreground">No data.</TableCell></TableRow>
                ) : leaderboards.topPct.map((e, i) => (
                  <TableRow key={e.name + i}>
                    <TableCell className="font-semibold">{i + 1}</TableCell>
                    <TableCell>{e.name}</TableCell>
                    <TableCell className={`text-right font-medium tabular-nums ${e.pct >= 100 ? "text-emerald-600" : e.pct < 50 ? "text-destructive" : "text-amber-500"}`}>
                      {e.pct.toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Top 5 Volume Contributors</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Rank</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead className="text-right">Total Achieved</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboards.topVol.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="py-6 text-center text-sm text-muted-foreground">No data.</TableCell></TableRow>
                ) : leaderboards.topVol.map((e, i) => (
                  <TableRow key={e.name + i}>
                    <TableCell className="font-semibold">{i + 1}</TableCell>
                    <TableCell>{e.name}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{formatRupiah(e.achievement)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}

function KpiCard({ label, value, icon, tone }: { label: string; value: string; icon: React.ReactNode; tone: "indigo" | "emerald" }) {
  const tones = { indigo: "bg-indigo-50 text-indigo-600", emerald: "bg-emerald-50 text-emerald-600" };
  return (
    <Card className="border-border/60 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <div className={`flex h-9 w-9 items-center justify-center rounded-md ${tones[tone]}`}>{icon}</div>
        </div>
        <p className="mt-3 text-2xl font-bold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
