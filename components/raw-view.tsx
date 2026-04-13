"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { Check, Copy, WrapText } from "lucide-react";
import { type MutableRefObject, useCallback, useEffect, useRef, useState } from "react";
import type { ParsedRecord } from "@/lib/parse-jsonl";
import { cn } from "@/lib/utils";
import { splitByQuery } from "./highlight-text";
import type { ScrollToRecordFn } from "./jsonl-viewer";

interface RawViewProps {
	records: ParsedRecord[];
	filteredRecords: ParsedRecord[];
	onSelectLine: (index: number) => void;
	wordWrap: boolean;
	onToggleWordWrap: () => void;
	searchQuery: string;
	currentMatchIndex: number;
	scrollToRecordRef: MutableRefObject<ScrollToRecordFn | null>;
}

function SyntaxLine({
	text,
	isError,
	searchQuery,
}: { text: string; isError: boolean; searchQuery: string }) {
	if (isError) {
		if (searchQuery.trim()) {
			const parts = splitByQuery(text, searchQuery);
			return (
				<span className="text-destructive">
					{parts.map((p, i) =>
						p.isMatch ? (
							<mark
								key={i}
								className="bg-primary/25 text-primary rounded-sm px-px ring-1 ring-primary/20"
							>
								{p.text}
							</mark>
						) : (
							<span key={i}>{p.text}</span>
						),
					)}
				</span>
			);
		}
		return <span className="text-destructive">{text}</span>;
	}

	const segments: { text: string; className: string }[] = [];
	let i = 0;

	while (i < text.length) {
		if (text[i] === " " || text[i] === "\t") {
			let ws = "";
			while (i < text.length && (text[i] === " " || text[i] === "\t")) {
				ws += text[i];
				i++;
			}
			segments.push({ text: ws, className: "" });
			continue;
		}

		if (text[i] === '"') {
			let str = '"';
			i++;
			while (i < text.length && text[i] !== '"') {
				if (text[i] === "\\") {
					str += text[i];
					i++;
				}
				if (i < text.length) {
					str += text[i];
					i++;
				}
			}
			if (i < text.length) {
				str += '"';
				i++;
			}

			let j = i;
			while (j < text.length && text[j] === " ") j++;
			const isKey = text[j] === ":";

			segments.push({
				text: str,
				className: isKey ? "text-syntax-key" : "text-syntax-string",
			});
			continue;
		}

		if (text[i] === "-" || (text[i] >= "0" && text[i] <= "9")) {
			let num = "";
			while (
				i < text.length &&
				(text[i] === "-" ||
					text[i] === "." ||
					text[i] === "e" ||
					text[i] === "E" ||
					text[i] === "+" ||
					(text[i] >= "0" && text[i] <= "9"))
			) {
				num += text[i];
				i++;
			}
			segments.push({ text: num, className: "text-syntax-number" });
			continue;
		}

		if (text.slice(i, i + 4) === "true") {
			segments.push({ text: "true", className: "text-syntax-boolean" });
			i += 4;
			continue;
		}
		if (text.slice(i, i + 5) === "false") {
			segments.push({ text: "false", className: "text-syntax-boolean" });
			i += 5;
			continue;
		}

		if (text.slice(i, i + 4) === "null") {
			segments.push({ text: "null", className: "text-syntax-null" });
			i += 4;
			continue;
		}

		segments.push({ text: text[i], className: "text-syntax-bracket" });
		i++;
	}

	if (!searchQuery.trim()) {
		return (
			<>
				{segments.map((seg, idx) => (
					<span key={idx} className={seg.className}>
						{seg.text}
					</span>
				))}
			</>
		);
	}

	// Overlay search highlights on top of syntax-colored segments
	return (
		<>
			{segments.map((seg, idx) => {
				const parts = splitByQuery(seg.text, searchQuery);
				const hasMatch = parts.some((p) => p.isMatch);
				if (!hasMatch) {
					return (
						<span key={idx} className={seg.className}>
							{seg.text}
						</span>
					);
				}
				return (
					<span key={idx} className={seg.className}>
						{parts.map((p, pi) =>
							p.isMatch ? (
								<mark
									key={pi}
									className="bg-primary/25 text-primary rounded-sm px-px ring-1 ring-primary/20"
								>
									{p.text}
								</mark>
							) : (
								<span key={pi}>{p.text}</span>
							),
						)}
					</span>
				);
			})}
		</>
	);
}

export function RawView({
	records,
	filteredRecords,
	onSelectLine,
	wordWrap,
	onToggleWordWrap,
	searchQuery,
	currentMatchIndex,
	scrollToRecordRef,
}: RawViewProps) {
	const parentRef = useRef<HTMLDivElement>(null);
	const [copied, setCopied] = useState(false);
	const [selectedLine, setSelectedLine] = useState<number | null>(null);

	const filteredSet = new Set(filteredRecords.map((r) => r.index));

	const virtualizer = useVirtualizer({
		count: records.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => (wordWrap ? 48 : 24),
		overscan: 30,
	});

	// Register scroll-to function so parent can scroll to a specific record
	useEffect(() => {
		scrollToRecordRef.current = (recordIndex: number) => {
			// In raw view, the virtualizer index matches the record's position in the full array
			virtualizer.scrollToIndex(recordIndex, { align: "center" });
		};
		return () => {
			scrollToRecordRef.current = null;
		};
	}, [virtualizer, scrollToRecordRef]);

	// The record index of the current navigated match
	const currentMatchRecordIndex =
		searchQuery.trim() && currentMatchIndex < filteredRecords.length
			? filteredRecords[currentMatchIndex]?.index
			: null;

	const handleCopyAll = useCallback(() => {
		const text = records.map((r) => r.raw).join("\n");
		navigator.clipboard.writeText(text);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}, [records]);

	const handleLineClick = useCallback(
		(record: ParsedRecord) => {
			setSelectedLine(record.index);
			onSelectLine(record.index);
		},
		[onSelectLine],
	);

	// Width of gutter based on digit count
	const gutterWidth = Math.max(48, String(records.length).length * 8 + 24);

	return (
		<div className="flex flex-col h-full">
			{/* Toolbar */}
			<div className="flex items-center justify-end px-4 h-8 border-b border-border gap-0.5 shrink-0">
				<button
					type="button"
					onClick={onToggleWordWrap}
					className={cn(
						"inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-md transition-colors duration-100",
						"focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
						wordWrap
							? "text-foreground bg-muted"
							: "text-muted-foreground hover:text-foreground hover:bg-muted",
					)}
					aria-label={wordWrap ? "Disable word wrap" : "Enable word wrap"}
					aria-pressed={wordWrap}
				>
					<WrapText className="w-3.5 h-3.5" />
					Wrap
				</button>
				<button
					type="button"
					onClick={handleCopyAll}
					className={cn(
						"inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-md",
						"text-muted-foreground hover:text-foreground hover:bg-muted",
						"transition-colors duration-100",
						"focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
					)}
					aria-label="Copy all records"
				>
					{copied ? (
						<>
							<Check className="w-3.5 h-3.5 text-syntax-string" />
							Copied
						</>
					) : (
						<>
							<Copy className="w-3.5 h-3.5" />
							Copy all
						</>
					)}
				</button>
			</div>

			{/* Content */}
			<div ref={parentRef} className="flex-1 overflow-auto">
				<div
					style={{ height: virtualizer.getTotalSize(), position: "relative" }}
				>
					{virtualizer.getVirtualItems().map((virtualRow) => {
						const record = records[virtualRow.index];
						const isError = !!record.error;
						const isFiltered =
							filteredRecords !== records && !filteredSet.has(record.index);
						const isSelected = selectedLine === record.index;
						const isCurrentMatch =
							currentMatchRecordIndex !== null &&
							record.index === currentMatchRecordIndex;

						return (
							<div
								key={record.index}
								className={cn(
									"absolute left-0 flex cursor-pointer transition-colors duration-75",
									isFiltered && "opacity-15",
									isCurrentMatch && "bg-primary/10 ring-1 ring-inset ring-primary/20",
									isSelected && !isCurrentMatch && "bg-primary/8",
									!isSelected && !isCurrentMatch && "hover:bg-muted/40",
								)}
								style={{
									top: virtualRow.start,
									height: virtualRow.size,
									width: "100%",
								}}
								onClick={() => handleLineClick(record)}
							>
								{/* Line number gutter */}
								<div
									className={cn(
										"shrink-0 px-2 text-right text-[11px] tabular-nums select-none border-r",
										isError
											? "text-destructive/70 bg-destructive/5 border-destructive/15"
											: "text-muted-foreground/40 border-border/50",
									)}
									style={{
										width: gutterWidth,
										lineHeight: `${virtualRow.size}px`,
									}}
								>
									{record.index + 1}
								</div>

								{/* Content */}
								<pre
									className={cn(
										"flex-1 px-3 text-xs font-[family-name:var(--font-geist-mono)] leading-6",
										wordWrap
											? "whitespace-pre-wrap break-all"
											: "whitespace-pre overflow-hidden",
									)}
									style={{ lineHeight: `${virtualRow.size}px` }}
								>
									<SyntaxLine text={record.raw} isError={isError} searchQuery={searchQuery} />
								</pre>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
