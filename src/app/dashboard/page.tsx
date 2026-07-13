import { AccountWorkspacePage } from "@/components/account-workspace-page";

export const dynamic = "force-dynamic";

export default function DashboardPage({ searchParams }: { searchParams: Promise<{ month?: string | string[]; category?: string | string[] }> }) {
  return <AccountWorkspacePage view="dashboard" searchParams={searchParams} />;
}
