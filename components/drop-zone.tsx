"use client";

import {
	AnimatePresence,
	motion,
	useMotionValue,
	useSpring,
} from "framer-motion";
import { ArrowUpFromLine, Braces, ClipboardPaste } from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface DropZoneProps {
	onFileLoad: (name: string, size: number, text: string) => void;
}

// ─── Phrases that cycle through the typewriter ────────────────────────────────
const PHRASES = [
	"Inspect 100k+ records without uploading.",
	"Filter training datasets by key or value.",
	"Navigate nested JSON as collapsible trees.",
	"Search across every field in real time.",
	"Table, tree, and raw views — your choice.",
	"Your data never leaves the browser.",
];

// ─── Typewriter Cycler (isolated CPU-bound component) ────────────────────────
const TypewriterCycler = memo(function TypewriterCycler() {
	const [phraseIdx, setPhraseIdx] = useState(0);
	const [displayed, setDisplayed] = useState("");
	const [phase, setPhase] = useState<"typing" | "hold" | "erasing">("typing");

	useEffect(() => {
		const phrase = PHRASES[phraseIdx];
		let timeout: ReturnType<typeof setTimeout>;

		if (phase === "typing") {
			if (displayed.length < phrase.length) {
				timeout = setTimeout(() => {
					setDisplayed(phrase.slice(0, displayed.length + 1));
				}, 36);
			} else {
				timeout = setTimeout(() => setPhase("hold"), 2400);
			}
		} else if (phase === "hold") {
			timeout = setTimeout(() => setPhase("erasing"), 400);
		} else {
			if (displayed.length > 0) {
				timeout = setTimeout(() => {
					setDisplayed(displayed.slice(0, -1));
				}, 16);
			} else {
				setPhraseIdx((i) => (i + 1) % PHRASES.length);
				setPhase("typing");
			}
		}

		return () => clearTimeout(timeout);
	}, [displayed, phase, phraseIdx]);

	return (
		<span className="text-xs text-muted-foreground font-[family-name:var(--font-geist-mono)] leading-relaxed">
			{displayed}
			<span
				className="inline-block w-[1.5px] h-[0.85em] bg-primary/70 ml-[1px] align-middle"
				style={{ animation: "blink 1s step-end infinite" }}
			/>
		</span>
	);
});

// ─── Magnetic Button (isolated, no useState for motion) ──────────────────────
const MagneticButton = memo(function MagneticButton({
	onClick,
	disabled,
	children,
	variant = "primary",
}: {
	onClick: () => void;
	disabled?: boolean;
	children: React.ReactNode;
	variant?: "primary" | "secondary";
}) {
	const ref = useRef<HTMLButtonElement>(null);
	const rawX = useMotionValue(0);
	const rawY = useMotionValue(0);
	const x = useSpring(rawX, { stiffness: 200, damping: 18, mass: 0.08 });
	const y = useSpring(rawY, { stiffness: 200, damping: 18, mass: 0.08 });

	const handleMouseMove = useCallback(
		(e: React.MouseEvent) => {
			const el = ref.current;
			if (!el) return;
			const rect = el.getBoundingClientRect();
			const cx = rect.left + rect.width / 2;
			const cy = rect.top + rect.height / 2;
			rawX.set((e.clientX - cx) * 0.3);
			rawY.set((e.clientY - cy) * 0.3);
		},
		[rawX, rawY],
	);

	const handleMouseLeave = useCallback(() => {
		rawX.set(0);
		rawY.set(0);
	}, [rawX, rawY]);

	return (
		<motion.button
			ref={ref}
			type="button"
			onClick={onClick}
			disabled={disabled}
			style={{ x, y }}
			onMouseMove={handleMouseMove}
			onMouseLeave={handleMouseLeave}
			whileTap={{ scale: 0.96 }}
			className={cn(
				"inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium",
				"transition-colors duration-150",
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
				"disabled:opacity-40 disabled:pointer-events-none",
				variant === "primary"
					? "bg-primary text-primary-foreground hover:bg-primary/90"
					: "border border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/40 hover:bg-muted/40",
			)}
		>
			{children}
		</motion.button>
	);
});

// ─── Stat cell ────────────────────────────────────────────────────────────────
function StatCell({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex flex-col gap-0.5">
			<span className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground/40 font-[family-name:var(--font-geist-mono)]">
				{label}
			</span>
			<span className="text-sm font-medium font-[family-name:var(--font-geist-mono)] tabular-nums">
				{value}
			</span>
		</div>
	);
}

// ─── Main Drop Zone ───────────────────────────────────────────────────────────
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

	// Stagger entrance variants
	const containerVariants = {
		hidden: {},
		visible: { transition: { staggerChildren: 0.065, delayChildren: 0.05 } },
	};
	const itemVariants = {
		hidden: { opacity: 0, y: 18, filter: "blur(4px)" },
		visible: {
			opacity: 1,
			y: 0,
			filter: "blur(0px)",
			transition: { type: "spring" as const, stiffness: 260, damping: 26 },
		},
	};

	return (
		<div
			className="relative min-h-[100dvh] overflow-hidden"
			onDrop={handleDrop}
			onDragOver={handleDragOver}
			onDragEnter={handleDragEnter}
			onDragLeave={handleDragLeave}
		>
			{/* ── Animated mesh gradient blobs ── */}
			<div
				className="absolute inset-0 pointer-events-none overflow-hidden"
				aria-hidden
			>
				<div
					className="absolute top-[-25%] left-[-8%] w-[65vw] h-[65vw] rounded-full bg-primary blur-[110px] opacity-[0.04] dark:opacity-[0.07]"
					style={{ animation: "blob-drift-1 20s ease-in-out infinite" }}
				/>
				<div
					className="absolute bottom-[-15%] right-[-10%] w-[55vw] h-[55vw] rounded-full bg-blue-500 blur-[130px] opacity-[0.025] dark:opacity-[0.045]"
					style={{ animation: "blob-drift-2 26s ease-in-out infinite" }}
				/>
				<div
					className="absolute top-[35%] right-[15%] w-[32vw] h-[32vw] rounded-full bg-emerald-500 blur-[90px] opacity-[0.018] dark:opacity-[0.032]"
					style={{ animation: "blob-drift-3 18s ease-in-out infinite" }}
				/>
			</div>

			{/* ── Dot grid pattern ── */}
			<div
				className="absolute inset-0 opacity-[0.012] pointer-events-none"
				aria-hidden
				style={{
					backgroundImage:
						"radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
					backgroundSize: "28px 28px",
				}}
			/>

			{/* ── Layout grid ── */}
			<div className="relative z-10 min-h-[100dvh] flex items-center px-6 md:px-16 lg:px-24 max-w-[1400px] mx-auto">
				<div className="w-full grid grid-cols-1 md:grid-cols-5 gap-10 md:gap-16 py-14">
					{/* ── Left column: brand + copy + actions (40%) ── */}
					<motion.div
						className="md:col-span-2 flex flex-col justify-center gap-7"
						variants={containerVariants}
						initial="hidden"
						animate="visible"
					>
						{/* Brand mark */}
						<motion.div
							variants={itemVariants}
							className="flex items-center gap-2.5"
						>
							<Braces
								className="w-4 h-4 text-primary"
								strokeWidth={2.5}
							/>
							<span className="text-sm font-semibold tracking-tight">
								Beauties
							</span>
							<span className="text-[9px] text-muted-foreground/40 font-[family-name:var(--font-geist-mono)] border border-border/50 px-1.5 py-0.5 rounded-sm tracking-wider">
								JSON
							</span>
						</motion.div>

						{/* Headline */}
						<motion.div variants={itemVariants}>
							<h1 className="text-[2.6rem] md:text-5xl font-semibold tracking-tighter leading-[1.04]">
								JSON & JSONL
								<br />
								<span className="text-muted-foreground/55">
									without the
								</span>
								<br />
								friction.
							</h1>
						</motion.div>

						{/* Typewriter */}
						<motion.div
							variants={itemVariants}
							className="min-h-[1.6rem] flex items-start"
						>
							<TypewriterCycler />
						</motion.div>

						{/* CTA row */}
						<motion.div
							variants={itemVariants}
							className="flex items-center gap-3 flex-wrap"
						>
							<MagneticButton onClick={handlePaste} disabled={isLoading}>
								<ClipboardPaste className="w-4 h-4" />
								Paste
								<kbd className="text-[10px] opacity-40 font-[family-name:var(--font-geist-mono)]">
									⌘V
								</kbd>
							</MagneticButton>
							<MagneticButton
								onClick={() => inputRef.current?.click()}
								disabled={isLoading}
								variant="secondary"
							>
								<ArrowUpFromLine className="w-4 h-4" />
								Browse file
							</MagneticButton>
						</motion.div>

						{/* Cockpit-density stats grid */}
						<motion.div
							variants={itemVariants}
							className="grid grid-cols-2 gap-x-8 gap-y-4 border-t border-border/40 pt-5"
						>
							<StatCell label="Max records" value="100k+" />
							<StatCell label="Upload size" value="0 kb" />
							<StatCell label="Views" value="3" />
							<StatCell label="Runtime" value="browser" />
						</motion.div>

						{/* Error */}
						<AnimatePresence>
							{error && (
								<motion.p
									key="error"
									initial={{ opacity: 0, y: -4 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -4 }}
									transition={{ duration: 0.18 }}
									className="text-xs text-destructive font-[family-name:var(--font-geist-mono)]"
								>
									{error}
								</motion.p>
							)}
						</AnimatePresence>
					</motion.div>

					{/* ── Right column: drop target (60%) ── */}
					<motion.div
						className="md:col-span-3 flex items-center"
						initial={{ opacity: 0, scale: 0.95, y: 12 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						transition={{
							duration: 0.55,
							delay: 0.15,
							type: "spring",
							stiffness: 180,
							damping: 28,
						}}
					>
						<button
							type="button"
							onClick={() => inputRef.current?.click()}
							disabled={isLoading}
							className={cn(
								"group relative w-full aspect-[4/3] md:aspect-[16/10]",
								"rounded-2xl border cursor-pointer",
								"transition-all duration-300 ease-out",
								"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
								isDragging
									? "border-primary/50 bg-primary/[0.04] shadow-[0_0_0_1px_var(--primary)]"
									: "border-dashed border-border/50 hover:border-muted-foreground/25 hover:bg-muted/[0.06]",
								isLoading && "pointer-events-none",
							)}
						>
							{/* Inner refraction edge */}
							<div className="absolute inset-[1px] rounded-[calc(1rem-1px)] pointer-events-none border border-white/[0.03] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]" />

							{isLoading ? (
								<div className="flex flex-col items-center justify-center gap-4 h-full">
									<div className="w-44 h-px bg-muted-foreground/15 overflow-hidden rounded-full">
										<motion.div
											className="h-full bg-primary rounded-full"
											initial={{ width: "0%" }}
											animate={{ width: `${progress}%` }}
											transition={{ duration: 0.25 }}
										/>
									</div>
									<span className="text-[11px] text-muted-foreground font-[family-name:var(--font-geist-mono)] tabular-nums">
										{progress}%
									</span>
								</div>
							) : (
								<div className="flex flex-col items-center justify-center gap-5 h-full p-10">
									<motion.div
										animate={
											isDragging
												? { scale: 1.12, y: -6 }
												: { scale: 1, y: 0 }
										}
										transition={{
											type: "spring",
											stiffness: 320,
											damping: 22,
										}}
										className={cn(
											"w-11 h-11 rounded-xl flex items-center justify-center transition-colors duration-200",
											isDragging
												? "bg-primary/15 text-primary"
												: "bg-muted/40 text-muted-foreground group-hover:bg-muted group-hover:text-foreground",
										)}
									>
										<ArrowUpFromLine className="w-5 h-5" />
									</motion.div>

									<div className="text-center">
										<p className="text-sm font-medium">
											{isDragging
												? "Release to open"
												: "Drop your file here"}
										</p>
										<p className="text-xs text-muted-foreground mt-1">
											or click to browse
										</p>
									</div>

									{/* Format badges — staggered entrance */}
									<div className="flex items-center gap-2 mt-1">
										{[".json", ".jsonl", ".ndjson"].map((fmt, i) => (
											<motion.span
												key={fmt}
												initial={{ opacity: 0, y: 8 }}
												animate={{ opacity: 1, y: 0 }}
												transition={{
													delay: 0.5 + i * 0.07,
													type: "spring",
													stiffness: 300,
													damping: 26,
												}}
												className="text-[10px] text-muted-foreground/50 font-[family-name:var(--font-geist-mono)] border border-border/40 px-2 py-0.5 rounded-sm"
											>
												{fmt}
											</motion.span>
										))}
									</div>
								</div>
							)}
						</button>
					</motion.div>
				</div>
			</div>

			<input
				ref={inputRef}
				type="file"
				accept=".jsonl,.json,.ndjson"
				onChange={handleFileChange}
				className="hidden"
				aria-label="Select a JSON or JSONL file"
			/>
		</div>
	);
}
