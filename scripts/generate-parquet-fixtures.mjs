// One-shot fixture generator: produces parquet files for testing the viewer.
// Run with: node scripts/generate-parquet-fixtures.mjs
import { parquetWriteBuffer } from "hyparquet-writer";
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

// Node's zlib gives us a GZIP encoder for free — wire it into hyparquet-writer's
// compressors hook. Verifies that the reader-side compressors=... wiring works,
// which is the same code path ZSTD goes through.
const writeCompressors = {
	GZIP: (bytes) => new Uint8Array(gzipSync(bytes)),
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const FIXTURES = join(ROOT, "e2e", "fixtures");

function writeFixture(filename, buffer) {
	const target = join(FIXTURES, filename);
	writeFileSync(target, Buffer.from(buffer));
	console.log(`✓ ${filename} (${buffer.byteLength} bytes)`);
}

// ── people.parquet ── classic flat table, 6 rows ────────────────────────────
{
	const buffer = parquetWriteBuffer({
		columnData: [
			{ name: "id", data: [1, 2, 3, 4, 5, 6], type: "INT32" },
			{
				name: "name",
				data: [
					"Alice Chen",
					"Bob Smith",
					"Carol Davis",
					"Dave Wilson",
					"Eve Park",
					"Frank Lee",
				],
				type: "STRING",
			},
			{
				name: "email",
				data: [
					"alice@example.com",
					"bob@example.com",
					"carol@example.com",
					null,
					"eve@example.com",
					"frank@example.com",
				],
				type: "STRING",
				nullable: true,
			},
			{ name: "age", data: [28, 34, 42, 31, 25, 50], type: "INT32" },
			{
				name: "active",
				data: [true, true, false, true, false, true],
				type: "BOOLEAN",
			},
			{
				name: "score",
				data: [98.5, 87.2, 91.0, 76.4, 88.8, 65.3],
				type: "DOUBLE",
			},
		],
		compressors: {}, // disable SNAPPY (writer compressor default needs node setup)
		codec: "UNCOMPRESSED",
	});
	writeFixture("people.parquet", buffer);
}

// ── tiny.parquet ── single row, single column ───────────────────────────────
{
	const buffer = parquetWriteBuffer({
		columnData: [{ name: "hello", data: ["world"], type: "STRING" }],
		codec: "UNCOMPRESSED",
		compressors: {},
	});
	writeFixture("tiny.parquet", buffer);
}

// ── gzip.parquet ── GZIP-compressed (regression for unsupported-codec error;
// uses the same compressors-hook code path on the reader as ZSTD/BROTLI/LZ4) ─
{
	const buffer = parquetWriteBuffer({
		columnData: [
			{ name: "id", data: [10, 20, 30], type: "INT32" },
			{ name: "label", data: ["g1", "g2", "g3"], type: "STRING" },
		],
		codec: "GZIP",
		compressors: writeCompressors,
	});
	writeFixture("gzip.parquet", buffer);
}

// ── numeric.parquet ── numeric edge cases ───────────────────────────────────
{
	const buffer = parquetWriteBuffer({
		columnData: [
			{ name: "i32", data: [-2147483648, 0, 2147483647], type: "INT32" },
			{
				name: "i64",
				data: [-9007199254740992n, 0n, 9007199254740992n],
				type: "INT64",
			},
			{ name: "f64", data: [-0.0, 3.141592653589793, 1e100], type: "DOUBLE" },
		],
		codec: "UNCOMPRESSED",
		compressors: {},
	});
	writeFixture("numeric.parquet", buffer);
}
