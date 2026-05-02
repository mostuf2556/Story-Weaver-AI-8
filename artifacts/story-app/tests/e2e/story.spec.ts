/**
 * E2E tests: Story page
 *
 * Covers: page structure, header toolbar, settings sheet, composer,
 * message list, merge button, and image-generation button.
 *
 * AI-powered network calls (ai-turn, generate-image) are NOT triggered
 * so the suite runs quickly without requiring a live API key.
 */
import { test, expect } from "@playwright/test";

const STORY_URL = "/story/1";

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

test.describe("Story page — structure", () => {
  test.beforeEach(async ({ page }) => {
    await setEnglish(page);
    await page.goto(STORY_URL);
    await expect(page.locator("header").first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("renders the story title in the header", async ({ page }) => {
    const header = page.locator("header").first();
    const headerText = await header.textContent();
    expect(headerText?.trim().length).toBeGreaterThan(0);
  });

  test("shows the back-to-library link", async ({ page }) => {
    await expect(
      page.getByRole("link", { name: /Back to library/i }),
    ).toBeVisible({ timeout: 8_000 });
  });

  test("shows the play-story button", async ({ page }) => {
    await expect(page.getByTestId("button-play-story")).toBeVisible({
      timeout: 8_000,
    });
  });

  test("shows the blind-mode toggle button", async ({ page }) => {
    await expect(
      page.getByTestId("button-toggle-blind-mode"),
    ).toBeVisible({ timeout: 8_000 });
  });

  test("shows the game-mode toggle button", async ({ page }) => {
    await expect(
      page.getByTestId("button-toggle-game-mode"),
    ).toBeVisible({ timeout: 8_000 });
  });

  test("shows the Story Settings button", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: "Story Settings" }),
    ).toBeVisible({ timeout: 8_000 });
  });

  test("renders the message composer textarea", async ({ page }) => {
    await expect(page.locator("textarea").first()).toBeVisible({
      timeout: 8_000,
    });
  });

  test("composer has the dictation (mic) button", async ({ page }) => {
    await expect(
      page
        .getByRole("button", { name: /Dictate|Stop dictation/i })
        .first(),
    ).toBeVisible({ timeout: 8_000 });
  });

  test("composer has the send-paragraph button", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: "Send your paragraph" }),
    ).toBeVisible({ timeout: 8_000 });
  });

  test("composer has the generate-illustration button", async ({ page }) => {
    await expect(
      page
        .getByRole("button", {
          name: /Generate illustration|Generating illustration/i,
        })
        .first(),
    ).toBeVisible({ timeout: 8_000 });
  });
});

test.describe("Story page — settings sheet", () => {
  test.beforeEach(async ({ page }) => {
    await setEnglish(page);
    await page.goto(STORY_URL);
    await expect(
      page.getByRole("button", { name: "Story Settings" }),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("settings sheet opens when the gear button is clicked", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Story Settings" }).click();
    await expect(
      page.locator("[data-state='open']").first(),
    ).toBeVisible({ timeout: 6_000 });
  });

  test("settings sheet contains the Playback section", async ({ page }) => {
    await page.getByRole("button", { name: "Story Settings" }).click();
    await expect(page.getByText("Playback").first()).toBeVisible({
      timeout: 6_000,
    });
  });

  test("settings sheet contains the Voice section", async ({ page }) => {
    await page.getByRole("button", { name: "Story Settings" }).click();
    await expect(page.getByText("Voice").first()).toBeVisible({
      timeout: 6_000,
    });
  });

  test("settings sheet can be closed with Escape", async ({ page }) => {
    await page.getByRole("button", { name: "Story Settings" }).click();
    await page.waitForTimeout(400);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
    const openPanels = await page
      .locator("[data-state='open']")
      .count();
    expect(openPanels).toBe(0);
  });
});

test.describe("Story page — message list", () => {
  test.beforeEach(async ({ page }) => {
    await setEnglish(page);
    await page.goto(STORY_URL);
    await page.waitForTimeout(2_000);
  });

  test("renders existing story messages or the main content area", async ({
    page,
  }) => {
    const message = page
      .locator("[data-testid^='message-original-']")
      .first();
    const mainContent = page.locator("main, [role='main']").first();
    await expect(message.or(mainContent)).toBeVisible({ timeout: 10_000 });
  });

  test("message action buttons are present in the DOM", async ({ page }) => {
    const messageBlock = page
      .locator("[data-testid^='message-original-']")
      .first();

    const hasMessages = await messageBlock.isVisible().catch(() => false);
    if (!hasMessages) {
      test.skip();
      return;
    }

    const playBtn = page
      .locator("[data-testid^='button-play-message-']")
      .first();
    await expect(playBtn).toBeAttached({ timeout: 5_000 });
  });

  test("merge button is present in the DOM when multiple messages exist", async ({
    page,
  }) => {
    const messages = page.locator("[data-testid^='message-original-']");
    const count = await messages.count();

    if (count < 2) {
      test.skip();
      return;
    }

    const mergeBtn = page
      .getByRole("button", { name: "Merge with next paragraph" })
      .first();
    await expect(mergeBtn).toBeAttached({ timeout: 5_000 });
  });
});

test.describe("Story page — blind mode toggle", () => {
  test.beforeEach(async ({ page }) => {
    await setEnglish(page);
    await page.goto(STORY_URL);
    await expect(
      page.getByTestId("button-toggle-blind-mode"),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("clicking blind-mode button does not crash the page", async ({
    page,
  }) => {
    const btn = page.getByTestId("button-toggle-blind-mode");
    await btn.click();
    await page.waitForTimeout(300);
    await expect(btn).toBeVisible();
    await btn.click();
  });

  test("blind mode button has an accessible aria-label", async ({ page }) => {
    const btn = page.getByTestId("button-toggle-blind-mode");
    const label = await btn.getAttribute("aria-label");
    expect(label).toBeTruthy();
    expect(label).toMatch(/blind mode/i);
  });
});

test.describe("Story page — game mode toggle", () => {
  test.beforeEach(async ({ page }) => {
    await setEnglish(page);
    await page.goto(STORY_URL);
    await expect(
      page.getByTestId("button-toggle-game-mode"),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("clicking game-mode button does not crash the page", async ({
    page,
  }) => {
    const btn = page.getByTestId("button-toggle-game-mode");
    await btn.click();
    await page.waitForTimeout(300);
    await expect(btn).toBeVisible();
    await btn.click();
  });

  test("game mode button has an accessible aria-label", async ({ page }) => {
    const btn = page.getByTestId("button-toggle-game-mode");
    const label = await btn.getAttribute("aria-label");
    expect(label).toBeTruthy();
    expect(label).toMatch(/AI turns/i);
  });

  test("manual mode shows the AI-turn request button in the composer", async ({
    page,
  }) => {
    const btn = page.getByTestId("button-toggle-game-mode");
    const label = await btn.getAttribute("aria-label");
    // If currently auto mode, switch to manual
    const isAuto = label?.includes("manual");
    if (isAuto) {
      await btn.click();
      await page.waitForTimeout(400);
    }

    await expect(
      page.getByTestId("button-ai-turn"),
    ).toBeVisible({ timeout: 6_000 });

    // Restore original mode
    if (isAuto) {
      await page.getByTestId("button-toggle-game-mode").click();
    }
  });
});

test.describe("Story page — composer interaction", () => {
  test.beforeEach(async ({ page }) => {
    await setEnglish(page);
    await page.goto(STORY_URL);
    await expect(page.locator("textarea").first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("send button is disabled when textarea is empty", async ({ page }) => {
    const sendBtn = page.getByRole("button", { name: "Send your paragraph" });
    const textarea = page.locator("textarea").first();
    await textarea.clear();
    await expect(sendBtn).toBeDisabled();
  });

  test("typing in the composer enables the send button", async ({ page }) => {
    const textarea = page.locator("textarea").first();
    const sendBtn = page.getByRole("button", { name: "Send your paragraph" });

    await textarea.fill("Once upon a time the playwright test began.");
    await expect(sendBtn).toBeEnabled({ timeout: 4_000 });

    await textarea.clear();
  });
});
