"use client";

import { Braces, FileText, Keyboard, Moon, Sun, Upload } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import type { FileInfo } from "./jsonl-viewer";

interface AppHeaderProps {
	file: FileInfo;
	recordCount: number;
	errorCount: number;
	parseTime: number;
	onReset: () => void;
	onToggleKeyboardHelp: () => void;
}

export function AppHeader({
	file,
	recordCount,
	errorCount,
	onReset,
	onToggleKeyboardHelp,
}: AppHeaderProps) {
	const { theme, setTheme } = useTheme();

	return (
		<header className="flex items-center justify-between px-4 h-11 border-b border-border bg-background/80 backdrop-blur-sm shrink-0">
			<div className="flex items-center gap-3 min-w-0">
				<div className="flex items-center gap-2 shrink-0">
					<Braces className="w-3.5 h-3.5 text-primary" strokeWidth={2.5} />
					<h1 className="text-[13px] font-semibold tracking-tight">Beauties</h1>
				</div>
				<div className="h-3.5 w-px bg-border shrink-0" />
				<div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
					<FileText className="w-3 h-3 shrink-0" />
					<span
						className="font-medium text-foreground truncate max-w-48"
						title={file.name}
					>
						{file.name}
					</span>
					<span className="shrink-0 tabular-nums">
						— {recordCount.toLocaleString()} record
						{recordCount !== 1 ? "s" : ""}
					</span>
					{errorCount > 0 && (
						<span className="text-destructive shrink-0">
							({errorCount} error{errorCount !== 1 ? "s" : ""})
						</span>
					)}
				</div>
			</div>

			<div className="flex items-center gap-0.5 shrink-0">
				<HeaderButton onClick={onReset} label="Load a different file">
					<Upload className="w-3.5 h-3.5" />
					<span className="hidden sm:inline text-xs">New file</span>
				</HeaderButton>
				<HeaderButton
					onClick={onToggleKeyboardHelp}
					label="Keyboard shortcuts (?)"
				>
					<Keyboard className="w-3.5 h-3.5" />
				</HeaderButton>
				<HeaderButton
					onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
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
