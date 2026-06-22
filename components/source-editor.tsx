"use client";

import { json } from "@codemirror/lang-json";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import {
	type Diagnostic,
	forEachDiagnostic,
	linter,
	lintGutter,
	nextDiagnostic,
} from "@codemirror/lint";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { tags as t } from "@lezer/highlight";
import { basicSetup } from "codemirror";
import { AlertTriangle, ArrowRight, Check, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { validateSource } from "@/lib/validate-source";

interface SourceEditorProps {
	/** Initial raw text to load into the editor. */
	initialText: string;
	/** File name shown in the toolbar. */
	fileName: string;
	/**
	 * "fix" — full-screen takeover after a load with parse errors. The only
	 * way out (other than fixing) is "New file".
	 * "edit" — manual edit of an already-valid file. Adds a Cancel exit.
	 */
	mode: "fix" | "edit";
	/** Called with the edited text when the user applies a 0-error document. */
	onApply: (text: string) => void;
	/** Discard edits and return to the viewer (manual "edit" mode only). */
	onCancel: () => void;
	/** Return to the drop zone. */
	onNewFile: () => void;
}

// JSON token colors, wired to the app's --syntax-* CSS variables so the editor
// adapts to dark/light automatically.
const jsonHighlight = HighlightStyle.define([
	{ tag: t.propertyName, color: "var(--syntax-key)" },
	{ tag: t.string, color: "var(--syntax-string)" },
	{ tag: [t.number, t.integer], color: "var(--syntax-number)" },
	{ tag: t.bool, color: "var(--syntax-boolean)" },
	{ tag: t.null, color: "var(--syntax-null)" },
	{
		tag: [t.brace, t.squareBracket, t.separator, t.punctuation],
		color: "var(--syntax-bracket)",
	},
]);

const editorTheme = EditorView.theme({
	"&": {
		height: "100%",
		fontSize: "13px",
		backgroundColor: "var(--background)",
		color: "var(--foreground)",
	},
	".cm-scroller": {
		fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
		lineHeight: "1.6",
	},
	".cm-content": { caretColor: "var(--primary)" },
	"&.cm-focused": { outline: "none" },
	".cm-gutters": {
		backgroundColor: "transparent",
		color: "color-mix(in oklab, var(--muted-foreground) 55%, transparent)",
		border: "none",
		borderRight: "1px solid var(--border)",
	},
	".cm-activeLine": {
		backgroundColor: "color-mix(in oklab, var(--muted) 40%, transparent)",
	},
	".cm-activeLineGutter": {
		backgroundColor: "color-mix(in oklab, var(--muted) 40%, transparent)",
	},
	".cm-selectionBackground, &.cm-focused .cm-selectionBackground, .cm-content ::selection":
		{
			backgroundColor: "color-mix(in oklab, var(--primary) 22%, transparent)",
		},
	".cm-lintRange-error": {
		textDecoration: "underline wavy var(--destructive)",
		textDecorationThickness: "1px",
	},
	".cm-diagnostic-error": {
		borderLeft: "3px solid var(--destructive)",
		backgroundColor: "color-mix(in oklab, var(--destructive) 12%, transparent)",
		color: "var(--foreground)",
		fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
		fontSize: "12px",
	},
	".cm-lint-marker-error": { content: "none" },
});

export function SourceEditor({
	initialText,
	fileName,
	mode,
	onApply,
	onCancel,
	onNewFile,
}: SourceEditorProps) {
	const hostRef = useRef<HTMLDivElement>(null);
	const viewRef = useRef<EditorView | null>(null);
	const [errorCount, setErrorCount] = useState(
		() => validateSource(initialText).length,
	);

	// Mount CodeMirror once. initialText/fileName are snapshots for this editing
	// session; the component is remounted (via `key`) when a new session starts,
	// so the effect intentionally runs only on mount.
	// biome-ignore lint/correctness/useExhaustiveDependencies: mount-only; remounted via key on session change
	useEffect(() => {
		if (!hostRef.current) return;

		// Recompute the error count off the linter's diagnostics so the toolbar
		// and the in-editor squiggles never disagree.
		const countListener = EditorView.updateListener.of((update) => {
			let n = 0;
			forEachDiagnostic(update.state, () => {
				n++;
			});
			setErrorCount(n);
		});

		const jsonLinter = linter(
			(view): Diagnostic[] =>
				validateSource(view.state.doc.toString()).map((d) => ({
					from: Math.min(d.from, view.state.doc.length),
					to: Math.min(d.to, view.state.doc.length),
					severity: "error",
					message: d.message,
				})),
			{ delay: 300 },
		);

		const state = EditorState.create({
			doc: initialText,
			extensions: [
				// Our JSON highlight before basicSetup so it takes precedence over
				// the default highlight style basicSetup ships with.
				syntaxHighlighting(jsonHighlight),
				basicSetup,
				json(),
				jsonLinter,
				lintGutter(),
				editorTheme,
				EditorView.lineWrapping,
				countListener,
			],
		});

		const view = new EditorView({ state, parent: hostRef.current });
		viewRef.current = view;
		view.focus();

		return () => {
			view.destroy();
			viewRef.current = null;
		};
	}, []);

	const handleApply = () => {
		const view = viewRef.current;
		if (!view) return;
		const text = view.state.doc.toString();
		if (validateSource(text).length > 0) return;
		onApply(text);
	};

	const handleJumpToError = () => {
		const view = viewRef.current;
		if (!view) return;
		nextDiagnostic(view);
		view.focus();
	};

	const clean = errorCount === 0;

	return (
		<div className="flex flex-col h-screen overflow-hidden">
			{/* Toolbar */}
			<header className="flex items-center justify-between gap-3 px-4 h-11 border-b border-border bg-background/80 backdrop-blur-sm shrink-0">
				<div className="flex items-center gap-3 min-w-0">
					<div
						className={cn(
							"flex items-center gap-1.5 text-xs font-medium shrink-0",
							clean ? "text-syntax-string" : "text-destructive",
						)}
					>
						{clean ? (
							<Check className="w-3.5 h-3.5" />
						) : (
							<AlertTriangle className="w-3.5 h-3.5" />
						)}
						{mode === "fix" && !clean
							? "Fix errors to continue"
							: "Edit source"}
					</div>
					<div className="h-3.5 w-px bg-border shrink-0" />
					<span
						className="text-xs text-muted-foreground truncate max-w-48 font-[family-name:var(--font-geist-mono)]"
						title={fileName}
					>
						{fileName}
					</span>
				</div>

				<div className="flex items-center gap-1.5 shrink-0">
					<div
						className={cn(
							"flex items-center gap-1.5 px-2 py-1 rounded-md text-xs tabular-nums",
							clean
								? "text-muted-foreground"
								: "text-destructive bg-destructive/10",
						)}
						aria-live="polite"
						data-testid="error-count"
					>
						{clean ? (
							"No errors"
						) : (
							<>
								{errorCount} error{errorCount !== 1 ? "s" : ""} remaining
							</>
						)}
					</div>

					{!clean && (
						<ToolbarButton
							onClick={handleJumpToError}
							label="Next error"
							title="Jump to next error"
						>
							<ArrowRight className="w-3.5 h-3.5" />
							<span className="hidden sm:inline">Next error</span>
						</ToolbarButton>
					)}

					<div className="h-3.5 w-px bg-border mx-0.5" />

					{mode === "edit" ? (
						<ToolbarButton
							onClick={onCancel}
							label="Cancel"
							title="Discard changes (Esc)"
						>
							<X className="w-3.5 h-3.5" />
							<span className="hidden sm:inline">Cancel</span>
						</ToolbarButton>
					) : (
						<ToolbarButton
							onClick={onNewFile}
							label="New file"
							title="Load a different file"
						>
							<Upload className="w-3.5 h-3.5" />
							<span className="hidden sm:inline">New file</span>
						</ToolbarButton>
					)}

					<button
						type="button"
						onClick={handleApply}
						disabled={!clean}
						className={cn(
							"inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium",
							"transition-colors duration-100",
							"focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
							clean
								? "bg-primary text-primary-foreground hover:bg-primary/90"
								: "bg-muted text-muted-foreground/50 cursor-not-allowed",
						)}
						aria-label={mode === "fix" ? "View data" : "Apply changes"}
					>
						<Check className="w-3.5 h-3.5" />
						{mode === "fix" ? "View data" : "Apply"}
					</button>
				</div>
			</header>

			{/* Editor */}
			<div ref={hostRef} className="flex-1 overflow-hidden" />
		</div>
	);
}

function ToolbarButton({
	onClick,
	label,
	title,
	children,
}: {
	onClick: () => void;
	/** Accessible name — kept in sync with the visible label (Label in Name). */
	label: string;
	/** Optional richer tooltip; defaults to the label. */
	title?: string;
	children: React.ReactNode;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"inline-flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs",
				"text-muted-foreground hover:text-foreground hover:bg-muted",
				"transition-colors duration-100",
				"focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
			)}
			title={title ?? label}
			aria-label={label}
		>
			{children}
		</button>
	);
}
