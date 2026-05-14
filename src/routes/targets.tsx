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

  // --- PDF Generation ---
  const generatePDF = () => {
    if (rows.length === 0) {
      toast.error("No data to export");
      return;
    }
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    try {
      doc.addImage("/src/assets/logo-icon.png", "PNG", 20, 12, 18, 18);
    } catch (e) {
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
    doc.text("Targets & Achievements Report", pageWidth / 2, 52, { align: "center" });

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    const periodText = month === "0" && year === "0" ? "All-Time" : `${month === "0" ? "All" : MONTHS[Number(month) - 1]} ${year === "0" ? "All" : year}`;
    doc.text(`Period: ${periodText}  |  Generated: ${format(new Date(), "PPP p")}`, pageWidth / 2, 60, { align: "center" });

    // Summary Grid
    doc.setDrawColor(241, 245, 249);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(20, 70, (pageWidth - 40) / 2 - 5, 30, 2, 2, "FD");
    doc.roundedRect(pageWidth / 2 + 5, 70, (pageWidth - 40) / 2 - 5, 30, 2, 2, "FD");

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "bold");
    doc.text("FILTER CRITERIA", 25, 77);
    doc.text("PAGE SUMMARY", pageWidth / 2 + 10, 77);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 41, 59);
    const prodText = productId === "all" ? "All Products" : products.find(p => String(p.id) === productId)?.name || "N/A";
    doc.text(`Period: ${periodText}`, 25, 84);
    doc.text(`Product: ${prodText}`, 25, 90);

    doc.text(`Total Target: ${formatRupiah(pageTotalTarget)}`, pageWidth / 2 + 10, 84);
    doc.text(`Total Achievement: ${formatRupiah(pageTotalAch)}`, pageWidth / 2 + 10, 90);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(79, 70, 229);
    doc.text(`Progress: ${pagePercentage.toFixed(1)}%`, pageWidth / 2 + 10, 96);

    // Table
    const tableData = rows.map((r) => {
      const pct = r.nominal > 0 ? (r.total_achievement / r.nominal) * 100 : 0;
      return [
        r.employee?.name || "—",
        r.product?.name || "—",
        formatRupiah(r.nominal || 0),
        formatRupiah(r.total_achievement || 0),
        `${pct.toFixed(1)}%`,
      ];
    });

    autoTable(doc, {
      startY: 110,
      head: [["Employee", "Product", "Target Nominal", "Achievement", "Progress"]],
      body: tableData,
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      styles: { fontSize: 8, cellPadding: 3 },
    });

    // Signature Area
    const finalY = (doc as any).lastAutoTable.finalY + 30;
    const signatureWidth = 50;
    const signatureX = pageWidth - 20 - signatureWidth;

    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "normal");
    doc.text("Ciamis, " + format(new Date(), "dd MMMM yyyy"), signatureX, finalY);
    doc.text("Verified by,", signatureX, finalY + 7);
    
    doc.setDrawColor(203, 213, 225);
    doc.line(signatureX, finalY + 35, signatureX + signatureWidth, finalY + 35);
    doc.setFontSize(9);
    doc.text("Operation Manager", signatureX, finalY + 40);

    doc.save(`Targets_Report_${format(new Date(), "yyyyMMdd")}.pdf`);
    toast.success("PDF Report downloaded");
  };

  return (
    <DashboardLayout title="Targets & Achievements" subtitle="Manage targets and record achievements globally.">

      {/* 1. FILTER SECTION */}
      <Card className="mb-6 border-border/60 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">Filters</CardTitle>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Assign New Target
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Month</Label>
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
              <Label>Year</Label>
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

      {/* 2. SUMMARY WIDGETS (Visible if there is data) */}
      {rows.length > 0 && !loading && (
        <div className="mb-6 grid gap-4 md:grid-cols-3 animate-in fade-in slide-in-from-top-4 duration-500">
          <Card className="border-border/60 shadow-sm bg-indigo-50/30">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Page Total Target</p>
                <p className="text-xl font-bold text-slate-900">{formatRupiah(pageTotalTarget)}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                <TargetIcon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60 shadow-sm bg-emerald-50/30">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Page Total Achieved</p>
                <p className="text-xl font-bold text-slate-900">{formatRupiah(pageTotalAch)}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                <TrendingUp className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60 shadow-sm bg-white">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Page Overall Progress</p>
                <p className={cn("text-xl font-bold", pctTone(pagePercentage))}>
                  {pagePercentage.toFixed(1)}%
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-16">
                  <Progress value={Math.min(100, pagePercentage)} className="h-1.5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 3. LINE CHART SECTION */}
      {chartData.length > 0 && !loading && (
        <Card className="mb-6 border-border/60 shadow-sm animate-in fade-in slide-in-from-top-4 duration-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Target vs Achievement Trend</CardTitle>
            <p className="text-xs text-muted-foreground">Aggregated by product for the current view.</p>
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