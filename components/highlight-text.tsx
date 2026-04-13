"use client";

import { cn } from "@/lib/utils";

interface HighlightTextProps {
	text: string;
	query: string;
	className?: string;
}

/**
 * Splits text by search query and wraps matching segments with a highlight span.
 * Case-insensitive matching. Returns plain text if query is empty.
 */
export function HighlightText({ text, query, className }: HighlightTextProps) {
	if (!query.trim()) {
		return <span className={className}>{text}</span>;
	}

	const parts = splitByQuery(text, query);

	return (
		<span className={className}>
			{parts.map((part, i) =>
				part.isMatch ? (
					<mark
						key={i}
						className="bg-primary/25 text-primary rounded-sm px-px ring-1 ring-primary/20"
					>
						{part.text}
					</mark>
				) : (
					<span key={i}>{part.text}</span>
				),
			)}
		</span>
	);
}

export interface TextPart {
	text: string;
	isMatch: boolean;
}

/**
 * Split a string into parts, marking which segments match the query.
 * Case-insensitive. Useful when you need to apply highlighting
 * inside custom renderers (e.g. syntax-highlighted raw view).
 */
export function splitByQuery(text: string, query: string): TextPart[] {
	if (!query.trim()) return [{ text, isMatch: false }];

	const lowerText = text.toLowerCase();
	const lowerQuery = query.toLowerCase();
	const parts: TextPart[] = [];
	let lastIndex = 0;

	let searchFrom = 0;
	while (searchFrom < lowerText.length) {
		const matchIndex = lowerText.indexOf(lowerQuery, searchFrom);
		if (matchIndex === -1) break;

		if (matchIndex > lastIndex) {
			parts.push({ text: text.slice(lastIndex, matchIndex), isMatch: false });
		}
		parts.push({
			text: text.slice(matchIndex, matchIndex + query.length),
			isMatch: true,
		});
		lastIndex = matchIndex + query.length;
		searchFrom = lastIndex;
	}

	if (lastIndex < text.length) {
		parts.push({ text: text.slice(lastIndex), isMatch: false });
	}

	return parts;
}
