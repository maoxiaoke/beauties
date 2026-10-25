"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Fragment, useId } from "react";
import styles from "./landing-page.module.css";

interface LandingPageProps {
	onBrowse: () => void;
	onPaste: () => void;
	isDragging: boolean;
	isLoading: boolean;
	progress: number;
	error?: string | null;
}

const formats = [".json", ".jsonl", ".ndjson", ".parquet", ".sqlite", ".db"];
const ease = [0.32, 0.72, 0, 1] as const;
const steps = [
	{
		number: "01",
		title: "Start with a file",
		copy: "Drop a dataset, open a database, or paste JSON from your clipboard.",
	},
	{
		number: "02",
		title: "See it your way",
		copy: "Scan rows, unfold nested objects, or read agent sessions as conversations.",
	},
	{
		number: "03",
		title: "Find the detail",
		copy: "Search values, inspect records, and keep the context around each result.",
	},
];

export function LandingPage({
	onBrowse,
	onPaste,
	isDragging,
	isLoading,
	progress,
	error,
}: LandingPageProps) {
	const reducedMotion = useReducedMotion();
	const openerId = useId();
	const headingId = useId();
	const privacyHeadingId = useId();
	const reveal = {
		initial: reducedMotion ? false : { opacity: 0, y: 24, filter: "blur(4px)" },
		whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
		viewport: { once: true, amount: 0.2 },
		transition: { duration: reducedMotion ? 0 : 0.8, ease },
	};

	return (
		<div className={styles.landing}>
			<a className={styles.skip} href={`#${openerId}`}>
				Skip to file opener
			</a>
			<header className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-8 md:px-12">
				<a
					href={`#${openerId}`}
					className={styles.brand}
					aria-label="Beauties home"
				>
					<span className={styles.brandMark} aria-hidden="true">
						{"{ }"}
					</span>
					<span className="text-lg font-semibold tracking-tight">Beauties</span>
				</a>
				<span className="flex items-center gap-2 text-xs sm:text-sm">
					<span className={styles.statusDot} aria-hidden="true" />
					<span className={styles.secondary}>Runs in your browser</span>
				</span>
			</header>

			<main id={openerId} className="mx-auto max-w-7xl px-6 md:px-12">
				<section
					className="grid items-center gap-12 pb-16 pt-12 md:pb-24 md:pt-16 lg:grid-cols-2 lg:gap-16"
					aria-labelledby={headingId}
				>
					<motion.div {...reveal}>
						<p className={`${styles.eyebrow} mb-6 text-sm font-medium`}>
							A little clarity for your data.
						</p>
						<h1
							id={headingId}
							className={`${styles.headline} max-w-[680px] text-5xl font-semibold tracking-tight sm:text-6xl xl:text-7xl`}
						>
							Your data,
							<br />
							in plain sight.
						</h1>
						<p
							className={`${styles.secondary} ${styles.pretty} mb-8 mt-6 max-w-[680px] text-lg`}
						>
							Explore JSON, Parquet, SQLite, and agent conversations. Open a
							file and get straight to the details.
						</p>
						<div className="flex flex-wrap items-center gap-6">
							<button
								type="button"
								onClick={onBrowse}
								disabled={isLoading}
								className={`${styles.primaryButton} text-base font-semibold`}
							>
								Browse file <span aria-hidden="true">↗</span>
							</button>
							<button
								type="button"
								onClick={onPaste}
								disabled={isLoading}
								className={`${styles.pasteButton} text-sm font-semibold`}
							>
								Paste <kbd className={`${styles.secondary} text-xs`}>⌘V</kbd>
							</button>
						</div>
						<p className={`${styles.secondary} mt-6 text-sm`}>
							No upload. No account. Just your browser.
						</p>
						{error && (
							<p role="alert" className="mt-4 text-sm text-destructive">
								{error}
							</p>
						)}
					</motion.div>

					<motion.div
						{...reveal}
						transition={{
							...reveal.transition,
							delay: reducedMotion ? 0 : 0.12,
						}}
						className={styles.workspace}
					>
						<div className="flex items-center justify-between gap-4 p-4">
							<span className="flex items-center gap-2 text-xs font-medium">
								<span className={styles.statusDot} aria-hidden="true" />
								Ready when you are
							</span>
							<span className={`${styles.secondary} text-xs`}>
								Local workspace
							</span>
						</div>
						<button
							type="button"
							onClick={onBrowse}
							disabled={isLoading}
							aria-busy={isLoading}
							className={`${styles.dropTarget} ${isDragging ? styles.dragging : ""}`}
						>
							{isLoading ? (
								<output className="flex w-full flex-col items-center gap-4">
									<span className="text-base font-medium">
										Reading your file…
									</span>
									<progress
										className={styles.progress}
										max={100}
										value={progress}
										aria-label="File reading progress"
									/>
									<span className={`${styles.secondary} text-sm tabular-nums`}>
										{progress}%
									</span>
								</output>
							) : (
								<>
									<span className={styles.fileMark} aria-hidden="true">
										{"{ }"}
										<span>↗</span>
									</span>
									<span className="text-xl font-medium">
										{isDragging ? "Release to open" : "Drop your file here"}
									</span>
									<span className={`${styles.secondary} text-sm`}>
										or click to browse
									</span>
									<span className="mt-4 flex flex-wrap justify-center gap-2">
										{formats.map((format) => (
											<span key={format} className={`${styles.format} text-xs`}>
												{format}
											</span>
										))}
									</span>
								</>
							)}
						</button>
						<figure className="m-4 mt-6">
							<figcaption
								className={`${styles.secondary} mb-3 flex justify-between gap-4 text-xs`}
							>
								<span>A glimpse inside</span>
								<span>Example · events.jsonl</span>
							</figcaption>
							<div className={styles.preview}>
								<div className="flex items-center gap-4 px-4 py-3 text-xs">
									<span className={styles.previewTab}>Table</span>
									<span className={styles.secondary}>Tree</span>
									<span className={styles.secondary}>Raw</span>
									<span className={`${styles.secondary} ml-auto`}>
										3 records
									</span>
								</div>
								<table
									className="w-full text-left font-[family-name:var(--font-geist-mono)] text-xs"
									aria-label="Example JSONL data preview"
								>
									<thead>
										<tr>
											<th scope="col">id</th>
											<th scope="col">event</th>
											<th scope="col">duration_ms</th>
										</tr>
									</thead>
									<tbody>
										<tr>
											<td>1</td>
											<td className={styles.string}>"page_view"</td>
											<td>142</td>
										</tr>
										<tr>
											<td>2</td>
											<td className={styles.string}>"file_open"</td>
											<td>38</td>
										</tr>
										<tr>
											<td>3</td>
											<td className={styles.string}>"search"</td>
											<td>7</td>
										</tr>
									</tbody>
								</table>
							</div>
						</figure>
					</motion.div>
				</section>

				<section
					aria-label="How it works"
					className={`${styles.steps} grid gap-8 rounded-2xl p-6 md:grid-cols-3 md:p-8`}
				>
					{steps.map((step) => (
						<motion.div key={step.number} {...reveal}>
							<span
								className={`${styles.secondary} font-[family-name:var(--font-geist-mono)] text-xs`}
							>
								{step.number} /
							</span>
							<h2 className="mb-2 mt-4 text-base font-semibold">
								{step.title}
							</h2>
							<p className={`${styles.secondary} ${styles.pretty} text-sm`}>
								{step.copy}
							</p>
						</motion.div>
					))}
				</section>

				<section
					aria-labelledby={privacyHeadingId}
					className="grid gap-8 py-16 md:grid-cols-2 md:py-24"
				>
					<h2
						id={privacyHeadingId}
						className="max-w-[680px] text-4xl font-medium tracking-tight md:text-5xl"
					>
						{["Less", "between", "you", "and", "your", "data."].map(
							(word, index) => (
								<Fragment key={word}>
									<motion.span
										initial={reducedMotion ? false : { opacity: 0.3 }}
										whileInView={{ opacity: 1 }}
										viewport={{ once: true, amount: 1 }}
										transition={{
											duration: reducedMotion ? 0 : 0.8,
											delay: reducedMotion ? 0 : index * 0.1,
											ease,
										}}
										className="inline-block"
									>
										{word}
										{index !== 1 && " "}
									</motion.span>
									{index === 1 ? <br /> : " "}
								</Fragment>
							),
						)}
					</h2>
					<motion.div
						{...reveal}
						className="flex flex-col justify-center gap-4"
					>
						<p
							className={`${styles.secondary} ${styles.pretty} max-w-lg text-base`}
						>
							Your files stay on your device. Beauties reads them locally, so
							you can inspect a dataset without sending it to a server.
						</p>
						<p
							className={`${styles.secondary} ${styles.pretty} max-w-lg text-sm`}
						>
							From nested JSON to agent sessions, keep your attention on what is
							in the file.
						</p>
					</motion.div>
				</section>
			</main>
			<footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 pb-8 text-xs md:px-12">
				<span className={styles.secondary}>
					Beauties · Made for a closer look.
				</span>
				<a href={`#${openerId}`} className={styles.footerLink}>
					Back to file opener ↑
				</a>
			</footer>
		</div>
	);
}
