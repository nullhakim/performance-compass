import { createFileRoute } from "@tanstack/react-router";
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
} from "lucide-react";
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

  return (
    <DashboardLayout title="Targets & Achievements" subtitle="Manage targets and record achievements.">
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
                  {MONTHS.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Year</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">All-Time</SelectItem>
                  {YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Product</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  {products.map((p) => <SelectItem key={String(p.id)} value={String(p.id)}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-semibold">Targets</CardTitle>
          <p className="text-xs text-muted-foreground">{total} record{total !== 1 ? "s" : ""}</p>
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
                          <TableCell className="font-medium">{r.employee?.name ?? "—"}</TableCell>
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

      <CreateTargetDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        employees={employees}
        products={products}
        defaults={{ month, year }}
        onCreated={() => { setCreateOpen(false); load(); }}
      />

      <EditNominalDialog row={editRow} onOpenChange={(v) => !v && setEditRow(null)} onSaved={() => { setEditRow(null); load(); }} />

      <RecordAchievementDialog row={achRow} onOpenChange={(v) => !v && setAchRow(null)} onSaved={() => { setAchRow(null); load(); }} />

      <HistoryDialog row={historyRow} onOpenChange={(v) => !v && setHistoryRow(null)} />

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

function EditNominalDialog({
  row, onOpenChange, onSaved,
}: {
  row: TargetRow | null;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [nominal, setNominal] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (row) setNominal(String(row.nominal ?? "")); }, [row]);

  const submit = async () => {
    if (!row) return;
    if (!nominal) return toast.error("Nominal is required");
    setSaving(true);
    try {
      await api.updateTargetNominal(row.id, Number(nominal));
      toast.success("Target nominal updated");
      onSaved();
    } catch (err) {
      toast.error("Failed to update", { description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!row} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Nominal</DialogTitle>
          <DialogDescription>
            Update nominal for <b>{row?.employee?.name}</b> — <b>{row?.product?.name}</b>.
          </DialogDescription>
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
  row, onOpenChange, onSaved,
}: {
  row: TargetRow | null;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [nominal, setNominal] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (row) { setNominal(""); setDescription(""); setDate(new Date()); }
  }, [row]);

  const submit = async () => {
    if (!row) return;
    if (!nominal || !description || !date) {
      toast.error("All fields are required");
      return;
    }
    setSaving(true);
    try {
      const closingIso = new Date(date).toISOString().replace(/\.\d{3}Z$/, "Z");
      await api.createAchievement({
        target_id: row.id,
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
    <Dialog open={!!row} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Achievement</DialogTitle>
          <DialogDescription>
            For <b>{row?.employee?.name}</b> — <b>{row?.product?.name}</b>
          </DialogDescription>
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
  row, onOpenChange,
}: {
  row: TargetRow | null;
  onOpenChange: (v: boolean) => void;
}) {
  const [items, setItems] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!row) return;
    setLoading(true);
    setItems([]);
    api.getTargetAchievements(row.id)
      .then((d) => setItems(d || []))
      .catch((err: Error) => toast.error("Failed to load history", { description: err.message }))
      .finally(() => setLoading(false));
  }, [row]);

  const total = useMemo(() => items.reduce((s, a) => s + (a.nominal || 0), 0), [items]);

  return (
    <Dialog open={!!row} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Achievement History</DialogTitle>
          <DialogDescription>
            Ledger for <b>{row?.employee?.name}</b> — <b>{row?.product?.name}</b>
          </DialogDescription>
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
