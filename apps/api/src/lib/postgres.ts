import pg from "pg";
import type { QueryResult, QueryResultRow } from "pg";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://postgres:password@localhost:5432/memory"
});

export const query = async <TRow extends QueryResultRow = QueryResultRow>(
  text: string,
  values?: unknown[]
): Promise<QueryResult<TRow>> => pool.query<TRow>(text, values);
