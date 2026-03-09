import type { Database, SqlJsStatic } from "sql.js";

export interface SqliteTableInfo {
	name: string;
	rowCount: number;
	columns: SqliteColumnInfo[];
	sql: string;
}

export interface SqliteColumnInfo {
	cid: number;
	name: string;
	type: string;
	notnull: boolean;
	dflt_value: string | null;
	pk: boolean;
}

export interface SqliteQueryResult {
	columns: string[];
	rows: unknown[][];
	rowCount: number;
	error?: string;
}

export interface SqliteDatabase {
	tables: SqliteTableInfo[];
	db: Database;
}

let sqlPromise: Promise<SqlJsStatic> | null = null;

function getSql(): Promise<SqlJsStatic> {
	if (!sqlPromise) {
		sqlPromise = (async () => {
			// Fetch the WASM binary ourselves for reliability
			const wasmResponse = await fetch("/sql-wasm.wasm");
			const wasmBinary = await wasmResponse.arrayBuffer();

			const mod = await import("sql.js");
			const initSqlJs = mod.default || mod;
			return await (initSqlJs as unknown as (config: { wasmBinary: ArrayBuffer }) => Promise<SqlJsStatic>)({
				wasmBinary,
			});
		})();
	}
	return sqlPromise;
}

export async function openSqliteDatabase(
	buffer: ArrayBuffer,
): Promise<SqliteDatabase> {
	const SQL = await getSql();
	const db = new SQL.Database(new Uint8Array(buffer));
	const tables = getTableInfos(db);
	return { tables, db };
}

function getTableInfos(db: Database): SqliteTableInfo[] {
	const stmt = db.prepare(
		"SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
	);
	const tables: SqliteTableInfo[] = [];

	while (stmt.step()) {
		const row = stmt.getAsObject() as { name: string; sql: string };
		const sqlText = row.sql || "";

		// Skip virtual tables that require modules sql.js doesn't support
		// (e.g., FTS3/4/5, rtree, etc.) — they'll crash on any query
		if (/CREATE\s+VIRTUAL\s+TABLE/i.test(sqlText)) {
			continue;
		}

		try {
			const columns = getColumnInfos(db, row.name);
			const countResult = db.exec(`SELECT COUNT(*) FROM "${row.name}"`);
			const rowCount =
				countResult.length > 0
					? (countResult[0].values[0][0] as number)
					: 0;

			tables.push({
				name: row.name,
				rowCount,
				columns,
				sql: sqlText,
			});
		} catch {
			// Table exists but can't be queried (e.g., depends on an
			// unavailable module) — skip it silently
		}
	}
	stmt.free();
	return tables;
}

function getColumnInfos(db: Database, tableName: string): SqliteColumnInfo[] {
	const result = db.exec(`PRAGMA table_info("${tableName}")`);
	if (result.length === 0) return [];

	return result[0].values.map((row) => ({
		cid: row[0] as number,
		name: row[1] as string,
		type: (row[2] as string) || "ANY",
		notnull: row[3] === 1,
		dflt_value: row[4] as string | null,
		pk: row[5] === 1,
	}));
}

export function queryTable(
	db: Database,
	tableName: string,
	limit = 1000,
	offset = 0,
): SqliteQueryResult {
	try {
		const result = db.exec(
			`SELECT * FROM "${tableName}" LIMIT ${limit} OFFSET ${offset}`,
		);
		if (result.length === 0) {
			// Table exists but is empty — get columns from pragma
			const cols = db.exec(`PRAGMA table_info("${tableName}")`);
			const columns =
				cols.length > 0 ? cols[0].values.map((r) => r[1] as string) : [];
			return { columns, rows: [], rowCount: 0 };
		}
		return {
			columns: result[0].columns,
			rows: result[0].values,
			rowCount: result[0].values.length,
		};
	} catch (e) {
		return {
			columns: [],
			rows: [],
			rowCount: 0,
			error: e instanceof Error ? e.message : "Query failed",
		};
	}
}

export function executeQuery(
	db: Database,
	sql: string,
): SqliteQueryResult {
	try {
		const result = db.exec(sql);
		if (result.length === 0) {
			return { columns: [], rows: [], rowCount: 0 };
		}
		return {
			columns: result[0].columns,
			rows: result[0].values,
			rowCount: result[0].values.length,
		};
	} catch (e) {
		return {
			columns: [],
			rows: [],
			rowCount: 0,
			error: e instanceof Error ? e.message : "Query failed",
		};
	}
}

export function isSqliteFile(name: string): boolean {
	const lower = name.toLowerCase();
	return lower.endsWith(".sqlite") || lower.endsWith(".db") || lower.endsWith(".sqlite3");
}
