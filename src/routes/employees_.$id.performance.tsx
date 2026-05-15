import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  CalendarIcon,
  ChevronLeft,
  Loader2,
  TrendingUp,
  Target as TargetIcon,
  FileDown,
  User,
  ArrowLeft,
  History,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
import {
  api,
  fetchTargets,
  formatRupiah,
  type Employee,
  type PerformanceResult,
  type TargetDetail,
  type TargetRow,
  type Product,
} from "@/lib/api";

// Re-using dialogs from targets.tsx logic or implementing simplified versions
import { RecordAchievementDialog, HistoryDialog, EditNominalDialog } from "@/components/target-dialogs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/employees_/$id/performance")({
  head: () => ({ meta: [{ title: "Employee Performance — Bank Galuh" }] }),
  component: EmployeePerformancePage,
});

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 11 }, (_, i) => CURRENT_YEAR - 5 + i);

function pctTone(pct: number) {
  if (pct >= 100) return "text-emerald-600";
  if (pct < 50) return "text-destructive";
  return "text-amber-500";
}

function compactRp(n: number) {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)}k`;
  return `Rp ${n}`;
}

function EmployeePerformancePage() {
  console.log("Rendering EmployeePerformancePage");
  const { id } = Route.useParams();
  const now = new Date();
  
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [performance, setPerformance] = useState<PerformanceResult | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  
  const [month, setMonth] = useState<string>(String(now.getMonth() + 1));
  const [year, setYear] = useState<string>(String(now.getFullYear()));
  const [productId, setProductId] = useState<string>("all");
  const [loading, setLoading] = useState(false);

  // Trend Chart State
  const [trendType, setTrendType] = useState<"MoM" | "YoY">("MoM");
  const [trendRows, setTrendRows] = useState<TargetRow[]>([]);
  const [trendLoading, setTrendLoading] = useState(false);

  // Dialog states
  const [achRow, setAchRow] = useState<any | null>(null);
  const [historyRow, setHistoryRow] = useState<any | null>(null);
  const [editRow, setEditRow] = useState<any | null>(null);
  const [deleteRow, setDeleteRow] = useState<any | null>(null);

  useEffect(() => {
    Promise.all([
      api.getEmployee(id),
      api.getProducts()
    ])
      .then(([emp, prods]) => {
        setEmployee(emp);
        setProducts(prods || []);
      })
      .catch((err: Error) => toast.error("Failed to load data", { description: err.message }));
  }, [id]);

  const loadPerformance = async () => {
    setLoading(true);
    try {
      const res = await api.getPerformance(id, Number(month), Number(year));
      setPerformance(res);
    } catch (err) {
      toast.error("Failed to load performance data", { description: (err as Error).message });
      setPerformance(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPerformance();
  }, [id, month, year]);

  useEffect(() => {
    const fetchTrend = async () => {
      setTrendLoading(true);
      try {
        if (trendType === "MoM") {
          const res = await fetchTargets({
            limit: 2000,
            month: 0,
            year: Number(year) || CURRENT_YEAR,
            employee_id: id,
            product_id: productId === "all" ? "" : productId,
          });
          setTrendRows(res.items);
        } else {
          const res = await fetchTargets({
            limit: 5000,
            month: 0,
            year: 0,
            employee_id: id,
            product_id: productId === "all" ? "" : productId,
          });
          const last5 = res.items.filter((r) => r.year > CURRENT_YEAR - 5);
          setTrendRows(last5);
        }
      } catch (err) {
        console.error("Failed to fetch trend data", err);
      } finally {
        setTrendLoading(false);
      }
    };
    fetchTrend();
  }, [trendType, year, id, productId]);

  const handleDelete = async () => {
    if (!deleteRow) return;
    try {
      await api.deleteTarget(deleteRow.id);
      toast.success("Target deleted");
      setDeleteRow(null);
      loadPerformance();
    } catch (err) {
      toast.error("Failed to delete", { description: (err as Error).message });
    }
  };

  const filteredTargets = useMemo(() => {
    if (!performance?.targets) return [];
    if (productId === "all") return performance.targets;
    return performance.targets.filter(d => String(d.product.id) === productId);
  }, [performance, productId]);

  const displayTotals = useMemo(() => {
    if (!performance) return { target: 0, achievement: 0, percentage: 0 };
    if (productId === "all") {
      return {
        target: performance.total_target,
        achievement: performance.total_achievement,
        percentage: performance.percentage,
      };
    }
    const target = filteredTargets.reduce((sum, t) => sum + t.nominal, 0);
    const achievement = filteredTargets.reduce((sum, t) => sum + t.total_achievement, 0);
    const percentage = target > 0 ? (achievement / target) * 100 : 0;
    return { target, achievement, percentage };
  }, [filteredTargets, performance, productId]);

  const chartData = useMemo(() => {
    return filteredTargets.map(d => ({
      name: d.product.name,
      Target: d.nominal,
      Achievement: d.total_achievement,
    }));
  }, [filteredTargets]);

  const trendChartData = useMemo(() => {
    if (trendType === "MoM") {
      const monthsData = Array.from({ length: 12 }, (_, i) => ({
        name: MONTHS[i].substring(0, 3),
        Target: 0,
        Achievement: 0,
      }));
      trendRows.forEach((r) => {
        if (r.month >= 1 && r.month <= 12) {
          monthsData[r.month - 1].Target += r.nominal || 0;
          monthsData[r.month - 1].Achievement += r.total_achievement || 0;
        }
      });
      return monthsData;
    } else {
      const yearsMap = new Map<number, { name: string; Target: number; Achievement: number }>();
      trendRows.forEach((r) => {
        const existing = yearsMap.get(r.year) || { name: String(r.year), Target: 0, Achievement: 0 };
        existing.Target += r.nominal || 0;
        existing.Achievement += r.total_achievement || 0;
        yearsMap.set(r.year, existing);
      });
      return Array.from(yearsMap.values()).sort((a, b) => Number(a.name) - Number(b.name));
    }
  }, [trendRows, trendType]);

  const generatePDF = () => {
    if (filteredTargets.length === 0) {
      toast.error("No data to export");
      return;
    }
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const M = 18; // page margin

    // Brand colors
    const NAVY: [number, number, number] = [15, 27, 61];      // #0F1B3D
    const NAVY_SOFT: [number, number, number] = [30, 58, 95]; // #1E3A5F
    const GOLD: [number, number, number] = [201, 168, 76];    // #C9A84C
    const INK: [number, number, number] = [30, 41, 59];
    const MUTED: [number, number, number] = [110, 120, 140];
    const LINE: [number, number, number] = [226, 232, 240];
    const ROW_ALT: [number, number, number] = [248, 250, 252];

    // ===== HEADER BAR (navy) =====
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, pageWidth, 32, "F");
    // Gold accent rule
    doc.setFillColor(...GOLD);
    doc.rect(0, 32, pageWidth, 1.2, "F");

    // Logo
    try {
      doc.addImage("/src/assets/logo-icon.png", "PNG", M, 8, 16, 16);
    } catch (e) {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(M, 8, 16, 16, 2, 2, "F");
    }

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("BANK GALUH", M + 21, 15);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(210, 220, 235);
    doc.text("Perumda BPR Galuh Ciamis", M + 21, 19.8);
    doc.text("Jl. MR Iwa Kusumasoemantri, Ciamis, Jawa Barat 46211  ·  Telp (0265) 7579981", M + 21, 23.6);

    // Document type stamp on the right
    doc.setFontSize(7.5);
    doc.setTextColor(...GOLD);
    doc.text("INTERNAL DOCUMENT", pageWidth - M, 13.5, { align: "right" });
    doc.setTextColor(220, 230, 245);
    doc.setFontSize(7);
    doc.text(`Generated · ${format(new Date(), "dd MMM yyyy, HH:mm")}`, pageWidth - M, 18, { align: "right" });

    // ===== TITLE =====
    let y = 46;
    doc.setTextColor(...NAVY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("Employee Performance Report", M, y);

    const periodStr = month === "0" ? "All Time" : `${MONTHS[Number(month) - 1]} ${year}`;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    y += 5.5;
    doc.text(`Reporting Period: ${periodStr}`, M, y);

    // ===== INFO PANEL (single, clean two-column) =====
    y += 6;
    doc.setDrawColor(...LINE);
    doc.setFillColor(252, 253, 255);
    doc.roundedRect(M, y, pageWidth - 2 * M, 32, 1.5, 1.5, "FD");

    const colW = (pageWidth - 2 * M) / 2;
    const padX = 6;
    const labelY = y + 7;
    const valueY = y + 13;

    // Left col — employee
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text("EMPLOYEE", M + padX, labelY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...INK);
    doc.text(employee?.name || "—", M + padX, valueY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text(`${employee?.position || "—"}  ·  ID ${String(id).slice(0, 8)}`, M + padX, valueY + 5);

    // Right col — summary numbers
    const rx = M + colW + padX;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text("SUMMARY", rx, labelY);

    const sumLabelY = valueY;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text("Total Target", rx, sumLabelY);
    doc.text("Total Achievement", rx + 48, sumLabelY);
    doc.text("Progress", rx + 100, sumLabelY);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    doc.text(formatRupiah(displayTotals.target), rx, sumLabelY + 5);
    doc.text(formatRupiah(displayTotals.achievement), rx + 48, sumLabelY + 5);

    const pctColor: [number, number, number] =
      displayTotals.percentage >= 100 ? [16, 122, 84] : displayTotals.percentage < 50 ? [185, 28, 28] : [180, 130, 30];
    doc.setTextColor(...pctColor);
    doc.text(`${displayTotals.percentage.toFixed(1)}%`, rx + 100, sumLabelY + 5);

    y += 32;

    // ===== TABLE =====
    autoTable(doc, {
      startY: y + 6,
      head: [["Product", "Target Nominal", "Total Achievement", "Progress"]],
      body: filteredTargets.map((d) => {
        const pct = d.nominal > 0 ? (d.total_achievement / d.nominal) * 100 : 0;
        return [
          d.product.name,
          formatRupiah(d.nominal),
          formatRupiah(d.total_achievement),
          `${pct.toFixed(1)}%`,
        ];
      }),
      theme: "plain",
      headStyles: {
        fillColor: NAVY_SOFT,
        textColor: 255,
        fontStyle: "bold",
        fontSize: 8.5,
        cellPadding: { top: 3.5, bottom: 3.5, left: 5, right: 5 },
      },
      bodyStyles: {
        fontSize: 9,
        textColor: INK,
        cellPadding: { top: 3.5, bottom: 3.5, left: 5, right: 5 },
        lineColor: LINE,
        lineWidth: { bottom: 0.2 } as any,
      },
      alternateRowStyles: { fillColor: ROW_ALT },
      columnStyles: {
        1: { halign: "right" },
        2: { halign: "right" },
        3: { halign: "right", fontStyle: "bold" },
      },
      margin: { left: M, right: M },
    });

    // ===== SIGNATURE =====
    const finalY = (doc as any).lastAutoTable.finalY + 18;
    const sigW = 58;
    const sigX = pageWidth - M - sigW;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...INK);
    doc.text(`Ciamis, ${format(new Date(), "dd MMMM yyyy")}`, sigX, finalY);
    doc.text("Approved by,", sigX, finalY + 5);

    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.3);
    doc.line(sigX, finalY + 28, sigX + sigW, finalY + 28);
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text("Branch Manager", sigX, finalY + 33);

    // ===== FOOTER =====
    doc.setDrawColor(...LINE);
    doc.line(M, pageHeight - 14, pageWidth - M, pageHeight - 14);
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text("Bank Galuh · Confidential — for internal use only", M, pageHeight - 9);
    doc.text("Page 1 of 1", pageWidth - M, pageHeight - 9, { align: "right" });

    const saveName = `Performance_${employee?.name || "Employee"}_${periodStr.replace(/\s+/g, "_")}.pdf`;
    doc.save(saveName);
    toast.success("PDF Report downloaded");
  };

  return (
    <DashboardLayout 
      title={employee ? `${employee.name}'s Performance` : "Employee Performance"} 
      subtitle="Detailed target and achievement breakdown for a specific employee."
    >
      <div className="mb-6 flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link to="/employees">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Employees
          </Link>
        </Button>
      </div>

      {/* 1. FILTER SECTION */}
      <Card className="mb-6 border-border/60 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">Period Selection</CardTitle>
          <div className="flex gap-2">
             <Button variant="outline" size="sm" onClick={generatePDF} className="h-8 gap-2">
              <FileDown className="h-3.5 w-3.5" /> Export PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Month</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">All Time</SelectItem>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Year</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">All Time</SelectItem>
                  {YEARS.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Product</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  {products.map((p) => (
                    <SelectItem key={String(p.id)} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. SUMMARY WIDGETS */}
      {performance && !loading && (
        <div className="mb-6 grid gap-4 md:grid-cols-3 animate-in fade-in slide-in-from-top-4 duration-500">
          <Card className="border-border/60 shadow-sm bg-indigo-50/30">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Total Target</p>
                <p className="text-xl font-bold text-slate-900">{formatRupiah(displayTotals.target)}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                <TargetIcon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60 shadow-sm bg-emerald-50/30">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Total Achieved</p>
                <p className="text-xl font-bold text-slate-900">{formatRupiah(displayTotals.achievement)}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                <TrendingUp className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60 shadow-sm bg-white">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Overall Progress</p>
                <p className={cn("text-xl font-bold", pctTone(displayTotals.percentage))}>
                  {displayTotals.percentage.toFixed(1)}%
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-16">
                  <Progress value={Math.min(100, displayTotals.percentage)} className="h-1.5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 3. CHARTS SECTION */}
      <div className="mb-6 grid gap-6 lg:grid-cols-2 animate-in fade-in slide-in-from-top-4 duration-700">
        {/* Product Comparison Chart */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Target vs Achievement by Product</CardTitle>
            <p className="text-xs text-muted-foreground">Snapshot for current selection.</p>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 && !loading ? (
              <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">No data for the selected period.</div>
            ) : (
              <div className="h-[300px] w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                      angle={-30}
                      textAnchor="end"
                      interval={0}
                      height={60}
                    />
                    <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={compactRp} axisLine={false} tickLine={false} width={80} />
                    <Tooltip formatter={(v: number) => formatRupiah(v)} contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 8px 20px rgba(0,0,0,0.08)", fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 20 }} />
                    <Line type="monotone" dataKey="Target" stroke="#1e3a5f" strokeWidth={3} dot={{ r: 4, fill: "#1e3a5f", strokeWidth: 2, stroke: "#fff" }} />
                    <Line type="monotone" dataKey="Achievement" stroke="#c9a84c" strokeWidth={3} dot={{ r: 4, fill: "#c9a84c", strokeWidth: 2, stroke: "#fff" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Growth Trend Chart (MoM/YoY) */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-semibold">Performance Trend</CardTitle>
              <p className="text-xs text-muted-foreground">
                {trendType === "MoM" ? `Monthly for ${year === "0" ? "All-Time" : year}` : "Year-over-Year (Last 5 years)"}
              </p>
            </div>
            <div className="flex items-center gap-1 rounded-md border border-border p-1">
              <Button
                variant={trendType === "MoM" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2.5 text-[11px]"
                onClick={() => setTrendType("MoM")}
              >
                MoM
              </Button>
              <Button
                variant={trendType === "YoY" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2.5 text-[11px]"
                onClick={() => setTrendType("YoY")}
              >
                YoY
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {trendLoading ? (
              <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : trendChartData.length === 0 ? (
              <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">No historical data.</div>
            ) : (
              <div className="h-[300px] w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendChartData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={compactRp} axisLine={false} tickLine={false} width={80} />
                    <Tooltip formatter={(v: number) => formatRupiah(v)} contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 8px 20px rgba(0,0,0,0.08)", fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 20 }} />
                    <Line type="monotone" dataKey="Target" stroke="#1e3a5f" strokeWidth={2} dot={{ r: 3, fill: "#1e3a5f" }} />
                    <Line type="monotone" dataKey="Achievement" stroke="#c9a84c" strokeWidth={2} dot={{ r: 3, fill: "#c9a84c" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 4. TABLE SECTION */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Targets & Achievements List</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...
            </div>
          ) : filteredTargets.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No performance data found for this period.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Nominal Target</TableHead>
                  <TableHead className="text-right">Total Achievement</TableHead>
                  <TableHead className="w-[200px]">Progress</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTargets.map((d, idx) => {
                  const pct = d.nominal > 0 ? (d.total_achievement / d.nominal) * 100 : 0;
                  // Construct a row object that matches what the dialogs expect
                  const row = {
                    id: d.id,
                    nominal: d.nominal,
                    total_achievement: d.total_achievement,
                    product: { name: d.product.name },
                    employee: { name: employee?.name || "Employee" },
                    month: Number(month),
                    year: Number(year),
                  } as any;
                  
                  return (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{d.product.name}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatRupiah(d.nominal)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatRupiah(d.total_achievement)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={Math.min(100, pct)} className="h-2" />
                          <span className={cn("w-12 text-right text-xs font-medium tabular-nums", pctTone(pct))}>
                            {pct.toFixed(0)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {d.target_id && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => setAchRow(row)} title="Record Achievement">
                                <TrendingUp className="mr-1 h-3.5 w-3.5" /> Record
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditRow(row)} title="Edit Nominal">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setHistoryRow(row)} title="History">
                                <History className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setDeleteRow(row)} className="text-destructive hover:text-destructive hover:bg-destructive/10" title="Delete Target">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 5. DIALOGS (Imported from targets.tsx logic) */}
      {/* Note: In a real app, these would be exported from targets.tsx or moved to components/ */}
      <RecordAchievementDialog
        row={achRow}
        onOpenChange={(v) => !v && setAchRow(null)}
        onSaved={() => { setAchRow(null); loadPerformance(); }}
      />

      <HistoryDialog
        row={historyRow}
        onOpenChange={(v) => !v && setHistoryRow(null)}
      />

      <EditNominalDialog
        row={editRow}
        onOpenChange={(v) => !v && setEditRow(null)}
        onSaved={() => { setEditRow(null); loadPerformance(); }}
      />

      <AlertDialog open={!!deleteRow} onOpenChange={(v) => !v && setDeleteRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this target?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the target for <b>{deleteRow?.product?.name}</b>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
