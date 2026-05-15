import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, CalendarIcon, Loader2, Pencil, Users, FileDown } from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
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

  const generatePDF = () => {
    if (!meeting) return;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const M = 18;

    // Brand colors
    const NAVY: [number, number, number] = [15, 27, 61];      // #0F1B3D
    const NAVY_SOFT: [number, number, number] = [30, 58, 95]; // #1E3A5F
    const GOLD: [number, number, number] = [201, 168, 76];    // #C9A84C
    const INK: [number, number, number] = [30, 41, 59];
    const MUTED: [number, number, number] = [110, 120, 140];
    const LINE: [number, number, number] = [226, 232, 240];
    const ROW_ALT: [number, number, number] = [248, 250, 252];

    // ===== HEADER BAR =====
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, pageWidth, 32, "F");
    doc.setFillColor(...GOLD);
    doc.rect(0, 32, pageWidth, 1.2, "F");

    try {
      doc.addImage("/src/assets/logo-icon.png", "PNG", M, 8, 16, 16);
    } catch (e) {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(M, 8, 16, 16, 2, 2, "F");
    }

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("BANK GALUH", M + 21, 15);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(210, 220, 235);
    doc.text("Perumda BPR Galuh Ciamis", M + 21, 19.8);
    doc.text("Jl. MR Iwa Kusumasoemantri, Ciamis, Jawa Barat 46211  ·  Telp (0265) 7579981", M + 21, 23.6);

    doc.setFontSize(7.5);
    doc.setTextColor(...GOLD);
    doc.text("INTERNAL DOCUMENT", pageWidth - M, 13.5, { align: "right" });
    doc.setTextColor(220, 230, 245);
    doc.setFontSize(7);
    doc.text(`Generated · ${format(new Date(), "dd MMM yyyy, HH:mm")}`, pageWidth - M, 18, { align: "right" });

    // ===== TITLE =====
    let y = 46;
    doc.setTextColor(...NAVY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("Meeting Minutes", M, y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    y += 5.5;
    doc.text(`Division: ${meeting.division || "N/A"}  ·  Type: ${meeting.meeting_type || "N/A"}`, M, y);

    // ===== INFO PANEL =====
    y += 6;
    doc.setDrawColor(...LINE);
    doc.setFillColor(252, 253, 255);
    doc.roundedRect(M, y, pageWidth - 2 * M, 32, 1.5, 1.5, "FD");

    const colW = (pageWidth - 2 * M) / 2;
    const padX = 6;
    const labelY = y + 7;
    const valueY = y + 13;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text("MEETING TITLE", M + padX, labelY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...INK);
    doc.text(meeting.title || "Untitled Meeting", M + padX, valueY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text(`Date: ${formatDate(meeting.meeting_date)}`, M + padX, valueY + 5);

    const rx = M + colW + padX;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text("SPEAKER / LEAD", rx, labelY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...INK);
    doc.text(meeting.speaker || "—", rx, valueY);
    
    const participantCount = (meeting.participants as any[])?.length || 0;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text(`Participants: ${participantCount} people`, rx, valueY + 5);

    y += 38;

    // ===== SUMMARY & NOTES =====
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...NAVY);
    doc.text("Summary & Notes", M, y);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...INK);
    y += 6;
    
    const combinedNotes = `Summary:\n${meeting.summary || "—"}\n\nNotes:\n${meeting.notes || "—"}`;
    const notesLines = doc.splitTextToSize(combinedNotes, pageWidth - 2 * M);
    doc.text(notesLines, M, y);
    
    y += (notesLines.length * 4) + 6;

    // ===== TABLE (ACTION ITEMS) =====
    const tableData = (meeting.results ?? []).map((r) => [
      r.employee?.name || r.employee_name || "Unknown",
      r.target_description,
      formatRupiah(r.target_nominal),
      r.achievement_status || "To Do",
    ]);

    autoTable(doc, {
      startY: y,
      head: [["PIC", "Description", "Target Nominal", "Status"]],
      body: tableData,
      theme: "plain",
      headStyles: {
        fillColor: NAVY_SOFT,
        textColor: 255,
        fontStyle: "bold",
        fontSize: 8.5,
        cellPadding: { top: 3.5, bottom: 3.5, left: 5, right: 5 },
      },
      bodyStyles: {
        fontSize: 8.5,
        textColor: INK,
        cellPadding: { top: 3.5, bottom: 3.5, left: 5, right: 5 },
        lineColor: LINE,
        lineWidth: { bottom: 0.1 } as any,
      },
      alternateRowStyles: { fillColor: ROW_ALT },
      columnStyles: {
        2: { halign: "right" },
        3: { fontStyle: "bold" },
      },
      margin: { left: M, right: M },
    });

    // ===== SIGNATURE =====
    const finalY = (doc as any).lastAutoTable.finalY + 18;
    const sigW = 58;
    const sigX = pageWidth - M - sigW;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...INK);
    doc.text(`Ciamis, ${format(new Date(), "dd MMMM yyyy")}`, sigX, finalY);
    doc.text("Notulis,", sigX, finalY + 5);

    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.3);
    doc.line(sigX, finalY + 28, sigX + sigW, finalY + 28);
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text("Sekretaris Rapat", sigX, finalY + 33);

    // ===== FOOTER =====
    doc.setDrawColor(...LINE);
    doc.line(M, pageHeight - 14, pageWidth - M, pageHeight - 14);
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text("Bank Galuh · Confidential — for internal use only", M, pageHeight - 9);
    doc.text(`Page 1 of 1`, pageWidth - M, pageHeight - 9, { align: "right" });

    doc.save(`Meeting_Minutes_${meeting.title.replace(/\s+/g, '_')}_${format(new Date(), "yyyyMMdd")}.pdf`);
    toast.success("Meeting minutes exported to PDF");
  };

  if (loading && !meeting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex h-12 w-12 items-center justify-center">
            <div className="absolute inset-0 animate-ping rounded-full bg-[#153160] opacity-20"></div>
            <Loader2 className="h-8 w-8 animate-spin text-[#153160]" />
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
            className="group -ml-2 text-slate-500 hover:bg-white hover:text-[#153160] hover:shadow-sm"
          >
            <Link to="/meetings" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Kembali ke Daftar Notulen
            </Link>
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="overflow-hidden border-border/60 shadow-sm lg:col-span-3">
            <CardHeader className="flex flex-col space-y-4 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-[#153160]/5 text-[#153160] hover:bg-[#153160]/10 border-[#153160]/20">
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
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  onClick={generatePDF}
                  className="border-[#153160]/20 text-[#153160] hover:bg-[#153160]/5"
                >
                  <FileDown className="mr-2 h-4 w-4" />
                  Export PDF
                </Button>
                <Button
                  onClick={openEdit}
                  className="bg-[#153160] shadow-lg shadow-[#153160]/20 hover:bg-[#153160]/90 hover:shadow-[#153160]/30"
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit Info
                </Button>
              </div>
            </CardHeader>
          </Card>

          {/* Card 2: Ringkasan */}
          <Card className="border-border/60 shadow-sm lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-800">Ringkasan & Catatan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-xl border border-[#153160]/20 bg-[#153160]/5 p-4">
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#153160]/80">Summary</h4>
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
          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-800">
                <Users className="h-5 w-5 text-[#153160]" />
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
          <Card className="overflow-hidden border-border/60 shadow-sm lg:col-span-3">
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

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl border-none p-0 shadow-2xl">
          <DialogHeader className="px-6 py-4">
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
          <DialogFooter className="px-6 py-4">
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
              className="bg-[#153160] shadow-md shadow-[#153160]/20 hover:bg-[#153160]/90"
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
    </div>
  );
}

