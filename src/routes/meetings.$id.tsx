import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, lazy, Suspense } from "react";
import { toast } from "sonner";
import { ArrowLeft, CalendarIcon, Loader2, Pencil, Users, FileDown, LogOut } from "lucide-react";
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
import { logout } from "@/lib/auth";
const ReactQuill = lazy(() => import("react-quill-new"));
import "react-quill-new/dist/quill.snow.css";

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

import { DashboardLayout } from "@/components/dashboard-layout";

function MeetingDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<ID | null>(null);

  // edit form
  const [division, setDivision] = useState("");
  const [title, setTitle] = useState("");
  const [meetingType, setMeetingType] = useState("Offline");
  const [summary, setSummary] = useState("");
  const [notes, setNotes] = useState("");
  const [speaker, setSpeaker] = useState("");
  const [location, setLocation] = useState("");
  const [minuteTaker, setMinuteTaker] = useState("");
  const [externalParticipants, setExternalParticipants] = useState<string[]>([]);
  const [extParticipantInput, setExtParticipantInput] = useState("");
  const [meetingDate, setMeetingDate] = useState<Date | undefined>(undefined);

  const load = async () => {
    setLoading(true);
    try {
      const m = await api.getMeeting(id);
      setMeeting(m);
    } catch (e) {
      toast.error((e as Error).message || "Failed to load meeting details");
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
    setLocation(meeting.location || "");
    setMinuteTaker(meeting.minute_taker || "");
    setExternalParticipants(meeting.external_participants || []);
    setExtParticipantInput("");
    setMeetingDate(meeting.meeting_date ? new Date(meeting.meeting_date) : undefined);
    setEditOpen(true);
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

  const handleSave = async () => {
    if (!meetingDate) {
      toast.error("Meeting date is required");
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
      location,
      minute_taker: minuteTaker,
      external_participants: externalParticipants,
    };
    setSaving(true);
    try {
      await api.updateMeeting(id, payload);
      toast.success("Meeting information updated");
      setEditOpen(false);
      load();
    } catch (e) {
      toast.error((e as Error).message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (resultId: ID, newStatus: string) => {
    setUpdatingStatus(resultId);
    try {
      await api.patchResultStatus(resultId, newStatus);
      toast.success("Task status updated successfully");
      load();
    } catch (e) {
      toast.error((e as Error).message || "Failed to update status");
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
      doc.addImage("/logo-icon.png", "PNG", M, 8, 16, 16);
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
    const colW = (pageWidth - 2 * M) / 2;
    const padX = 6;
    const labelY = y + 7;
    const valueY = y + 14;

    // Split title by words (every 5 words to next line)
    const splitTitleByWords = (text: string, maxWords = 5) => {
      const words = text.split(/\s+/);
      const lines = [];
      for (let i = 0; i < words.length; i += maxWords) {
        lines.push(words.slice(i, i + maxWords).join(" "));
      }
      return lines;
    };
    
    const rawTitleLines = splitTitleByWords(meeting.title || "Untitled Meeting", 5);
    const titleLines: string[] = [];
    rawTitleLines.forEach(line => {
      const splitLines = doc.splitTextToSize(line, colW - padX * 2);
      titleLines.push(...splitLines);
    });
    
    // Get participant names instead of count
    const internalNames = (meeting.participants as any[])?.map((p, i) => p.employee?.name || p.name || `Peserta ${i + 1}`) || [];
    const externalNames = meeting.external_participants || [];
    
    let participantsStr = "";
    if (internalNames.length > 0) {
      participantsStr += `Internal: ${internalNames.join(", ")}`;
    }
    if (externalNames.length > 0) {
      if (participantsStr) participantsStr += "  ·  ";
      participantsStr += `External: ${externalNames.join(", ")}`;
    }
    if (!participantsStr) participantsStr = "—";
    
    const participantLines = doc.splitTextToSize(participantsStr, colW - padX * 2);
    
    // Calculate positions dynamically
    let currentTitleY = valueY;
    const nextY = valueY + (titleLines.length * 5.5) + 1.5; 
    
    // Calculate right column Y footprint
    let currentParticipantY = valueY + 5.5;
    const rightSideEndY = currentParticipantY + 4.5 + (participantLines.length * 4);
    
    const maxLeftY = nextY + 11;
    const maxRequiredY = Math.max(maxLeftY, rightSideEndY);
    const panelHeight = Math.max(38, (maxRequiredY + 6) - y);

    doc.setDrawColor(...LINE);
    doc.setFillColor(252, 253, 255);
    doc.roundedRect(M, y, pageWidth - 2 * M, panelHeight, 1.5, 1.5, "FD");

    // MEETING TITLE LABEL & VALUE
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text("MEETING TITLE", M + padX, labelY);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...INK);
    titleLines.forEach((line: string) => {
      doc.text(line, M + padX, currentTitleY);
      currentTitleY += 5.5; 
    });

    // MEETING DETAILS (LEFT COLUMN)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text(`Date: ${formatDate(meeting.meeting_date)}`, M + padX, nextY);
    doc.text(`Location: ${meeting.location || "—"}`, M + padX, nextY + 5.5);
    doc.text(`Minute Taker: ${meeting.minute_taker || "—"}`, M + padX, nextY + 11);

    // RIGHT COLUMN (SPEAKER / LEAD & PARTICIPANTS)
    const rx = M + colW + padX;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text("SPEAKER / LEAD", rx, labelY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...INK);
    doc.text(meeting.speaker || "—", rx, valueY);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text("PARTICIPANTS", rx, currentParticipantY);
    
    currentParticipantY += 4.5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.2);
    doc.setTextColor(...INK);
    participantLines.forEach((line: string) => {
      doc.text(line, rx, currentParticipantY);
      currentParticipantY += 4;
    });

    y += panelHeight + 6;

    // Render SUMMARY
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...INK);
    doc.text("SUMMARY", M, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...INK);

    const summaryText = meeting.summary || "—";
    const summaryLines = doc.splitTextToSize(summaryText, pageWidth - 2 * M);
    summaryLines.forEach((line: string) => {
      if (y > pageHeight - M - 10) {
        doc.addPage();
        y = M + 10;
      }
      doc.text(line, M, y);
      y += 5;
    });

    y += 5; // Gap between sections

    // Render NOTES
    if (y > pageHeight - M - 15) {
      doc.addPage();
      y = M + 10;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...INK);
    doc.text("NOTES", M, y);
    y += 6;

    // Helper to render HTML paragraph/list items with inline tags (b/strong) and auto wrap
    const renderInlineParagraph = (el: HTMLElement, startX: number, bulletPrefix = "") => {
      const children = Array.from(el.childNodes);
      let currentX = startX;
      const endX = pageWidth - M;
      
      if (y > pageHeight - M - 10) {
        doc.addPage();
        y = M + 10;
      }
      
      if (bulletPrefix) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(...INK);
        doc.text(bulletPrefix, startX - 3.5, y);
      }
      
      const segments: { text: string; bold: boolean }[] = [];
      if (children.length === 0) {
        segments.push({ text: el.textContent || "", bold: false });
      } else {
        children.forEach(node => {
          if (node.nodeType === Node.TEXT_NODE) {
            segments.push({ text: node.textContent || "", bold: false });
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            const childEl = node as HTMLElement;
            const isBold = childEl.tagName === "STRONG" || childEl.tagName === "B";
            segments.push({ text: childEl.textContent || "", bold: isBold });
          }
        });
      }
      
      segments.forEach(seg => {
        const fontStyle = seg.bold ? "bold" : "normal";
        doc.setFont("helvetica", fontStyle);
        doc.setFontSize(9);
        doc.setTextColor(...INK);
        
        // Split text by space but preserve spaces
        const words = seg.text.split(/(\s+)/);
        words.forEach(word => {
          if (!word) return;
          
          const wordWidth = doc.getTextWidth(word);
          if (currentX + wordWidth > endX && word.trim()) {
            currentX = startX;
            y += 5;
            if (y > pageHeight - M - 10) {
              doc.addPage();
              y = M + 10;
            }
          }
          
          doc.text(word, currentX, y);
          currentX += wordWidth;
        });
      });
      
      y += 5; // move to next line
    };

    // Parse HTML notes using browser DOMParser
    const parser = new DOMParser();
    const tempDoc = parser.parseFromString(meeting.notes || "—", "text/html");
    const childNodes = Array.from(tempDoc.body.childNodes);

    childNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || "";
        if (!text.trim()) return;
        
        const tempP = document.createElement("p");
        tempP.textContent = text;
        renderInlineParagraph(tempP, M);
        y += 2.5;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const tagName = el.tagName.toUpperCase();
        
        if (tagName === "H1" || tagName === "H2" || tagName === "H3" || tagName === "H4" || tagName === "H5" || tagName === "H6") {
          const text = el.textContent || "";
          if (!text.trim()) return;
          
          if (y > pageHeight - M - 15) {
            doc.addPage();
            y = M + 10;
          }
          
          doc.setFont("helvetica", "bold");
          doc.setFontSize(tagName === "H1" || tagName === "H2" ? 11.5 : 10);
          doc.setTextColor(...NAVY_SOFT);
          
          const lines = doc.splitTextToSize(text, pageWidth - 2 * M);
          lines.forEach((line: string) => {
            if (y > pageHeight - M - 10) {
              doc.addPage();
              y = M + 10;
            }
            doc.text(line, M, y);
            y += 5.5;
          });
          y += 3;
        } else if (tagName === "P") {
          renderInlineParagraph(el, M);
          y += 2.5;
        } else if (tagName === "UL" || tagName === "OL") {
          const listItems = Array.from(el.querySelectorAll("li"));
          listItems.forEach((li, idx) => {
            const prefix = tagName === "UL" ? "• " : `${idx + 1}. `;
            renderInlineParagraph(li, M + 5, prefix);
          });
          y += 2.5;
        } else if (tagName === "LI") {
          renderInlineParagraph(el, M + 5, "• ");
          y += 2.5;
        } else {
          renderInlineParagraph(el, M);
          y += 2.5;
        }
      }
    });

    // ===== TABLE (ACTION ITEMS) =====
    const results = meeting.results ?? [];
    if (results.length > 0) {
      const tableData = results.map((r) => [
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
      y = (doc as any).lastAutoTable.finalY + 18;
    } else {
      y += 12;
    }

    // ===== SIGNATURE =====
    const finalY = y;
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
    doc.text(meeting.minute_taker || "Sekretaris Rapat", sigX, finalY + 33);

    // ===== FOOTER (MULTIPLE PAGES SYSTEM) =====
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setDrawColor(...LINE);
      doc.setLineWidth(0.3);
      doc.line(M, pageHeight - 14, pageWidth - M, pageHeight - 14);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...MUTED);
      doc.text("Bank Galuh · Confidential — for internal use only", M, pageHeight - 9);
      doc.text(`Page ${i} of ${totalPages}`, pageWidth - M, pageHeight - 9, { align: "right" });
    }

    doc.save(`Meeting_Minutes_${meeting.title.replace(/\s+/g, '_')}_${format(new Date(), "yyyyMMdd")}.pdf`);
    toast.success("Meeting minutes exported to PDF");
  };

  if (loading && !meeting) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#153160]" />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="flex flex-col items-center py-12 text-center">
        <div className="mb-4 rounded-full bg-slate-100 p-3">
          <CalendarIcon className="h-6 w-6 text-slate-400" />
        </div>
        <h3 className="mb-2 text-lg font-bold">Meeting Not Found</h3>
        <p className="mb-6 text-sm text-muted-foreground">
          Sorry, we could not find the meeting you are looking for.
        </p>
        <Button asChild variant="outline">
          <Link to="/meetings">Back to List</Link>
        </Button>
      </div>
    );
  }

  return (
    <DashboardLayout title="Meeting Details" subtitle={meeting.title} hideMobileNav hideSidebar backTo="/meetings">

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
              <CardTitle className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                {meeting.title}
              </CardTitle>
              {meeting.speaker && (
                <p className="text-sm text-slate-500">
                  Speaker: <span className="font-semibold text-slate-700">{meeting.speaker}</span>
                </p>
              )}
              {meeting.location && (
                <p className="text-sm text-slate-500">
                  Location: <span className="font-semibold text-slate-700">{meeting.location}</span>
                </p>
              )}
              {meeting.minute_taker && (
                <p className="text-sm text-slate-500">
                  Minute Taker: <span className="font-semibold text-slate-700">{meeting.minute_taker}</span>
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={generatePDF}
                className="border-[#153160]/20 text-[#153160] hover:bg-[#153160]/5 h-8"
              >
                <FileDown className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Export PDF</span>
              </Button>
              <Button
                size="sm"
                onClick={openEdit}
                className="bg-[#153160] shadow-lg shadow-[#153160]/20 hover:bg-[#153160]/90 h-8"
              >
                <Pencil className="mr-2 h-3.5 w-3.5" />
                Edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 h-8"
                onClick={() => {
                  logout();
                  navigate({ to: "/login" });
                }}
              >
                <LogOut className="h-3.5 w-3.5 sm:mr-2" />
                <span className="hidden sm:inline">Log out</span>
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Card 2: Ringkasan */}
        <Card className="border-border/60 shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-800">Summary & Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-xl border border-[#153160]/20 bg-[#153160]/5 p-4">
              <h4 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#153160]/80">Summary</h4>
              <p className="text-sm leading-relaxed text-slate-700">
                {meeting.summary || "—"}
              </p>
            </div>
            <div>
              <h4 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Notes</h4>
              <div 
                className="text-sm leading-relaxed text-slate-600 ql-editor px-0 py-0"
                dangerouslySetInnerHTML={{ __html: meeting.notes || "—" }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Peserta */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-800">
              <Users className="h-4 w-4 text-[#153160]" />
              Participants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div>
                <h4 className="mb-2 text-xs font-semibold text-slate-600">Internal</h4>
                <div className="flex flex-wrap gap-2">
                  {(meeting.participants as any[])?.length > 0 ? (
                    (meeting.participants as any[]).map((p, i) => {
                      const name = p.employee?.name || p.name || `Peserta ${i + 1}`;
                      return (
                        <Badge
                          key={i}
                          variant="secondary"
                          className="bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                        >
                          {name}
                        </Badge>
                      );
                    })
                  ) : (
                    <p className="text-sm italic text-slate-400">No internal participants.</p>
                  )}
                </div>
              </div>
              
              {meeting.external_participants && meeting.external_participants.length > 0 && (
                <div>
                  <h4 className="mb-2 text-xs font-semibold text-slate-600">External</h4>
                  <div className="flex flex-wrap gap-2">
                    {meeting.external_participants.map((name, i) => (
                      <Badge
                        key={`ext-${i}`}
                        variant="outline"
                        className="border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                      >
                        {name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Tugas */}
        {(meeting.results ?? []).length > 0 && (
          <Card className="overflow-hidden border-border/60 shadow-sm lg:col-span-3">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-800">Action Items</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead className="w-[180px] font-semibold text-slate-700">PIC</TableHead>
                      <TableHead className="min-w-[200px] font-semibold text-slate-700">Description</TableHead>
                      <TableHead className="w-[140px] text-right font-semibold text-slate-700">Nominal</TableHead>
                      <TableHead className="w-[150px] font-semibold text-slate-700">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {meeting.results!.map((r) => (
                      <TableRow key={r.id} className="group transition-colors hover:bg-slate-50/50">
                        <TableCell className="font-medium text-slate-900">
                          {r.employee?.name || r.employee_name || "Unknown"}
                        </TableCell>
                        <TableCell className="text-slate-600 text-sm">{r.target_description}</TableCell>
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
                              "h-7 w-[120px] text-[11px] font-medium border-none shadow-none focus:ring-1",
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
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl border-none p-0 shadow-2xl">
          <DialogHeader className="px-6 py-4">
            <DialogTitle className="text-xl font-bold text-slate-900">Edit Basic Information</DialogTitle>
            <DialogDescription className="text-slate-500">
              Update main meeting details.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 px-6 py-6">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Division</Label>
                <Input
                  className="bg-slate-50 focus:bg-white"
                  value={division}
                  onChange={(e) => setDivision(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Meeting Type</Label>
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
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Meeting Title</Label>
              <Input
                className="bg-slate-50 focus:bg-white"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Meeting Date</Label>
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
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Location</Label>
                <Input
                  className="bg-slate-50 focus:bg-white"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Minute Taker</Label>
                <Input
                  className="bg-slate-50 focus:bg-white"
                  value={minuteTaker}
                  onChange={(e) => setMinuteTaker(e.target.value)}
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
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Summary</Label>
              <Textarea
                className="min-h-[80px] bg-slate-50 focus:bg-white"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Additional Notes</Label>
              <div className="flex flex-col gap-2">
                <div 
                  className={cn(
                    "min-h-[80px] rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 line-clamp-3",
                    !notes && "text-slate-400 italic"
                  )}
                  dangerouslySetInnerHTML={{ __html: notes || "Belum ada catatan." }}
                />
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
          </div>
          <DialogFooter className="px-6 py-4">
            <Button
              variant="ghost"
              onClick={() => setEditOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#153160] shadow-md shadow-[#153160]/20 hover:bg-[#153160]/90"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Changes
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

