import { createFileRoute, Link } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { FolderTree, Package, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/master-data")({
  head: () => ({ meta: [{ title: "Master Data — Performance Tracker" }] }),
  component: MasterDataPage,
});

function MasterDataPage() {
  return (
    <DashboardLayout title="Master Data" subtitle="Manage categories and products.">
      <div className="grid gap-4 sm:grid-cols-2">
        <Link to="/categories">
          <Card className="transition-colors hover:border-primary/60">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
                <FolderTree className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Categories</p>
                <p className="text-sm text-muted-foreground">Product groupings.</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
        <Link to="/products">
          <Card className="transition-colors hover:border-primary/60">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Package className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Products</p>
                <p className="text-sm text-muted-foreground">Sales product catalog.</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </DashboardLayout>
  );
}
