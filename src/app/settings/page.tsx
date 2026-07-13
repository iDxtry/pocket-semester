import { AccountWorkspacePage } from "@/components/account-workspace-page";

export const dynamic = "force-dynamic";

export default function SettingsPage({ searchParams }: { searchParams: Promise<{ month?: string | string[]; category?: string | string[] }> }) {
  return <AccountWorkspacePage view="settings" searchParams={searchParams} />;
}
