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
import { api, formatDate, formatRupiah, type Meeting, type MeetingUpdateInput } from "@/lib/api";

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-background to-indigo-50/40">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-4">
          <Link to="/meetings">
            <ArrowLeft className="h-4 w-4" />
            Daftar Notulen
          </Link>
        </Button>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !meeting ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Rapat tidak ditemukan.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{meeting.meeting_type}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(meeting.meeting_date)}
                    </span>
                  </div>
                  <CardTitle className="mt-2 text-2xl">{meeting.title}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Divisi: <span className="font-medium text-foreground">{meeting.division}</span>
                    {meeting.speaker ? (
                      <> · Pembicara: <span className="font-medium text-foreground">{meeting.speaker}</span></>
                    ) : null}
                  </p>
                </div>
                <Button onClick={openEdit} variant="outline">
                  <Pencil className="h-4 w-4" />
                  Edit Informasi Dasar
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Summary</p>
                  <p className="mt-1 text-sm leading-relaxed">{meeting.summary || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{meeting.notes || "—"}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4" />
                  Peserta ({meeting.participants?.length ?? meeting.participant_ids?.length ?? 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {(meeting.participants && meeting.participants.length > 0
                    ? meeting.participants.map((p, i) => {
                        const name = (p as { name?: string }).name ?? `Peserta ${i + 1}`;
                        return (
                          <Badge key={i} variant="outline" className="px-3 py-1 text-sm">
                            {name}
                          </Badge>
                        );
                      })
                    : (meeting.participant_ids ?? []).map((pid, i) => (
                        <Badge key={i} variant="outline" className="px-3 py-1 text-sm">
                          {String(pid)}
                        </Badge>
                      )))}
                  {(meeting.participants?.length ?? meeting.participant_ids?.length ?? 0) === 0 && (
                    <p className="text-sm text-muted-foreground">Tidak ada peserta tercatat.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Action Items</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PIC</TableHead>
                      <TableHead>Deskripsi</TableHead>
                      <TableHead className="text-right">Nominal</TableHead>
                      <TableHead>Deadline</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(meeting.results ?? []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                          Tidak ada action items.
                        </TableCell>
                      </TableRow>
                    ) : (
                      meeting.results!.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">
                            {r.employee_name ?? String(r.employee_id)}
                          </TableCell>
                          <TableCell>{r.target_description}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatRupiah(r.target_nominal)}
                          </TableCell>
                          <TableCell>{formatDate(r.target_completion_date)}</TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
                                statusTone(r.status),
                              )}
                            >
                              {r.status || "Pending"}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Informasi Dasar</DialogTitle>
            <DialogDescription>Perbarui detail rapat.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Division</Label>
                <Input value={division} onChange={(e) => setDivision(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Meeting Type</Label>
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
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Meeting Date</Label>
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
                <Input value={speaker} onChange={(e) => setSpeaker(e.target.value)} />
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>Batal</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
