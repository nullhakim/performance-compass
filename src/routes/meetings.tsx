import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, ArrowLeft, Construction } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/meetings")({
  head: () => ({
    meta: [
      { title: "Meeting Minutes — Super App Internal" },
      { name: "description", content: "Catat hasil rapat, daftar hadir, dan pantau status Action Items." },
    ],
  }),
  component: MeetingsPage,
});

function MeetingsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-background to-indigo-50/40">
      <div className="mx-auto max-w-3xl px-6 py-20">
        <Button asChild variant="ghost" size="sm" className="mb-6">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Main Menu
          </Link>
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <FileText className="h-8 w-8" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Meeting Minutes</h1>
            <p className="max-w-md text-muted-foreground">
              Modul ini sedang dalam pengembangan. Segera Anda dapat mencatat hasil rapat, daftar hadir, dan memantau status Action Items di sini.
            </p>
            <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-warning/10 px-3 py-1 text-xs font-medium text-warning-foreground">
              <Construction className="h-3.5 w-3.5" />
              Coming Soon
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
