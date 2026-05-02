/**
 * E2E tests: Home page
 *
 * Covers: page load, conversation list, creating a new story,
 * and navigating to an existing story.
 */
import { test, expect } from "@playwright/test";

const setEnglish = async (page: import("@playwright/test").Page) => {
  await page.addInitScript(() => {
    try {
      const raw = localStorage.getItem("story-together-settings");
      const saved = raw ? JSON.parse(raw) : {};
      saved.uiLanguage = "en";
      localStorage.setItem("story-together-settings", JSON.stringify(saved));
    } catch {}
  });
};

test.describe("Home page", () => {
  test.beforeEach(async ({ page }) => {
    await setEnglish(page);
    await page.goto("/");
  });

  test("loads and shows the app title", async ({ page }) => {
    await expect(page).toHaveTitle(/Story Together/i);
    await expect(
      page.getByRole("heading", { name: "Story Together" }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("shows the tagline text", async ({ page }) => {
    await expect(
      page.getByText(/Every story starts with you/i),
    ).toBeVisible({ timeout: 8_000 });
  });

  test("shows at least one existing conversation or the empty state", async ({
    page,
  }) => {
    // At least one story link OR the empty-state heading must be present
    const storyLinks = page.locator("a[href^='/story/']");
    const emptyHeading = page.getByRole("heading", { name: /start.*first|no stories/i });

    await page.waitForTimeout(2_000);

    const linkCount = await storyLinks.count();
    const emptyVisible = await emptyHeading.isVisible().catch(() => false);
    expect(linkCount > 0 || emptyVisible).toBe(true);
  });

  test("has the new-story button visible", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /Write a New Story/i }),
    ).toBeVisible({ timeout: 8_000 });
  });

  test("clicking new-story shows the title input", async ({ page }) => {
    await page.getByRole("button", { name: /Write a New Story/i }).click();
    await expect(
      page.locator("input[id='title']"),
    ).toBeVisible({ timeout: 6_000 });
  });

  test("filling title and submitting creates a new story", async ({ page }) => {
    await page.getByRole("button", { name: /Write a New Story/i }).click();
    const input = page.locator("input[id='title']");
    await expect(input).toBeVisible({ timeout: 6_000 });
    await input.fill("Playwright E2E Test Story");
    const createBtn = page.getByRole("button", { name: /Begin Writing|begin|start|create/i }).last();
    await expect(createBtn).toBeEnabled();
    await createBtn.click();
    await expect(page).toHaveURL(/\/story\/\d+/, { timeout: 15_000 });
  });

  test("can navigate to an existing conversation", async ({ page }) => {
    const link = page.locator("a[href^='/story/']").first();
    await expect(link).toBeVisible({ timeout: 10_000 });
    await link.click();
    await expect(page).toHaveURL(/\/story\/\d+/, { timeout: 10_000 });
  });
});
