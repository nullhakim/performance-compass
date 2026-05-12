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
  formatRupiah,
  formatDate,
  type Achievement,
  type Employee,
  type PerformanceResult,
  type Product,
  type TargetDetail,
} from "@/lib/api";

export const Route = createFileRoute("/targets")({
  head: () => ({ meta: [{ title: "Targets & Achievements — Performance Tracker" }] }),
  component: TargetsPage,
});

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

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

  const fetchPerformance = async () => {
    if (!employeeId) return;
    setLoading(true);
    try {
      const data = await api.getPerformance(employeeId, Number(month), Number(year));
      setResult(data);
    } catch (err) {
      toast.error("Failed to load targets", { description: (err as Error).message });
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (employeeId) fetchPerformance();
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
              <Input type="number" min={2000} max={2100} value={year} onChange={(e) => setYear(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

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
              <Input type="number" min={2000} max={2100} value={year} onChange={(e) => setYear(e.target.value)} />
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
      await api.createAchievement({
        target_id: target.target_id,
        nominal: Number(nominal),
        description,
        closing_date: format(date, "yyyy-MM-dd"),
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

// Avoid TS unused warning for ID import
