"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

interface KeyboardHelpProps {
	onClose: () => void;
}

const shortcuts = [
	{ keys: ["⌘", "1"], description: "Switch to Table view" },
	{ keys: ["⌘", "2"], description: "Switch to Tree view" },
	{ keys: ["⌘", "3"], description: "Switch to Raw view" },
	{ keys: ["⌘", "K"], description: "Focus search" },
	{ keys: ["⌘", "D"], description: "Toggle dark/light mode" },
	{ keys: ["↑", "↓"], description: "Navigate records in detail panel" },
	{ keys: ["Esc"], description: "Close panel / clear search" },
	{ keys: ["?"], description: "Toggle this help" },
];

export function KeyboardHelp({ onClose }: KeyboardHelpProps) {
	useEffect(() => {
		const handler = (e: MouseEvent) => {
			const panel = document.getElementById("keyboard-help-panel");
			if (panel && !panel.contains(e.target as Node)) {
				onClose();
			}
		};
		const timeout = setTimeout(() => {
			window.addEventListener("mousedown", handler);
		}, 100);
		return () => {
			clearTimeout(timeout);
			window.removeEventListener("mousedown", handler);
		};
	}, [onClose]);

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center"
			role="dialog"
			aria-label="Keyboard shortcuts"
		>
			<div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] animate-fade-in" />
			<div
				id="keyboard-help-panel"
				className="relative w-full max-w-sm bg-background border border-border rounded-xl shadow-2xl p-5 animate-fade-in-scale"
			>
				<div className="flex items-center justify-between mb-5">
					<h2 className="text-[13px] font-semibold">Keyboard Shortcuts</h2>
					<button
						type="button"
						onClick={onClose}
						className={cn(
							"inline-flex items-center justify-center w-7 h-7 rounded-md",
							"text-muted-foreground hover:text-foreground hover:bg-muted",
							"transition-colors duration-100",
							"focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
						)}
						aria-label="Close keyboard shortcuts"
					>
						<X className="w-3.5 h-3.5" />
					</button>
				</div>

				<div className="space-y-1">
					{shortcuts.map((shortcut) => (
						<div
							key={shortcut.description}
							className="flex items-center justify-between py-1.5 px-1 rounded hover:bg-muted/50 transition-colors"
						>
							<span className="text-xs text-muted-foreground">
								{shortcut.description}
							</span>
							<div className="flex items-center gap-1 ml-4 shrink-0">
								{shortcut.keys.map((key) => (
									<kbd
										key={key}
										className={cn(
											"inline-flex items-center justify-center min-w-[22px] h-5.5 px-1.5",
											"text-[11px] font-[family-name:var(--font-geist-mono)]",
											"rounded border border-border bg-muted/80 text-muted-foreground",
											"shadow-[0_1px_0_0_var(--border)]",
										)}
									>
										{key}
									</kbd>
								))}
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
