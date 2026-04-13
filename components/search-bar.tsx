"use client";

import { ChevronDown, ChevronUp, Search, X } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface SearchBarProps {
	query: string;
	onChange: (query: string) => void;
	matchCount: number;
	totalCount: number;
	currentMatchIndex: number;
	onNavigate: (direction: "prev" | "next") => void;
}

export function SearchBar({
	query,
	onChange,
	matchCount,
	totalCount,
	currentMatchIndex,
	onNavigate,
}: SearchBarProps) {
	const hasQuery = query.trim().length > 0;
	const [isFocused, setIsFocused] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			e.preventDefault();
			if (e.shiftKey) {
				onNavigate("prev");
			} else {
				onNavigate("next");
			}
		}
	};

	return (
		<div
			className={cn(
				"relative flex items-center transition-all duration-200 ease-out",
				isFocused || hasQuery ? "w-80" : "w-56",
			)}
		>
			<Search
				className={cn(
					"absolute left-2.5 w-3.5 h-3.5 pointer-events-none transition-colors duration-100",
					isFocused ? "text-foreground" : "text-muted-foreground",
				)}
			/>
			<input
				ref={inputRef}
				id="search-input"
				type="text"
				value={query}
				onChange={(e) => onChange(e.target.value)}
				onFocus={() => setIsFocused(true)}
				onBlur={() => setIsFocused(false)}
				onKeyDown={handleKeyDown}
				placeholder="Search records…"
				aria-label="Search records"
				className={cn(
					"h-8 w-full pl-8 text-xs rounded-md",
					hasQuery ? "pr-[7.5rem]" : "pr-8",
					"bg-muted/50 border",
					"placeholder:text-muted-foreground/40",
					"transition-all duration-150",
					"focus:outline-none",
					isFocused
						? "border-primary/40 bg-background shadow-[0_0_0_1px_var(--primary)_/_0.1]"
						: "border-transparent hover:border-border",
				)}
			/>
			{!hasQuery && !isFocused && (
				<kbd className="absolute right-2.5 text-[10px] text-muted-foreground/40 font-[family-name:var(--font-geist-mono)] pointer-events-none">
					⌘K
				</kbd>
			)}
			{hasQuery && (
				<div className="absolute right-1.5 flex items-center gap-0.5">
					{/* Match counter */}
					<span className="text-[10px] text-muted-foreground tabular-nums font-[family-name:var(--font-geist-mono)] mr-0.5">
						{matchCount === 0 ? (
							<span className="text-destructive/70">0 results</span>
						) : (
							<>
								<span className="text-foreground/80">
									{currentMatchIndex + 1}
								</span>
								<span className="text-muted-foreground/40">
									/{matchCount.toLocaleString()}
								</span>
							</>
						)}
					</span>

					{/* Nav buttons */}
					<button
						type="button"
						onClick={() => onNavigate("prev")}
						disabled={matchCount === 0}
						className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-default transition-colors rounded hover:bg-muted"
						aria-label="Previous match (Shift+Enter)"
						title="Previous match (Shift+Enter)"
					>
						<ChevronUp className="w-3.5 h-3.5" />
					</button>
					<button
						type="button"
						onClick={() => onNavigate("next")}
						disabled={matchCount === 0}
						className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-default transition-colors rounded hover:bg-muted"
						aria-label="Next match (Enter)"
						title="Next match (Enter)"
					>
						<ChevronDown className="w-3.5 h-3.5" />
					</button>

					{/* Clear button */}
					<button
						type="button"
						onClick={() => {
							onChange("");
							inputRef.current?.focus();
						}}
						className="p-0.5 text-muted-foreground hover:text-foreground transition-colors rounded hover:bg-muted"
						aria-label="Clear search"
					>
						<X className="w-3.5 h-3.5" />
					</button>
				</div>
			)}
		</div>
	);
}
