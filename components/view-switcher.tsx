"use client";

import { FileCode, Table, TreePine } from "lucide-react";
import { cn } from "@/lib/utils";

type ViewType = "table" | "tree" | "raw";

interface ViewSwitcherProps {
	view: ViewType;
	onViewChange: (view: ViewType) => void;
}

const views: {
	value: ViewType;
	label: string;
	icon: typeof Table;
	shortcut: string;
}[] = [
	{ value: "table", label: "Table", icon: Table, shortcut: "⌘1" },
	{ value: "tree", label: "Tree", icon: TreePine, shortcut: "⌘2" },
	{ value: "raw", label: "Raw", icon: FileCode, shortcut: "⌘3" },
];

export function ViewSwitcher({ view, onViewChange }: ViewSwitcherProps) {
	return (
		<div
			className="flex items-center gap-px p-0.5 rounded-lg bg-muted/80"
			role="tablist"
		>
			{views.map((v) => {
				const Icon = v.icon;
				const isActive = view === v.value;
				return (
					<button
						key={v.value}
						type="button"
						role="tab"
						aria-selected={isActive}
						onClick={() => onViewChange(v.value)}
						className={cn(
							"relative inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md",
							"transition-all duration-150 ease-out",
							"focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
							isActive
								? "bg-background text-foreground shadow-[0_1px_2px_0_rgb(0_0_0/0.05)]"
								: "text-muted-foreground hover:text-foreground",
						)}
						title={v.shortcut}
					>
						<Icon className="w-3.5 h-3.5" />
						{v.label}
						<kbd
							className={cn(
								"hidden sm:inline text-[10px] font-[family-name:var(--font-geist-mono)] ml-0.5",
								isActive ? "text-muted-foreground" : "text-muted-foreground/50",
							)}
						>
							{v.shortcut}
						</kbd>
					</button>
				);
			})}
		</div>
	);
}
