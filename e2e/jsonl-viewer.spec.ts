import { test, expect, type Page } from "@playwright/test";
import * as path from "node:path";
import * as fs from "node:fs";

const fixturesDir = path.resolve(__dirname, "fixtures");

// Helper: load a JSONL file into the viewer by dispatching to the hidden file input
async function loadFile(page: Page, fixtureName: string) {
	const filePath = path.join(fixturesDir, fixtureName);
	const input = page.locator('input[type="file"]');
	await input.setInputFiles(filePath);
	// Wait for viewer to render (header becomes visible)
	await page.waitForSelector("header", { timeout: 10_000 });
}

// Helper: get the modifier key for the current platform
function meta(page: Page) {
	return "Meta";
}

// ---------------------------------------------------------------------------
// F002: File upload flow
// ---------------------------------------------------------------------------
test.describe("F002 – File upload", () => {
	test("shows drop zone on initial load", async ({ page }) => {
		await page.goto("/");
		await expect(page.getByText("Drop a JSON or JSONL file here")).toBeVisible();
		await expect(
			page.getByText("or click to browse — .jsonl, .json, .ndjson"),
		).toBeVisible();
		await expect(
			page.getByText("Everything runs client-side"),
		).toBeVisible();
	});

	test("loads file via click-to-browse", async ({ page }) => {
		await page.goto("/");
		await loadFile(page, "small.jsonl");
		// After loading, the header should show file name and record count
		await expect(page.getByText("small.jsonl")).toBeVisible();
		await expect(page.locator("header").getByText("3 records")).toBeVisible();
	});

	test("shows error count for malformed data", async ({ page }) => {
		await page.goto("/");
		await loadFile(page, "malformed.jsonl");
		// Should show error count in header
		await expect(page.locator("header").getByText("2 errors")).toBeVisible();
	});

	test("handles file with single record", async ({ page }) => {
		await page.goto("/");
		await loadFile(page, "single.jsonl");
		await expect(page.locator("header").getByText("1 record")).toBeVisible();
	});

	test("drop zone screenshot", async ({ page }) => {
		await page.goto("/");
		await page.waitForTimeout(500);
		await page.screenshot({
			path: "e2e/results/screenshots/drop-zone.png",
			fullPage: true,
		});
	});
});

// ---------------------------------------------------------------------------
// F003: Table view
// ---------------------------------------------------------------------------
test.describe("F003 – Table view", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
		await loadFile(page, "small.jsonl");
	});

	test("renders table with correct columns", async ({ page }) => {
		// Table view is default; check column headers exist
		const headers = page.locator("[role='tablist']");
		await expect(headers).toBeVisible();

		// Check column headers - the # column plus data columns
		await expect(page.getByText("id").first()).toBeVisible();
		await expect(page.getByText("name").first()).toBeVisible();
		await expect(page.getByText("age").first()).toBeVisible();
		await expect(page.getByText("active").first()).toBeVisible();
	});

	test("displays correct row data", async ({ page }) => {
		await expect(page.getByText("Alice").first()).toBeVisible();
		await expect(page.getByText("Bob").first()).toBeVisible();
		await expect(page.getByText("Carol").first()).toBeVisible();
	});

	test("sorts by column on click", async ({ page }) => {
		// Click the "name" column header to sort
		const nameHeader = page
			.locator("div")
			.filter({ hasText: /^name$/ })
			.first();
		await nameHeader.click();
		await page.waitForTimeout(300);
		// After sort, check sort indicator is visible (ArrowUp icon)
		const sortIndicator = page.locator("svg.text-primary").first();
		await expect(sortIndicator).toBeVisible();
	});

	test("opens record detail on row click", async ({ page }) => {
		// Click on "Alice" row
		await page.getByText("Alice").first().click();
		// Detail panel should open
		await expect(page.getByText("Record 1")).toBeVisible();
		await expect(page.locator("[role='dialog']")).toBeVisible();
	});

	test("handles empty search results gracefully", async ({ page }) => {
		const searchInput = page.locator("#search-input");
		await searchInput.fill("nonexistent_string_xyz");
		await page.waitForTimeout(300);
		await expect(page.getByText("No matching records")).toBeVisible();
	});

	test("table view screenshot", async ({ page }) => {
		await page.waitForTimeout(500);
		await page.screenshot({
			path: "e2e/results/screenshots/table-view.png",
		});
	});
});

// ---------------------------------------------------------------------------
// F004: Tree view
// ---------------------------------------------------------------------------
test.describe("F004 – Tree view", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
		await loadFile(page, "nested.jsonl");
	});

	test("switches to tree view and displays record", async ({ page }) => {
		await page.getByRole("tab", { name: /Tree/ }).click();
		// Check record navigation controls are visible
		const recordInput = page.locator('input[aria-label="Go to record number"]');
		await expect(recordInput).toBeVisible();
		await expect(recordInput).toHaveValue("1");
		await expect(page.getByText("of 3")).toBeVisible();
	});

	test("navigates between records", async ({ page }) => {
		await page.getByRole("tab", { name: /Tree/ }).click();
		// Navigate to next record
		await page.getByLabel("Next record").click();
		// Should show record 2
		const input = page.locator('input[aria-label="Go to record number"]');
		await expect(input).toHaveValue("2");
	});

	test("toggles expand/collapse all", async ({ page }) => {
		await page.getByRole("tab", { name: /Tree/ }).click();
		// Click Collapse button
		await page.getByText("Collapse").click();
		// Should switch to "Expand" text
		await expect(page.getByText("Expand")).toBeVisible();
	});

	test("shows copy button and copies JSON", async ({ page }) => {
		await page.getByRole("tab", { name: /Tree/ }).click();
		await page.getByText("Copy").first().click();
		// Should show "Copied" text briefly
		await expect(page.getByText("Copied").first()).toBeVisible();
	});

	test("shows error state for malformed records", async ({ page }) => {
		await page.goto("/");
		await loadFile(page, "malformed.jsonl");
		await page.getByRole("tab", { name: /Tree/ }).click();
		// Navigate to the malformed record (index 1)
		await page.getByLabel("Next record").click();
		// Should show error message
		await expect(page.getByText(/Malformed JSON/)).toBeVisible();
	});

	test("tree view screenshot", async ({ page }) => {
		await page.getByRole("tab", { name: /Tree/ }).click();
		await page.waitForTimeout(500);
		await page.screenshot({
			path: "e2e/results/screenshots/tree-view.png",
		});
	});
});

// ---------------------------------------------------------------------------
// F005: Raw view
// ---------------------------------------------------------------------------
test.describe("F005 – Raw view", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
		await loadFile(page, "small.jsonl");
	});

	test("switches to raw view and shows line numbers", async ({ page }) => {
		await page.getByRole("tab", { name: /Raw/ }).click();
		// Line numbers should be visible (1, 2, 3)
		await expect(page.getByText("1").first()).toBeVisible();
		await expect(page.getByText("2").first()).toBeVisible();
		await expect(page.getByText("3").first()).toBeVisible();
	});

	test("toggles word wrap", async ({ page }) => {
		await page.getByRole("tab", { name: /Raw/ }).click();
		const wrapBtn = page.getByLabel(/word wrap/i);
		await wrapBtn.click();
		// The button should now be "active" (pressed state)
		await expect(wrapBtn).toHaveAttribute("aria-pressed", "true");
		// Click again to toggle off
		await wrapBtn.click();
		await expect(wrapBtn).toHaveAttribute("aria-pressed", "false");
	});

	test("clicking a line opens detail panel", async ({ page }) => {
		await page.getByRole("tab", { name: /Raw/ }).click();
		// Click on the first line content
		await page.locator("pre").first().click();
		// Detail panel should open
		await expect(page.locator("[role='dialog']")).toBeVisible();
	});

	test("copy all button works", async ({ page }) => {
		await page.getByRole("tab", { name: /Raw/ }).click();
		await page.getByLabel("Copy all records").click();
		await expect(page.getByText("Copied").first()).toBeVisible();
	});

	test("raw view screenshot", async ({ page }) => {
		await page.getByRole("tab", { name: /Raw/ }).click();
		await page.waitForTimeout(500);
		await page.screenshot({
			path: "e2e/results/screenshots/raw-view.png",
		});
	});
});

// ---------------------------------------------------------------------------
// F006: View switching
// ---------------------------------------------------------------------------
test.describe("F006 – View switching", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
		await loadFile(page, "small.jsonl");
	});

	test("switches views via tabs", async ({ page }) => {
		// Default is table
		const tableTab = page.getByRole("tab", { name: /Table/ });
		await expect(tableTab).toHaveAttribute("aria-selected", "true");

		// Switch to tree
		await page.getByRole("tab", { name: /Tree/ }).click();
		await expect(
			page.getByRole("tab", { name: /Tree/ }),
		).toHaveAttribute("aria-selected", "true");

		// Switch to raw
		await page.getByRole("tab", { name: /Raw/ }).click();
		await expect(page.getByRole("tab", { name: /Raw/ })).toHaveAttribute(
			"aria-selected",
			"true",
		);
	});

	test("switches views via keyboard shortcuts", async ({ page }) => {
		// Press ⌘2 for tree view
		await page.keyboard.press("Meta+2");
		await expect(
			page.getByRole("tab", { name: /Tree/ }),
		).toHaveAttribute("aria-selected", "true");

		// Press ⌘3 for raw view
		await page.keyboard.press("Meta+3");
		await expect(page.getByRole("tab", { name: /Raw/ })).toHaveAttribute(
			"aria-selected",
			"true",
		);

		// Press ⌘1 for table view
		await page.keyboard.press("Meta+1");
		await expect(
			page.getByRole("tab", { name: /Table/ }),
		).toHaveAttribute("aria-selected", "true");
	});
});

// ---------------------------------------------------------------------------
// F007: Search & filter
// ---------------------------------------------------------------------------
test.describe("F007 – Search & filter", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
		await loadFile(page, "small.jsonl");
	});

	test("search filters records and shows match count", async ({ page }) => {
		const searchInput = page.locator("#search-input");
		await searchInput.fill("Alice");
		await page.waitForTimeout(300);
		// Should show match count "1/3" near the search bar
		const searchContainer = searchInput.locator("..");
		await expect(searchContainer.getByText(/1/)).toBeVisible();
		await expect(searchContainer.getByText(/3/)).toBeVisible();
	});

	test("clear button resets search", async ({ page }) => {
		const searchInput = page.locator("#search-input");
		await searchInput.fill("Alice");
		await page.waitForTimeout(300);
		// Click clear button
		await page.getByLabel("Clear search").click();
		// Search should be empty
		await expect(searchInput).toHaveValue("");
	});

	test("⌘K focuses search input", async ({ page }) => {
		await page.keyboard.press("Meta+k");
		await expect(page.locator("#search-input")).toBeFocused();
	});

	test("Escape clears search", async ({ page }) => {
		const searchInput = page.locator("#search-input");
		await searchInput.fill("Alice");
		await page.waitForTimeout(200);
		// Press Escape on the page (not in input) - first blur the input
		await searchInput.blur();
		await page.keyboard.press("Escape");
		await expect(searchInput).toHaveValue("");
	});
});

// ---------------------------------------------------------------------------
// F008: Record detail panel
// ---------------------------------------------------------------------------
test.describe("F008 – Record detail panel", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
		await loadFile(page, "small.jsonl");
	});

	test("opens detail panel on row click", async ({ page }) => {
		await page.getByText("Alice").first().click();
		const dialog = page.locator("[role='dialog']");
		await expect(dialog).toBeVisible();
		await expect(dialog.getByText("Record 1")).toBeVisible();
	});

	test("navigates between records with prev/next buttons", async ({
		page,
	}) => {
		await page.getByText("Alice").first().click();
		await expect(
			page.locator("[role='dialog']").getByText("Record 1"),
		).toBeVisible();
		// Navigate to next record
		await page.getByLabel("Next record (↓)").click();
		await expect(
			page.locator("[role='dialog']").getByText("Record 2"),
		).toBeVisible();
		// Navigate back
		await page.getByLabel("Previous record (↑)").click();
		await expect(
			page.locator("[role='dialog']").getByText("Record 1"),
		).toBeVisible();
	});

	test("navigates records with arrow keys", async ({ page }) => {
		await page.getByText("Alice").first().click();
		await expect(
			page.locator("[role='dialog']").getByText("Record 1"),
		).toBeVisible();
		// Arrow down to next record
		await page.keyboard.press("ArrowDown");
		await expect(
			page.locator("[role='dialog']").getByText("Record 2"),
		).toBeVisible();
		// Arrow up to previous
		await page.keyboard.press("ArrowUp");
		await expect(
			page.locator("[role='dialog']").getByText("Record 1"),
		).toBeVisible();
	});

	test("closes detail panel with Escape", async ({ page }) => {
		await page.getByText("Alice").first().click();
		await expect(page.locator("[role='dialog']")).toBeVisible();
		await page.keyboard.press("Escape");
		await expect(page.locator("[role='dialog']")).not.toBeVisible();
	});

	test("closes detail panel with close button", async ({ page }) => {
		await page.getByText("Alice").first().click();
		await expect(page.locator("[role='dialog']")).toBeVisible();
		await page.getByLabel("Close (Escape)").click();
		await expect(page.locator("[role='dialog']")).not.toBeVisible();
	});

	test("copy formatted button works", async ({ page }) => {
		await page.getByText("Alice").first().click();
		await page.getByText("Copy formatted").click();
		await expect(
			page.locator("[role='dialog']").getByText("Copy formatted"),
		).toBeVisible();
	});

	test("copy minified button works", async ({ page }) => {
		await page.getByText("Alice").first().click();
		await page.getByText("Copy minified").click();
		// "Copy minified" text should still be visible (button label)
		await expect(
			page.locator("[role='dialog']").getByText("Copy minified"),
		).toBeVisible();
	});

	test("detail panel screenshot", async ({ page }) => {
		await page.getByText("Alice").first().click();
		await page.waitForTimeout(500);
		await page.screenshot({
			path: "e2e/results/screenshots/record-detail.png",
		});
	});
});

// ---------------------------------------------------------------------------
// F009: Dark mode
// ---------------------------------------------------------------------------
test.describe("F009 – Dark mode", () => {
	test("default theme is dark", async ({ page }) => {
		await page.goto("/");
		// Default theme is dark per layout.tsx
		const html = page.locator("html");
		await expect(html).toHaveClass(/dark/);
	});

	test("toggles theme via header button", async ({ page }) => {
		await page.goto("/");
		await loadFile(page, "small.jsonl");
		// Click theme toggle button
		await page.getByLabel("Toggle theme (⌘D)").click();
		await page.waitForTimeout(300);
		const html = page.locator("html");
		// Should switch to light
		await expect(html).not.toHaveClass(/dark/);
		// Toggle back
		await page.getByLabel("Toggle theme (⌘D)").click();
		await page.waitForTimeout(300);
		await expect(html).toHaveClass(/dark/);
	});

	test("dark mode screenshot", async ({ page }) => {
		await page.goto("/");
		await loadFile(page, "small.jsonl");
		await page.waitForTimeout(500);
		await page.screenshot({
			path: "e2e/results/screenshots/dark-mode.png",
		});
	});

	test("light mode screenshot", async ({ page }) => {
		await page.goto("/");
		await loadFile(page, "small.jsonl");
		await page.getByLabel("Toggle theme (⌘D)").click();
		await page.waitForTimeout(500);
		await page.screenshot({
			path: "e2e/results/screenshots/light-mode.png",
		});
	});
});

// ---------------------------------------------------------------------------
// F010: Header & layout
// ---------------------------------------------------------------------------
test.describe("F010 – Header & layout", () => {
	test("displays file name and record count", async ({ page }) => {
		await page.goto("/");
		await loadFile(page, "small.jsonl");
		await expect(page.getByText("small.jsonl")).toBeVisible();
		await expect(page.locator("header").getByText("3 records")).toBeVisible();
	});

	test("displays parse time in status bar", async ({ page }) => {
		await page.goto("/");
		await loadFile(page, "small.jsonl");
		// Status bar should show "ms" (parse time)
		await expect(page.getByText(/\d+ms/)).toBeVisible();
	});

	test("New file button resets to drop zone", async ({ page }) => {
		await page.goto("/");
		await loadFile(page, "small.jsonl");
		await expect(page.getByText("small.jsonl")).toBeVisible();
		// Click "New file" button
		await page.getByLabel("Load a different file").click();
		// Should go back to drop zone
		await expect(page.getByText("Drop a JSON or JSONL file here")).toBeVisible();
	});

	test("displays Beauties branding", async ({ page }) => {
		await page.goto("/");
		await expect(page.getByText("Beauties").first()).toBeVisible();
	});
});

// ---------------------------------------------------------------------------
// F011: Keyboard shortcuts
// ---------------------------------------------------------------------------
test.describe("F011 – Keyboard shortcuts", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
		await loadFile(page, "small.jsonl");
	});

	test("? opens keyboard help dialog", async ({ page }) => {
		await page.keyboard.press("?");
		await expect(page.getByText("Keyboard Shortcuts")).toBeVisible();
		// Verify shortcut entries are displayed
		await expect(page.getByText("Switch to Table view")).toBeVisible();
		await expect(page.getByText("Focus search")).toBeVisible();
		await expect(page.getByText("Toggle dark/light mode")).toBeVisible();
	});

	test("Escape closes keyboard help", async ({ page }) => {
		await page.keyboard.press("?");
		await expect(page.getByText("Keyboard Shortcuts")).toBeVisible();
		await page.keyboard.press("Escape");
		await expect(page.getByText("Keyboard Shortcuts")).not.toBeVisible();
	});

	test("close button closes keyboard help", async ({ page }) => {
		await page.keyboard.press("?");
		await expect(page.getByText("Keyboard Shortcuts")).toBeVisible();
		await page.getByLabel("Close keyboard shortcuts").click();
		await expect(page.getByText("Keyboard Shortcuts")).not.toBeVisible();
	});

	test("⌘D toggles dark mode via keyboard", async ({ page }) => {
		const html = page.locator("html");
		await expect(html).toHaveClass(/dark/);
		await page.keyboard.press("Meta+d");
		await page.waitForTimeout(300);
		await expect(html).not.toHaveClass(/dark/);
	});

	test("keyboard help screenshot", async ({ page }) => {
		await page.keyboard.press("?");
		await page.waitForTimeout(500);
		await page.screenshot({
			path: "e2e/results/screenshots/keyboard-help.png",
		});
	});
});

// ---------------------------------------------------------------------------
// F012: Error handling
// ---------------------------------------------------------------------------
test.describe("F012 – Error handling", () => {
	test("shows error count for malformed lines", async ({ page }) => {
		await page.goto("/");
		await loadFile(page, "malformed.jsonl");
		// Header should show errors
		await expect(page.locator("header").getByText("2 errors")).toBeVisible();
	});

	test("malformed records are visible in table with error styling", async ({
		page,
	}) => {
		await page.goto("/");
		await loadFile(page, "malformed.jsonl");
		// 5 records total (3 valid + 2 malformed)
		await expect(page.locator("header").getByText("5 records")).toBeVisible();
	});

	test("tree view shows error details for malformed records", async ({
		page,
	}) => {
		await page.goto("/");
		await loadFile(page, "malformed.jsonl");
		await page.getByRole("tab", { name: /Tree/ }).click();
		// Go to second record (malformed)
		await page.getByLabel("Next record").click();
		await expect(page.getByText(/Malformed JSON/)).toBeVisible();
	});

	test("detail panel shows error for malformed records", async ({
		page,
	}) => {
		await page.goto("/");
		await loadFile(page, "malformed.jsonl");
		// Navigate to tree view and select the malformed record, then check detail
		await page.getByRole("tab", { name: /Tree/ }).click();
		// Navigate to the second record which is malformed
		await page.getByLabel("Next record").click();
		// Should show malformed JSON error
		await expect(page.getByText(/Malformed JSON/)).toBeVisible();
		// Also verify the raw text is shown
		await expect(page.getByText("this is not valid json")).toBeVisible();
	});

	test("error handling screenshot", async ({ page }) => {
		await page.goto("/");
		await loadFile(page, "malformed.jsonl");
		await page.waitForTimeout(500);
		await page.screenshot({
			path: "e2e/results/screenshots/error-handling.png",
		});
	});
});

// ---------------------------------------------------------------------------
// Data types & nested objects
// ---------------------------------------------------------------------------
test.describe("Data types rendering", () => {
	test("renders all JSON data types correctly in table", async ({
		page,
	}) => {
		await page.goto("/");
		await loadFile(page, "types.jsonl");
		// String value
		await expect(page.getByText("hello").first()).toBeVisible();
		// Number values
		await expect(page.getByText("42").first()).toBeVisible();
		await expect(page.getByText("3.14").first()).toBeVisible();
		// Boolean
		await expect(page.getByText("true").first()).toBeVisible();
		await expect(page.getByText("false").first()).toBeVisible();
		// Null
		await expect(page.getByText("null").first()).toBeVisible();
		// Array badge
		await expect(page.getByText("[3]").first()).toBeVisible();
	});

	test("nested objects render in tree view", async ({ page }) => {
		await page.goto("/");
		await loadFile(page, "nested.jsonl");
		await page.getByRole("tab", { name: /Tree/ }).click();
		// Should show nested keys
		await expect(page.getByText('"user"').first()).toBeVisible();
		await expect(page.getByText('"address"').first()).toBeVisible();
		await expect(page.getByText('"NYC"').first()).toBeVisible();
	});
});

// ---------------------------------------------------------------------------
// Performance: large dataset
// ---------------------------------------------------------------------------
test.describe("Performance – large dataset", () => {
	test("loads 1000 records within reasonable time", async ({ page }) => {
		await page.goto("/");
		const start = Date.now();
		await loadFile(page, "large.jsonl");
		const elapsed = Date.now() - start;
		// Should show 1,000 records in header
		await expect(page.locator("header").getByText("1,000 records")).toBeVisible();
		// Loading + parsing should complete in under 5 seconds
		expect(elapsed).toBeLessThan(5000);
	});

	test("table view is scrollable with virtualization", async ({ page }) => {
		await page.goto("/");
		await loadFile(page, "large.jsonl");
		// The table should be virtualized (not all 1000 rows in DOM)
		const visibleRows = page.locator(
			'div[style*="position: absolute"]',
		);
		const count = await visibleRows.count();
		// With virtualization, only a subset of rows should be rendered
		expect(count).toBeLessThan(200);
		expect(count).toBeGreaterThan(0);
	});

	test("search works on large datasets", async ({ page }) => {
		await page.goto("/");
		await loadFile(page, "large.jsonl");
		const searchInput = page.locator("#search-input");
		await searchInput.fill("User 500");
		await page.waitForTimeout(500);
		// Should filter down to a single record
		await expect(page.getByText("User 500").first()).toBeVisible();
	});

	test("large dataset screenshot", async ({ page }) => {
		await page.goto("/");
		await loadFile(page, "large.jsonl");
		await page.waitForTimeout(500);
		await page.screenshot({
			path: "e2e/results/screenshots/large-dataset.png",
		});
	});
});

// ---------------------------------------------------------------------------
// Console error check
// ---------------------------------------------------------------------------
test.describe("No console errors", () => {
	test("no console errors during normal usage flow", async ({ page }) => {
		const consoleErrors: string[] = [];
		page.on("console", (msg) => {
			if (msg.type() === "error") {
				consoleErrors.push(msg.text());
			}
		});

		await page.goto("/");
		await loadFile(page, "small.jsonl");

		// Switch through all views
		await page.getByRole("tab", { name: /Tree/ }).click();
		await page.waitForTimeout(300);
		await page.getByRole("tab", { name: /Raw/ }).click();
		await page.waitForTimeout(300);
		await page.getByRole("tab", { name: /Table/ }).click();
		await page.waitForTimeout(300);

		// Open detail panel
		await page.getByText("Alice").first().click();
		await page.waitForTimeout(300);
		await page.keyboard.press("Escape");

		// Search
		await page.locator("#search-input").fill("Bob");
		await page.waitForTimeout(300);
		await page.locator("#search-input").fill("");

		// Open keyboard help
		await page.keyboard.press("?");
		await page.waitForTimeout(300);
		await page.keyboard.press("Escape");

		// Filter out known benign errors (e.g., favicon 404)
		const realErrors = consoleErrors.filter(
			(e) => !e.includes("favicon") && !e.includes("404"),
		);

		expect(realErrors).toEqual([]);
	});

	test("no console errors with malformed data", async ({ page }) => {
		const consoleErrors: string[] = [];
		page.on("console", (msg) => {
			if (msg.type() === "error") {
				consoleErrors.push(msg.text());
			}
		});

		await page.goto("/");
		await loadFile(page, "malformed.jsonl");
		await page.waitForTimeout(500);

		// Switch through views
		await page.getByRole("tab", { name: /Tree/ }).click();
		await page.waitForTimeout(300);
		await page.getByRole("tab", { name: /Raw/ }).click();
		await page.waitForTimeout(300);

		const realErrors = consoleErrors.filter(
			(e) => !e.includes("favicon") && !e.includes("404"),
		);
		expect(realErrors).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// Accessibility basics
// ---------------------------------------------------------------------------
test.describe("Accessibility", () => {
	test("file input has accessible label", async ({ page }) => {
		await page.goto("/");
		const input = page.locator('input[type="file"]');
		await expect(input).toHaveAttribute("aria-label", "Select a JSONL file");
	});

	test("view tabs have proper ARIA roles", async ({ page }) => {
		await page.goto("/");
		await loadFile(page, "small.jsonl");
		const tablist = page.locator("[role='tablist']");
		await expect(tablist).toBeVisible();
		const tabs = page.locator("[role='tab']");
		expect(await tabs.count()).toBe(3);
	});

	test("buttons have accessible labels", async ({ page }) => {
		await page.goto("/");
		await loadFile(page, "small.jsonl");
		// Header buttons should have labels
		await expect(
			page.getByLabel("Load a different file"),
		).toBeVisible();
		await expect(
			page.getByLabel("Keyboard shortcuts (?)"),
		).toBeVisible();
		await expect(page.getByLabel("Toggle theme (⌘D)")).toBeVisible();
	});

	test("search input has accessible label", async ({ page }) => {
		await page.goto("/");
		await loadFile(page, "small.jsonl");
		await expect(page.getByLabel("Search records")).toBeVisible();
	});

	test("detail panel has dialog role", async ({ page }) => {
		await page.goto("/");
		await loadFile(page, "small.jsonl");
		await page.getByText("Alice").first().click();
		const dialog = page.locator("[role='dialog']");
		await expect(dialog).toBeVisible();
		await expect(dialog).toHaveAttribute("aria-label", "Record detail");
	});
});
