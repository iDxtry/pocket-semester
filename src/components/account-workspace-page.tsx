import { AccountSetupNotice } from "@/components/account-setup-notice";
import { BudgetWorkspace } from "@/components/budget-workspace";
import { categories, type Category } from "@/lib/budget";
import { currentMonth, getLatestCoachRun, getMonthlyWorkspace } from "@/lib/data";
import { isAccountPlatformConfigured } from "@/lib/platform";
import { resolveWorkspaceView, type WorkspaceView } from "@/lib/routes";
import { requireActiveAccount } from "@/lib/server/account";
import { monthSchema } from "@/lib/validation";

type SearchParams = Promise<{ month?: string | string[]; category?: string | string[] }>;

export async function AccountWorkspacePage({ view, searchParams }: { view: WorkspaceView; searchParams: SearchParams }) {
  if (!isAccountPlatformConfigured()) return <AccountSetupNotice />;
  const params = await searchParams;
  const monthCandidate = Array.isArray(params.month) ? params.month[0] : params.month;
  const categoryCandidate = Array.isArray(params.category) ? params.category[0] : params.category;
  const month = monthSchema.safeParse(monthCandidate).success ? monthCandidate! : currentMonth();
  const category = categories.includes(categoryCandidate as Category) ? (categoryCandidate as Category) : "all";
  const { userId } = await requireActiveAccount();
  const [data, latestCoach] = await Promise.all([getMonthlyWorkspace(userId, month), getLatestCoachRun(userId, month)]);
  return <BudgetWorkspace mode="account" initialView={resolveWorkspaceView(view)} initialData={data} initialCoachPlan={latestCoach?.plan ?? null} initialCategory={category} />;
}
