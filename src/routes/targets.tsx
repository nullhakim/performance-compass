import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Target } from "lucide-react";

export const Route = createFileRoute("/targets")({
  head: () => ({ meta: [{ title: "Targets & Achievements — Performance Tracker" }] }),
  component: () => (
    <DashboardLayout title="Targets & Achievements" subtitle="Assign targets and record achievements.">
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-20 text-center">
          <Target className="h-10 w-10 text-muted-foreground" />
          <p className="mt-4 text-sm font-medium">Targets module</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Coming next: assign targets and record achievements.
          </p>
        </CardContent>
      </Card>
    </DashboardLayout>
  ),
});
