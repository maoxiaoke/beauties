import { test, expect, type Page } from "@playwright/test";
import * as path from "node:path";

const fixturesDir = path.resolve(__dirname, "fixtures");

// Helper: load a file into the viewer via the hidden file input
async function loadFile(page: Page, fixtureName: string) {
	const filePath = path.join(fixturesDir, fixtureName);
	const input = page.locator('input[type="file"]');
	await input.setInputFiles(filePath);
	await page.waitForSelector("header", { timeout: 10_000 });
}

// ===========================================================================
// Clipboard Paste Support (Task #6)
// ===========================================================================
test.describe("Clipboard paste – Drop zone UI", () => {
	test("paste button is visible on drop zone", async ({ page }) => {
		await page.goto("/");
		await expect(page.getByText("Paste from clipboard")).toBeVisible();
	});

	test("paste button shows ⌘V hint", async ({ page }) => {
		await page.goto("/");
		await expect(page.getByText("⌘V")).toBeVisible();
	});

	test("drop zone screenshot with paste button", async ({ page }) => {
		await page.goto("/");
		await page.waitForTimeout(500);
		await page.screenshot({
			path: "e2e/results/screenshots/drop-zone-with-paste.png",
			fullPage: true,
		});
	});
});

test.describe("Clipboard paste – Paste via button", () => {
	test("paste button loads valid JSONL from clipboard", async ({
		page,
		context,
	}) => {
		await context.grantPermissions(["clipboard-read", "clipboard-write"]);
		await page.goto("/");

		// Write JSONL data to clipboard
		const jsonlData = '{"id": 1, "name": "ClipAlice"}\n{"id": 2, "name": "ClipBob"}';
		await page.evaluate((text) => navigator.clipboard.writeText(text), jsonlData);

		// Click paste button
		await page.getByText("Paste from clipboard").click();

		// Should load and display the data
		await page.waitForSelector("header", { timeout: 10_000 });
		await expect(page.getByText("clipboard-paste.jsonl")).toBeVisible();
		await expect(page.locator("header").getByText("2 records")).toBeVisible();
		await expect(page.getByText("ClipAlice").first()).toBeVisible();
		await expect(page.getByText("ClipBob").first()).toBeVisible();
	});

	test("paste button loads valid JSON array from clipboard", async ({
		page,
		context,
	}) => {
		await context.grantPermissions(["clipboard-read", "clipboard-write"]);
		await page.goto("/");

		const jsonArray = JSON.stringify([
			{ id: 1, city: "NYC" },
			{ id: 2, city: "LA" },
			{ id: 3, city: "Chicago" },
		]);
		await page.evaluate((text) => navigator.clipboard.writeText(text), jsonArray);

		await page.getByText("Paste from clipboard").click();
		await page.waitForSelector("header", { timeout: 10_000 });
		await expect(page.locator("header").getByText("3 records")).toBeVisible();
		await expect(page.getByText("NYC").first()).toBeVisible();
	});

	test("paste button loads single JSON object from clipboard", async ({
		page,
		context,
	}) => {
		await context.grantPermissions(["clipboard-read", "clipboard-write"]);
		await page.goto("/");

		const singleObj = JSON.stringify({ name: "Solo", score: 99 });
		await page.evaluate((text) => navigator.clipboard.writeText(text), singleObj);

		await page.getByText("Paste from clipboard").click();
		await page.waitForSelector("header", { timeout: 10_000 });
		await expect(page.locator("header").getByText("1 record")).toBeVisible();
		await expect(page.getByText("Solo").first()).toBeVisible();
	});

	test("paste button shows error for empty clipboard", async ({
		page,
		context,
	}) => {
		await context.grantPermissions(["clipboard-read", "clipboard-write"]);
		await page.goto("/");

		// Set clipboard to empty string
		await page.evaluate(() => navigator.clipboard.writeText(""));

		await page.getByText("Paste from clipboard").click();
		await page.waitForTimeout(500);
		await expect(page.getByText("Clipboard is empty")).toBeVisible();
	});

	test("paste button handles malformed JSON in clipboard", async ({
		page,
		context,
	}) => {
		await context.grantPermissions(["clipboard-read", "clipboard-write"]);
		await page.goto("/");

		const malformed = '{"id": 1, "name": "Valid"}\nthis is bad\n{"id": 2, "name": "AlsoValid"}';
		await page.evaluate((text) => navigator.clipboard.writeText(text), malformed);

		await page.getByText("Paste from clipboard").click();
		await page.waitForSelector("header", { timeout: 10_000 });
		// Should load with errors
		await expect(page.locator("header").getByText("3 records")).toBeVisible();
		await expect(page.locator("header").getByText("1 error")).toBeVisible();
	});

	test("pasted data renders in all three views", async ({
		page,
		context,
	}) => {
		await context.grantPermissions(["clipboard-read", "clipboard-write"]);
		await page.goto("/");

		const data = '{"id": 1, "name": "ViewTest", "active": true}';
		await page.evaluate((text) => navigator.clipboard.writeText(text), data);

		await page.getByText("Paste from clipboard").click();
		await page.waitForSelector("header", { timeout: 10_000 });

		// Table view (default)
		await expect(page.getByText("ViewTest").first()).toBeVisible();

		// Tree view
		await page.getByRole("tab", { name: /Tree/ }).click();
		await expect(page.getByText('"ViewTest"').first()).toBeVisible();

		// Raw view
		await page.getByRole("tab", { name: /Raw/ }).click();
		await expect(page.locator("pre").first()).toBeVisible();
	});

	test("clipboard paste screenshot", async ({ page, context }) => {
		await context.grantPermissions(["clipboard-read", "clipboard-write"]);
		await page.goto("/");

		const data = '{"id": 1, "name": "PastedAlice", "role": "engineer"}\n{"id": 2, "name": "PastedBob", "role": "designer"}';
		await page.evaluate((text) => navigator.clipboard.writeText(text), data);

		await page.getByText("Paste from clipboard").click();
		await page.waitForSelector("header", { timeout: 10_000 });
		await page.waitForTimeout(500);
		await page.screenshot({
			path: "e2e/results/screenshots/clipboard-paste-result.png",
		});
	});
});

test.describe("Clipboard paste – Console errors", () => {
	test("no console errors during paste flow", async ({ page, context }) => {
		const consoleErrors: string[] = [];
		page.on("console", (msg) => {
			if (msg.type() === "error") {
				consoleErrors.push(msg.text());
			}
		});

		await context.grantPermissions(["clipboard-read", "clipboard-write"]);
		await page.goto("/");

		const data = '{"id": 1, "name": "Test"}';
		await page.evaluate((text) => navigator.clipboard.writeText(text), data);

		await page.getByText("Paste from clipboard").click();
		await page.waitForSelector("header", { timeout: 10_000 });

		// Switch views
		await page.getByRole("tab", { name: /Tree/ }).click();
		await page.waitForTimeout(200);
		await page.getByRole("tab", { name: /Raw/ }).click();
		await page.waitForTimeout(200);

		const realErrors = consoleErrors.filter(
			(e) => !e.includes("favicon") && !e.includes("404"),
		);
		expect(realErrors).toEqual([]);
	});
});

// ===========================================================================
// JSON File Support (Task #7)
// ===========================================================================
test.describe("JSON file – Array format", () => {
	test("loads .json file with array of objects", async ({ page }) => {
		await page.goto("/");
		await loadFile(page, "array.json");
		await expect(page.getByText("array.json")).toBeVisible();
		await expect(page.locator("header").getByText("3 records")).toBeVisible();
	});

	test("displays all records from JSON array", async ({ page }) => {
		await page.goto("/");
		await loadFile(page, "array.json");
		await expect(page.getByText("Alice").first()).toBeVisible();
		await expect(page.getByText("Bob").first()).toBeVisible();
		await expect(page.getByText("Carol").first()).toBeVisible();
	});

	test("detects columns from JSON array records", async ({ page }) => {
		await page.goto("/");
		await loadFile(page, "array.json");
		// Check column headers
		await expect(page.getByText("id").first()).toBeVisible();
		await expect(page.getByText("name").first()).toBeVisible();
		await expect(page.getByText("role").first()).toBeVisible();
	});

	test("JSON array renders in tree view", async ({ page }) => {
		await page.goto("/");
		await loadFile(page, "array.json");
		await page.getByRole("tab", { name: /Tree/ }).click();
		const recordInput = page.locator('input[aria-label="Go to record number"]');
		await expect(recordInput).toHaveValue("1");
		await expect(page.getByText("of 3")).toBeVisible();
		await expect(page.getByText('"Alice"').first()).toBeVisible();
	});

	test("JSON array renders in raw view", async ({ page }) => {
		await page.goto("/");
		await loadFile(page, "array.json");
		await page.getByRole("tab", { name: /Raw/ }).click();
		// Should show raw JSON lines
		await expect(page.locator("pre").first()).toBeVisible();
	});

	test("JSON array screenshot", async ({ page }) => {
		await page.goto("/");
		await loadFile(page, "array.json");
		await page.waitForTimeout(500);
		await page.screenshot({
			path: "e2e/results/screenshots/json-array.png",
		});
	});
});

test.describe("JSON file – Single object format", () => {
	test("loads .json file with single object", async ({ page }) => {
		await page.goto("/");
		await loadFile(page, "single-object.json");
		await expect(page.getByText("single-object.json")).toBeVisible();
		await expect(page.locator("header").getByText("1 record")).toBeVisible();
	});

	test("displays single object data correctly", async ({ page }) => {
		await page.goto("/");
		await loadFile(page, "single-object.json");
		await expect(page.getByText("Alice Johnson").first()).toBeVisible();
		await expect(page.getByText("engineer").first()).toBeVisible();
	});

	test("single object renders in tree view with all fields", async ({
		page,
	}) => {
		await page.goto("/");
		await loadFile(page, "single-object.json");
		await page.getByRole("tab", { name: /Tree/ }).click();
		await expect(page.getByText('"Alice Johnson"').first()).toBeVisible();
		await expect(page.getByText('"email"').first()).toBeVisible();
	});

	test("single object screenshot", async ({ page }) => {
		await page.goto("/");
		await loadFile(page, "single-object.json");
		await page.waitForTimeout(500);
		await page.screenshot({
			path: "e2e/results/screenshots/json-single-object.png",
		});
	});
});

test.describe("JSON file – Invalid JSON", () => {
	test("handles invalid .json file gracefully", async ({ page }) => {
		await page.goto("/");
		await loadFile(page, "invalid.json");
		// Should fall through to JSONL parsing and show error
		await expect(page.locator("header").getByText("1 error")).toBeVisible();
	});
});

test.describe("JSON file – Backward compatibility", () => {
	test(".jsonl files still work correctly", async ({ page }) => {
		await page.goto("/");
		await loadFile(page, "small.jsonl");
		await expect(page.getByText("small.jsonl")).toBeVisible();
		await expect(page.locator("header").getByText("3 records")).toBeVisible();
		await expect(page.getByText("Alice").first()).toBeVisible();
	});

	test("malformed .jsonl files still show errors", async ({ page }) => {
		await page.goto("/");
		await loadFile(page, "malformed.jsonl");
		await expect(page.locator("header").getByText("2 errors")).toBeVisible();
		await expect(page.locator("header").getByText("5 records")).toBeVisible();
	});

	test("large .jsonl files still load with virtualization", async ({
		page,
	}) => {
		await page.goto("/");
		await loadFile(page, "large.jsonl");
		await expect(
			page.locator("header").getByText("1,000 records"),
		).toBeVisible();
	});
});

test.describe("JSON file – Drop zone text updated", () => {
	test("drop zone shows updated text for JSON and JSONL", async ({
		page,
	}) => {
		await page.goto("/");
		await expect(
			page.getByText("Drop a JSON or JSONL file here"),
		).toBeVisible();
	});
});

test.describe("JSON file – Console errors", () => {
	test("no console errors loading .json array file", async ({ page }) => {
		const consoleErrors: string[] = [];
		page.on("console", (msg) => {
			if (msg.type() === "error") {
				consoleErrors.push(msg.text());
			}
		});

		await page.goto("/");
		await loadFile(page, "array.json");
		await page.waitForTimeout(300);

		// Switch through views
		await page.getByRole("tab", { name: /Tree/ }).click();
		await page.waitForTimeout(200);
		await page.getByRole("tab", { name: /Raw/ }).click();
		await page.waitForTimeout(200);
		await page.getByRole("tab", { name: /Table/ }).click();
		await page.waitForTimeout(200);

		const realErrors = consoleErrors.filter(
			(e) => !e.includes("favicon") && !e.includes("404"),
		);
		expect(realErrors).toEqual([]);
	});

	test("no console errors loading single object .json", async ({
		page,
	}) => {
		const consoleErrors: string[] = [];
		page.on("console", (msg) => {
			if (msg.type() === "error") {
				consoleErrors.push(msg.text());
			}
		});

		await page.goto("/");
		await loadFile(page, "single-object.json");
		await page.waitForTimeout(300);

		await page.getByRole("tab", { name: /Tree/ }).click();
		await page.waitForTimeout(200);
		await page.getByRole("tab", { name: /Raw/ }).click();
		await page.waitForTimeout(200);

		const realErrors = consoleErrors.filter(
			(e) => !e.includes("favicon") && !e.includes("404"),
		);
		expect(realErrors).toEqual([]);
	});
});
