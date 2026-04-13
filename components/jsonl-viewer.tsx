"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ParseResult } from "@/lib/parse-jsonl";
import { parseJsonl } from "@/lib/parse-jsonl";
import type { SqliteDatabase } from "@/lib/parse-sqlite";
import { isSqliteFile, openSqliteDatabase } from "@/lib/parse-sqlite";
import { DropZone } from "./drop-zone";
import { AppHeader } from "./header";
import { KeyboardHelp } from "./keyboard-help";
import { RawView } from "./raw-view";
import { RecordDetail } from "./record-detail";
import { SearchBar } from "./search-bar";
import { SqliteViewer } from "./sqlite-viewer";
import { TableView } from "./table-view";
import { TreeView } from "./tree-view";
import { ViewSwitcher } from "./view-switcher";

export interface FileInfo {
	name: string;
	size: number;
	rawText: string;
}

export type ScrollToRecordFn = (recordIndex: number) => void;

type ViewType = "table" | "tree" | "raw";

export function JsonlViewer() {
	const [file, setFile] = useState<FileInfo | null>(null);
	const [parseResult, setParseResult] = useState<ParseResult | null>(null);
	const [parseTime, setParseTime] = useState(0);

	// SQLite state
	const [sqliteDb, setSqliteDb] = useState<SqliteDatabase | null>(null);
	const [sqliteFileName, setSqliteFileName] = useState("");
	const [sqliteFileSize, setSqliteFileSize] = useState(0);
	const [sqliteLoadTime, setSqliteLoadTime] = useState(0);
	const [sqliteError, setSqliteError] = useState<string | null>(null);

	const [view, setView] = useState<ViewType>(() => {
		if (typeof window !== "undefined") {
			return (localStorage.getItem("beauties-view") as ViewType) || "table";
		}
		return "table";
	});
	const [selectedRecord, setSelectedRecord] = useState<number | null>(null);
	const [detailOpen, setDetailOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
	const [wordWrap, setWordWrap] = useState(false);
	const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);

	// Ref to allow views to register their scroll-to function
	const scrollToRecordRef = useRef<ScrollToRecordFn | null>(null);

	// Persist view preference
	useEffect(() => {
		localStorage.setItem("beauties-view", view);
	}, [view]);

	const handleFileLoad = useCallback(
		(name: string, size: number, text: string) => {
			const start = performance.now();
			const result = parseJsonl(text);
			const elapsed = performance.now() - start;

			setFile({ name, size, rawText: text });
			setParseResult(result);
			setParseTime(elapsed);
			setSelectedRecord(null);
			setDetailOpen(false);
			setSearchQuery("");
			setCurrentMatchIndex(0);
			// Clear SQLite state
			if (sqliteDb) {
				sqliteDb.db.close();
				setSqliteDb(null);
			}
		},
		[sqliteDb],
	);

	const handleSqliteLoad = useCallback(
		async (name: string, size: number, buffer: ArrayBuffer) => {
			setSqliteError(null);
			const start = performance.now();
			try {
				const db = await openSqliteDatabase(buffer);
				const elapsed = performance.now() - start;
				// Clear JSON state
				setFile(null);
				setParseResult(null);
				// Set SQLite state
				setSqliteDb(db);
				setSqliteFileName(name);
				setSqliteFileSize(size);
				setSqliteLoadTime(elapsed);
			} catch (e) {
				setSqliteError(
					e instanceof Error ? e.message : "Failed to open SQLite file",
				);
			}
		},
		[],
	);

	const handleReset = useCallback(() => {
		setFile(null);
		setParseResult(null);
		setParseTime(0);
		setSelectedRecord(null);
		setDetailOpen(false);
		setSearchQuery("");
		setCurrentMatchIndex(0);
		if (sqliteDb) {
			sqliteDb.db.close();
			setSqliteDb(null);
		}
		setSqliteFileName("");
		setSqliteFileSize(0);
		setSqliteLoadTime(0);
		setSqliteError(null);
	}, [sqliteDb]);

	// Search filtering
	const filteredRecords = useMemo(() => {
		if (!parseResult || !searchQuery.trim()) return parseResult?.records ?? [];
		const q = searchQuery.toLowerCase();
		return parseResult.records.filter((r) => r.raw.toLowerCase().includes(q));
	}, [parseResult, searchQuery]);

	const matchCount = filteredRecords.length;
	const totalCount = parseResult?.records.length ?? 0;

	// Reset match index when query changes and scroll to first match
	const handleSearchChange = useCallback(
		(newQuery: string) => {
			setSearchQuery(newQuery);
			setCurrentMatchIndex(0);
		},
		[],
	);

	// Auto-scroll to first match when filtered results change
	useEffect(() => {
		if (searchQuery.trim() && filteredRecords.length > 0 && scrollToRecordRef.current) {
			const target = filteredRecords[currentMatchIndex];
			if (target) {
				scrollToRecordRef.current(target.index);
			}
		}
	}, [searchQuery, filteredRecords, currentMatchIndex]);

	// Navigate between matches — scroll is handled by the effect above
	const handleMatchNavigate = useCallback(
		(direction: "prev" | "next") => {
			if (matchCount === 0) return;
			setCurrentMatchIndex((prev) => {
				if (direction === "next") {
					return prev + 1 >= matchCount ? 0 : prev + 1;
				}
				return prev - 1 < 0 ? matchCount - 1 : prev - 1;
			});
		},
		[matchCount],
	);

	// Record selection
	const handleSelectRecord = useCallback((index: number) => {
		setSelectedRecord(index);
		setDetailOpen(true);
	}, []);

	const handleNavigateRecord = useCallback(
		(direction: "prev" | "next") => {
			if (selectedRecord === null || !parseResult) return;
			const records = filteredRecords;
			const currentIdx = records.findIndex((r) => r.index === selectedRecord);
			if (currentIdx === -1) return;
			const newIdx = direction === "prev" ? currentIdx - 1 : currentIdx + 1;
			if (newIdx >= 0 && newIdx < records.length) {
				setSelectedRecord(records[newIdx].index);
			}
		},
		[selectedRecord, parseResult, filteredRecords],
	);

	// Keyboard shortcuts
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			const meta = e.metaKey || e.ctrlKey;

			// ⌘1/2/3 - switch views
			if (meta && e.key === "1") {
				e.preventDefault();
				setView("table");
			} else if (meta && e.key === "2") {
				e.preventDefault();
				setView("tree");
			} else if (meta && e.key === "3") {
				e.preventDefault();
				setView("raw");
			}
			// ⌘K or ⌘F - focus search
			else if (meta && (e.key === "k" || e.key === "f") && file) {
				e.preventDefault();
				document.getElementById("search-input")?.focus();
			}
			// ⌘D - toggle theme
			else if (meta && e.key === "d") {
				e.preventDefault();
				const html = document.documentElement;
				html.classList.toggle("dark");
			}
			// Escape - close detail, clear search
			else if (e.key === "Escape") {
				if (detailOpen) {
					setDetailOpen(false);
				} else if (searchQuery) {
					setSearchQuery("");
					setCurrentMatchIndex(0);
				} else if (showKeyboardHelp) {
					setShowKeyboardHelp(false);
				}
			}
			// ? - show keyboard help
			else if (
				e.key === "?" &&
				!meta &&
				!(e.target instanceof HTMLInputElement)
			) {
				e.preventDefault();
				setShowKeyboardHelp((v) => !v);
			}
			// Arrow keys for record navigation in detail panel
			else if (detailOpen && e.key === "ArrowUp") {
				e.preventDefault();
				handleNavigateRecord("prev");
			} else if (detailOpen && e.key === "ArrowDown") {
				e.preventDefault();
				handleNavigateRecord("next");
			}
		};

		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [file, detailOpen, searchQuery, showKeyboardHelp, handleNavigateRecord]);

	// No file loaded - show drop zone
	if ((!file || !parseResult) && !sqliteDb) {
		return (
			<DropZone
				onFileLoad={handleFileLoad}
				onSqliteLoad={handleSqliteLoad}
				sqliteError={sqliteError}
			/>
		);
	}

	// SQLite file loaded
	if (sqliteDb) {
		return (
			<SqliteViewer
				sqliteDb={sqliteDb}
				fileName={sqliteFileName}
				fileSize={sqliteFileSize}
				loadTime={sqliteLoadTime}
				onReset={handleReset}
			/>
		);
	}

	// At this point, file and parseResult must be non-null
	// (the early returns above cover all null cases)
	if (!file || !parseResult) return null;

	const selectedData =
		selectedRecord !== null
			? parseResult.records.find((r) => r.index === selectedRecord)
			: null;

	return (
		<div className="flex flex-col h-screen overflow-hidden">
			<AppHeader
				file={file}
				recordCount={totalCount}
				errorCount={parseResult.errorCount}
				parseTime={parseTime}
				onReset={handleReset}
				onToggleKeyboardHelp={() => setShowKeyboardHelp((v) => !v)}
			/>

			<div className="flex items-center justify-between gap-3 px-4 h-10 border-b border-border shrink-0">
				<ViewSwitcher view={view} onViewChange={setView} />
				<SearchBar
					query={searchQuery}
					onChange={handleSearchChange}
					matchCount={matchCount}
					totalCount={totalCount}
					currentMatchIndex={currentMatchIndex}
					onNavigate={handleMatchNavigate}
				/>
			</div>

			<div className="flex-1 overflow-hidden">
				{view === "table" && (
					<TableView
						records={filteredRecords}
						columns={parseResult.columns}
						onSelectRecord={handleSelectRecord}
						searchQuery={searchQuery}
						currentMatchIndex={currentMatchIndex}
						scrollToRecordRef={scrollToRecordRef}
					/>
				)}
				{view === "tree" && (
					<TreeView
						records={filteredRecords}
						onSelectRecord={handleSelectRecord}
					/>
				)}
				{view === "raw" && (
					<RawView
						records={parseResult.records}
						filteredRecords={filteredRecords}
						onSelectLine={handleSelectRecord}
						wordWrap={wordWrap}
						onToggleWordWrap={() => setWordWrap((v) => !v)}
						searchQuery={searchQuery}
						currentMatchIndex={currentMatchIndex}
						scrollToRecordRef={scrollToRecordRef}
					/>
				)}
			</div>

			<div className="flex items-center gap-2.5 px-4 h-7 border-t border-border text-[11px] text-muted-foreground/70 font-[family-name:var(--font-geist-mono)] tabular-nums shrink-0">
				<span>{totalCount.toLocaleString()} records</span>
				<span className="text-muted-foreground/20">·</span>
				<span>{formatFileSize(file.size)}</span>
				<span className="text-muted-foreground/20">·</span>
				<span>{parseTime.toFixed(0)}ms</span>
				{parseResult.errorCount > 0 && (
					<>
						<span className="text-muted-foreground/20">·</span>
						<span className="text-destructive/80">
							{parseResult.errorCount} error
							{parseResult.errorCount > 1 ? "s" : ""}
						</span>
					</>
				)}
			</div>

			{detailOpen && selectedData && (
				<RecordDetail
					record={selectedData}
					total={totalCount}
					onClose={() => setDetailOpen(false)}
					onNavigate={handleNavigateRecord}
				/>
			)}

			{showKeyboardHelp && (
				<KeyboardHelp onClose={() => setShowKeyboardHelp(false)} />
			)}
		</div>
	);
}

function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
