declare module "sql.js" {
	export interface SqlJsStatic {
		Database: new (data?: ArrayLike<number> | Buffer | null) => Database;
	}

	export interface Database {
		run(sql: string, params?: unknown[]): Database;
		exec(sql: string, params?: unknown[]): QueryExecResult[];
		prepare(sql: string): Statement;
		export(): Uint8Array;
		close(): void;
	}

	export interface Statement {
		step(): boolean;
		getAsObject(params?: unknown): Record<string, unknown>;
		free(): void;
	}

	export interface QueryExecResult {
		columns: string[];
		values: unknown[][];
	}

	export default function initSqlJs(config?: {
		locateFile?: (file: string) => string;
	}): Promise<SqlJsStatic>;
}
