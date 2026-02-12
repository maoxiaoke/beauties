"use client";

import { Braces, ClipboardPaste, FileText, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface DropZoneProps {
	onFileLoad: (name: string, size: number, text: string) => void;
}

export function DropZone({ onFileLoad }: DropZoneProps) {
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
		[onFileLoad],
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
				setError("Clipboard access denied — please allow clipboard permissions");
			} else {
				setError("Failed to read clipboard");
			}
		}
	}, [onFileLoad]);

	// ⌘V / Ctrl+V keyboard shortcut for paste
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "v" && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
				e.preventDefault();
				handlePaste();
			}
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [handlePaste]);

	return (
		<div
			className="flex flex-col items-center justify-center h-screen p-8 relative"
			onDrop={handleDrop}
			onDragOver={handleDragOver}
			onDragEnter={handleDragEnter}
			onDragLeave={handleDragLeave}
		>
			{/* Subtle background pattern */}
			<div
				className="absolute inset-0 opacity-[0.015] pointer-events-none"
				style={{
					backgroundImage:
						"radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
					backgroundSize: "32px 32px",
				}}
			/>

			<div className="mb-10 text-center relative">
				<div className="flex items-center justify-center gap-2.5 mb-3">
					<Braces className="w-5 h-5 text-primary" strokeWidth={2.5} />
					<h1 className="text-xl font-semibold tracking-tight">Beauties</h1>
				</div>
				<p className="text-[13px] text-muted-foreground">
					A beautiful, fast, privacy-first JSONL viewer
				</p>
			</div>

			<button
				type="button"
				onClick={() => inputRef.current?.click()}
				disabled={isLoading}
				className={cn(
					"group relative flex flex-col items-center justify-center gap-4",
					"w-full max-w-md aspect-[2/1]",
					"rounded-xl border border-dashed",
					"transition-all duration-200 ease-out",
					"cursor-pointer",
					"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
					isDragging
						? "border-primary/60 bg-primary/[0.04] scale-[1.01] shadow-[0_0_0_1px_var(--primary)]"
						: "border-border hover:border-muted-foreground/40 hover:bg-muted/30",
					isLoading && "pointer-events-none opacity-70",
				)}
			>
				{isLoading ? (
					<>
						<FileText className="w-8 h-8 text-muted-foreground animate-pulse" />
						<div className="text-center">
							<p className="text-[13px] font-medium">Reading file…</p>
							<div className="mt-3 w-48 h-1 bg-muted rounded-full overflow-hidden">
								<div
									className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
									style={{ width: `${progress}%` }}
								/>
							</div>
							<p className="mt-2 text-[11px] text-muted-foreground tabular-nums">
								{progress}%
							</p>
						</div>
					</>
				) : (
					<>
						<div
							className={cn(
								"flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200",
								isDragging
									? "bg-primary/10 text-primary"
									: "bg-muted/70 text-muted-foreground group-hover:bg-muted group-hover:text-foreground",
							)}
						>
							<Upload className="w-5 h-5" />
						</div>
						<div className="text-center">
							<p className="text-[13px] font-medium">
								{isDragging ? "Drop to open" : "Drop a JSON or JSONL file here"}
							</p>
							<p className="text-[11px] text-muted-foreground mt-1.5">
								or click to browse — .jsonl, .json, .ndjson
							</p>
						</div>
					</>
				)}
			</button>

			<button
				type="button"
				onClick={handlePaste}
				disabled={isLoading}
				className={cn(
					"mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg",
					"text-xs text-muted-foreground",
					"border border-border hover:border-muted-foreground/40 hover:bg-muted/30 hover:text-foreground",
					"transition-all duration-150",
					"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
					"disabled:opacity-50 disabled:pointer-events-none",
				)}
			>
				<ClipboardPaste className="w-3.5 h-3.5" />
				Paste from clipboard
				<kbd className="text-[10px] text-muted-foreground/50 font-[family-name:var(--font-geist-mono)] ml-1">
					⌘V
				</kbd>
			</button>

			{error && (
				<p className="mt-4 text-[13px] text-destructive animate-fade-in">
					{error}
				</p>
			)}

			<p className="mt-8 text-[11px] text-muted-foreground/50">
				Everything runs client-side. Your data never leaves the browser.
			</p>

			<input
				ref={inputRef}
				type="file"
				accept=".jsonl,.json,.ndjson"
				onChange={handleFileChange}
				className="hidden"
				aria-label="Select a JSONL file"
			/>
		</div>
	);
}
