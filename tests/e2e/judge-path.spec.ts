import { expect, test, type Page } from "@playwright/test";

async function openDemo(page: Page) {
  await page.goto("/demo");
  await expect(page.getByRole("heading", { name: "A clearer plan for this month." })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Funds run out after/ })).toBeVisible();
}

test("judge demo: add, categorize, choose a flight tradeoff, then reset", async ({ page }) => {
  await openDemo(page);

  await page.getByRole("button", { name: "Add expense" }).click();
  await page.getByLabel("Merchant").fill("Campus Cafe");
  await page.getByLabel("Description").fill("Iced coffee before study group");
  await page.getByLabel("Amount").fill("5.75");
  await page.getByRole("button", { name: /Categorize and add/ }).click();
  await expect(page.getByRole("heading", { name: "Campus Cafe is in Food & dining" })).toBeVisible();
  await expect(page.locator(".categorization-card")).toContainText(/Quick category match|Live response · (Gemini|OpenAI)/);

  const purchase = page.getByRole("textbox", { name: "Planned purchase", exact: true });
  await purchase.fill("");
  await purchase.press("Tab");
  await expect(purchase).toHaveValue("260");
  await page.getByRole("button", { name: /Textbooks.*\$220/ }).click();
  await expect(purchase).toHaveValue("220");
  await page.getByRole("button", { name: /Flight home.*\$260/ }).click();

  await page.getByRole("checkbox", { name: /Postpone the planned purchase/ }).check();
  await expect(page.getByRole("heading", { name: /Covered through finals/ })).toBeVisible();
  await expect(page.getByText(/Resources after choices:/)).toBeVisible();

  await page.getByRole("button", { name: "Reset Alex’s demo" }).click();
  await expect(page.getByRole("heading", { name: /Funds run out after/ })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /Postpone the planned purchase/ })).not.toBeChecked();
});

for (const width of [1024, 1180, 1280, 1440]) {
  test(`dashboard layout stays in flow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 960 });
    await openDemo(page);

    const coach = await page.locator(".coach-stack").boundingBox();
    const lowerGrid = await page.locator(".lower-grid").boundingBox();
    const budgetPanel = await page.locator(".budgets-panel").boundingBox();
    const chart = await page.locator(".budget-health-chart").boundingBox();

    expect(coach).not.toBeNull();
    expect(lowerGrid).not.toBeNull();
    expect(budgetPanel).not.toBeNull();
    expect(chart).not.toBeNull();
    expect((coach?.y ?? 0) + (coach?.height ?? 0)).toBeLessThanOrEqual((lowerGrid?.y ?? 0) + 1);
    expect(chart?.x ?? 0).toBeGreaterThanOrEqual(budgetPanel?.x ?? 0);
    expect((chart?.x ?? 0) + (chart?.width ?? 0)).toBeLessThanOrEqual((budgetPanel?.x ?? 0) + (budgetPanel?.width ?? 0) + 1);
    expect((chart?.y ?? 0) + (chart?.height ?? 0)).toBeLessThanOrEqual((budgetPanel?.y ?? 0) + (budgetPanel?.height ?? 0) + 1);
  });
}

test("mobile keeps budget values when the decorative donut is hidden", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openDemo(page);
  await expect(page.locator(".budget-health-chart")).toBeHidden();
  await expect(page.getByText("Housing", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/On track|Watch|At limit|Over plan/).first()).toBeVisible();
});
