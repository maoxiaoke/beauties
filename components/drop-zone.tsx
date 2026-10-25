"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LandingPage } from "./landing-page";

interface DropZoneProps {
	onFileLoad: (name: string, size: number, text: string) => void;
	onSqliteLoad?: (name: string, size: number, buffer: ArrayBuffer) => void;
	onParquetLoad?: (name: string, size: number, buffer: ArrayBuffer) => void;
	sqliteError?: string | null;
	parquetError?: string | null;
}

function isSqliteExtension(name: string): boolean {
	const lower = name.toLowerCase();
	return (
		lower.endsWith(".sqlite") ||
		lower.endsWith(".db") ||
		lower.endsWith(".sqlite3")
	);
}

function isParquetExtension(name: string): boolean {
	return name.toLowerCase().endsWith(".parquet");
}

export function DropZone({
	onFileLoad,
	onSqliteLoad,
	onParquetLoad,
	sqliteError,
	parquetError,
}: DropZoneProps) {
	const [isDragging, setIsDragging] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [progress, setProgress] = useState(0);
	const [error, setError] = useState<string | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const dragCounter = useRef(0);

	const readFile = useCallback(
		(file: File) => {
			setError(null);
			setIsLoading(true);
			setProgress(0);

			// SQLite & Parquet files need binary reading
			const isSqlite = isSqliteExtension(file.name) && onSqliteLoad;
			const isParquet = isParquetExtension(file.name) && onParquetLoad;
			if (isSqlite || isParquet) {
				const reader = new FileReader();
				reader.onprogress = (e) => {
					if (e.lengthComputable) {
						setProgress(Math.round((e.loaded / e.total) * 100));
					}
				};
				reader.onload = (e) => {
					const buffer = e.target?.result as ArrayBuffer;
					if (!buffer || buffer.byteLength === 0) {
						setError("File is empty");
						setIsLoading(false);
						return;
					}
					setIsLoading(false);
					if (isParquet) {
						onParquetLoad?.(file.name, file.size, buffer);
					} else {
						onSqliteLoad?.(file.name, file.size, buffer);
					}
				};
				reader.onerror = () => {
					setError("Failed to read file");
					setIsLoading(false);
				};
				reader.readAsArrayBuffer(file);
				return;
			}

			const reader = new FileReader();

			reader.onprogress = (e) => {
				if (e.lengthComputable) {
					setProgress(Math.round((e.loaded / e.total) * 100));
				}
			};

			reader.onload = (e) => {
				const text = e.target?.result as string;
				if (!text.trim()) {
					setError("File is empty");
					setIsLoading(false);
					return;
				}
				setIsLoading(false);
				onFileLoad(file.name, file.size, text);
			};

			reader.onerror = () => {
				setError("Failed to read file");
				setIsLoading(false);
			};

			reader.readAsText(file);
		},
		[onFileLoad, onSqliteLoad, onParquetLoad],
	);

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			dragCounter.current = 0;
			setIsDragging(false);
			const file = e.dataTransfer.files[0];
			if (file) readFile(file);
		},
		[readFile],
	);

	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
	}, []);

	const handleDragEnter = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		dragCounter.current++;
		setIsDragging(true);
	}, []);

	const handleDragLeave = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		dragCounter.current--;
		if (dragCounter.current === 0) {
			setIsDragging(false);
		}
	}, []);

	const handleFileChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (file) readFile(file);
		},
		[readFile],
	);

	const handlePaste = useCallback(async () => {
		setError(null);
		try {
			const text = await navigator.clipboard.readText();
			if (!text.trim()) {
				setError("Clipboard is empty");
				return;
			}
			onFileLoad("clipboard-paste.jsonl", new Blob([text]).size, text);
		} catch (err) {
			if (err instanceof DOMException && err.name === "NotAllowedError") {
				setError(
					"Clipboard access denied — allow clipboard permissions and try again",
				);
			} else {
				setError("Failed to read clipboard");
			}
		}
	}, [onFileLoad]);

	// ⌘V / Ctrl+V keyboard shortcut
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if (
				(e.metaKey || e.ctrlKey) &&
				e.key === "v" &&
				!(e.target instanceof HTMLInputElement) &&
				!(e.target instanceof HTMLTextAreaElement)
			) {
				e.preventDefault();
				handlePaste();
			}
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [handlePaste]);

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: File drop surface; equivalent keyboard actions provided by browse and paste buttons.
		<div
			onDrop={handleDrop}
			onDragOver={handleDragOver}
			onDragEnter={handleDragEnter}
			onDragLeave={handleDragLeave}
		>
			<LandingPage
				onBrowse={() => inputRef.current?.click()}
				onPaste={handlePaste}
				isDragging={isDragging}
				isLoading={isLoading}
				progress={progress}
				error={error || sqliteError || parquetError}
			/>
			<input
				ref={inputRef}
				type="file"
				accept=".jsonl,.json,.ndjson,.parquet,.sqlite,.db,.sqlite3"
				onChange={handleFileChange}
				className="hidden"
				aria-label="Select a JSON, JSONL, Parquet, or SQLite file"
			/>
		</div>
	);
}
