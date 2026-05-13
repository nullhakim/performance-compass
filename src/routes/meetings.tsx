import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarIcon,
  FileText,
  Loader2,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  api,
  formatDate,
  formatRupiah,
  type Employee,
  type Meeting,
  type MeetingInput,
} from "@/lib/api";

export const Route = createFileRoute("/meetings")({
  head: () => ({
    meta: [
      { title: "Meeting Minutes — Super App Internal" },
      {
        name: "description",
        content: "Catat hasil rapat, daftar hadir, dan pantau status Action Items.",
      },
    ],
  }),
  component: MeetingsPage,
});

const MEETING_TYPES = ["Offline", "Online", "Hybrid"] as const;

type ResultDraft = {
  employee_id: string;
  target_description: string;
  target_nominal: string;
  target_completion_date?: Date;
};

const emptyResult = (): ResultDraft => ({
  employee_id: "",
  target_description: "",
  target_nominal: "",
  target_completion_date: undefined,
});

function MeetingsPage() {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // form state
  const [division, setDivision] = useState("");
  const [title, setTitle] = useState("");
  const [meetingType, setMeetingType] = useState<string>("Offline");
  const [summary, setSummary] = useState("");
  const [notes, setNotes] = useState("");
  const [speaker, setSpeaker] = useState("");
  const [meetingDate, setMeetingDate] = useState<Date | undefined>(undefined);
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [results, setResults] = useState<ResultDraft[]>([]);

  const employeeMap = useMemo(() => {
    const m = new Map<string, Employee>();
    employees.forEach((e) => m.set(String(e.id), e));
    return m;
  }, [employees]);

  const load = async () => {
    setLoading(true);
    try {
      const [m, emp] = await Promise.all([api.getMeetings(), api.getEmployees()]);
      setMeetings(Array.isArray(m) ? m : []);
      setEmployees(Array.isArray(emp) ? emp : []);
    } catch (e) {
      toast.error((e as Error).message || "Gagal memuat data rapat");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setDivision("");
    setTitle("");
    setMeetingType("Offline");
    setSummary("");
    setNotes("");
    setSpeaker("");
    setMeetingDate(undefined);
    setParticipantIds([]);
    setResults([]);
  };

  const toggleParticipant = (id: string) => {
    setParticipantIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  const handleSubmit = async () => {
    if (!division || !title || !meetingDate || !meetingType) {
      toast.error("Lengkapi field wajib (Division, Title, Type, Date)");
      return;
    }
    const payload: MeetingInput = {
      division,
      title,
      meeting_date: meetingDate.toISOString(),
      meeting_type: meetingType,
      summary,
      notes,
      speaker,
      participant_ids: participantIds,
      results: results
        .filter((r) => r.employee_id && r.target_description && r.target_completion_date)
        .map((r) => ({
          employee_id: r.employee_id,
          target_description: r.target_description,
          target_nominal: Number(r.target_nominal) || 0,
          target_completion_date: (r.target_completion_date as Date).toISOString(),
        })),
      image_urls: [],
    };

    setSubmitting(true);
    try {
      await api.createMeeting(payload);
      toast.success("Notulen rapat berhasil dibuat");
      setOpen(false);
      resetForm();
      load();
    } catch (e) {
      toast.error((e as Error).message || "Gagal menyimpan notulen");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-background to-indigo-50/40">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
              <Link to="/">
                <ArrowLeft className="h-4 w-4" />
                Main Menu
              </Link>
            </Button>
            <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
              <FileText className="h-7 w-7 text-primary" />
              Meeting Minutes
            </h1>
            <p className="text-sm text-muted-foreground">
              Daftar notulen rapat terbaru dan action items.
            </p>
          </div>
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Tambah Notulen
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Divisi</TableHead>
                  <TableHead>Judul Rapat</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead className="text-right">Peserta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : meetings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                      Belum ada notulen rapat.
                    </TableCell>
                  </TableRow>
                ) : (
                  meetings.map((m) => {
                    const count =
                      m.participants?.length ?? m.participant_ids?.length ?? 0;
                    return (
                      <TableRow
                        key={String(m.id)}
                        className="cursor-pointer"
                        onClick={() =>
                          navigate({ to: "/meetings/$id", params: { id: String(m.id) } })
                        }
                      >
                        <TableCell className="whitespace-nowrap">
                          {formatDate(m.meeting_date)}
                        </TableCell>
                        <TableCell>{m.division}</TableCell>
                        <TableCell className="font-medium">{m.title}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{m.meeting_type}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                            <Users className="h-3.5 w-3.5" />
                            {count}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tambah Notulen Rapat</DialogTitle>
            <DialogDescription>
              Catat informasi rapat, peserta, dan action items.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Division *</Label>
                <Input value={division} onChange={(e) => setDivision(e.target.value)} placeholder="Marketing" />
              </div>
              <div className="space-y-1.5">
                <Label>Meeting Type *</Label>
                <Select value={meetingType} onValueChange={setMeetingType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MEETING_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Rapat Evaluasi Q1" />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Meeting Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("justify-start text-left font-normal", !meetingDate && "text-muted-foreground")}
                    >
                      <CalendarIcon className="h-4 w-4" />
                      {meetingDate ? format(meetingDate, "PPP") : "Pilih tanggal"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={meetingDate}
                      onSelect={setMeetingDate}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <Label>Speaker</Label>
                <Input value={speaker} onChange={(e) => setSpeaker(e.target.value)} placeholder="Bapak Direktur" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Summary</Label>
              <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={2} />
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </div>

            <div className="space-y-2">
              <Label>Participants ({participantIds.length})</Label>
              {participantIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {participantIds.map((id) => (
                    <Badge key={id} variant="secondary" className="gap-1">
                      {employeeMap.get(id)?.name ?? id}
                      <button
                        type="button"
                        onClick={() => toggleParticipant(id)}
                        className="ml-0.5 rounded hover:bg-muted-foreground/20"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <div className="max-h-40 overflow-y-auto rounded-md border p-2">
                {employees.map((emp) => {
                  const id = String(emp.id);
                  const checked = participantIds.includes(id);
                  return (
                    <label
                      key={id}
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleParticipant(id)}
                      />
                      <span>{emp.name}</span>
                      <span className="text-xs text-muted-foreground">— {emp.position}</span>
                    </label>
                  );
                })}
                {employees.length === 0 && (
                  <p className="px-2 py-1 text-xs text-muted-foreground">Tidak ada karyawan.</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Action Items</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setResults((r) => [...r, emptyResult()])}
                >
                  <Plus className="h-3.5 w-3.5" /> Tambah Tugas
                </Button>
              </div>
              {results.length === 0 && (
                <p className="rounded-md border border-dashed py-4 text-center text-xs text-muted-foreground">
                  Belum ada tugas.
                </p>
              )}
              <div className="space-y-3">
                {results.map((r, idx) => (
                  <div key={idx} className="rounded-lg border p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Tugas #{idx + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setResults((rs) => rs.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Employee PIC</Label>
                        <Select
                          value={r.employee_id}
                          onValueChange={(v) =>
                            setResults((rs) => rs.map((x, i) => (i === idx ? { ...x, employee_id: v } : x)))
                          }
                        >
                          <SelectTrigger><SelectValue placeholder="Pilih PIC" /></SelectTrigger>
                          <SelectContent>
                            {employees.map((e) => (
                              <SelectItem key={String(e.id)} value={String(e.id)}>{e.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Target Nominal</Label>
                        <Input
                          type="number"
                          value={r.target_nominal}
                          onChange={(e) =>
                            setResults((rs) => rs.map((x, i) => (i === idx ? { ...x, target_nominal: e.target.value } : x)))
                          }
                          placeholder="50000000"
                        />
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <Label className="text-xs">Target Description</Label>
                        <Input
                          value={r.target_description}
                          onChange={(e) =>
                            setResults((rs) => rs.map((x, i) => (i === idx ? { ...x, target_description: e.target.value } : x)))
                          }
                          placeholder="Tingkatkan penjualan"
                        />
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <Label className="text-xs">Target Completion Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !r.target_completion_date && "text-muted-foreground",
                              )}
                            >
                              <CalendarIcon className="h-4 w-4" />
                              {r.target_completion_date
                                ? format(r.target_completion_date, "PPP")
                                : "Pilih tanggal"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={r.target_completion_date}
                              onSelect={(d) =>
                                setResults((rs) =>
                                  rs.map((x, i) => (i === idx ? { ...x, target_completion_date: d } : x)),
                                )
                              }
                              initialFocus
                              className={cn("p-3 pointer-events-auto")}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Batal
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Simpan Notulen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
