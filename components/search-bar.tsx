"use client";

import { Search, X } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface SearchBarProps {
	query: string;
	onChange: (query: string) => void;
	matchCount: number;
	totalCount: number;
}

export function SearchBar({
	query,
	onChange,
	matchCount,
	totalCount,
}: SearchBarProps) {
	const hasQuery = query.trim().length > 0;
	const [isFocused, setIsFocused] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	return (
		<div
			className={cn(
				"relative flex items-center transition-all duration-200 ease-out",
				isFocused ? "w-72" : "w-56",
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
				placeholder="Search records…"
				aria-label="Search records"
				className={cn(
					"h-8 w-full pl-8 pr-8 text-xs rounded-md",
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
				<>
					<span className="absolute right-8 text-[10px] text-muted-foreground tabular-nums font-[family-name:var(--font-geist-mono)]">
						{matchCount === totalCount ? (
							totalCount.toLocaleString()
						) : (
							<>
								{matchCount.toLocaleString()}
								<span className="text-muted-foreground/40">
									/{totalCount.toLocaleString()}
								</span>
							</>
						)}
					</span>
					<button
						type="button"
						onClick={() => {
							onChange("");
							inputRef.current?.focus();
						}}
						className="absolute right-2 text-muted-foreground hover:text-foreground transition-colors"
						aria-label="Clear search"
					>
						<X className="w-3.5 h-3.5" />
					</button>
				</>
			)}
		</div>
	);
}
