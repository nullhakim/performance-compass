import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarIcon,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Users,
  X,
  LogOut,
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
import { logout } from "@/lib/auth";
const ReactQuill = lazy(() => import("react-quill-new"));
import "react-quill-new/dist/quill.snow.css";

export const Route = createFileRoute("/meetings/")({
  head: () => ({
    meta: [
      { title: "Meeting Minutes — Super App Internal" },
      {
        name: "description",
        content: "Record meeting minutes, attendance, and monitor Action Items status.",
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

import { DashboardLayout } from "@/components/dashboard-layout";

function MeetingsPage() {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // form state
  const [division, setDivision] = useState("");
  const [title, setTitle] = useState("");
  const [meetingType, setMeetingType] = useState<string>("Offline");
  const [summary, setSummary] = useState("");
  const [notes, setNotes] = useState("");
  const [speaker, setSpeaker] = useState("");
  const [location, setLocation] = useState("Gedung Utama");
  const [minuteTaker, setMinuteTaker] = useState("Bapak Admin");
  const [externalParticipants, setExternalParticipants] = useState<string[]>([]);
  const [extParticipantInput, setExtParticipantInput] = useState("");
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
      toast.error((e as Error).message || "Failed to load meeting data");
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
    setLocation("Gedung Utama");
    setMinuteTaker("Bapak Admin");
    setExternalParticipants([]);
    setExtParticipantInput("");
    setMeetingDate(undefined);
    setParticipantIds([]);
    setResults([]);
  };

  const toggleParticipant = (id: string) => {
    setParticipantIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  const handleAddExternalParticipant = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const val = extParticipantInput.trim();
      if (val && !externalParticipants.includes(val)) {
        setExternalParticipants([...externalParticipants, val]);
        setExtParticipantInput("");
      }
    }
  };

  const removeExternalParticipant = (name: string) => {
    setExternalParticipants(externalParticipants.filter(p => p !== name));
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
      location,
      minute_taker: minuteTaker,
      external_participants: externalParticipants,
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
      toast.success("Meeting minutes created successfully");
      setOpen(false);
      resetForm();
      load();
    } catch (e) {
      toast.error((e as Error).message || "Failed to save meeting minutes");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout title="Meeting Minutes" subtitle="List of meeting minutes and action items." hideMobileNav hideSidebar>
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 md:text-2xl">
            Recent Meetings
          </h2>
          <p className="text-sm text-slate-500">
            List of recent meeting minutes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => setOpen(true)}
            className="bg-[#153160] shadow-lg shadow-[#153160]/20 hover:bg-[#153160]/90"
          >
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Add Minutes</span>
            <span className="sm:hidden">Add</span>
          </Button>
          <Button
            variant="outline"
            className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={() => {
              logout();
              navigate({ to: "/login" });
            }}
          >
            <LogOut className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Log out</span>
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden border-border/60 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="w-[150px] font-semibold text-slate-700">Date</TableHead>
                  <TableHead className="w-[120px] font-semibold text-slate-700">Division</TableHead>
                  <TableHead className="font-semibold text-slate-700">Meeting Title</TableHead>
                  <TableHead className="w-[100px] text-right font-semibold text-slate-700">Participants</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-[#153160]" />
                        <p className="text-sm font-medium text-slate-400">Loading meeting data...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : meetings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="rounded-full bg-slate-100 p-4">
                          <FileText className="h-8 w-8 text-slate-300" />
                        </div>
                        <p className="text-sm font-medium text-slate-500">No meeting minutes yet.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  meetings.map((m) => {
                    const count = m.participants?.length ?? m.participant_ids?.length ?? 0;
                    return (
                      <TableRow
                        key={String(m.id)}
                        className="group cursor-pointer transition-colors hover:bg-slate-50/80"
                        onClick={() =>
                          navigate({ to: "/meetings/$id", params: { id: String(m.id) } })
                        }
                      >
                        <TableCell className="whitespace-nowrap font-medium text-slate-500">
                          {formatDate(m.meeting_date)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-[#153160]/20 bg-[#153160]/5 text-[#153160]">
                            {m.division}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold text-slate-900 group-hover:text-[#153160] transition-colors">
                          {m.title}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5 text-slate-500">
                            <Users className="h-3.5 w-3.5" />
                            <span className="text-sm font-medium tabular-nums">{count}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">Add Meeting Minutes</DialogTitle>
            <DialogDescription className="text-slate-500">
              Record meeting information, participants, and action items.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 px-4 py-4 md:px-6 md:py-6">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Division *</Label>
                <Input 
                  className="bg-slate-50 focus:bg-white"
                  value={division} 
                  onChange={(e) => setDivision(e.target.value)} 
                  placeholder="Marketing / Operasional" 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Meeting Type *</Label>
                <Select value={meetingType} onValueChange={setMeetingType}>
                  <SelectTrigger className="bg-slate-50 focus:bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MEETING_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Meeting Title *</Label>
              <Input 
                className="bg-slate-50 focus:bg-white"
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                placeholder="Rapat Evaluasi KPI Q1" 
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Meeting Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start border-slate-200 bg-slate-50 text-left font-normal focus:bg-white",
                        !meetingDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {meetingDate ? format(meetingDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={meetingDate}
                      onSelect={setMeetingDate}
                      initialFocus
                      className="p-3"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Speaker / Lead</Label>
                <Input 
                  className="bg-slate-50 focus:bg-white"
                  value={speaker} 
                  onChange={(e) => setSpeaker(e.target.value)} 
                  placeholder="Nama pembicara" 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Location</Label>
                <Input 
                  className="bg-slate-50 focus:bg-white"
                  value={location} 
                  onChange={(e) => setLocation(e.target.value)} 
                  placeholder="Gedung Utama" 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Minute Taker</Label>
                <Input 
                  className="bg-slate-50 focus:bg-white"
                  value={minuteTaker} 
                  onChange={(e) => setMinuteTaker(e.target.value)} 
                  placeholder="Bapak Admin" 
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">External Participants</Label>
                <div className="flex flex-col gap-2 rounded-md border border-input bg-slate-50 p-2 focus-within:ring-1 focus-within:ring-ring focus-within:bg-white transition-colors">
                  {externalParticipants.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {externalParticipants.map(p => (
                        <Badge key={p} variant="secondary" className="bg-[#153160]/10 text-[#153160] hover:bg-[#153160]/20 flex items-center gap-1 font-medium">
                          {p}
                          <button 
                            type="button" 
                            onClick={() => removeExternalParticipant(p)}
                            className="rounded-full hover:bg-[#153160]/20 p-0.5 transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  <Input 
                    className="border-0 bg-transparent px-1 py-0 h-7 focus-visible:ring-0 shadow-none text-sm placeholder:text-slate-400"
                    value={extParticipantInput} 
                    onChange={(e) => setExtParticipantInput(e.target.value)} 
                    onKeyDown={handleAddExternalParticipant}
                    placeholder={externalParticipants.length === 0 ? "Ketik nama lalu tekan Enter" : "Tambah lagi..."} 
                  />
                </div>
              </div>
              <div className="space-y-3 md:col-span-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Internal Participants ({participantIds.length})</Label>
                <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/50 p-2">
                  <div className="grid gap-1 sm:grid-cols-2">
                    {employees.map((emp) => {
                      const id = String(emp.id);
                      const checked = participantIds.includes(id);
                      return (
                        <label
                          key={id}
                          className={cn(
                            "flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-white",
                            checked && "bg-white shadow-sm ring-1 ring-[#153160]/20"
                          )}
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300 text-[#153160] focus:ring-[#153160]"
                            checked={checked}
                            onChange={() => toggleParticipant(id)}
                          />
                          <span className={cn("flex-1 truncate", checked ? "font-semibold text-slate-900" : "text-slate-600")}>
                            {emp.name}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Summary</Label>
              <Textarea 
                className="min-h-[80px] bg-slate-50 focus:bg-white"
                value={summary} 
                onChange={(e) => setSummary(e.target.value)} 
                placeholder="Ringkasan hasil diskusi..."
                rows={2} 
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Notes</Label>
              <div className="flex flex-col gap-2">
                <div className="max-h-[150px] min-h-[80px] w-full rounded-md border border-slate-200 bg-slate-50 p-3 overflow-y-auto">
                  <div className="ql-container ql-snow border-none">
                    <div 
                      className={cn(
                        "ql-editor p-0 text-sm text-slate-600 break-words [word-break:break-word] overflow-x-hidden",
                        !notes && "text-slate-400 italic"
                      )}
                      dangerouslySetInnerHTML={{ __html: notes || "Belum ada catatan." }}
                    />
                  </div>
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  className="w-fit"
                  onClick={() => setNotesModalOpen(true)}
                >
                  <Pencil className="mr-2 h-3.5 w-3.5" />
                  Edit Notes in Rich Text
                </Button>
              </div>
            </div>


            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Action Items</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-[#153160]/20 text-[#153160] hover:bg-[#153160]/5"
                  onClick={() => setResults((r) => [...r, emptyResult()])}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add Task
                </Button>
              </div>
              
              <div className="space-y-4">
                {results.map((r, idx) => (
                  <Card key={idx} className="border-slate-100 bg-slate-50/30 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <Badge variant="outline" className="bg-white text-slate-500">Task #{idx + 1}</Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-slate-400 hover:text-destructive"
                        onClick={() => setResults((rs) => rs.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">PIC *</Label>
                        <Select
                          value={r.employee_id}
                          onValueChange={(v) =>
                            setResults((rs) => rs.map((x, i) => (i === idx ? { ...x, employee_id: v } : x)))
                          }
                        >
                          <SelectTrigger className="bg-white"><SelectValue placeholder="Select PIC" /></SelectTrigger>
                          <SelectContent>
                            {employees.map((e) => (
                              <SelectItem key={String(e.id)} value={String(e.id)}>{e.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Target Nominal *</Label>
                        <Input
                          className="bg-white"
                          type="number"
                          value={r.target_nominal}
                          onChange={(e) =>
                            setResults((rs) => rs.map((x, i) => (i === idx ? { ...x, target_nominal: e.target.value } : x)))
                          }
                          placeholder="50000000"
                        />
                      </div>
                      <div className="space-y-1.5 md:col-span-2">
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Task Description *</Label>
                        <Input
                          className="bg-white"
                          value={r.target_description}
                          onChange={(e) =>
                            setResults((rs) => rs.map((x, i) => (i === idx ? { ...x, target_description: e.target.value } : x)))
                          }
                          placeholder="Misal: Mencapai target penjualan produk A"
                        />
                      </div>
                      <div className="space-y-1.5 md:col-span-2">
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Due Date *</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start border-slate-200 bg-white text-left font-normal",
                                !r.target_completion_date && "text-muted-foreground",
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
                              {r.target_completion_date
                                ? format(r.target_completion_date, "PPP")
                                : "Select date"}
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
                              className="p-3"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="ghost" 
              onClick={() => setOpen(false)} 
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={submitting}
              className="bg-[#153160] shadow-md shadow-[#153160]/20 hover:bg-[#153160]/90"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Minutes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={notesModalOpen} onOpenChange={setNotesModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">Edit Notes</DialogTitle>
            <DialogDescription className="text-slate-500">
              Format your meeting notes using the rich text editor below.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto py-4">
            <Suspense fallback={<div className="h-[350px] flex items-center justify-center text-sm text-slate-500">Loading editor...</div>}>
              <ReactQuill 
                theme="snow" 
                value={notes} 
                onChange={setNotes} 
                style={{ height: '350px', marginBottom: '40px' }}
              />
            </Suspense>
          </div>

          <DialogFooter className="mt-4">
            <Button onClick={() => setNotesModalOpen(false)} className="bg-[#153160] hover:bg-[#153160]/90">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
