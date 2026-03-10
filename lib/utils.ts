import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatNumber(n: number): string {
	return n.toLocaleString();
}

/**
 * Try to parse a string as JSON. Returns the parsed value if the string
 * contains a valid JSON object or array, otherwise returns null.
 * Used for drill-down into stringified JSON values.
 */
export function tryParseJsonString(value: string): unknown | null {
	const trimmed = value.trim();
	if (trimmed.length < 2) return null;
	const first = trimmed[0];
	if (first !== "{" && first !== "[") return null;
	try {
		const parsed = JSON.parse(trimmed);
		if (typeof parsed === "object" && parsed !== null) return parsed;
		return null;
	} catch {
		return null;
	}
}
