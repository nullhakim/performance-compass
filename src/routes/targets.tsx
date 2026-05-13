import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  CalendarIcon,
  Loader2,
  Pencil,
  Plus,
  Target as TargetIcon,
  Trash2,
  TrendingUp,
  History,
  Calculator,
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
  formatRupiah,
  formatDate,
  type Achievement,
  type Employee,
  type PerformanceResult,
  type Product,
  type TargetDetail,
  type Target,
} from "@/lib/api";

export const Route = createFileRoute("/targets")({
  head: () => ({ meta: [{ title: "Targets & Achievements — Performance Tracker" }] }),
  component: TargetsPage,
});

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 11 }, (_, i) => CURRENT_YEAR - 5 + i);

function pctTone(pct: number) {
  if (pct > 100) return "text-success";
  if (pct < 50) return "text-destructive";
  return "text-warning";
}

function TargetsPage() {
  const now = new Date();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [employeeId, setEmployeeId] = useState<string>("");
  const [month, setMonth] = useState<string>(String(now.getMonth() + 1));
  const [year, setYear] = useState<string>(String(now.getFullYear()));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PerformanceResult | null>(null);

  // dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TargetDetail | null>(null);
  const [achTarget, setAchTarget] = useState<TargetDetail | null>(null);
  const [historyTarget, setHistoryTarget] = useState<TargetDetail | null>(null);
  const [deleteTargetItem, setDeleteTargetItem] = useState<TargetDetail | null>(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([api.getEmployees(), api.getProducts()])
      .then(([emps, prods]) => {
        if (!mounted) return;
        setEmployees(emps || []);
        setProducts(prods || []);
      })
      .catch((err: Error) => toast.error("Failed to load reference data", { description: err.message }));
    return () => {
      mounted = false;
    };
  }, []);

  const mapTargetsArrayToResult = (targets: any[]): PerformanceResult => {
    const grouped = new Map<string, TargetDetail & { target_id?: string | number }>();
    targets.forEach((t) => {
      const productObj = t.product || { id: t.product_id, name: t.product_name };
      const key = String(productObj?.id ?? t.product_id ?? t.id ?? Math.random());
      const nominal = Number(t.nominal ?? t.nominal_target ?? 0) || 0;
      const ach = Number(t.total_achievement ?? t.achievement ?? 0) || 0;
      const existing = grouped.get(key);
      if (existing) {
        existing.nominal_target = (existing.nominal_target || 0) + nominal;
        existing.total_achievement = (existing.total_achievement || 0) + ach;
      } else {
        grouped.set(key, {
          product_name: productObj?.name || "",
          nominal_target: nominal,
          total_achievement: ach,
          target_id: t.id,
        });
      }
    });
    const details = Array.from(grouped.values()).map((g) => ({ ...g }));
    return {
      total_target: details.reduce((s, d) => s + (d.nominal_target || 0), 0),
      total_achievement: details.reduce((s, d) => s + (d.total_achievement || 0), 0),
      percentage: 0,
      details,
    };
  };

  const fetchPerformance = async (silent = false) => {
    if (!employeeId) {
      if (!silent) toast.error("Please select an employee");
      return;
    }
    setLoading(true);
    try {
      const dataRaw = await api.getPerformance(employeeId, Number(month), Number(year));
      
      let finalResult: PerformanceResult | null = null;
      if ((dataRaw as PerformanceResult).details && Array.isArray((dataRaw as PerformanceResult).details)) {
        finalResult = dataRaw as PerformanceResult;
      } else {
        const anyData = dataRaw as any;
        if (Array.isArray(anyData)) {
          finalResult = mapTargetsArrayToResult(anyData);
        } else if (Array.isArray(anyData.targets)) {
          finalResult = mapTargetsArrayToResult(anyData.targets);
        } else if (anyData.data) {
          const inner = anyData.data;
          if (inner.details && Array.isArray(inner.details)) finalResult = inner;
          else if (Array.isArray(inner)) finalResult = mapTargetsArrayToResult(inner);
        }
      }
      
      if (finalResult) {
        // Recalculate percentage if missing
        if (!finalResult.percentage && finalResult.total_target > 0) {
          finalResult.percentage = (finalResult.total_achievement / finalResult.total_target) * 100;
        }
        setResult(finalResult);
        if (!silent) toast.success("Performance calculated");
      }
    } catch (err) {
      if (!silent) toast.error("Failed to load targets", { description: (err as Error).message });
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (employeeId) fetchPerformance(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, month, year]);

  const handleDelete = async () => {
    if (!deleteTargetItem?.target_id) return;
    try {
      await api.deleteTarget(deleteTargetItem.target_id);
      toast.success("Target deleted");
      setDeleteTargetItem(null);
      fetchPerformance();
    } catch (err) {
      toast.error("Failed to delete", { description: (err as Error).message });
    }
  };

  const generatePDF = () => {
    if (!result || !employeeId) return;
    const employee = employees.find((e) => String(e.id) === employeeId);
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(20);
    doc.setTextColor(79, 70, 229); // Indigo-600
    doc.text("Performance Report", pageWidth / 2, 20, { align: "center" });
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text(`Generated on ${format(new Date(), "PPP p")}`, pageWidth / 2, 28, { align: "center" });

    // Employee Info
    doc.setDrawColor(226, 232, 240);
    doc.line(20, 35, pageWidth - 20, 35);
    
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.setFont("helvetica", "bold");
    doc.text("Employee Information", 20, 45);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Name: ${employee?.name || "N/A"}`, 20, 52);
    doc.text(`Position: ${employee?.position || "N/A"}`, 20, 58);
    doc.text(`Period: ${MONTHS[Number(month) - 1]} ${year}`, 20, 64);

    // Summary Metrics
    doc.setFont("helvetica", "bold");
    doc.text("Summary Metrics", 120, 45);
    doc.setFont("helvetica", "normal");
    doc.text(`Total Target: ${formatRupiah(result.total_target)}`, 120, 52);
    doc.text(`Total Achievement: ${formatRupiah(result.total_achievement)}`, 120, 58);
    doc.text(`Overall Percentage: ${result.percentage.toFixed(1)}%`, 120, 64);

    // Table
    const tableData = result.details.map((d) => [
      d.product_name,
      formatRupiah(d.nominal_target),
      formatRupiah(d.total_achievement),
      `${((d.total_achievement / (d.nominal_target || 1)) * 100).toFixed(1)}%`,
    ]);

    autoTable(doc, {
      startY: 75,
      head: [["Product", "Target", "Achievement", "Percentage"]],
      body: tableData,
      headStyles: { fillColor: [79, 70, 229], textColor: 255 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 20, right: 20 },
    });

    // Footer
    const finalY = (doc as any).lastAutoTable.finalY || 150;
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("This is an automatically generated document from Super App Internal.", pageWidth / 2, finalY + 20, { align: "center" });

    doc.save(`Performance_${employee?.name || "Employee"}_${month}_${year}.pdf`);
    toast.success("PDF Report downloaded");
  };

  return (
    <DashboardLayout title="Targets & Achievements" subtitle="Assign monthly targets and record achievements.">
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
              <Label>Employee</Label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={String(e.id)} value={String(e.id)}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Month</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
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
                  {YEARS.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end md:col-span-3">
              <Button onClick={() => fetchPerformance(false)} disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 shadow-sm">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calculator className="mr-2 h-4 w-4" />}
                Calculate Performance
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {result && (
        <div className="mb-6 grid gap-4 md:grid-cols-3 animate-in fade-in slide-in-from-top-4 duration-500">
          <Card className="border-border/60 shadow-sm bg-indigo-50/30">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Total Target</p>
                <p className="text-xl font-bold text-slate-900">{formatRupiah(result.total_target)}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                <TargetIcon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60 shadow-sm bg-emerald-50/30">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Total Achievement</p>
                <p className="text-xl font-bold text-slate-900">{formatRupiah(result.total_achievement)}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                <TrendingUp className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60 shadow-sm bg-white">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Overall Achievement</p>
                <p className={cn("text-xl font-bold", pctTone(result.percentage))}>
                  {result.percentage.toFixed(1)}%
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-16">
                  <Progress value={Math.min(100, result.percentage)} className="h-1.5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {result && (
        <div className="grid gap-6 mb-6 lg:grid-cols-3 animate-in fade-in slide-in-from-top-4 duration-700 delay-150">
          <Card className="border-border/60 shadow-sm lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base font-semibold">Target vs Achievement Trend</CardTitle>
                <p className="text-xs text-muted-foreground">Product-wise comparison for the selected period.</p>
              </div>
              <Button variant="outline" size="sm" onClick={generatePDF} className="h-8 gap-2">
                <FileDown className="h-3.5 w-3.5" /> Export PDF
              </Button>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={result.details.map(d => ({
                      name: d.product_name,
                      Target: d.nominal_target,
                      Achievement: d.total_achievement
                    }))}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 11, fill: "#64748b" }} 
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 11, fill: "#64748b" }} 
                      tickFormatter={(v) => `Rp${v/1000000}M`}
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

          <Card className="border-border/60 shadow-sm flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Distribution</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-center py-6">
              <div className="space-y-4">
                {result.details.slice(0, 5).map((d, i) => {
                  const pct = d.nominal_target > 0 ? (d.total_achievement / d.nominal_target) * 100 : 0;
                  return (
                    <div key={i} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-700 truncate max-w-[120px]">{d.product_name}</span>
                        <span className="text-slate-500">{pct.toFixed(0)}%</span>
                      </div>
                      <Progress value={Math.min(100, pct)} className="h-1" />
                    </div>
                  );
                })}
              </div>
              <p className="mt-8 text-center text-[11px] text-muted-foreground italic">
                Showing top 5 products by distribution.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Targets</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...
            </div>
          ) : !employeeId ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Select an employee to view targets.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Nominal Target</TableHead>
                  <TableHead className="text-right">Total Achievement</TableHead>
                  <TableHead className="w-[220px]">Progress</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(result?.details || []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                      No targets for this period.
                    </TableCell>
                  </TableRow>
                ) : (
                  result!.details.map((d, idx) => {
                    const pct = d.nominal_target > 0 ? (d.total_achievement / d.nominal_target) * 100 : 0;
                    return (
                      <TableRow key={String(d.target_id ?? idx)}>
                        <TableCell className="font-medium">{d.product_name}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatRupiah(d.nominal_target)}</TableCell>
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
                            <Button size="sm" variant="outline" onClick={() => setAchTarget(d)}>
                              <TrendingUp className="mr-1 h-3.5 w-3.5" /> Record
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setHistoryTarget(d)} title="History">
                              <History className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditTarget(d)} title="Edit">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setDeleteTargetItem(d)} title="Delete">
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
          )}
        </CardContent>
      </Card>

      <CreateTargetDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        employees={employees}
        products={products}
        defaults={{ employeeId, month, year }}
        onCreated={() => {
          setCreateOpen(false);
          fetchPerformance();
        }}
      />

      <EditNominalDialog
        target={editTarget}
        onOpenChange={(v) => !v && setEditTarget(null)}
        onSaved={() => {
          setEditTarget(null);
          fetchPerformance();
        }}
      />

      <RecordAchievementDialog
        target={achTarget}
        onOpenChange={(v) => !v && setAchTarget(null)}
        onSaved={() => {
          setAchTarget(null);
          fetchPerformance();
        }}
      />

      <HistoryDialog target={historyTarget} onOpenChange={(v) => !v && setHistoryTarget(null)} />

      <AlertDialog open={!!deleteTargetItem} onOpenChange={(v) => !v && setDeleteTargetItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this target?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the target for <b>{deleteTargetItem?.product_name}</b>.
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
  defaults: { employeeId: string; month: string; year: string };
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
      setEmployeeId(defaults.employeeId || "");
      setProductId("");
      setNominal("");
      setMonth(defaults.month);
      setYear(defaults.year);
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
                {employees.map((e) => (
                  <SelectItem key={String(e.id)} value={String(e.id)}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Product *</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={String(p.id)} value={String(p.id)}>{p.name}</SelectItem>
                ))}
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
                  {MONTHS.map((m, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Year *</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
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

function EditNominalDialog({
  target, onOpenChange, onSaved,
}: {
  target: TargetDetail | null;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [nominal, setNominal] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (target) setNominal(String(target.nominal_target ?? ""));
  }, [target]);

  const submit = async () => {
    if (!target?.target_id) return;
    if (!nominal) return toast.error("Nominal is required");
    setSaving(true);
    try {
      await api.updateTargetNominal(target.target_id, Number(nominal));
      toast.success("Target nominal updated");
      onSaved();
    } catch (err) {
      toast.error("Failed to update", { description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Nominal</DialogTitle>
          <DialogDescription>Update the target nominal for <b>{target?.product_name}</b>.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>Nominal (IDR)</Label>
          <Input type="number" min={0} value={nominal} onChange={(e) => setNominal(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RecordAchievementDialog({
  target, onOpenChange, onSaved,
}: {
  target: TargetDetail | null;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [nominal, setNominal] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (target) {
      setNominal("");
      setDescription("");
      setDate(new Date());
    }
  }, [target]);

  const submit = async () => {
    if (!target?.target_id) return;
    if (!nominal || !description || !date) {
      toast.error("All fields are required");
      return;
    }
    setSaving(true);
    try {
      const closingIso = new Date(date).toISOString().replace(/\.\d{3}Z$/, "Z");
      await api.createAchievement({
        target_id: target.target_id,
        nominal: Number(nominal),
        description,
        closing_date: closingIso,
      });
      toast.success("Achievement recorded");
      onSaved();
    } catch (err) {
      toast.error("Failed to record", { description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Achievement</DialogTitle>
          <DialogDescription>For target: <b>{target?.product_name}</b></DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="space-y-1.5">
            <Label>Nominal (IDR) *</Label>
            <Input type="number" min={0} value={nominal} onChange={(e) => setNominal(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Description *</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Closing details..." />
          </div>
          <div className="space-y-1.5">
            <Label>Closing Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={date} onSelect={setDate} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Achievement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HistoryDialog({
  target, onOpenChange,
}: {
  target: TargetDetail | null;
  onOpenChange: (v: boolean) => void;
}) {
  const [items, setItems] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!target?.target_id) return;
    setLoading(true);
    setItems([]);
    api.getTargetAchievements(target.target_id)
      .then((d) => setItems(d || []))
      .catch((err: Error) => toast.error("Failed to load history", { description: err.message }))
      .finally(() => setLoading(false));
  }, [target]);

  const total = useMemo(() => items.reduce((s, a) => s + (a.nominal || 0), 0), [items]);

  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Achievement History</DialogTitle>
          <DialogDescription>Ledger for <b>{target?.product_name}</b></DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...
          </div>
        ) : items.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">No achievements recorded yet.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Closing Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Nominal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((a) => (
                <TableRow key={String(a.id)}>
                  <TableCell>{formatDate(a.closing_date)}</TableCell>
                  <TableCell className="max-w-[280px] truncate" title={a.description}>{a.description}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatRupiah(a.nominal)}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={2} className="font-semibold">Total</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{formatRupiah(total)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
