import { parquetReadObjects } from "hyparquet";
import { compressors } from "hyparquet-compressors";
import type { ParseResult, ParsedRecord } from "./parse-jsonl";

/**
 * Convert values that aren't legal JSON (BigInt, Date, TypedArray) into
 * something Table/Tree/Raw views can render. Recursive, but parquet rows are
 * generally shallow — only nested for STRUCT / LIST / MAP columns.
 */
function toJsonSafe(value: unknown): unknown {
	if (value === null || value === undefined) return value;
	if (typeof value === "bigint") {
		// Preserve precision: emit as number when safe, otherwise as string.
		return value >= Number.MIN_SAFE_INTEGER && value <= Number.MAX_SAFE_INTEGER
			? Number(value)
			: value.toString();
	}
	if (value instanceof Date) return value.toISOString();
	if (value instanceof Uint8Array) {
		return `<bytes: ${value.byteLength}>`;
	}
	if (Array.isArray(value)) return value.map(toJsonSafe);
	if (typeof value === "object") {
		const out: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
			out[k] = toJsonSafe(v);
		}
		return out;
	}
	return value;
}

/**
 * Parse a parquet ArrayBuffer into a ParseResult that's structurally identical
 * to what `parseJsonl` returns, so existing Table / Tree / Raw views work
 * unchanged. Each row becomes a ParsedRecord.
 */
export async function parseParquet(buffer: ArrayBuffer): Promise<ParseResult> {
	const file = {
		byteLength: buffer.byteLength,
		slice: (start: number, end?: number) => buffer.slice(start, end),
	};

	// hyparquet only bundles SNAPPY by default — pass compressors to support
	// ZSTD, GZIP, BROTLI, LZ4, LZ4_RAW. Without this, parquet files written by
	// most modern tooling (pandas, polars, spark) fail with "unsupported codec".
	const rawRows = await parquetReadObjects({ file, compressors });

	const records: ParsedRecord[] = [];
	const columnSet = new Set<string>();

	for (let i = 0; i < rawRows.length; i++) {
		const sanitized = toJsonSafe(rawRows[i]) as Record<string, unknown>;
		if (sanitized && typeof sanitized === "object" && !Array.isArray(sanitized)) {
			for (const key of Object.keys(sanitized)) columnSet.add(key);
		}
		records.push({
			index: i,
			data: sanitized,
			raw: JSON.stringify(sanitized),
		});
	}

	return {
		records,
		columns: Array.from(columnSet),
		errorCount: 0,
	};
}

export function isParquetFile(name: string): boolean {
	return name.toLowerCase().endsWith(".parquet");
}
