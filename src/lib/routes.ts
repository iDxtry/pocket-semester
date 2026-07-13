export const workspaceViews = ["dashboard", "transactions", "budgets", "goals", "insights", "settings"] as const;

export type WorkspaceView = (typeof workspaceViews)[number];

export function resolveWorkspaceView(value: string | undefined | null): WorkspaceView {
  return workspaceViews.includes(value as WorkspaceView) ? (value as WorkspaceView) : "dashboard";
}

export function routeForView(view: WorkspaceView) {
  return view === "dashboard" ? "/dashboard" : `/${view}`;
}
