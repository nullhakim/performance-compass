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
  formatRupiah,
  type Employee,
  type PerformanceResult,
  type TargetDetail,
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

function EmployeePerformancePage() {
  console.log("Rendering EmployeePerformancePage");
  const { id } = Route.useParams();
  const now = new Date();
  
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [performance, setPerformance] = useState<PerformanceResult | null>(null);
  
  const [month, setMonth] = useState<string>(String(now.getMonth() + 1));
  const [year, setYear] = useState<string>(String(now.getFullYear()));
  const [loading, setLoading] = useState(false);

  // Dialog states
  const [achRow, setAchRow] = useState<any | null>(null);
  const [historyRow, setHistoryRow] = useState<any | null>(null);
  const [editRow, setEditRow] = useState<any | null>(null);
  const [deleteRow, setDeleteRow] = useState<any | null>(null);

  useEffect(() => {
    api.getEmployee(id)
      .then(setEmployee)
      .catch((err: Error) => toast.error("Failed to load employee info", { description: err.message }));
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

  const chartData = useMemo(() => {
    if (!performance?.targets) return [];
    return performance.targets.map(d => ({
      name: d.product.name,
      Target: d.nominal,
      Achievement: d.total_achievement,
    }));
  }, [performance]);

  const generatePDF = () => {
    if (!performance || !performance.targets || performance.targets.length === 0) {
      toast.error("No data to export");
      return;
    }
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // BANK HEADER WITH LOGO
    // We attempt to draw the logo. In a real app, you might want to pre-load this as a base64 string.
    try {
      doc.addImage("/src/assets/logo-icon.png", "PNG", 20, 12, 18, 18);
    } catch (e) {
      // Fallback if logo fails to load
      doc.setFillColor(79, 70, 229);
      doc.roundedRect(20, 12, 18, 18, 2, 2, "F");
    }

    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.text("Bank Galuh", 42, 20);
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("(Perumda BPR Galuh Ciamis)", 42, 25);
    doc.text("Jl. MR Iwa Kusumasoemantri, Kec. Ciamis, Kab. Ciamis, Jawa Barat 46211", 42, 29);
    doc.text("Telp: (0265) 7579981", 42, 33);

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(20, 38, pageWidth - 20, 38);

    doc.setFontSize(18);
    doc.setTextColor(79, 70, 229);
    doc.text("Employee Performance Report", pageWidth / 2, 52, { align: "center" });

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    const periodStr = month === "0" ? "All Time" : `${MONTHS[Number(month) - 1]} ${year}`;
    doc.text(`Period: ${periodStr}  |  Generated: ${format(new Date(), "PPP p")}`, pageWidth / 2, 60, { align: "center" });

    // Details Grid
    doc.setDrawColor(241, 245, 249);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(20, 70, (pageWidth - 40) / 2 - 5, 30, 2, 2, "FD");
    doc.roundedRect(pageWidth / 2 + 5, 70, (pageWidth - 40) / 2 - 5, 30, 2, 2, "FD");

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "bold");
    doc.text("EMPLOYEE DETAILS", 25, 77);
    doc.text("PERFORMANCE SUMMARY", pageWidth / 2 + 10, 77);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 41, 59);
    doc.text(`Name: ${employee?.name || "N/A"}`, 25, 84);
    doc.text(`Position: ${employee?.position || "N/A"}`, 25, 90);
    doc.text(`ID: ${id}`, 25, 96);

    doc.text(`Total Target: ${formatRupiah(performance.total_target)}`, pageWidth / 2 + 10, 84);
    doc.text(`Total Achievement: ${formatRupiah(performance.total_achievement)}`, pageWidth / 2 + 10, 90);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(79, 70, 229);
    doc.text(`Overall Progress: ${performance.percentage.toFixed(1)}%`, pageWidth / 2 + 10, 96);

    const tableData = performance.targets.map((d) => {
      const pct = d.nominal > 0 ? (d.total_achievement / d.nominal) * 100 : 0;
      return [
        d.product.name,
        formatRupiah(d.nominal),
        formatRupiah(d.total_achievement),
        `${pct.toFixed(1)}%`,
      ];
    });

    autoTable(doc, {
      startY: 110,
      head: [["Product", "Target Nominal", "Total Achievement", "Progress"]],
      body: tableData,
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 20, right: 20 },
      styles: { fontSize: 9, cellPadding: 4 },
    });

    // Signature Area
    const finalY = (doc as any).lastAutoTable.finalY + 30;
    const signatureWidth = 50;
    const signatureX = pageWidth - 20 - signatureWidth;

    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "normal");
    doc.text("Ciamis, " + format(new Date(), "dd MMMM yyyy"), signatureX, finalY);
    doc.text("Approved by,", signatureX, finalY + 7);
    
    doc.setDrawColor(203, 213, 225);
    doc.line(signatureX, finalY + 35, signatureX + signatureWidth, finalY + 35);
    doc.setFontSize(9);
    doc.text("Branch Manager", signatureX, finalY + 40);

    const saveName = `Performance_${employee?.name}_${periodStr.replace(/\s+/g, '_')}.pdf`;
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
          <div className="grid gap-4 md:grid-cols-2">
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
                <p className="text-xl font-bold text-slate-900">{formatRupiah(performance.total_target)}</p>
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
                <p className="text-xl font-bold text-slate-900">{formatRupiah(performance.total_achievement)}</p>
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
                <p className={cn("text-xl font-bold", pctTone(performance.percentage))}>
                  {performance.percentage.toFixed(1)}%
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-16">
                  <Progress value={Math.min(100, performance.percentage)} className="h-1.5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 3. CHART SECTION */}
      {chartData.length > 0 && !loading && (
        <Card className="mb-6 border-border/60 shadow-sm animate-in fade-in slide-in-from-top-4 duration-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Performance by Product</CardTitle>
            <p className="text-xs text-muted-foreground">Breakdown of targets vs achievements for the selected period.</p>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    tickFormatter={(v) => `Rp${v / 1000000}M`}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(v: number) => formatRupiah(v)}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                  <Line 
                    type="monotone" 
                    dataKey="Target" 
                    stroke="#6366f1" 
                    strokeWidth={3}
                    dot={{ r: 4, fill: "#6366f1", strokeWidth: 2, stroke: "#fff" }}
                    activeDot={{ r: 6 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="Achievement" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    dot={{ r: 4, fill: "#10b981", strokeWidth: 2, stroke: "#fff" }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

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
          ) : !performance || !performance.targets || performance.targets.length === 0 ? (
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
                {performance.targets.map((d, idx) => {
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
