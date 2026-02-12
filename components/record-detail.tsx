"use client";

import {
	Check,
	ChevronLeft,
	ChevronRight,
	Copy,
	Minimize2,
	X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { ParsedRecord } from "@/lib/parse-jsonl";
import { cn } from "@/lib/utils";

interface RecordDetailProps {
	record: ParsedRecord;
	total: number;
	onClose: () => void;
	onNavigate: (direction: "prev" | "next") => void;
}

export function RecordDetail({
	record,
	total,
	onClose,
	onNavigate,
}: RecordDetailProps) {
	const [copied, setCopied] = useState<"formatted" | "minified" | null>(null);

	const handleCopy = useCallback(
		(mode: "formatted" | "minified") => {
			if (!record.data) return;
			const text =
				mode === "formatted"
					? JSON.stringify(record.data, null, 2)
					: JSON.stringify(record.data);
			navigator.clipboard.writeText(text);
			setCopied(mode);
			setTimeout(() => setCopied(null), 2000);
		},
		[record],
	);

	// Close on click outside
	useEffect(() => {
		const handler = (e: MouseEvent) => {
			const panel = document.getElementById("record-detail-panel");
			if (panel && !panel.contains(e.target as Node)) {
				onClose();
			}
		};
		const timeout = setTimeout(() => {
			window.addEventListener("mousedown", handler);
		}, 100);
		return () => {
			clearTimeout(timeout);
			window.removeEventListener("mousedown", handler);
		};
	}, [onClose]);

	const formatted = record.data
		? JSON.stringify(record.data, null, 2)
		: record.raw;

	return (
		<div
			className="fixed inset-0 z-50 flex justify-end"
			role="dialog"
			aria-label="Record detail"
		>
			{/* Backdrop */}
			<div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] animate-fade-in" />

			{/* Panel */}
			<div
				id="record-detail-panel"
				className="relative w-full max-w-xl bg-background border-l border-border shadow-2xl flex flex-col animate-slide-in-right"
			>
				{/* Header */}
				<div className="flex items-center justify-between px-4 h-11 border-b border-border shrink-0">
					<div className="flex items-center gap-2.5">
						<span className="text-[13px] font-medium tabular-nums">
							Record {(record.index + 1).toLocaleString()}
						</span>
						<span className="text-xs text-muted-foreground tabular-nums">
							of {total.toLocaleString()}
						</span>
					</div>

					<div className="flex items-center gap-0.5">
						<PanelButton
							onClick={() => onNavigate("prev")}
							label="Previous record (↑)"
						>
							<ChevronLeft className="w-3.5 h-3.5" />
						</PanelButton>
						<PanelButton
							onClick={() => onNavigate("next")}
							label="Next record (↓)"
						>
							<ChevronRight className="w-3.5 h-3.5" />
						</PanelButton>
						<div className="w-px h-4 bg-border mx-1" />
						<PanelButton onClick={onClose} label="Close (Escape)">
							<X className="w-3.5 h-3.5" />
						</PanelButton>
					</div>
				</div>

				{/* Copy actions */}
				<div className="flex items-center gap-0.5 px-4 h-9 border-b border-border shrink-0">
					<CopyButton
						onClick={() => handleCopy("formatted")}
						icon={
							copied === "formatted" ? (
								<Check className="w-3.5 h-3.5 text-syntax-string" />
							) : (
								<Copy className="w-3.5 h-3.5" />
							)
						}
					>
						Copy formatted
					</CopyButton>
					<CopyButton
						onClick={() => handleCopy("minified")}
						icon={
							copied === "minified" ? (
								<Check className="w-3.5 h-3.5 text-syntax-string" />
							) : (
								<Minimize2 className="w-3.5 h-3.5" />
							)
						}
					>
						Copy minified
					</CopyButton>
				</div>

				{/* Content */}
				<div className="flex-1 overflow-auto p-4">
					{record.error ? (
						<div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
							<p className="text-[13px] text-destructive font-medium mb-2">
								{record.error}
							</p>
							<pre className="text-xs font-[family-name:var(--font-geist-mono)] text-muted-foreground whitespace-pre-wrap break-all">
								{record.raw}
							</pre>
						</div>
					) : (
						<pre className="text-xs font-[family-name:var(--font-geist-mono)] leading-relaxed whitespace-pre-wrap break-words">
							<SyntaxHighlightedJson text={formatted} />
						</pre>
					)}
				</div>
			</div>
		</div>
	);
}

function PanelButton({
	onClick,
	label,
	children,
}: {
	onClick: () => void;
	label: string;
	children: React.ReactNode;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"inline-flex items-center justify-center w-7 h-7 rounded-md",
				"text-muted-foreground hover:text-foreground hover:bg-muted",
				"transition-colors duration-100",
				"focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
			)}
			title={label}
			aria-label={label}
		>
			{children}
		</button>
	);
}

function CopyButton({
	onClick,
	icon,
	children,
}: {
	onClick: () => void;
	icon: React.ReactNode;
	children: React.ReactNode;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md",
				"text-muted-foreground hover:text-foreground hover:bg-muted",
				"transition-colors duration-100",
				"focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
			)}
		>
			{icon}
			{children}
		</button>
	);
}

function SyntaxHighlightedJson({ text }: { text: string }) {
	const lines = text.split("\n");

	return (
		<>
			{lines.map((line, i) => (
				<div key={i}>
					<HighlightLine line={line} />
				</div>
			))}
		</>
	);
}

function HighlightLine({ line }: { line: string }) {
	const segments: { text: string; className: string }[] = [];
	let remaining = line;

	while (remaining.length > 0) {
		// Leading whitespace
		const wsMatch = remaining.match(/^(\s+)/);
		if (wsMatch) {
			segments.push({ text: wsMatch[1], className: "" });
			remaining = remaining.slice(wsMatch[1].length);
			continue;
		}

		// Key: "key":
		const keyMatch = remaining.match(/^("(?:[^"\\]|\\.)*")\s*:/);
		if (keyMatch) {
			segments.push({ text: keyMatch[1], className: "text-syntax-key" });
			segments.push({ text: ": ", className: "text-syntax-bracket" });
			remaining = remaining.slice(keyMatch[0].length);
			const trimmed = remaining.replace(/^\s+/, "");
			if (trimmed !== remaining) {
				segments.push({
					text: remaining.slice(0, remaining.length - trimmed.length),
					className: "",
				});
				remaining = trimmed;
			}
			continue;
		}

		// String value
		const strMatch = remaining.match(/^("(?:[^"\\]|\\.)*")(,?)/);
		if (strMatch) {
			segments.push({ text: strMatch[1], className: "text-syntax-string" });
			if (strMatch[2]) {
				segments.push({ text: strMatch[2], className: "text-syntax-bracket" });
			}
			remaining = remaining.slice(strMatch[0].length);
			continue;
		}

		// Number
		const numMatch = remaining.match(/^(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)(,?)/);
		if (numMatch) {
			segments.push({ text: numMatch[1], className: "text-syntax-number" });
			if (numMatch[2]) {
				segments.push({ text: numMatch[2], className: "text-syntax-bracket" });
			}
			remaining = remaining.slice(numMatch[0].length);
			continue;
		}

		// Boolean
		const boolMatch = remaining.match(/^(true|false)(,?)/);
		if (boolMatch) {
			segments.push({ text: boolMatch[1], className: "text-syntax-boolean" });
			if (boolMatch[2]) {
				segments.push({ text: boolMatch[2], className: "text-syntax-bracket" });
			}
			remaining = remaining.slice(boolMatch[0].length);
			continue;
		}

		// Null
		const nullMatch = remaining.match(/^(null)(,?)/);
		if (nullMatch) {
			segments.push({
				text: nullMatch[1],
				className: "text-syntax-null italic",
			});
			if (nullMatch[2]) {
				segments.push({ text: nullMatch[2], className: "text-syntax-bracket" });
			}
			remaining = remaining.slice(nullMatch[0].length);
			continue;
		}

		// Brackets, braces, commas, colons
		segments.push({ text: remaining[0], className: "text-syntax-bracket" });
		remaining = remaining.slice(1);
	}

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
