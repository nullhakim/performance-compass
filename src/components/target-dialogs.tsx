import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { api, formatRupiah, formatDate, type Achievement, type TargetRow } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function EditNominalDialog({
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

export function RecordAchievementDialog({
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
              <PopoverContent align="start" className="w-auto p-0">
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

export function HistoryDialog({
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
