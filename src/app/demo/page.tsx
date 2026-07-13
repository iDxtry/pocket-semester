import { BudgetWorkspace } from "@/components/budget-workspace";
import { categories, createDemoWorkspace, type Category } from "@/lib/budget";
import { currentMonth } from "@/lib/data";
import { resolveWorkspaceView } from "@/lib/routes";
import { monthSchema } from "@/lib/validation";

export default async function DemoPage({ searchParams }: { searchParams: Promise<{ view?: string | string[]; month?: string | string[]; category?: string | string[] }> }) {
  const params = await searchParams;
  const viewValue = Array.isArray(params.view) ? params.view[0] : params.view;
  const monthValue = Array.isArray(params.month) ? params.month[0] : params.month;
  const categoryValue = Array.isArray(params.category) ? params.category[0] : params.category;
  const month = monthSchema.safeParse(monthValue).success ? monthValue! : currentMonth();
  const category = categories.includes(categoryValue as Category) ? (categoryValue as Category) : "all";
  return <BudgetWorkspace mode="demo" initialView={resolveWorkspaceView(viewValue)} initialData={createDemoWorkspace(month)} initialCategory={category} />;
}
