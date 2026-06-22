import * as path from "node:path";
import { expect, type Page, test } from "@playwright/test";

const fixturesDir = path.resolve(__dirname, "fixtures");

async function loadFile(page: Page, fixtureName: string) {
	const filePath = path.join(fixturesDir, fixtureName);
	await page.locator('input[type="file"]').setInputFiles(filePath);
	await page.waitForSelector("header", { timeout: 10_000 });
}

// Replace the whole CodeMirror document. Uses insertText (a single input
// event) rather than keystrokes so the editor's auto-close-brackets doesn't
// mangle the JSON we type.
async function setEditorText(page: Page, text: string) {
	await page.locator(".cm-content").click();
	await page.keyboard.press("Meta+a");
	await page.keyboard.press("Delete");
	await page.keyboard.insertText(text);
}

const VALID_JSONL =
	'{"id": 1, "name": "FixedAlice"}\n{"id": 2, "name": "FixedBob"}';

// ===========================================================================
// Auto fix-takeover: loading a file with parse errors
// ===========================================================================
test.describe("Source editor – fix takeover", () => {
	test("malformed file takes over with the fix editor", async ({ page }) => {
		await page.goto("/");
		await loadFile(page, "malformed.jsonl");

		await expect(page.getByText("Fix errors to continue")).toBeVisible();
		await expect(page.getByTestId("error-count")).toHaveText(
			"2 errors remaining",
		);
		// Data views are gated.
		await expect(page.getByRole("tab", { name: /Table/ })).toHaveCount(0);
		await expect(
			page.getByRole("button", { name: "View data" }),
		).toBeDisabled();
	});

	test("the original source is loaded into the editor", async ({ page }) => {
		await page.goto("/");
		await loadFile(page, "malformed.jsonl");
		await expect(page.locator(".cm-content")).toContainText(
			"this is not valid json",
		);
		await expect(page.locator(".cm-content")).toContainText("Valid record");
	});

	test("Next error jumps to a malformed line", async ({ page }) => {
		await page.goto("/");
		await loadFile(page, "malformed.jsonl");
		const nextError = page.getByRole("button", { name: /Next error/ });
		await expect(nextError).toBeVisible();
		await nextError.click();
		// The active line should now sit on a malformed line.
		await expect(page.locator(".cm-activeLine").first()).toBeVisible();
	});

	test("fixing all errors unlocks the data and shows it", async ({ page }) => {
		await page.goto("/");
		await loadFile(page, "malformed.jsonl");

		await setEditorText(page, VALID_JSONL);

		await expect(page.getByTestId("error-count")).toHaveText("No errors");
		const viewData = page.getByRole("button", { name: "View data" });
		await expect(viewData).toBeEnabled();
		await viewData.click();

		// Back in the viewer with the corrected data.
		await expect(page.locator("header").getByText("2 records")).toBeVisible();
		await expect(page.getByText("FixedAlice").first()).toBeVisible();
	});

	test("fix editor offers only New file as an escape (no Cancel)", async ({
		page,
	}) => {
		await page.goto("/");
		await loadFile(page, "malformed.jsonl");
		await expect(page.getByRole("button", { name: "Cancel" })).toHaveCount(0);
		const newFile = page.getByRole("button", { name: /New file/ });
		await expect(newFile).toBeVisible();
		await newFile.click();
		await expect(page.getByText("Drop your file here")).toBeVisible();
	});
});

// ===========================================================================
// Manual edit of an already-valid file (Header "Edit" button)
// ===========================================================================
test.describe("Source editor – manual edit", () => {
	test("Edit button opens the editor for a valid file", async ({ page }) => {
		await page.goto("/");
		await loadFile(page, "small.jsonl");
		await page.getByRole("button", { name: "Edit source text" }).click();

		await expect(page.getByText("Edit source")).toBeVisible();
		await expect(page.getByTestId("error-count")).toHaveText("No errors");
		await expect(
			page.getByRole("button", { name: "Apply changes" }),
		).toBeEnabled();
	});

	test("Cancel discards changes and returns to the viewer", async ({
		page,
	}) => {
		await page.goto("/");
		await loadFile(page, "small.jsonl");
		await page.getByRole("button", { name: "Edit source text" }).click();

		await setEditorText(page, '{"id": 99, "name": "Discarded"}');
		await page.getByRole("button", { name: "Cancel" }).click();

		// Original data is intact (Cancel discarded the edit).
		await expect(page.locator("header").getByText("3 records")).toBeVisible();
		await expect(page.getByText("Alice").first()).toBeVisible();
	});

	test("Escape cancels a manual edit", async ({ page }) => {
		await page.goto("/");
		await loadFile(page, "small.jsonl");
		await page.getByRole("button", { name: "Edit source text" }).click();
		await expect(page.getByText("Edit source")).toBeVisible();

		await page.keyboard.press("Escape");
		await expect(page.locator("header").getByText("3 records")).toBeVisible();
	});

	test("introducing an error disables Apply until fixed", async ({ page }) => {
		await page.goto("/");
		await loadFile(page, "small.jsonl");
		await page.getByRole("button", { name: "Edit source text" }).click();

		await setEditorText(page, '{"id": 1, "name": "ok"}\nnot json');
		await expect(page.getByTestId("error-count")).toHaveText(
			"1 error remaining",
		);
		await expect(
			page.getByRole("button", { name: "Apply changes" }),
		).toBeDisabled();

		// Fix it.
		await setEditorText(page, '{"id": 1, "name": "ok"}');
		await expect(page.getByTestId("error-count")).toHaveText("No errors");
		await expect(
			page.getByRole("button", { name: "Apply changes" }),
		).toBeEnabled();
	});

	test("Apply persists edits into the data views", async ({ page }) => {
		await page.goto("/");
		await loadFile(page, "small.jsonl");
		await page.getByRole("button", { name: "Edit source text" }).click();

		await setEditorText(
			page,
			'{"id": 1, "name": "EditedA"}\n{"id": 2, "name": "EditedB"}\n{"id": 3, "name": "EditedC"}\n{"id": 4, "name": "EditedD"}',
		);
		await expect(page.getByTestId("error-count")).toHaveText("No errors");
		await page.getByRole("button", { name: "Apply changes" }).click();

		await expect(page.locator("header").getByText("4 records")).toBeVisible();
		await expect(page.getByText("EditedD").first()).toBeVisible();
	});
});

// ===========================================================================
// Console errors
// ===========================================================================
test.describe("Source editor – console errors", () => {
	test("no console errors across fix + edit flows", async ({ page }) => {
		const consoleErrors: string[] = [];
		page.on("console", (msg) => {
			if (msg.type() === "error") consoleErrors.push(msg.text());
		});

		await page.goto("/");
		await loadFile(page, "malformed.jsonl");
		await page.getByRole("button", { name: /Next error/ }).click();
		await setEditorText(page, VALID_JSONL);
		await expect(page.getByTestId("error-count")).toHaveText("No errors");
		await page.getByRole("button", { name: "View data" }).click();
		await expect(page.locator("header").getByText("2 records")).toBeVisible();

		// Re-enter via manual edit and apply.
		await page.getByRole("button", { name: "Edit source text" }).click();
		await page.getByRole("button", { name: "Apply changes" }).click();
		await page.waitForTimeout(200);

		const realErrors = consoleErrors.filter(
			(e) => !e.includes("favicon") && !e.includes("404"),
		);
		expect(realErrors).toEqual([]);
	});
});
