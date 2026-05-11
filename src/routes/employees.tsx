import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Loader2, Users } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, type Employee, type EmployeeInput, formatDate } from "@/lib/api";

export const Route = createFileRoute("/employees")({
  head: () => ({ meta: [{ title: "Employees — Performance Tracker" }] }),
  component: EmployeesPage,
});

const empty: EmployeeInput = {
  name: "",
  position: "",
  office_location: "",
  entry_date: "",
};

function toIsoFromDateInput(value: string): string {
  // input type="date" returns YYYY-MM-DD; expand to ISO datetime
  if (!value) return "";
  if (value.length === 10) return `${value}T00:00:00Z`;
  return value;
}

function toDateInput(iso?: string): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function EmployeesPage() {
  const [rows, setRows] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState<EmployeeInput>(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await api.getEmployees();
      setRows(data ?? []);
    } catch (e) {
      toast.error("Failed to load employees", { description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  }

  function openEdit(emp: Employee) {
    setEditing(emp);
    setForm({
      name: emp.name,
      position: emp.position,
      office_location: emp.office_location,
      entry_date: toDateInput(emp.entry_date),
    });
    setOpen(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.position.trim() || !form.office_location.trim() || !form.entry_date) {
      toast.error("Please fill in all required fields");
      return;
    }
    const payload: EmployeeInput = {
      name: form.name.trim(),
      position: form.position.trim(),
      office_location: form.office_location.trim(),
      entry_date: toIsoFromDateInput(form.entry_date),
    };
    setSaving(true);
    try {
      if (editing) {
        await api.updateEmployee(editing.id, payload);
        toast.success("Employee updated");
      } else {
        await api.createEmployee(payload);
        toast.success("Employee created");
      }
      setOpen(false);
      load();
    } catch (e) {
      toast.error(editing ? "Update failed" : "Create failed", { description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout title="Employees" subtitle="Manage your sales workforce.">
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b p-4">
            <div>
              <p className="text-sm font-medium">All employees</p>
              <p className="text-xs text-muted-foreground">
                {loading ? "Loading…" : `${rows.length} record${rows.length === 1 ? "" : "s"}`}
              </p>
            </div>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> Add Employee
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Office Location</TableHead>
                <TableHead>Entry Date</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Users className="h-8 w-8" />
                      <span className="text-sm">No employees yet.</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((emp) => (
                  <TableRow key={String(emp.id)}>
                    <TableCell className="font-medium">{emp.name}</TableCell>
                    <TableCell>{emp.position}</TableCell>
                    <TableCell>{emp.office_location}</TableCell>
                    <TableCell>{formatDate(emp.entry_date)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(emp)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form onSubmit={onSubmit}>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Employee" : "Add Employee"}</DialogTitle>
              <DialogDescription>
                {editing ? "Update employee details." : "Register a new sales employee."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">Position</Label>
                <Input
                  id="position"
                  required
                  value={form.position}
                  onChange={(e) => setForm({ ...form, position: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="office_location">Office Location</Label>
                <Input
                  id="office_location"
                  required
                  value={form.office_location}
                  onChange={(e) => setForm({ ...form, office_location: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="entry_date">Entry Date</Label>
                <Input
                  id="entry_date"
                  type="date"
                  required
                  value={form.entry_date}
                  onChange={(e) => setForm({ ...form, entry_date: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? "Save changes" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
