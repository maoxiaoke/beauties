"use client";

import { Check, ChevronRight, Copy } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface JsonTreeNodeProps {
	value: unknown;
	keyName?: string;
	expandAll: boolean;
	depth: number;
	isLast?: boolean;
}

export function JsonTreeNode({
	value,
	keyName,
	expandAll,
	depth,
	isLast = true,
}: JsonTreeNodeProps) {
	const [expanded, setExpanded] = useState(expandAll);
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		setExpanded(expandAll);
	}, [expandAll]);

	const handleCopyValue = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			const text =
				typeof value === "string" ? value : JSON.stringify(value, null, 2);
			navigator.clipboard.writeText(text);
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		},
		[value],
	);

	const isObject =
		typeof value === "object" && value !== null && !Array.isArray(value);
	const isArray = Array.isArray(value);
	const isExpandable = isObject || isArray;

	const comma = isLast ? "" : ",";

	if (!isExpandable) {
		return (
			<div className="group flex items-start hover:bg-muted/50 rounded px-1 -mx-1">
				{keyName !== undefined && (
					<>
						<span className="text-syntax-key">{`"${keyName}"`}</span>
						<span className="text-syntax-bracket mr-1">: </span>
					</>
				)}
				<PrimitiveValue value={value} />
				<span className="text-syntax-bracket">{comma}</span>
				<button
					type="button"
					onClick={handleCopyValue}
					className="ml-2 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity"
					title="Copy value"
				>
					{copied ? (
						<Check className="w-3 h-3 text-syntax-string" />
					) : (
						<Copy className="w-3 h-3" />
					)}
				</button>
			</div>
		);
	}

	const entries = isArray
		? (value as unknown[]).map((v, i) => ({ key: String(i), value: v }))
		: Object.entries(value as Record<string, unknown>).map(([k, v]) => ({
				key: k,
				value: v,
			}));

	const openBracket = isArray ? "[" : "{";
	const closeBracket = isArray ? "]" : "}";

	return (
		<div>
			<div
				className="group flex items-start cursor-pointer hover:bg-muted/50 rounded px-1 -mx-1"
				onClick={() => setExpanded((v) => !v)}
			>
				<ChevronRight
					className={cn(
						"w-3.5 h-3.5 mt-0.5 mr-0.5 shrink-0 text-muted-foreground transition-transform duration-150",
						expanded && "rotate-90",
					)}
				/>
				{keyName !== undefined && (
					<>
						<span className="text-syntax-key">{`"${keyName}"`}</span>
						<span className="text-syntax-bracket mr-1">: </span>
					</>
				)}
				<span className="text-syntax-bracket">{openBracket}</span>
				{!expanded && (
					<>
						<span className="text-muted-foreground mx-1 text-[11px]">
							{entries.length} {isArray ? "item" : "key"}
							{entries.length !== 1 ? "s" : ""}
						</span>
						<span className="text-syntax-bracket">
							{closeBracket}
							{comma}
						</span>
					</>
				)}
			</div>
			{expanded && (
				<>
					<div className="ml-4 border-l border-border/50 pl-2">
						{entries.map((entry, i) => (
							<JsonTreeNode
								key={entry.key}
								keyName={isArray ? undefined : entry.key}
								value={entry.value}
								expandAll={expandAll}
								depth={depth + 1}
								isLast={i === entries.length - 1}
							/>
						))}
					</div>
					<div className="px-1 -mx-1">
						<span className="text-syntax-bracket ml-[18px]">
							{closeBracket}
							{comma}
						</span>
					</div>
				</>
			)}
		</div>
	);
}

function PrimitiveValue({ value }: { value: unknown }) {
	if (value === null || value === undefined) {
		return <span className="text-syntax-null italic">null</span>;
	}
	if (typeof value === "boolean") {
		return <span className="text-syntax-boolean">{String(value)}</span>;
	}
	if (typeof value === "number") {
		return <span className="text-syntax-number">{value}</span>;
	}
	if (typeof value === "string") {
		return <span className="text-syntax-string">{`"${value}"`}</span>;
	}
	return <span>{String(value)}</span>;
}
