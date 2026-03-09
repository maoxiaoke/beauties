import { test, expect } from "@playwright/test";
import path from "node:path";

const FIXTURES = path.join(__dirname, "fixtures");

test.describe("F015: SQLite File Preview", () => {
	test.describe("File loading", () => {
		test("loads a .sqlite file via file input and shows the SQLite viewer", async ({
			page,
		}) => {
			await page.goto("/");

			// Upload SQLite file
			const fileInput = page.locator('input[type="file"]');
			await fileInput.setInputFiles(path.join(FIXTURES, "test.sqlite"));

			// Should show SQLite viewer (table sidebar visible)
			await expect(page.getByTestId("table-sidebar")).toBeVisible();

			// Should show file name in header
			await expect(page.locator("header")).toContainText("test.sqlite");
		});

		test("shows table count in header", async ({ page }) => {
			await page.goto("/");
			const fileInput = page.locator('input[type="file"]');
			await fileInput.setInputFiles(path.join(FIXTURES, "test.sqlite"));

			await expect(page.locator("header")).toContainText("3 tables");
		});

		test("handles empty SQLite database", async ({ page }) => {
			await page.goto("/");
			const fileInput = page.locator('input[type="file"]');
			await fileInput.setInputFiles(path.join(FIXTURES, "empty.sqlite"));

			// Should still load, showing 0 tables
			await expect(page.getByTestId("table-sidebar")).toBeVisible({
				timeout: 15000,
			});
			await expect(page.locator("header")).toContainText("0 tables");
		});
	});

	test.describe("Table sidebar", () => {
		test.beforeEach(async ({ page }) => {
			await page.goto("/");
			const fileInput = page.locator('input[type="file"]');
			await fileInput.setInputFiles(path.join(FIXTURES, "test.sqlite"));
			await expect(page.getByTestId("table-sidebar")).toBeVisible();
		});

		test("lists all tables with row counts", async ({ page }) => {
			// Should show all 3 tables (orders, products, users — alphabetical)
			await expect(page.getByTestId("table-item-users")).toBeVisible();
			await expect(page.getByTestId("table-item-products")).toBeVisible();
			await expect(page.getByTestId("table-item-orders")).toBeVisible();

			// Check row counts
			await expect(page.getByTestId("table-item-users")).toContainText("5");
			await expect(page.getByTestId("table-item-products")).toContainText("4");
			await expect(page.getByTestId("table-item-orders")).toContainText("4");
		});

		test("first table is selected by default", async ({ page }) => {
			// First table alphabetically is "orders"
			const firstTable = page.getByTestId("table-item-orders");
			await expect(firstTable).toHaveClass(/text-primary/);
		});

		test("clicking a table switches the data grid", async ({ page }) => {
			// Click on users table
			await page.getByTestId("table-item-users").click();

			// Should show user data
			await expect(page.getByText("Alice Chen")).toBeVisible();
			await expect(page.getByText("Bob Smith")).toBeVisible();
		});
	});

	test.describe("Data grid", () => {
		test.beforeEach(async ({ page }) => {
			await page.goto("/");
			const fileInput = page.locator('input[type="file"]');
			await fileInput.setInputFiles(path.join(FIXTURES, "test.sqlite"));
			await expect(page.getByTestId("table-sidebar")).toBeVisible();
		});

		test("displays table data with correct columns", async ({ page }) => {
			// Click users table
			await page.getByTestId("table-item-users").click();

			// Should have column headers
			await expect(page.locator("text=name").first()).toBeVisible();
			await expect(page.locator("text=email").first()).toBeVisible();
			await expect(page.locator("text=age").first()).toBeVisible();
		});

		test("displays data rows", async ({ page }) => {
			await page.getByTestId("table-item-users").click();

			// Should show data rows — wait for first row to appear
			const rows = page.getByTestId("sqlite-data-row");
			await expect(rows.first()).toBeVisible();
			// users table has 5 rows
			await expect(rows).toHaveCount(5);
		});

		test("renders NULL values with styled chip", async ({ page }) => {
			await page.getByTestId("table-item-users").click();

			// Dave Wilson has NULL email
			await expect(page.getByText("NULL").first()).toBeVisible();
		});

		test("renders numeric values correctly", async ({ page }) => {
			await page.getByTestId("table-item-products").click();

			// Should show price values
			await expect(page.getByText("999.99").first()).toBeVisible();
			await expect(page.getByText("49.95").first()).toBeVisible();
		});

		test("shows row count in the content header", async ({ page }) => {
			await page.getByTestId("table-item-users").click();

			await expect(page.getByText("5 rows")).toBeVisible();
		});
	});

	test.describe("Schema view", () => {
		test.beforeEach(async ({ page }) => {
			await page.goto("/");
			const fileInput = page.locator('input[type="file"]');
			await fileInput.setInputFiles(path.join(FIXTURES, "test.sqlite"));
			await expect(page.getByTestId("table-sidebar")).toBeVisible();
		});

		test("switches to schema view", async ({ page }) => {
			await page.getByTestId("table-item-users").click();
			await page.getByTestId("schema-tab").click();

			// Should show CREATE TABLE statement
			await expect(page.getByText("CREATE TABLE")).toBeVisible();
		});

		test("shows column types and constraints", async ({ page }) => {
			await page.getByTestId("table-item-users").click();
			await page.getByTestId("schema-tab").click();

			// Should show column info
			await expect(page.getByText("INTEGER").first()).toBeVisible();
			await expect(page.getByText("TEXT").first()).toBeVisible();
			await expect(page.getByText("PK").first()).toBeVisible();
		});
	});

	test.describe("SQL query input", () => {
		test.beforeEach(async ({ page }) => {
			await page.goto("/");
			const fileInput = page.locator('input[type="file"]');
			await fileInput.setInputFiles(path.join(FIXTURES, "test.sqlite"));
			await expect(page.getByTestId("table-sidebar")).toBeVisible();
		});

		test("query bar is visible", async ({ page }) => {
			await expect(page.getByTestId("query-bar")).toBeVisible();
			await expect(page.getByTestId("sql-input")).toBeVisible();
			await expect(page.getByTestId("run-query-btn")).toBeVisible();
		});

		test("executes a custom SQL query", async ({ page }) => {
			const input = page.getByTestId("sql-input");
			await input.fill("SELECT name, age FROM users WHERE age > 30");
			await page.getByTestId("run-query-btn").click();

			// Should show filtered results
			await expect(page.getByText("Bob Smith")).toBeVisible();
			await expect(page.getByText("Carol Davis")).toBeVisible();
			// Alice (28) should not be visible
			await expect(page.getByText("Alice Chen")).not.toBeVisible();
		});

		test("shows error for invalid SQL", async ({ page }) => {
			const input = page.getByTestId("sql-input");
			await input.fill("SELECT * FROM nonexistent_table");
			await page.getByTestId("run-query-btn").click();

			// Should show error message
			await expect(
				page.getByText(/no such table/i),
			).toBeVisible();
		});

		test("executes query with Cmd+Enter", async ({ page }) => {
			const input = page.getByTestId("sql-input");
			await input.fill("SELECT COUNT(*) FROM products");
			await input.press("Meta+Enter");

			// Should show result
			await expect(page.getByText("4").first()).toBeVisible();
		});

		test("shows custom query indicator and reset button", async ({
			page,
		}) => {
			const input = page.getByTestId("sql-input");
			await input.fill("SELECT 1");
			await page.getByTestId("run-query-btn").click();

			await expect(page.getByText("Custom query")).toBeVisible();
			await expect(page.getByText("Reset")).toBeVisible();
		});
	});

	test.describe("Status bar", () => {
		test("shows table count, total rows, file size, and load time", async ({
			page,
		}) => {
			await page.goto("/");
			const fileInput = page.locator('input[type="file"]');
			await fileInput.setInputFiles(path.join(FIXTURES, "test.sqlite"));
			await expect(page.getByTestId("table-sidebar")).toBeVisible();

			// Status bar info
			await expect(
				page.getByText("3 tables", { exact: true }),
			).toBeVisible();
			await expect(page.getByText("13 total rows")).toBeVisible();
		});
	});

	test.describe("Navigation", () => {
		test("New file button resets to drop zone", async ({ page }) => {
			await page.goto("/");
			const fileInput = page.locator('input[type="file"]');
			await fileInput.setInputFiles(path.join(FIXTURES, "test.sqlite"));
			await expect(page.getByTestId("table-sidebar")).toBeVisible();

			// Click New file
			await page.getByLabel("Load a different file").click();

			// Should show drop zone again
			await expect(page.getByText("Data files")).toBeVisible();
		});
	});

	test.describe("Drop zone integration", () => {
		test("drop zone shows .sqlite and .db format badges", async ({
			page,
		}) => {
			await page.goto("/");
			await expect(page.getByText(".sqlite")).toBeVisible();
			await expect(page.getByText(".db")).toBeVisible();
		});

		test("file input accepts SQLite extensions", async ({ page }) => {
			await page.goto("/");
			const fileInput = page.locator('input[type="file"]');
			const accept = await fileInput.getAttribute("accept");
			expect(accept).toContain(".sqlite");
			expect(accept).toContain(".db");
		});
	});

	test.describe("FTS5 / virtual table handling", () => {
		test("loads SQLite with FTS5 tables without crashing", async ({
			page,
		}) => {
			await page.goto("/");
			const fileInput = page.locator('input[type="file"]');
			await fileInput.setInputFiles(path.join(FIXTURES, "fts5.sqlite"));

			// Should show sidebar with regular tables only (FTS5 tables skipped)
			await expect(page.getByTestId("table-sidebar")).toBeVisible();

			// Regular tables should be accessible
			await expect(page.getByTestId("table-item-users")).toBeVisible();
			await expect(page.getByTestId("table-item-posts")).toBeVisible();

			// FTS5 virtual table should NOT appear in sidebar
			await expect(
				page.getByTestId("table-item-posts_fts"),
			).not.toBeVisible();
		});

		test("can query regular tables from FTS5 database", async ({
			page,
		}) => {
			await page.goto("/");
			const fileInput = page.locator('input[type="file"]');
			await fileInput.setInputFiles(path.join(FIXTURES, "fts5.sqlite"));
			await expect(page.getByTestId("table-sidebar")).toBeVisible();

			await page.getByTestId("table-item-users").click();
			await expect(page.getByText("Alice", { exact: true })).toBeVisible();
			await expect(page.getByText("Bob", { exact: true })).toBeVisible();
		});

		test("no console errors with FTS5 database", async ({ page }) => {
			const errors: string[] = [];
			page.on("console", (msg) => {
				if (msg.type() === "error") errors.push(msg.text());
			});

			await page.goto("/");
			const fileInput = page.locator('input[type="file"]');
			await fileInput.setInputFiles(path.join(FIXTURES, "fts5.sqlite"));
			await expect(page.getByTestId("table-sidebar")).toBeVisible();

			await page.getByTestId("table-item-users").click();
			await page.getByTestId("table-item-posts").click();

			expect(errors).toHaveLength(0);
		});
	});

	test.describe("No console errors", () => {
		test("no console errors during SQLite viewing", async ({ page }) => {
			const errors: string[] = [];
			page.on("console", (msg) => {
				if (msg.type() === "error") errors.push(msg.text());
			});

			await page.goto("/");
			const fileInput = page.locator('input[type="file"]');
			await fileInput.setInputFiles(path.join(FIXTURES, "test.sqlite"));
			await expect(page.getByTestId("table-sidebar")).toBeVisible();

			// Switch between tables
			await page.getByTestId("table-item-users").click();
			await page.getByTestId("table-item-products").click();

			// Switch to schema view
			await page.getByTestId("schema-tab").click();
			await page.getByTestId("data-tab").click();

			// Run a query
			await page.getByTestId("sql-input").fill("SELECT 1");
			await page.getByTestId("run-query-btn").click();

			expect(errors).toHaveLength(0);
		});
	});
});
