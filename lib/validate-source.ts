/**
 * Source-text validation for the manual editor.
 *
 * Produces character-offset diagnostics that mirror exactly what
 * {@link parseJsonl} would treat as errors, so the editor's "remaining
 * errors" gate stays in sync with the parser:
 *
 *   validateSource(text).length === 0  ⟺  parseJsonl(text).errorCount === 0
 *
 * Detection order matches parse-jsonl.ts:
 *   1. If the text starts with `[` or `{`, try to parse the whole thing as a
 *      single JSON document. If that succeeds, there are no errors.
 *   2. Otherwise (or if the single-document parse fails), validate line by
 *      line as JSONL — each non-empty line must be valid JSON on its own.
 */

export interface SourceDiagnostic {
	/** Character offset of the start of the offending region. */
	from: number;
	/** Character offset of the end of the offending region. */
	to: number;
	/** 1-based line number. */
	line: number;
	/** Human-readable message. */
	message: string;
}

export function validateSource(text: string): SourceDiagnostic[] {
	const trimmed = text.trim();

	// Empty document — nothing to flag (and nothing to view either).
	if (trimmed === "") return [];

	// Try as a single JSON document first (handles .json files).
	if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
		try {
			JSON.parse(trimmed);
			return [];
		} catch {
			// Not a valid single document — fall through to line-by-line JSONL
			// validation, mirroring parseJsonl's fallback exactly.
		}
	}

	return validateLines(text);
}

function validateLines(text: string): SourceDiagnostic[] {
	const diagnostics: SourceDiagnostic[] = [];
	const lines = text.split("\n");
	let offset = 0;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const trimmedLine = line.trim();

		if (trimmedLine !== "") {
			try {
				JSON.parse(trimmedLine);
			} catch (e) {
				const reason = e instanceof Error ? e.message : "Malformed JSON";
				// Underline the trimmed content of the line (skip leading
				// whitespace) so the squiggle lands on real characters.
				const leading = line.length - line.trimStart().length;
				const start = offset + leading;
				const end = offset + line.trimEnd().length;
				diagnostics.push({
					from: start,
					to: Math.max(end, start + 1),
					line: i + 1,
					message: `Malformed JSON on line ${i + 1}: ${reason}`,
				});
			}
		}

		offset += line.length + 1; // +1 for the consumed "\n"
	}

	return diagnostics;
}
