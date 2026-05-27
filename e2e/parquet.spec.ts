import { test, expect, type Page } from "@playwright/test";
import * as path from "node:path";

const fixturesDir = path.resolve(__dirname, "fixtures");

async function loadFile(page: Page, fixtureName: string) {
	const input = page.locator('input[type="file"]');
	await input.setInputFiles(path.join(fixturesDir, fixtureName));
	await page.waitForSelector("header", { timeout: 10_000 });
}

test.describe("F016: Parquet file support", () => {
	test.describe("Drop zone", () => {
		test("shows .parquet format badge", async ({ page }) => {
			await page.goto("/");
			await expect(page.getByText(".parquet", { exact: true })).toBeVisible();
		});

		test("file input accepts .parquet extension", async ({ page }) => {
			await page.goto("/");
			const accept = await page
				.locator('input[type="file"]')
				.getAttribute("accept");
			expect(accept).toContain(".parquet");
		});
	});

	test.describe("File loading", () => {
		test("loads people.parquet and shows header", async ({ page }) => {
			await page.goto("/");
			await loadFile(page, "people.parquet");
			await expect(page.getByText("people.parquet")).toBeVisible();
			await expect(page.locator("header").getByText("6 records")).toBeVisible();
		});

		test("renders all rows in table view", async ({ page }) => {
			await page.goto("/");
			await loadFile(page, "people.parquet");
			// Default view is table — check a few data values
			await expect(page.getByText("Alice Chen")).toBeVisible();
			await expect(page.getByText("Bob Smith")).toBeVisible();
			await expect(page.getByText("Frank Lee")).toBeVisible();
		});

		test("displays columns derived from parquet schema", async ({ page }) => {
			await page.goto("/");
			await loadFile(page, "people.parquet");
			// Column names appear in the custom div-based table header (uppercased via CSS)
			for (const col of ["id", "name", "email", "age", "active", "score"]) {
				await expect(page.getByText(col, { exact: true }).first()).toBeVisible();
			}
		});

		test("handles single-row parquet", async ({ page }) => {
			await page.goto("/");
			await loadFile(page, "tiny.parquet");
			await expect(page.locator("header").getByText("1 record")).toBeVisible();
			await expect(page.getByText("world")).toBeVisible();
		});
	});

	test.describe("Compression codecs", () => {
		test("loads GZIP-compressed parquet (regression for ZSTD codec error)", async ({
			page,
		}) => {
			// Same `compressors` hook handles ZSTD/GZIP/BROTLI/LZ4 — GZIP exercises
			// the same code path that previously threw "unsupported codec: ZSTD".
			await page.goto("/");
			await loadFile(page, "gzip.parquet");
			await expect(page.locator("header").getByText("3 records")).toBeVisible();
			await expect(page.getByText("g1")).toBeVisible();
			await expect(page.getByText("g3")).toBeVisible();
		});
	});

	test.describe("Type handling", () => {
		test("renders BIGINT values without breaking", async ({ page }) => {
			await page.goto("/");
			await loadFile(page, "numeric.parquet");
			await expect(page.locator("header").getByText("3 records")).toBeVisible();
			// Bigint outside safe-integer range should render as a string
			await expect(page.getByText("-9007199254740992")).toBeVisible();
		});
	});

	test.describe("Tree view", () => {
		test("switches to tree view and shows record fields", async ({ page }) => {
			await page.goto("/");
			await loadFile(page, "people.parquet");
			await page.keyboard.press("Meta+2");
			// Tree view shows JSON tokens for the first record
			await expect(page.getByText("Alice Chen").first()).toBeVisible();
		});
	});

	test.describe("Raw view", () => {
		test("renders pretty JSONL in raw view", async ({ page }) => {
			await page.goto("/");
			await loadFile(page, "people.parquet");
			await page.keyboard.press("Meta+3");
			// Each row should appear as JSON
			await expect(page.getByText(/"name":\s*"Alice Chen"/).first()).toBeVisible();
		});
	});

	test.describe("Search", () => {
		test("filters parquet records by query", async ({ page }) => {
			await page.goto("/");
			await loadFile(page, "people.parquet");
			await page.keyboard.press("Meta+F");
			await page.locator("#search-input").fill("Carol");
			// Only Carol's row should remain visible; other names should not
			await expect(page.getByText("Carol Davis")).toBeVisible();
			await expect(page.getByText("Alice Chen")).not.toBeVisible();
			await expect(page.getByText("Bob Smith")).not.toBeVisible();
		});
	});

	test.describe("Reset", () => {
		test("New file button returns to drop zone", async ({ page }) => {
			await page.goto("/");
			await loadFile(page, "people.parquet");
			await page.getByLabel("Load a different file").click();
			await expect(page.getByText("Drop your file here")).toBeVisible();
		});
	});

	test.describe("No console errors", () => {
		test("no errors loading and exploring a parquet file", async ({ page }) => {
			const errors: string[] = [];
			page.on("console", (msg) => {
				if (msg.type() === "error") errors.push(msg.text());
			});
			await page.goto("/");
			await loadFile(page, "people.parquet");
			// Cycle views
			await page.keyboard.press("Meta+2");
			await page.keyboard.press("Meta+3");
			await page.keyboard.press("Meta+1");
			expect(errors).toHaveLength(0);
		});
	});
});
