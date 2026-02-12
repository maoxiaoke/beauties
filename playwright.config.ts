import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir: "./e2e",
	timeout: 30_000,
	expect: { timeout: 10_000 },
	fullyParallel: false,
	retries: 0,
	use: {
		baseURL: "http://localhost:3099",
		screenshot: "on",
		trace: "retain-on-failure",
		viewport: { width: 1280, height: 800 },
	},
	projects: [
		{
			name: "chromium",
			use: { browserName: "chromium" },
		},
	],
	outputDir: "./e2e/results",
});
