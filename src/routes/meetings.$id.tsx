import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, CalendarIcon, Loader2, Pencil, Users } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { api, formatDate, formatRupiah, type Meeting, type MeetingUpdateInput, type ID } from "@/lib/api";

export const Route = createFileRoute("/meetings/$id")({
  component: MeetingDetailPage,
});

const MEETING_TYPES = ["Offline", "Online", "Hybrid"] as const;

function statusTone(status?: string) {
  const s = (status || "").toLowerCase();
  if (s.includes("done") || s.includes("complete") || s.includes("selesai"))
    return "bg-success/15 text-success-foreground border-success/30";
  if (s.includes("progress") || s.includes("ongoing"))
    return "bg-warning/15 text-warning-foreground border-warning/30";
  return "bg-muted text-muted-foreground border-border";
}

function MeetingDetailPage() {
  const { id } = Route.useParams();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<ID | null>(null);

  // edit form
  const [division, setDivision] = useState("");
  const [title, setTitle] = useState("");
  const [meetingType, setMeetingType] = useState("Offline");
  const [summary, setSummary] = useState("");
  const [notes, setNotes] = useState("");
  const [speaker, setSpeaker] = useState("");
  const [meetingDate, setMeetingDate] = useState<Date | undefined>(undefined);

  const load = async () => {
    setLoading(true);
    try {
      const m = await api.getMeeting(id);
      setMeeting(m);
    } catch (e) {
      toast.error((e as Error).message || "Gagal memuat detail rapat");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const openEdit = () => {
    if (!meeting) return;
    setDivision(meeting.division || "");
    setTitle(meeting.title || "");
    setMeetingType(meeting.meeting_type || "Offline");
    setSummary(meeting.summary || "");
    setNotes(meeting.notes || "");
    setSpeaker(meeting.speaker || "");
    setMeetingDate(meeting.meeting_date ? new Date(meeting.meeting_date) : undefined);
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!meetingDate) {
      toast.error("Tanggal rapat wajib diisi");
      return;
    }
    const payload: MeetingUpdateInput = {
      division,
      title,
      meeting_date: meetingDate.toISOString(),
      meeting_type: meetingType,
      summary,
      notes,
      speaker,
    };
    setSaving(true);
    try {
      await api.updateMeeting(id, payload);
      toast.success("Informasi rapat diperbarui");
      setEditOpen(false);
      load();
    } catch (e) {
      toast.error((e as Error).message || "Gagal memperbarui");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (resultId: ID, newStatus: string) => {
    setUpdatingStatus(resultId);
    try {
      await api.patchResultStatus(resultId, newStatus);
      toast.success("Status tugas berhasil diperbarui");
      // Update local state to reflect change without full reload if possible, 
      // but requirements say "re-fetch (GET Detail) agar UI terupdate" for PUT, 
      // for status it says "Tampilkan Toast Success". I'll re-fetch to be safe and consistent.
      load();
    } catch (e) {
      toast.error((e as Error).message || "Gagal memperbarui status");
    } finally {
      setUpdatingStatus(null);
    }
  };

  if (loading && !meeting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex h-12 w-12 items-center justify-center">
            <div className="absolute inset-0 animate-ping rounded-full bg-indigo-500 opacity-20"></div>
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
          <p className="animate-pulse text-sm font-medium text-slate-500">Memuat detail rapat...</p>
        </div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <Card className="w-full max-w-md border-slate-200/60 shadow-xl shadow-slate-200/40">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <div className="mb-4 rounded-full bg-slate-100 p-3">
              <CalendarIcon className="h-6 w-6 text-slate-400" />
            </div>
            <CardTitle className="mb-2">Rapat Tidak Ditemukan</CardTitle>
            <p className="mb-6 text-sm text-muted-foreground">
              Maaf, kami tidak dapat menemukan data rapat yang Anda cari.
            </p>
            <Button asChild variant="outline">
              <Link to="/meetings">Kembali ke Daftar</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-50/50 via-slate-50 to-white pb-20">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8 flex items-center justify-between">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="group -ml-2 text-slate-500 hover:bg-white hover:text-indigo-600 hover:shadow-sm"
          >
            <Link to="/meetings" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Kembali ke Daftar Notulen
            </Link>
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Card 1: Header Info */}
          <Card className="overflow-hidden border-slate-200/60 bg-white/70 shadow-sm backdrop-blur-md lg:col-span-3">
            <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
            <CardHeader className="flex flex-col space-y-4 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200/50">
                    {meeting.division}
                  </Badge>
                  <Badge variant="outline" className="border-slate-200 text-slate-600">
                    {meeting.meeting_type}
                  </Badge>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {formatDate(meeting.meeting_date)}
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  {meeting.title}
                </CardTitle>
                {meeting.speaker && (
                  <p className="text-sm text-slate-500">
                    Pembicara: <span className="font-semibold text-slate-700">{meeting.speaker}</span>
                  </p>
                )}
              </div>
              <Button
                onClick={openEdit}
                className="bg-indigo-600 shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300"
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit Info
              </Button>
            </CardHeader>
          </Card>

          {/* Card 2: Ringkasan */}
          <Card className="border-slate-200/60 bg-white/70 shadow-sm backdrop-blur-md lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-800">Ringkasan & Catatan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-xl border border-indigo-100/50 bg-indigo-50/30 p-4">
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-indigo-600/80">Summary</h4>
                <p className="text-sm leading-relaxed text-slate-700">
                  {meeting.summary || "Tidak ada ringkasan tersedia."}
                </p>
              </div>
              <div>
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Notes</h4>
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
                  {meeting.notes || "Tidak ada catatan tambahan."}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Peserta */}
          <Card className="border-slate-200/60 bg-white/70 shadow-sm backdrop-blur-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-800">
                <Users className="h-5 w-5 text-indigo-500" />
                Peserta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {(meeting.participants as any[])?.length > 0 ? (
                  (meeting.participants as any[]).map((p, i) => {
                    const name = p.employee?.name || p.name || `Peserta ${i + 1}`;
                    return (
                      <Badge
                        key={i}
                        variant="secondary"
                        className="bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-200"
                      >
                        {name}
                      </Badge>
                    );
                  })
                ) : (
                  <p className="text-sm italic text-slate-400">Tidak ada peserta terdaftar.</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Tugas */}
          <Card className="overflow-hidden border-slate-200/60 bg-white/70 shadow-sm backdrop-blur-md lg:col-span-3">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-slate-800">Daftar Tugas (Action Items)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead className="w-[200px] font-semibold text-slate-700">PIC</TableHead>
                      <TableHead className="font-semibold text-slate-700">Deskripsi</TableHead>
                      <TableHead className="w-[180px] text-right font-semibold text-slate-700">Target Nominal</TableHead>
                      <TableHead className="w-[180px] font-semibold text-slate-700">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(meeting.results ?? []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-12 text-center">
                          <p className="text-sm text-slate-400">Tidak ada tugas yang tercatat dari rapat ini.</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      meeting.results!.map((r) => (
                        <TableRow key={r.id} className="group transition-colors hover:bg-slate-50/50">
                          <TableCell className="font-medium text-slate-900">
                            {r.employee?.name || r.employee_name || "Unknown"}
                          </TableCell>
                          <TableCell className="text-slate-600">{r.target_description}</TableCell>
                          <TableCell className="text-right tabular-nums font-medium text-slate-900">
                            {formatRupiah(r.target_nominal)}
                          </TableCell>
                          <TableCell>
                            <Select
                              disabled={updatingStatus === r.id}
                              value={r.achievement_status || "To Do"}
                              onValueChange={(val) => handleStatusChange(r.id!, val)}
                            >
                              <SelectTrigger className={cn(
                                "h-8 w-[140px] text-xs font-medium border-none shadow-none focus:ring-1",
                                (r.achievement_status === "Done") && "bg-emerald-50 text-emerald-700 ring-emerald-200",
                                (r.achievement_status === "In Progress") && "bg-amber-50 text-amber-700 ring-amber-200",
                                (r.achievement_status === "To Do" || !r.achievement_status) && "bg-slate-100 text-slate-700 ring-slate-200"
                              )}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="To Do">To Do</SelectItem>
                                <SelectItem value="In Progress">In Progress</SelectItem>
                                <SelectItem value="Done">Done</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl border-none p-0 shadow-2xl">
          <DialogHeader className="bg-slate-50/80 px-6 py-4">
            <DialogTitle className="text-xl font-bold text-slate-900">Edit Informasi Dasar</DialogTitle>
            <DialogDescription className="text-slate-500">
              Perbarui detail utama rapat. Data peserta dan tugas tidak akan terpengaruh.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 px-6 py-6">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Divisi</Label>
                <Input
                  className="bg-slate-50 focus:bg-white"
                  placeholder="Contoh: Operasional"
                  value={division}
                  onChange={(e) => setDivision(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Tipe Rapat</Label>
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
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Judul Rapat</Label>
              <Input
                className="bg-slate-50 focus:bg-white"
                placeholder="Judul agenda rapat"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Tanggal Rapat</Label>
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
                      {meetingDate ? format(meetingDate, "PPP") : "Pilih tanggal"}
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
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Pembicara / Lead</Label>
                <Input
                  className="bg-slate-50 focus:bg-white"
                  placeholder="Nama pembicara"
                  value={speaker}
                  onChange={(e) => setSpeaker(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Ringkasan (Summary)</Label>
              <Textarea
                className="min-h-[80px] bg-slate-50 focus:bg-white"
                placeholder="Ringkasan hasil rapat..."
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Catatan Tambahan (Notes)</Label>
              <Textarea
                className="min-h-[100px] bg-slate-50 focus:bg-white"
                placeholder="Detail catatan penting lainnya..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="bg-slate-50/80 px-6 py-4">
            <Button
              variant="ghost"
              onClick={() => setEditOpen(false)}
              disabled={saving}
              className="text-slate-500 hover:bg-slate-200"
            >
              Batal
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-indigo-600 shadow-md shadow-indigo-100 hover:bg-indigo-700"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                "Simpan Perubahan"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

