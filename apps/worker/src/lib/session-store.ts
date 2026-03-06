import { pool } from './postgres.js';

const TABLE = 'raw_sessions';

export async function markReflectionProcessing(rawSessionId: number): Promise<void> {
  await pool.query(
    `UPDATE ${TABLE} SET reflection_status = 'processing', updated_at = NOW() WHERE id = $1`,
    [rawSessionId]
  );
}

export async function markReflectionCompleted(rawSessionId: number): Promise<void> {
  await pool.query(
    `UPDATE ${TABLE} SET reflection_status = 'completed', reflection_completed_at = NOW(), updated_at = NOW() WHERE id = $1`,
    [rawSessionId]
  );
}

export async function markReflectionFailed(rawSessionId: number, error: string): Promise<void> {
  await pool.query(
    `UPDATE ${TABLE} SET reflection_status = 'failed', reflection_error = $2, updated_at = NOW() WHERE id = $1`,
    [rawSessionId, error]
  );
}

export const sessionStoreStatus = {
  markReflectionProcessing,
  markReflectionCompleted,
  markReflectionFailed,
};
