"use client";

import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowDown, ArrowUp, Braces, Inbox, Undo2 } from "lucide-react";
import { type MutableRefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ParsedRecord } from "@/lib/parse-jsonl";
import { cn, tryParseJsonString } from "@/lib/utils";
import { HighlightText } from "./highlight-text";
import type { ScrollToRecordFn } from "./jsonl-viewer";

interface TableViewProps {
	records: ParsedRecord[];
	columns: string[];
	onSelectRecord: (index: number) => void;
	searchQuery: string;
	currentMatchIndex: number;
	scrollToRecordRef: MutableRefObject<ScrollToRecordFn | null>;
}

function CellValue({
	value,
	searchQuery,
}: { value: unknown; searchQuery: string }) {
	const [drilled, setDrilled] = useState(false);

	const parsedJson = useMemo(
		() => (typeof value === "string" ? tryParseJsonString(value) : null),
		[value],
	);

	// When drilled, show the parsed value's chip representation
	if (drilled && parsedJson) {
		if (Array.isArray(parsedJson)) {
			return (
				<span className="inline-flex items-center gap-1">
					<span className="inline-flex items-center px-1.5 py-px rounded text-[10px] bg-primary/10 text-primary font-[family-name:var(--font-geist-mono)]">
						[{parsedJson.length}]
					</span>
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							setDrilled(false);
						}}
						className="shrink-0 inline-flex items-center gap-0.5 px-1 py-px rounded text-[10px] bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
						title="Collapse back to string"
					>
						<Undo2 className="w-2.5 h-2.5" />
					</button>
				</span>
			);
		}
		if (typeof parsedJson === "object" && parsedJson !== null) {
			const keys = Object.keys(parsedJson);
			return (
				<span className="inline-flex items-center gap-1">
					<span className="inline-flex items-center px-1.5 py-px rounded text-[10px] bg-primary/10 text-primary font-[family-name:var(--font-geist-mono)]">
						{"{"}…{keys.length}
						{"}"}
					</span>
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							setDrilled(false);
						}}
						className="shrink-0 inline-flex items-center gap-0.5 px-1 py-px rounded text-[10px] bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
						title="Collapse back to string"
					>
						<Undo2 className="w-2.5 h-2.5" />
					</button>
				</span>
			);
		}
	}

	if (value === null || value === undefined) {
		return (
			<span className="text-syntax-null italic opacity-60">
				<HighlightText text="null" query={searchQuery} />
			</span>
		);
	}
	if (typeof value === "boolean") {
		return (
			<span className="text-syntax-boolean">
				<HighlightText text={String(value)} query={searchQuery} />
			</span>
		);
	}
	if (typeof value === "number") {
		return (
			<span className="text-syntax-number tabular-nums">
				<HighlightText text={String(value)} query={searchQuery} />
			</span>
		);
	}
	if (typeof value === "string") {
		return (
			<span className="inline-flex items-center gap-1 min-w-0 w-full">
				<HighlightText
					text={value}
					query={searchQuery}
					className="text-syntax-string truncate"
				/>
				{parsedJson !== null && (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							setDrilled(true);
						}}
						className="shrink-0 inline-flex items-center px-1 py-px rounded text-[10px] bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
						title="Drill down — parse as JSON"
					>
						<Braces className="w-2.5 h-2.5" />
					</button>
				)}
			</span>
		);
	}
	if (Array.isArray(value)) {
		return (
			<span className="inline-flex items-center px-1.5 py-px rounded text-[10px] bg-muted text-muted-foreground font-[family-name:var(--font-geist-mono)]">
				[{value.length}]
			</span>
		);
	}
	if (typeof value === "object") {
		const keys = Object.keys(value as object);
		return (
			<span className="inline-flex items-center px-1.5 py-px rounded text-[10px] bg-muted text-muted-foreground font-[family-name:var(--font-geist-mono)]">
				{"{"}…{keys.length}
				{"}"}
			</span>
		);
	}
	return <span>{String(value)}</span>;
}

export function TableView({
	records,
	columns: columnKeys,
	onSelectRecord,
	searchQuery,
	currentMatchIndex,
	scrollToRecordRef,
}: TableViewProps) {
	const parentRef = useRef<HTMLDivElement>(null);
	const [sorting, setSorting] = useState<SortingState>([]);
	const [columnSizing, setColumnSizing] = useState<Record<string, number>>({});

	const columns = useMemo<ColumnDef<ParsedRecord>[]>(() => {
		const rowNumCol: ColumnDef<ParsedRecord> = {
			id: "__row_num",
			header: "#",
			size: 56,
			minSize: 40,
			enableResizing: false,
			enableSorting: false,
			cell: ({ row }) => (
				<span className="text-muted-foreground/60 tabular-nums text-[11px]">
					{row.original.index + 1}
				</span>
			),
		};

		const dataCols: ColumnDef<ParsedRecord>[] = columnKeys.map((key) => ({
			id: key,
			accessorFn: (row: ParsedRecord) => (row.data ? row.data[key] : undefined),
			header: key,
			size: Math.max(100, Math.min(300, key.length * 10 + 40)),
			minSize: 60,
			cell: ({ getValue }) => (
				<CellValue value={getValue()} searchQuery={searchQuery} />
			),
			sortingFn: (rowA, rowB, columnId) => {
				const a = rowA.original.data?.[columnId];
				const b = rowB.original.data?.[columnId];
				if (a === b) return 0;
				if (a === null || a === undefined) return 1;
				if (b === null || b === undefined) return -1;
				if (typeof a === "number" && typeof b === "number") return a - b;
				return String(a).localeCompare(String(b));
			},
		}));

		return [rowNumCol, ...dataCols];
	}, [columnKeys, searchQuery]);

	const table = useReactTable({
		data: records,
		columns,
		state: { sorting, columnSizing },
		onSortingChange: setSorting,
		onColumnSizingChange: setColumnSizing,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		columnResizeMode: "onChange",
	});

	const { rows } = table.getRowModel();

	const virtualizer = useVirtualizer({
		count: rows.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => 34,
		overscan: 20,
	});

	// Register scroll-to function so parent can scroll to a specific record
	useEffect(() => {
		scrollToRecordRef.current = (recordIndex: number) => {
			const rowIdx = rows.findIndex((r) => r.original.index === recordIndex);
			if (rowIdx !== -1) {
				virtualizer.scrollToIndex(rowIdx, { align: "center" });
			}
		};
		return () => {
			scrollToRecordRef.current = null;
		};
	}, [rows, virtualizer, scrollToRecordRef]);

	// The record index of the current navigated match
	const currentMatchRecordIndex =
		searchQuery.trim() && currentMatchIndex < records.length
			? records[currentMatchIndex]?.index
			: null;

	const handleRowClick = useCallback(
		(record: ParsedRecord) => {
			onSelectRecord(record.index);
		},
		[onSelectRecord],
	);

	if (records.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
				<Inbox className="w-8 h-8 opacity-40" />
				<p className="text-sm">No matching records</p>
			</div>
		);
	}

	return (
		<div ref={parentRef} className="h-full overflow-auto">
			<div className="relative" style={{ width: table.getTotalSize() }}>
				{/* Header */}
				<div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border shadow-[0_1px_2px_0_rgb(0_0_0/0.03)]">
					{table.getHeaderGroups().map((headerGroup) => (
						<div key={headerGroup.id} className="flex">
							{headerGroup.headers.map((header) => (
								<div
									key={header.id}
									className={cn(
										"relative flex items-center px-3 h-8 text-[11px] font-medium text-muted-foreground uppercase tracking-wider select-none shrink-0",
										header.column.getCanSort() &&
											"cursor-pointer hover:text-foreground",
									)}
									style={{ width: header.getSize() }}
									onClick={header.column.getToggleSortingHandler()}
								>
									<span className="truncate font-[family-name:var(--font-geist-mono)]">
										{typeof header.column.columnDef.header === "string" ? (
											<HighlightText
												text={header.column.columnDef.header}
												query={searchQuery}
											/>
										) : (
											flexRender(
												header.column.columnDef.header,
												header.getContext(),
											)
										)}
									</span>
									{header.column.getIsSorted() === "asc" && (
										<ArrowUp className="w-3 h-3 ml-1 shrink-0 text-primary" />
									)}
									{header.column.getIsSorted() === "desc" && (
										<ArrowDown className="w-3 h-3 ml-1 shrink-0 text-primary" />
									)}
									{/* Column resize handle */}
									{header.column.getCanResize() && (
										<div
											onMouseDown={header.getResizeHandler()}
											onTouchStart={header.getResizeHandler()}
											className={cn(
												"absolute right-0 top-1 bottom-1 w-px cursor-col-resize select-none touch-none",
												"bg-border hover:bg-primary transition-colors",
												header.column.getIsResizing() && "bg-primary w-0.5",
											)}
										/>
									)}
								</div>
							))}
						</div>
					))}
				</div>

				{/* Virtualized rows */}
				<div
					style={{ height: virtualizer.getTotalSize(), position: "relative" }}
				>
					{virtualizer.getVirtualItems().map((virtualRow) => {
						const row = rows[virtualRow.index];
						const isError = !!row.original.error;
						const isCurrentMatch =
							currentMatchRecordIndex !== null &&
							row.original.index === currentMatchRecordIndex;
						return (
							<div
								key={row.id}
								className={cn(
									"absolute left-0 flex items-center cursor-pointer transition-colors duration-75",
									virtualRow.index % 2 === 0 ? "bg-transparent" : "bg-muted/20",
									isError && "bg-destructive/5",
									isCurrentMatch && "bg-primary/10 ring-1 ring-inset ring-primary/20",
									"hover:bg-accent/60",
								)}
								style={{
									top: virtualRow.start,
									height: virtualRow.size,
									width: "100%",
								}}
								onClick={() => handleRowClick(row.original)}
							>
								{row.getVisibleCells().map((cell) => (
									<div
										key={cell.id}
										className="px-3 py-1 text-xs font-[family-name:var(--font-geist-mono)] truncate shrink-0"
										style={{ width: cell.column.getSize() }}
									>
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</div>
								))}
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
