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
import { ArrowDown, ArrowUp, Inbox } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import type { ParsedRecord } from "@/lib/parse-jsonl";
import { cn } from "@/lib/utils";

interface TableViewProps {
	records: ParsedRecord[];
	columns: string[];
	onSelectRecord: (index: number) => void;
	searchQuery: string;
}

function CellValue({ value }: { value: unknown }) {
	if (value === null || value === undefined) {
		return <span className="text-syntax-null italic opacity-60">null</span>;
	}
	if (typeof value === "boolean") {
		return <span className="text-syntax-boolean">{String(value)}</span>;
	}
	if (typeof value === "number") {
		return <span className="text-syntax-number tabular-nums">{value}</span>;
	}
	if (typeof value === "string") {
		return (
			<span className="text-syntax-string truncate block" title={value}>
				{value}
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
			cell: ({ getValue }) => <CellValue value={getValue()} />,
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
	}, [columnKeys]);

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
										{flexRender(
											header.column.columnDef.header,
											header.getContext(),
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
						return (
							<div
								key={row.id}
								className={cn(
									"absolute left-0 flex items-center cursor-pointer transition-colors duration-75",
									virtualRow.index % 2 === 0 ? "bg-transparent" : "bg-muted/20",
									isError && "bg-destructive/5",
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
