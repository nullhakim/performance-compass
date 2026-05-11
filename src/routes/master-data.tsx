import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Database } from "lucide-react";

export const Route = createFileRoute("/master-data")({
  head: () => ({ meta: [{ title: "Master Data — Performance Tracker" }] }),
  component: () => (
    <DashboardLayout title="Master Data" subtitle="Products and categories.">
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-20 text-center">
          <Database className="h-10 w-10 text-muted-foreground" />
          <p className="mt-4 text-sm font-medium">Master Data module</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Coming next: manage products and categories.
          </p>
        </CardContent>
      </Card>
    </DashboardLayout>
  ),
});
