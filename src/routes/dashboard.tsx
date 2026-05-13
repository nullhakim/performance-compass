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
import { api, formatRupiah, type Employee, type PerformanceResult, type Target, type TargetDetail } from "@/lib/api";

export const Route = createFileRoute("/dashboard")({
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
  const [products, setProducts] = useState<Product[]>([]);
  const [allTargets, setAllTargets] = useState<Target[]>([]);
  const [month, setMonth] = useState<string>(String(now.getMonth() + 1));
  const [year, setYear] = useState<string>(String(now.getFullYear()));
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prods, targets] = await Promise.all([
        api.getProducts(),
        api.getTargets(),
      ]);
      setProducts(prods || []);
      setAllTargets(targets || []);
    } catch (err) {
      toast.error("Failed to load dashboard data", { description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredTargets = useMemo(() => {
    return allTargets.filter(
      (t) => String(t.month) === month && String(t.year) === year
    );
  }, [allTargets, month, year]);

  const stats = useMemo(() => {
    let totalTarget = 0;
    let totalAchievement = 0;
    const productMap = new Map<string, { target: number; achievement: number }>();

    // Initialize with all products
    products.forEach((p) => {
      productMap.set(p.name, { target: 0, achievement: 0 });
    });

    filteredTargets.forEach((t) => {
      const pName = t.product_name || "Unknown";
      const current = productMap.get(pName) || { target: 0, achievement: 0 };
      
      const nominal = Number(t.nominal || 0);
      const achievement = Number((t as any).total_achievement || (t as any).achievement || 0);

      totalTarget += nominal;
      totalAchievement += achievement;

      productMap.set(pName, {
        target: current.target + nominal,
        achievement: current.achievement + achievement,
      });
    });

    const productStats = Array.from(productMap.entries()).map(([name, data]) => ({
      name,
      Target: data.target,
      Achievement: data.achievement,
    })).filter(p => p.Target > 0 || p.Achievement > 0);

    const percentage = totalTarget > 0 ? (totalAchievement / totalTarget) * 100 : 0;

    return { totalTarget, totalAchievement, percentage, productStats };
  }, [filteredTargets, products]);

  const barData = stats.productStats;
  const rawPct = stats.percentage;
  const percentage = Math.max(0, Math.min(100, rawPct));
  const pctTone = rawPct >= 100 ? "text-emerald-600" : rawPct < 50 ? "text-destructive" : "text-amber-500";

  const COLOR_TARGET = "#6366f1"; // indigo-500
  const COLOR_ACHIEVEMENT = "#10b981"; // emerald-500
  
  const compactRp = (n: number) => {
    if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}B`;
    if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)}k`;
    return `Rp ${n}`;
  };

  return (
    <DashboardLayout 
      title="Company Performance Overview" 
      subtitle="Summary of targets and achievements for all employees."
    >
      <div className="mb-8 grid gap-4 md:grid-cols-4">
        <Card className="border-slate-200/60 bg-white/50 shadow-sm backdrop-blur-sm md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">Period Filter</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold text-slate-400">Month</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger className="h-8 text-xs bg-white/80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold text-slate-400">Year</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger className="h-8 text-xs bg-white/80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026].map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <MetricCard
          label="Total Target (All)"
          value={formatRupiah(stats.totalTarget)}
          icon={<TargetIcon className="h-5 w-5" />}
          tone="indigo"
        />
        <MetricCard
          label="Total Achievement (All)"
          value={formatRupiah(stats.totalAchievement)}
          icon={<TrendingUp className="h-5 w-5" />}
          tone="emerald"
        />
        <Card className="relative overflow-hidden border-slate-200/60 bg-white/50 shadow-sm backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Total Achievement %
                </p>
                <p className={`mt-1 text-3xl font-bold tabular-nums ${pctTone}`}>
                  {rawPct.toFixed(1)}%
                </p>
              </div>
              <CircularProgress value={percentage} />
            </div>
            <Progress value={percentage} className="mt-4 h-2 bg-slate-100" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-slate-200/60 bg-white/50 shadow-md backdrop-blur-sm lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100/50 pb-4">
            <div>
              <CardTitle className="text-lg font-bold text-slate-800">Achievement per Product</CardTitle>
              <p className="text-xs text-slate-500">Global achievement breakdown across all products.</p>
            </div>
            <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="h-8 text-xs">
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Refresh Data"}
            </Button>
          </CardHeader>
          <CardContent className="pt-6">
            {loading ? (
              <div className="flex h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
              </div>
            ) : barData.length === 0 ? (
              <div className="flex h-[400px] flex-col items-center justify-center text-center">
                <div className="mb-4 rounded-full bg-slate-50 p-4">
                  <TargetIcon className="h-8 w-8 text-slate-300" />
                </div>
                <p className="text-sm font-medium text-slate-500">No performance data found for this period.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 11, fill: "#64748b" }} 
                    interval={0} 
                    angle={-45} 
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: "#64748b" }} 
                    tickFormatter={compactRp}
                    width={80}
                  />
                  <Tooltip
                    formatter={(v: number) => formatRupiah(v)}
                    contentStyle={{ 
                      borderRadius: 12, 
                      border: "none", 
                      boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                      fontSize: 12,
                      padding: "12px"
                    }}
                    cursor={{ fill: "#f8fafc" }}
                  />
                  <Legend 
                    verticalAlign="top" 
                    align="right"
                    wrapperStyle={{ paddingTop: 0, paddingBottom: 20, fontSize: 12 }}
                  />
                  <Bar dataKey="Target" fill={COLOR_TARGET} radius={[4, 4, 0, 0]} barSize={32} />
                  <Bar dataKey="Achievement" fill={COLOR_ACHIEVEMENT} radius={[4, 4, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
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
