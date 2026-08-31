import { Router, Request, Response } from "express";
import pool from "../db";

const router = Router();

// GET /api/public/status/:token — read-only client status page, no auth. Never returns the
// project's dollar value or contact info; change orders keep their cost impact (the client
// needs the price to approve one), project assets never carry pricing.
router.get("/status/:token", async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const projResult = await pool.query(
      `SELECT id, name, client, location, project_stage AS "projectStage", due_date AS "dueDate",
              cameras, devices, stage_history AS "stageHistory", pipeline_type AS "pipelineType",
              summary, assignee_name AS "assigneeName", assignee_initials AS "assigneeInitials",
              assignee_color AS "assigneeColor", collaborators
       FROM projects
       WHERE public_share_token = $1 AND public_share_enabled = TRUE AND deleted_at IS NULL`,
      [token]
    );
    if (projResult.rows.length === 0) {
      return res.status(404).json({ error: "Link not found or has been revoked" });
    }
    const project = projResult.rows[0];

    const [assetsResult, coResult, deviceStatusResult] = await Promise.all([
      pool.query(
        `SELECT pa.category, pa.quantity, pa.location, pa.purpose, pa.cable_spec AS "cableSpec",
                pa.coverage_photos AS "coveragePhotos", d.manufacturer, d.model
         FROM project_assets pa
         LEFT JOIN devices d ON d.id = pa.device_store_ref
         WHERE pa.project_id = $1
         ORDER BY pa.created_at`,
        [project.id]
      ),
      pool.query(
        `SELECT title, description, cost_impact AS "costImpact", status, created_at AS "createdAt"
         FROM change_orders WHERE project_id = $1 ORDER BY created_at DESC`,
        [project.id]
      ),
      pool.query(
        `SELECT d.status FROM install_devices d JOIN install_zones z ON z.id = d.zone_id WHERE z.project_id = $1`,
        [project.id]
      ),
    ]);

    const totalDevices = deviceStatusResult.rows.length;
    const completeDevices = deviceStatusResult.rows.filter((r) => r.status === "complete").length;
    const progress = totalDevices > 0 ? Math.round((completeDevices / totalDevices) * 100) : 0;

    // Same "current pipeline only" rule as the authenticated Project Detail timeline (Phase 10)
    // — a client shouldn't see internal Sales-stage history mixed into their project's progress.
    const PROJECT_STAGE_VALUES = new Set(["support", "planning", "procurement", "installation", "commissioning", "complete"]);
    const stageHistory = (project.stageHistory || []).filter((e: { stage: string }) =>
      project.pipelineType === "project" ? PROJECT_STAGE_VALUES.has(e.stage) : !PROJECT_STAGE_VALUES.has(e.stage)
    );

    // Same dedup rule as the authenticated app's getDeduplicatedTeam: the assignee is always
    // "Account Owner", a collaborator sharing their name just adds another role rather than
    // appearing as a second person.
    const team: { name: string; initials: string; color: string; roles: string[] }[] = [];
    if (project.assigneeName) team.push({ name: project.assigneeName, initials: project.assigneeInitials || "", color: project.assigneeColor || "#3b82f6", roles: ["Account Owner"] });
    for (const c of (project.collaborators || []) as { name: string; initials: string; color: string; role: string }[]) {
      const existing = team.find((m) => m.name === c.name);
      if (existing) existing.roles.push(c.role);
      else team.push({ name: c.name, initials: c.initials, color: c.color, roles: [c.role] });
    }

    res.json({
      project: {
        name: project.name,
        client: project.client,
        location: project.location,
        projectStage: project.projectStage,
        dueDate: project.dueDate,
        cameras: project.cameras,
        devices: project.devices,
        progress,
        stageHistory,
        summary: project.summary || undefined,
        team,
      },
      changeOrders: coResult.rows,
      assets: assetsResult.rows,
    });
  } catch (err) {
    console.error("GET /public/status/:token error:", err);
    res.status(500).json({ error: "Failed to fetch project status" });
  }
});

export default router;
