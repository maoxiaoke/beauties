export interface ParsedRecord {
	index: number;
	data: Record<string, unknown> | null;
	raw: string;
	error?: string;
}

export interface ParseResult {
	records: ParsedRecord[];
	columns: string[];
	errorCount: number;
}

/**
 * Smart parser that handles JSONL, JSON arrays, and single JSON objects.
 * Detection order:
 * 1. Try parsing as a single JSON value (array or object)
 * 2. Fall back to line-by-line JSONL parsing
 */
export function parseJsonl(text: string): ParseResult {
	const trimmed = text.trim();

	// Try parsing as a single JSON document first (handles .json files)
	if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
		try {
			const parsed = JSON.parse(trimmed);

			// JSON array → treat each element as a record
			if (Array.isArray(parsed)) {
				return buildResult(
					parsed.map((item, i) => ({
						data: typeof item === "object" && item !== null ? item : { value: item },
						raw: JSON.stringify(item),
						index: i,
					})),
				);
			}

			// Single JSON object → one record
			if (typeof parsed === "object" && parsed !== null) {
				return buildResult([
					{ data: parsed, raw: trimmed, index: 0 },
				]);
			}
		} catch {
			// Not valid as a single JSON document — fall through to JSONL parsing
		}
	}

	// JSONL: parse line by line
	return parseLines(text);
}

function parseLines(text: string): ParseResult {
	const lines = text.split("\n");
	const records: ParsedRecord[] = [];
	const columnSet = new Set<string>();
	let errorCount = 0;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i].trim();
		if (line === "") continue;

		try {
			const data = JSON.parse(line);
			if (typeof data === "object" && data !== null && !Array.isArray(data)) {
				for (const key of Object.keys(data)) {
					columnSet.add(key);
				}
			}
			records.push({ index: records.length, data, raw: line });
		} catch {
			errorCount++;
			records.push({
				index: records.length,
				data: null,
				raw: line,
				error: `Malformed JSON on line ${i + 1}`,
			});
		}
	}

	return { records, columns: Array.from(columnSet), errorCount };
}

function buildResult(
	items: { data: Record<string, unknown>; raw: string; index: number }[],
): ParseResult {
	const columnSet = new Set<string>();
	const records: ParsedRecord[] = [];

	for (const item of items) {
		if (typeof item.data === "object" && item.data !== null && !Array.isArray(item.data)) {
			for (const key of Object.keys(item.data)) {
				columnSet.add(key);
			}
		}
		records.push({ index: item.index, data: item.data, raw: item.raw });
	}

	return { records, columns: Array.from(columnSet), errorCount: 0 };
}
