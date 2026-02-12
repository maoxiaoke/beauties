"use client";

import {
	Check,
	ChevronLeft,
	ChevronRight,
	ChevronsDownUp,
	ChevronsUpDown,
	Copy,
	Inbox,
} from "lucide-react";
import { useCallback, useState } from "react";
import type { ParsedRecord } from "@/lib/parse-jsonl";
import { cn } from "@/lib/utils";
import { JsonTreeNode } from "./json-tree-node";

interface TreeViewProps {
	records: ParsedRecord[];
	onSelectRecord: (index: number) => void;
}

export function TreeView({
	records,
	onSelectRecord: _onSelectRecord,
}: TreeViewProps) {
	const [currentIndex, setCurrentIndex] = useState(0);
	const [expandAll, setExpandAll] = useState(true);
	const [copied, setCopied] = useState(false);

	const record = records[currentIndex];

	const handlePrev = useCallback(() => {
		setCurrentIndex((i) => Math.max(0, i - 1));
	}, []);

	const handleNext = useCallback(() => {
		setCurrentIndex((i) => Math.min(records.length - 1, i + 1));
	}, [records.length]);

	const handleCopy = useCallback(() => {
		if (!record?.data) return;
		navigator.clipboard.writeText(JSON.stringify(record.data, null, 2));
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}, [record]);

	const handleIndexInput = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const val = Number.parseInt(e.target.value, 10);
			if (!Number.isNaN(val) && val >= 1 && val <= records.length) {
				setCurrentIndex(val - 1);
			}
		},
		[records.length],
	);

	if (records.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
				<Inbox className="w-8 h-8 opacity-40" />
				<p className="text-sm">No records to display</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col h-full">
			{/* Navigation bar */}
			<div className="flex items-center justify-between px-4 h-9 border-b border-border shrink-0">
				<div className="flex items-center gap-1.5">
					<NavButton
						onClick={handlePrev}
						disabled={currentIndex === 0}
						label="Previous record"
					>
						<ChevronLeft className="w-3.5 h-3.5" />
					</NavButton>
					<div className="flex items-center gap-1.5 text-xs">
						<span className="text-muted-foreground">Record</span>
						<input
							type="number"
							min={1}
							max={records.length}
							value={currentIndex + 1}
							onChange={handleIndexInput}
							className={cn(
								"w-14 h-6 px-1.5 text-center text-xs rounded border border-border bg-muted/50",
								"font-[family-name:var(--font-geist-mono)] tabular-nums",
								"focus:outline-none focus:border-primary/50",
								"transition-colors",
							)}
							aria-label="Go to record number"
						/>
						<span className="text-muted-foreground tabular-nums">
							of {records.length.toLocaleString()}
						</span>
					</div>
					<NavButton
						onClick={handleNext}
						disabled={currentIndex === records.length - 1}
						label="Next record"
					>
						<ChevronRight className="w-3.5 h-3.5" />
					</NavButton>
				</div>

				<div className="flex items-center gap-0.5">
					<ToolbarButton onClick={() => setExpandAll((v) => !v)}>
						{expandAll ? (
							<>
								<ChevronsDownUp className="w-3.5 h-3.5" />
								Collapse
							</>
						) : (
							<>
								<ChevronsUpDown className="w-3.5 h-3.5" />
								Expand
							</>
						)}
					</ToolbarButton>
					<ToolbarButton onClick={handleCopy}>
						{copied ? (
							<>
								<Check className="w-3.5 h-3.5 text-syntax-string" />
								Copied
							</>
						) : (
							<>
								<Copy className="w-3.5 h-3.5" />
								Copy
							</>
						)}
					</ToolbarButton>
				</div>
			</div>

			{/* Tree content */}
			<div className="flex-1 overflow-auto p-4">
				{record?.error ? (
					<div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
						<p className="text-[13px] text-destructive font-medium mb-2">
							{record.error}
						</p>
						<pre className="text-xs font-[family-name:var(--font-geist-mono)] text-muted-foreground whitespace-pre-wrap break-all">
							{record.raw}
						</pre>
					</div>
				) : (
					<div className="font-[family-name:var(--font-geist-mono)] text-[13px] leading-relaxed">
						<JsonTreeNode
							value={record?.data}
							expandAll={expandAll}
							depth={0}
						/>
					</div>
				)}
			</div>
		</div>
	);
}

function NavButton({
	onClick,
	disabled,
	label,
	children,
}: {
	onClick: () => void;
	disabled: boolean;
	label: string;
	children: React.ReactNode;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			className={cn(
				"inline-flex items-center justify-center w-6 h-6 rounded",
				"text-muted-foreground hover:text-foreground hover:bg-muted",
				"disabled:opacity-25 disabled:pointer-events-none",
				"transition-colors duration-100",
				"focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
			)}
			aria-label={label}
		>
			{children}
		</button>
	);
}

function ToolbarButton({
	onClick,
	children,
}: {
	onClick: () => void;
	children: React.ReactNode;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"inline-flex items-center gap-1.5 px-2 py-1 text-xs",
				"text-muted-foreground hover:text-foreground rounded-md hover:bg-muted",
				"transition-colors duration-100",
				"focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
			)}
		>
			{children}
		</button>
	);
}
