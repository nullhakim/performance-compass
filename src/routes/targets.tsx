import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  Plus,
  History,
  Trash2,
  TrendingUp,
  Target as TargetIcon,
  FileDown,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  formatDate,
  type Achievement,
  type Employee,
  type Product,
  type TargetRow,
} from "@/lib/api";
import { RecordAchievementDialog, HistoryDialog, EditNominalDialog } from "@/components/target-dialogs";

export const Route = createFileRoute("/targets")({
  head: () => ({ meta: [{ title: "Targets — Bank Galuh" }] }),
  component: TargetsPage,
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

function TargetsPage() {
  const now = new Date();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [month, setMonth] = useState<string>(String(now.getMonth() + 1));
  const [year, setYear] = useState<string>(String(now.getFullYear()));
  const [productId, setProductId] = useState<string>("all");
  const [page, setPage] = useState(1);
  const limit = 10;

  const [rows, setRows] = useState<TargetRow[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // Trend Chart State
  const [trendType, setTrendType] = useState<"MoM" | "YoY">("MoM");
  const [trendRows, setTrendRows] = useState<TargetRow[]>([]);
  const [trendLoading, setTrendLoading] = useState(false);

  // dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<TargetRow | null>(null);
  const [achRow, setAchRow] = useState<TargetRow | null>(null);
  const [historyRow, setHistoryRow] = useState<TargetRow | null>(null);
  const [deleteRow, setDeleteRow] = useState<TargetRow | null>(null);

  useEffect(() => {
    Promise.all([api.getEmployees(), api.getProducts()])
      .then(([emps, prods]) => {
        setEmployees(emps || []);
        setProducts(prods || []);
      })
      .catch((err: Error) => toast.error("Failed to load reference data", { description: err.message }));
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchTargets({
        page,
        limit,
        month: Number(month),
        year: Number(year),
        product_id: productId === "all" ? "" : productId,
      });
      setRows(res.items);
      setTotalPages(res.total_pages);
      setTotal(res.total);
    } catch (err) {
      toast.error("Failed to load targets", { description: (err as Error).message });
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  // Reset to page 1 on filter change
  useEffect(() => { setPage(1); }, [month, year, productId]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, month, year, productId]);

  useEffect(() => {
    const fetchTrend = async () => {
      setTrendLoading(true);
      try {
        if (trendType === "MoM") {
          // Fetch all targets for the selected year to show monthly progression
          const res = await fetchTargets({
            limit: 2000,
            month: 0,
            year: Number(year) || CURRENT_YEAR,
            product_id: productId === "all" ? "" : productId,
          });
          setTrendRows(res.items);
        } else {
          // Fetch targets for the last 5 years for YoY
          const res = await fetchTargets({
            limit: 5000,
            month: 0,
            year: 0, // All years
            product_id: productId === "all" ? "" : productId,
          });
          // Filter to last 5 years manually if backend doesn't support range
          const last5 = res.items.filter(r => r.year > CURRENT_YEAR - 5);
          setTrendRows(last5);
        }
      } catch (err) {
        console.error("Failed to fetch trend data", err);
      } finally {
        setTrendLoading(false);
      }
    };
    fetchTrend();
  }, [trendType, year, productId]);

  const handleDelete = async () => {
    if (!deleteRow) return;
    try {
      await api.deleteTarget(deleteRow.id);
      toast.success("Target deleted");
      setDeleteRow(null);
      load();
    } catch (err) {
      toast.error("Failed to delete", { description: (err as Error).message });
    }
  };

  // --- Calculations for Widgets & Chart (Current Page Data) ---
  const pageTotalTarget = rows.reduce((sum, r) => sum + (r.nominal || 0), 0);
  const pageTotalAch = rows.reduce((sum, r) => sum + (r.total_achievement || 0), 0);
  const pagePercentage = pageTotalTarget > 0 ? (pageTotalAch / pageTotalTarget) * 100 : 0;

  const chartData = useMemo(() => {
    const grouped = new Map<string, { name: string; Target: number; Achievement: number }>();
    rows.forEach((r) => {
      const pName = r.product?.name || "Unknown";
      const existing = grouped.get(pName) || { name: pName, Target: 0, Achievement: 0 };
      existing.Target += r.nominal || 0;
      existing.Achievement += r.total_achievement || 0;
      grouped.set(pName, existing);
    });
    return Array.from(grouped.values());
  }, [rows]);

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

  // --- PDF Generation ---
  const generatePDF = () => {
    if (rows.length === 0) {
      toast.error("No data to export");
      return;
    }
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const M = 18;

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
    doc.text("Targets & Achievements Report", M, y);

    const periodStr = month === "0" && year === "0" ? "All-Time" : `${month === "0" ? "All" : MONTHS[Number(month) - 1]} ${year === "0" ? "All" : year}`;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    y += 5.5;
    doc.text(`Reporting Period: ${periodStr}`, M, y);

    // ===== INFO PANEL =====
    y += 6;
    doc.setDrawColor(...LINE);
    doc.setFillColor(252, 253, 255);
    doc.roundedRect(M, y, pageWidth - 2 * M, 32, 1.5, 1.5, "FD");

    const colW = (pageWidth - 2 * M) / 2;
    const padX = 6;
    const labelY = y + 7;
    const valueY = y + 13;

    // Left col — filter criteria
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text("FILTER CRITERIA", M + padX, labelY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...INK);
    const prodText = productId === "all" ? "All Products" : products.find(p => String(p.id) === productId)?.name || "N/A";
    doc.text(prodText, M + padX, valueY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text(`Period: ${periodStr}`, M + padX, valueY + 5);

    // Right col — page summary
    const rx = M + colW + padX;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text("PAGE SUMMARY", rx, labelY);

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
    doc.text(formatRupiah(pageTotalTarget), rx, sumLabelY + 5);
    doc.text(formatRupiah(pageTotalAch), rx + 48, sumLabelY + 5);

    const pctColor: [number, number, number] =
      pagePercentage >= 100 ? [16, 122, 84] : pagePercentage < 50 ? [185, 28, 28] : [180, 130, 30];
    doc.setTextColor(...pctColor);
    doc.text(`${pagePercentage.toFixed(1)}%`, rx + 100, sumLabelY + 5);

    y += 32;

    // ===== TABLE =====
    autoTable(doc, {
      startY: y + 6,
      head: [["Employee", "Product", "Target Nominal", "Achievement", "Progress"]],
      body: rows.map((r) => {
        const pct = r.nominal > 0 ? (r.total_achievement / r.nominal) * 100 : 0;
        return [
          r.employee?.name || "—",
          r.product?.name || "—",
          formatRupiah(r.nominal || 0),
          formatRupiah(r.total_achievement || 0),
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
        fontSize: 8.5,
        textColor: INK,
        cellPadding: { top: 3.5, bottom: 3.5, left: 5, right: 5 },
        lineColor: LINE,
        lineWidth: { bottom: 0.1 } as any,
      },
      alternateRowStyles: { fillColor: ROW_ALT },
      columnStyles: {
        2: { halign: "right" },
        3: { halign: "right" },
        4: { halign: "right", fontStyle: "bold" },
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
    doc.text("Verified by,", sigX, finalY + 5);

    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.3);
    doc.line(sigX, finalY + 28, sigX + sigW, finalY + 28);
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text("Operation Manager", sigX, finalY + 33);

    // ===== FOOTER =====
    doc.setDrawColor(...LINE);
    doc.line(M, pageHeight - 14, pageWidth - M, pageHeight - 14);
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text("Bank Galuh · Confidential — for internal use only", M, pageHeight - 9);
    doc.text(`Page 1 of 1`, pageWidth - M, pageHeight - 9, { align: "right" });

    doc.save(`Targets_Report_${format(new Date(), "yyyyMMdd")}.pdf`);
    toast.success("PDF Report downloaded");
  };

  return (
    <DashboardLayout title="Targets & Achievements" subtitle="Manage targets and record achievements globally.">

      {/* 1. FILTER SECTION */}
      <Card className="mb-6 border-border/60 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1 grid gap-4 grid-cols-2 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Month</Label>
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">All-Time</SelectItem>
                    {MONTHS.map((m, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Year</Label>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">All-Time</SelectItem>
                    {YEARS.map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 md:col-span-1 space-y-1.5">
                <Label className="text-xs">Product</Label>
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
            <Button onClick={() => setCreateOpen(true)} className="md:w-auto">
              <Plus className="mr-1.5 h-4 w-4" /> Assign New Target
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 2. SUMMARY WIDGETS */}
      {rows.length > 0 && !loading && (
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <KpiCard label="Page Total Target" value={formatRupiah(pageTotalTarget)} icon={<TargetIcon className="h-5 w-5" />} tone="indigo" />
          <KpiCard label="Page Total Achieved" value={formatRupiah(pageTotalAch)} icon={<TrendingUp className="h-5 w-5" />} tone="emerald" />
          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-6">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Overall Progress</p>
              <p className={`mt-3 text-2xl font-bold tabular-nums ${pctTone(pagePercentage)}`}>{pagePercentage.toFixed(1)}%</p>
              <Progress value={Math.min(100, pagePercentage)} className="mt-3 h-2" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* 3. CHARTS SECTION */}
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
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

      {/* 4. TABLE SECTION (PAGINATED) */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-base font-semibold">Targets List</CardTitle>
            <p className="text-xs text-muted-foreground">{total} record{total !== 1 ? "s" : ""} overall</p>
          </div>
          <Button variant="outline" size="sm" onClick={generatePDF} className="h-8 gap-2">
            <FileDown className="h-3.5 w-3.5" /> Export PDF
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Nominal Target</TableHead>
                    <TableHead className="text-right">Total Achievement</TableHead>
                    <TableHead className="w-[200px]">Progress</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                        No targets found for the selected filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((r) => {
                      const pct = r.nominal > 0 ? (r.total_achievement / r.nominal) * 100 : 0;
                      return (
                        <TableRow key={String(r.id)}>
                          <TableCell className="font-medium">
                            {r.employee ? (
                              <Link 
                                to="/employees/$id/performance" 
                                params={{ id: String(r.employee.id) }}
                                className="hover:text-indigo-600 hover:underline transition-colors"
                              >
                                {r.employee.name}
                              </Link>
                            ) : "—"}
                          </TableCell>
                          <TableCell>{r.product?.name ?? "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {MONTHS[(r.month ?? 1) - 1]} {r.year}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{formatRupiah(r.nominal)}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatRupiah(r.total_achievement)}</TableCell>
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
                              <Button size="sm" variant="outline" onClick={() => setAchRow(r)}>
                                <TrendingUp className="mr-1 h-3.5 w-3.5" /> Record
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setHistoryRow(r)} title="History">
                                <History className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditRow(r)} title="Edit">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setDeleteRow(r)} title="Delete">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>

              {/* PAGINATION CONTROLS */}
              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                    <ChevronLeft className="mr-1 h-4 w-4" /> Previous
                  </Button>
                  <Button size="sm" variant="outline" disabled={page >= totalPages || loading} onClick={() => setPage((p) => p + 1)}>
                    Next <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 5. DIALOGS */}
      <CreateTargetDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        employees={employees}
        products={products}
        defaults={{ month, year }}
        onCreated={() => { setCreateOpen(false); load(); }}
      />

      <EditNominalDialog
        row={editRow}
        onOpenChange={(v) => !v && setEditRow(null)}
        onSaved={() => { setEditRow(null); load(); }}
      />

      <RecordAchievementDialog
        row={achRow}
        onOpenChange={(v) => !v && setAchRow(null)}
        onSaved={() => { setAchRow(null); load(); }}
      />

      <HistoryDialog
        row={historyRow}
        onOpenChange={(v) => !v && setHistoryRow(null)}
      />

      <AlertDialog open={!!deleteRow} onOpenChange={(v) => !v && setDeleteRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this target?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the target for <b>{deleteRow?.employee?.name}</b> — <b>{deleteRow?.product?.name}</b>.
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

function CreateTargetDialog({
  open, onOpenChange, employees, products, defaults, onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  employees: Employee[];
  products: Product[];
  defaults: { month: string; year: string };
  onCreated: () => void;
}) {
  const [employeeId, setEmployeeId] = useState("");
  const [productId, setProductId] = useState("");
  const [nominal, setNominal] = useState("");
  const [month, setMonth] = useState(defaults.month);
  const [year, setYear] = useState(defaults.year);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setEmployeeId("");
      setProductId("");
      setNominal("");
      setMonth(defaults.month && defaults.month !== "0" ? defaults.month : String(new Date().getMonth() + 1));
      setYear(defaults.year && defaults.year !== "0" ? defaults.year : String(new Date().getFullYear()));
    }
  }, [open, defaults]);

  const submit = async () => {
    if (!employeeId || !productId || !nominal || !month || !year) {
      toast.error("All fields are required");
      return;
    }
    setSaving(true);
    try {
      await api.createTarget({
        employee_id: employeeId,
        product_id: productId,
        nominal: Number(nominal),
        month: Number(month),
        year: Number(year),
      });
      toast.success("Target assigned");
      onCreated();
    } catch (err) {
      toast.error("Failed to assign target", { description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign New Target</DialogTitle>
          <DialogDescription>Set a monthly nominal target for an employee and product.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="space-y-1.5">
            <Label>Employee *</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
              <SelectContent>
                {employees.map((e) => <SelectItem key={String(e.id)} value={String(e.id)}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Product *</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
              <SelectContent>
                {products.map((p) => <SelectItem key={String(p.id)} value={String(p.id)}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Nominal (IDR) *</Label>
            <Input type="number" min={0} value={nominal} onChange={(e) => setNominal(e.target.value)} placeholder="50000000" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Month *</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Year *</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Target
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}