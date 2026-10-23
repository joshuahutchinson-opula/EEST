import pool from "../db";

// Links a project to the client record matching its client name (case-insensitive), creating
// the record if it's a new client. Called after a project is created or its client changes.
export async function linkProjectClient(projectId: string): Promise<void> {
  const project = (await pool.query(`SELECT client FROM projects WHERE id = $1`, [projectId])).rows[0];
  const name = String(project?.client || "").trim();
  if (!name) return;
  const found = await pool.query(
    `INSERT INTO clients (name) VALUES ($1)
     ON CONFLICT ((lower(trim(name)))) DO UPDATE SET updated_at = clients.updated_at
     RETURNING id`,
    [name]
  );
  await pool.query(`UPDATE projects SET client_id = $2 WHERE id = $1`, [projectId, found.rows[0].id]);
}
