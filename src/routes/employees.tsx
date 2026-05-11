import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Users } from "lucide-react";

export const Route = createFileRoute("/employees")({
  head: () => ({ meta: [{ title: "Employees — Performance Tracker" }] }),
  component: () => (
    <DashboardLayout title="Employees" subtitle="Manage your sales workforce.">
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-20 text-center">
          <Users className="h-10 w-10 text-muted-foreground" />
          <p className="mt-4 text-sm font-medium">Employees module</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Coming next: data table with registration modal.
          </p>
        </CardContent>
      </Card>
    </DashboardLayout>
  ),
});
