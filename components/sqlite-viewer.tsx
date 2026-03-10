"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
	ChevronRight,
	Code2,
	Database,
	Keyboard,
	Moon,
	Play,
	RotateCcw,
	Sun,
	Table2,
	Upload,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import type {
	SqliteDatabase,
	SqliteQueryResult,
	SqliteTableInfo,
} from "@/lib/parse-sqlite";
import { executeQuery, queryTable } from "@/lib/parse-sqlite";
import { cn } from "@/lib/utils";
import { KeyboardHelp } from "./keyboard-help";
import { Braces } from "lucide-react";

// ─── Type badge color map ───────────────────────────────────────────────────
const TYPE_COLORS: Record<string, string> = {
	INTEGER: "text-syntax-number bg-syntax-number/8",
	INT: "text-syntax-number bg-syntax-number/8",
	REAL: "text-syntax-number bg-syntax-number/8",
	FLOAT: "text-syntax-number bg-syntax-number/8",
	TEXT: "text-syntax-string bg-syntax-string/8",
	VARCHAR: "text-syntax-string bg-syntax-string/8",
	BLOB: "text-syntax-null bg-syntax-null/8",
	BOOLEAN: "text-syntax-boolean bg-syntax-boolean/8",
	ANY: "text-muted-foreground bg-muted",
};

function getTypeColor(type: string): string {
	const upper = type.toUpperCase().split("(")[0].trim();
	return TYPE_COLORS[upper] || TYPE_COLORS.ANY;
}

// ─── Cell renderer ──────────────────────────────────────────────────────────
function SqliteCellValue({ value }: { value: unknown }) {
	if (value === null || value === undefined) {
		return (
			<span className="inline-flex items-center px-1.5 py-px rounded text-[10px] italic text-syntax-null/70 bg-syntax-null/5 font-[family-name:var(--font-geist-mono)]">
				NULL
			</span>
		);
	}
	if (value instanceof Uint8Array || value instanceof ArrayBuffer) {
		const len =
			value instanceof Uint8Array ? value.length : value.byteLength;
		return (
			<span className="inline-flex items-center px-1.5 py-px rounded text-[10px] text-syntax-null bg-syntax-null/8 font-[family-name:var(--font-geist-mono)]">
				BLOB ({len} B)
			</span>
		);
	}
	if (typeof value === "number") {
		return <span className="text-syntax-number tabular-nums">{value}</span>;
	}
	if (typeof value === "boolean" || value === 0 || value === 1) {
		// SQLite booleans are integers
		return (
			<span className="text-syntax-boolean">{String(value)}</span>
		);
	}
	return (
		<span className="text-foreground truncate block" title={String(value)}>
			{String(value)}
		</span>
	);
}

// ─── Data Grid ──────────────────────────────────────────────────────────────
function DataGrid({
	queryResult,
	tableInfo,
}: {
	queryResult: SqliteQueryResult;
	tableInfo: SqliteTableInfo | null;
}) {
	const parentRef = useRef<HTMLDivElement>(null);
	const [sorting, setSorting] = useState<SortingState>([]);

	const columns = useMemo<ColumnDef<unknown[]>[]>(() => {
		const rowNumCol: ColumnDef<unknown[]> = {
			id: "__row_num",
			header: "#",
			size: 56,
			minSize: 40,
			enableResizing: false,
			enableSorting: false,
			cell: ({ row }) => (
				<span className="text-muted-foreground/50 tabular-nums text-[10px]">
					{row.index + 1}
				</span>
			),
		};

		const dataCols: ColumnDef<unknown[]>[] = queryResult.columns.map(
			(colName, colIdx) => {
				const colInfo = tableInfo?.columns.find(
					(c) => c.name === colName,
				);
				return {
					id: colName,
					accessorFn: (row: unknown[]) => row[colIdx],
					header: () => (
						<div className="flex items-center gap-1.5 min-w-0">
							<span className="truncate">{colName}</span>
							{colInfo && (
								<span
									className={cn(
										"shrink-0 px-1 py-px rounded text-[8px] uppercase tracking-wider font-semibold",
										getTypeColor(colInfo.type),
									)}
								>
									{colInfo.pk ? "PK" : colInfo.type.split("(")[0]}
								</span>
							)}
						</div>
					),
					size: Math.max(
						100,
						Math.min(300, colName.length * 9 + 60),
					),
					minSize: 60,
					cell: ({ getValue }) => (
						<SqliteCellValue value={getValue()} />
					),
					sortingFn: (rowA, rowB, columnId) => {
						const aRow = rowA.original as unknown[];
						const bRow = rowB.original as unknown[];
						const a = aRow[colIdx];
						const b = bRow[colIdx];
						if (a === b) return 0;
						if (a === null || a === undefined) return 1;
						if (b === null || b === undefined) return -1;
						if (typeof a === "number" && typeof b === "number")
							return a - b;
						return String(a).localeCompare(String(b));
					},
				};
			},
		);

		return [rowNumCol, ...dataCols];
	}, [queryResult.columns, tableInfo]);

	const table = useReactTable({
		data: queryResult.rows,
		columns,
		state: { sorting },
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
	});

	const { rows } = table.getRowModel();

	const virtualizer = useVirtualizer({
		count: rows.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => 34,
		overscan: 20,
	});

	// Reset sorting when table changes
	useEffect(() => {
		setSorting([]);
	}, [queryResult.columns]);

	if (queryResult.error) {
		return (
			<div className="flex flex-col items-center justify-center h-full gap-3 text-destructive/80 p-8">
				<Code2 className="w-6 h-6 opacity-50" />
				<p className="text-sm font-[family-name:var(--font-geist-mono)] text-center max-w-md">
					{queryResult.error}
				</p>
			</div>
		);
	}

	if (queryResult.rows.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
				<Table2 className="w-7 h-7 opacity-30" />
				<p className="text-sm">Empty table</p>
			</div>
		);
	}

	return (
		<div ref={parentRef} className="h-full overflow-auto">
			<div
				className="relative"
				style={{ width: table.getTotalSize() }}
			>
				{/* Header */}
				<div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border shadow-[0_1px_2px_0_rgb(0_0_0/0.03)]">
					{table.getHeaderGroups().map((headerGroup) => (
						<div key={headerGroup.id} className="flex">
							{headerGroup.headers.map((header) => (
								<div
									key={header.id}
									className={cn(
										"relative flex items-center px-3 h-8 text-[11px] font-medium text-muted-foreground select-none shrink-0",
										header.column.getCanSort() &&
											"cursor-pointer hover:text-foreground",
									)}
									style={{
										width: header.getSize(),
									}}
									onClick={header.column.getToggleSortingHandler()}
								>
									<span className="truncate font-[family-name:var(--font-geist-mono)]">
										{flexRender(
											header.column.columnDef
												.header,
											header.getContext(),
										)}
									</span>
									{header.column.getIsSorted() ===
										"asc" && (
										<span className="ml-1 text-primary text-[10px]">
											↑
										</span>
									)}
									{header.column.getIsSorted() ===
										"desc" && (
										<span className="ml-1 text-primary text-[10px]">
											↓
										</span>
									)}
								</div>
							))}
						</div>
					))}
				</div>

				{/* Rows */}
				<div
					style={{
						height: virtualizer.getTotalSize(),
						position: "relative",
					}}
				>
					{virtualizer.getVirtualItems().map((virtualRow) => {
						const row = rows[virtualRow.index];
						return (
							<div
								key={row.id}
								data-testid="sqlite-data-row"
								className={cn(
									"absolute left-0 flex items-center transition-colors duration-75",
									virtualRow.index % 2 === 0
										? "bg-transparent"
										: "bg-muted/20",
									"hover:bg-accent/60",
								)}
								style={{
									top: virtualRow.start,
									height: virtualRow.size,
									width: "100%",
								}}
							>
								{row
									.getVisibleCells()
									.map((cell) => (
										<div
											key={cell.id}
											className="px-3 py-1 text-xs font-[family-name:var(--font-geist-mono)] truncate shrink-0"
											style={{
												width: cell.column.getSize(),
											}}
										>
											{flexRender(
												cell.column
													.columnDef
													.cell,
												cell.getContext(),
											)}
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

// ─── Schema View ────────────────────────────────────────────────────────────
function SchemaView({ tableInfo }: { tableInfo: SqliteTableInfo }) {
	return (
		<div className="h-full overflow-auto p-4">
			<pre className="text-xs font-[family-name:var(--font-geist-mono)] leading-relaxed whitespace-pre-wrap">
				<span className="text-syntax-key">
					{tableInfo.sql}
				</span>
			</pre>
			<div className="mt-6 border-t border-border pt-4">
				<h3 className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/50 font-semibold mb-3">
					Columns
				</h3>
				<div className="space-y-1.5">
					{tableInfo.columns.map((col) => (
						<div
							key={col.cid}
							className="flex items-center gap-2 text-xs"
						>
							<span
								className={cn(
									"w-14 shrink-0 px-1.5 py-0.5 rounded text-center text-[9px] uppercase tracking-wider font-semibold",
									getTypeColor(col.type),
								)}
							>
								{col.type.split("(")[0] || "ANY"}
							</span>
							<span
								className={cn(
									"font-[family-name:var(--font-geist-mono)] font-medium",
									col.pk && "text-primary",
								)}
							>
								{col.name}
							</span>
							{col.pk && (
								<span className="text-[9px] text-primary/70 bg-primary/8 px-1 py-px rounded font-semibold">
									PK
								</span>
							)}
							{col.notnull && (
								<span className="text-[9px] text-muted-foreground/50">
									NOT NULL
								</span>
							)}
							{col.dflt_value !== null && (
								<span className="text-[9px] text-muted-foreground/40 font-[family-name:var(--font-geist-mono)]">
									= {col.dflt_value}
								</span>
							)}
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

// ─── Query Bar ──────────────────────────────────────────────────────────────
function QueryBar({
	onExecute,
	isRunning,
}: {
	onExecute: (sql: string) => void;
	isRunning: boolean;
}) {
	const [sql, setSql] = useState("");
	const inputRef = useRef<HTMLTextAreaElement>(null);

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
			e.preventDefault();
			if (sql.trim()) onExecute(sql.trim());
		}
	};

	return (
		<div
			className="flex items-start gap-2 px-3 py-2 border-b border-border bg-background/60"
			data-testid="query-bar"
		>
			<div className="relative flex-1">
				<textarea
					ref={inputRef}
					data-testid="sql-input"
					value={sql}
					onChange={(e) => setSql(e.target.value)}
					onKeyDown={handleKeyDown}
					placeholder="SELECT * FROM ..."
					rows={1}
					className={cn(
						"w-full resize-none bg-muted/40 border border-border/60 rounded-md px-3 py-1.5",
						"text-xs font-[family-name:var(--font-geist-mono)] text-foreground placeholder:text-muted-foreground/40",
						"focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring",
						"transition-colors duration-100",
					)}
				/>
			</div>
			<button
				type="button"
				data-testid="run-query-btn"
				disabled={!sql.trim() || isRunning}
				onClick={() => sql.trim() && onExecute(sql.trim())}
				className={cn(
					"inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium",
					"bg-primary text-primary-foreground hover:bg-primary/90",
					"disabled:opacity-40 disabled:pointer-events-none",
					"transition-colors duration-100",
					"focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
				)}
			>
				<Play className="w-3 h-3" />
				Run
				<kbd className="text-[10px] opacity-50 font-[family-name:var(--font-geist-mono)]">
					⌘↵
				</kbd>
			</button>
		</div>
	);
}

// ─── Table Sidebar ──────────────────────────────────────────────────────────
function TableSidebar({
	tables,
	activeTable,
	onSelectTable,
	sidebarView,
	onToggleSidebarView,
}: {
	tables: SqliteTableInfo[];
	activeTable: string;
	onSelectTable: (name: string) => void;
	sidebarView: "tables" | "schema";
	onToggleSidebarView: () => void;
}) {
	return (
		<div className="w-52 shrink-0 border-r border-border flex flex-col bg-background/50" data-testid="table-sidebar">
			{/* Sidebar header */}
			<div className="flex items-center justify-between px-3 h-8 border-b border-border shrink-0">
				<span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/50 font-semibold">
					{sidebarView === "tables" ? "Tables" : "Schema"}
				</span>
				<button
					type="button"
					data-testid="toggle-schema-btn"
					onClick={onToggleSidebarView}
					className={cn(
						"p-1 rounded text-muted-foreground/50 hover:text-foreground hover:bg-muted",
						"transition-colors duration-100",
						sidebarView === "schema" && "text-primary",
					)}
					title={
						sidebarView === "tables"
							? "Show schema"
							: "Show tables"
					}
				>
					<Code2 className="w-3 h-3" />
				</button>
			</div>

			{/* Table list */}
			<div className="flex-1 overflow-y-auto py-1">
				{tables.map((table) => {
					const isActive = table.name === activeTable;
					return (
						<button
							key={table.name}
							type="button"
							data-testid={`table-item-${table.name}`}
							onClick={() => onSelectTable(table.name)}
							className={cn(
								"w-full flex items-center gap-2 px-3 py-1.5 text-left",
								"transition-colors duration-75",
								isActive
									? "bg-primary/10 text-primary"
									: "text-muted-foreground hover:text-foreground hover:bg-muted/50",
							)}
						>
							<ChevronRight
								className={cn(
									"w-3 h-3 shrink-0 transition-transform duration-100",
									isActive && "rotate-90",
								)}
							/>
							<Table2 className="w-3 h-3 shrink-0 opacity-50" />
							<span className="text-xs font-medium truncate flex-1">
								{table.name}
							</span>
							<span
								className={cn(
									"text-[10px] tabular-nums font-[family-name:var(--font-geist-mono)] shrink-0",
									isActive
										? "text-primary/60"
										: "text-muted-foreground/40",
								)}
							>
								{table.rowCount.toLocaleString()}
							</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}

// ─── Main SQLite Viewer ─────────────────────────────────────────────────────
interface SqliteViewerProps {
	sqliteDb: SqliteDatabase;
	fileName: string;
	fileSize: number;
	loadTime: number;
	onReset: () => void;
}

export function SqliteViewer({
	sqliteDb,
	fileName,
	fileSize,
	loadTime,
	onReset,
}: SqliteViewerProps) {
	const { theme, setTheme } = useTheme();
	const [activeTable, setActiveTable] = useState<string>(
		sqliteDb.tables.length > 0 ? sqliteDb.tables[0].name : "",
	);
	const [sidebarView, setSidebarView] = useState<"tables" | "schema">(
		"tables",
	);
	const [contentView, setContentView] = useState<"data" | "schema">(
		"data",
	);
	const [customQueryResult, setCustomQueryResult] =
		useState<SqliteQueryResult | null>(null);
	const [isQueryMode, setIsQueryMode] = useState(false);
	const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);

	const activeTableInfo = useMemo(
		() => sqliteDb.tables.find((t) => t.name === activeTable) ?? null,
		[sqliteDb.tables, activeTable],
	);

	const tableData = useMemo(() => {
		if (!activeTable) return { columns: [], rows: [], rowCount: 0 };
		return queryTable(sqliteDb.db, activeTable);
	}, [sqliteDb.db, activeTable]);

	const displayResult = isQueryMode && customQueryResult
		? customQueryResult
		: tableData;

	const handleSelectTable = useCallback((name: string) => {
		setActiveTable(name);
		setCustomQueryResult(null);
		setIsQueryMode(false);
		setContentView("data");
	}, []);

	const handleExecuteQuery = useCallback(
		(sql: string) => {
			const result = executeQuery(sqliteDb.db, sql);
			setCustomQueryResult(result);
			setIsQueryMode(true);
			setContentView("data");
		},
		[sqliteDb.db],
	);

	const handleResetQuery = useCallback(() => {
		setCustomQueryResult(null);
		setIsQueryMode(false);
	}, []);

	// Keyboard shortcuts
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			const meta = e.metaKey || e.ctrlKey;

			if (meta && e.key === "d") {
				e.preventDefault();
				setTheme(theme === "dark" ? "light" : "dark");
			} else if (
				e.key === "?" &&
				!meta &&
				!(e.target instanceof HTMLInputElement) &&
				!(e.target instanceof HTMLTextAreaElement)
			) {
				e.preventDefault();
				setShowKeyboardHelp((v) => !v);
			} else if (e.key === "Escape") {
				if (showKeyboardHelp) setShowKeyboardHelp(false);
				else if (isQueryMode) handleResetQuery();
			}
		};

		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [theme, setTheme, showKeyboardHelp, isQueryMode, handleResetQuery]);

	const totalRows = sqliteDb.tables.reduce((s, t) => s + t.rowCount, 0);

	return (
		<div className="flex flex-col h-screen overflow-hidden">
			{/* ── Header ── */}
			<header className="flex items-center justify-between px-4 h-11 border-b border-border bg-background/80 backdrop-blur-sm shrink-0">
				<div className="flex items-center gap-3 min-w-0">
					<button
						type="button"
						onClick={onReset}
						className="flex items-center gap-2 shrink-0 rounded-md px-1.5 py-1 -ml-1.5 hover:bg-muted transition-colors duration-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
						title="Back to home"
						aria-label="Back to home"
					>
						<Braces
							className="w-3.5 h-3.5 text-primary"
							strokeWidth={2.5}
						/>
						<h1 className="text-[13px] font-semibold tracking-tight">
							Beauties
						</h1>
					</button>
					<div className="h-3.5 w-px bg-border shrink-0" />
					<div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
						<Database className="w-3 h-3 shrink-0 text-primary/70" />
						<span
							className="font-medium text-foreground truncate max-w-48"
							title={fileName}
						>
							{fileName}
						</span>
						<span className="shrink-0 tabular-nums">
							— {sqliteDb.tables.length} table
							{sqliteDb.tables.length !== 1 ? "s" : ""}
						</span>
					</div>
				</div>

				<div className="flex items-center gap-0.5 shrink-0">
					<HeaderButton
						onClick={onReset}
						label="Load a different file"
					>
						<Upload className="w-3.5 h-3.5" />
						<span className="hidden sm:inline text-xs">
							New file
						</span>
					</HeaderButton>
					<HeaderButton
						onClick={() => setShowKeyboardHelp((v) => !v)}
						label="Keyboard shortcuts (?)"
					>
						<Keyboard className="w-3.5 h-3.5" />
					</HeaderButton>
					<HeaderButton
						onClick={() =>
							setTheme(
								theme === "dark" ? "light" : "dark",
							)
						}
						label="Toggle theme (⌘D)"
					>
						{theme === "dark" ? (
							<Sun className="w-3.5 h-3.5" />
						) : (
							<Moon className="w-3.5 h-3.5" />
						)}
					</HeaderButton>
				</div>
			</header>

			{/* ── Query bar ── */}
			<QueryBar
				onExecute={handleExecuteQuery}
				isRunning={false}
			/>

			{/* ── Content area: sidebar + main ── */}
			<div className="flex flex-1 overflow-hidden">
				{/* Sidebar */}
				<TableSidebar
					tables={sqliteDb.tables}
					activeTable={activeTable}
					onSelectTable={handleSelectTable}
					sidebarView={sidebarView}
					onToggleSidebarView={() =>
						setSidebarView((v) =>
							v === "tables" ? "schema" : "tables",
						)
					}
				/>

				{/* Main content */}
				<div className="flex-1 flex flex-col overflow-hidden">
					{/* Content header — data/schema toggle + query mode indicator */}
					<div className="flex items-center gap-2 px-3 h-8 border-b border-border shrink-0">
						<div className="flex items-center gap-px p-0.5 rounded-md bg-muted/60">
							<button
								type="button"
								data-testid="data-tab"
								onClick={() => setContentView("data")}
								className={cn(
									"px-2.5 py-1 text-[11px] font-medium rounded-sm transition-colors duration-100",
									contentView === "data"
										? "bg-background text-foreground shadow-sm"
										: "text-muted-foreground hover:text-foreground",
								)}
							>
								Data
							</button>
							<button
								type="button"
								data-testid="schema-tab"
								onClick={() => setContentView("schema")}
								className={cn(
									"px-2.5 py-1 text-[11px] font-medium rounded-sm transition-colors duration-100",
									contentView === "schema"
										? "bg-background text-foreground shadow-sm"
										: "text-muted-foreground hover:text-foreground",
								)}
							>
								Schema
							</button>
						</div>

						{isQueryMode && (
							<div className="flex items-center gap-2 ml-2">
								<span className="text-[10px] text-primary font-[family-name:var(--font-geist-mono)]">
									Custom query
								</span>
								<button
									type="button"
									onClick={handleResetQuery}
									className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
								>
									<RotateCcw className="w-2.5 h-2.5" />
									Reset
								</button>
							</div>
						)}

						<div className="flex-1" />

						{contentView === "data" && (
							<span className="text-[10px] text-muted-foreground/50 tabular-nums font-[family-name:var(--font-geist-mono)]">
								{displayResult.rowCount.toLocaleString()} row
								{displayResult.rowCount !== 1 ? "s" : ""}
							</span>
						)}
					</div>

					{/* Content body */}
					<div className="flex-1 overflow-hidden">
						<AnimatePresence mode="wait">
							{contentView === "data" ? (
								<motion.div
									key={`data-${activeTable}-${isQueryMode}`}
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									exit={{ opacity: 0 }}
									transition={{ duration: 0.1 }}
									className="h-full"
								>
									<DataGrid
										queryResult={displayResult}
										tableInfo={activeTableInfo}
									/>
								</motion.div>
							) : activeTableInfo ? (
								<motion.div
									key={`schema-${activeTable}`}
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									exit={{ opacity: 0 }}
									transition={{ duration: 0.1 }}
									className="h-full"
								>
									<SchemaView
										tableInfo={activeTableInfo}
									/>
								</motion.div>
							) : (
								<div className="flex items-center justify-center h-full text-muted-foreground text-sm">
									No table selected
								</div>
							)}
						</AnimatePresence>
					</div>
				</div>
			</div>

			{/* ── Status bar ── */}
			<div className="flex items-center gap-2.5 px-4 h-7 border-t border-border text-[11px] text-muted-foreground/70 font-[family-name:var(--font-geist-mono)] tabular-nums shrink-0">
				<span>
					{sqliteDb.tables.length} table
					{sqliteDb.tables.length !== 1 ? "s" : ""}
				</span>
				<span className="text-muted-foreground/20">·</span>
				<span>{totalRows.toLocaleString()} total rows</span>
				<span className="text-muted-foreground/20">·</span>
				<span>{formatFileSize(fileSize)}</span>
				<span className="text-muted-foreground/20">·</span>
				<span>{loadTime.toFixed(0)}ms</span>
			</div>

			{/* Keyboard help */}
			{showKeyboardHelp && (
				<KeyboardHelp
					onClose={() => setShowKeyboardHelp(false)}
				/>
			)}
		</div>
	);
}

function HeaderButton({
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
				"inline-flex items-center gap-1.5 px-2 py-1.5 rounded-md",
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

function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
