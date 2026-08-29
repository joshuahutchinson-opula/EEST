import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

export async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        client TEXT NOT NULL,
        value NUMERIC DEFAULT 0,
        stage TEXT DEFAULT 'lead',
        risk TEXT DEFAULT 'low',
        assignee_name TEXT,
        assignee_initials TEXT,
        assignee_color TEXT,
        due_date DATE,
        cameras INTEGER DEFAULT 0,
        devices INTEGER DEFAULT 0,
        location TEXT,
        contact_name TEXT,
        contact_title TEXT,
        contact_email TEXT,
        contact_phone TEXT,
        summary TEXT,
        notes TEXT,
        collaborators JSONB DEFAULT '[]',
        lead_source TEXT,
        stage_history JSONB DEFAULT '[]',
        pipeline_type TEXT DEFAULT 'sales',
        project_stage TEXT DEFAULT 'planning',
        support_type TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS quotes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id),
        client_name TEXT,
        ref_number TEXT,
        date DATE DEFAULT CURRENT_DATE,
        status TEXT DEFAULT 'draft',
        quote_type TEXT DEFAULT 'Multiple',
        exchange_rate NUMERIC DEFAULT 163,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS quote_categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        type TEXT DEFAULT 'Multiple',
        system TEXT DEFAULT 'VSS',
        section_number INTEGER DEFAULT 0,
        import_rate_percent NUMERIC DEFAULT 0,
        sort_order INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS quote_line_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        category_id UUID REFERENCES quote_categories(id) ON DELETE CASCADE,
        item_number TEXT,
        description TEXT,
        unit_cost NUMERIC DEFAULT 0,
        quantity INTEGER DEFAULT 0,
        markup_percent NUMERIC DEFAULT 0,
        is_contingency BOOLEAN DEFAULT FALSE
      );

      CREATE TABLE IF NOT EXISTS devices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        model TEXT NOT NULL,
        manufacturer TEXT,
        category TEXT DEFAULT 'camera',
        system TEXT DEFAULT 'VSS',
        resolution TEXT,
        lens TEXT,
        sensor TEXT,
        night_vision TEXT,
        weather_rating TEXT,
        power_input TEXT,
        storage TEXT,
        channels TEXT,
        readers TEXT,
        authentication TEXT,
        price NUMERIC,
        sku TEXT UNIQUE,
        image_url TEXT,
        frame_rate TEXT,
        compression TEXT,
        fov TEXT,
        operating_temp TEXT,
        tags TEXT[] DEFAULT '{}',
        discontinued BOOLEAN DEFAULT FALSE
      );

      CREATE TABLE IF NOT EXISTS install_zones (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id),
        name TEXT NOT NULL,
        is_quick_support BOOLEAN DEFAULT FALSE,
        sort_order INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS install_devices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        zone_id UUID REFERENCES install_zones(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        type TEXT DEFAULT 'camera',
        location TEXT,
        status TEXT DEFAULT 'pending',
        assignee TEXT,
        notes TEXT
      );

      CREATE TABLE IF NOT EXISTS canvas_layouts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id) UNIQUE,
        layout_data JSONB DEFAULT '{}',
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS change_orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id),
        title TEXT NOT NULL,
        description TEXT,
        cost_impact NUMERIC DEFAULT 0,
        status TEXT DEFAULT 'draft',
        created_by TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id),
        event TEXT NOT NULL,
        details TEXT,
        user_name TEXT,
        notification_type TEXT,
        action_url TEXT,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS synthesis_overrides (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        section_number VARCHAR(20) NOT NULL,
        override_value DECIMAL(12,2),
        is_overridden BOOLEAN DEFAULT false,
        overridden_by VARCHAR(100),
        overridden_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(project_id, section_number)
      );

      CREATE TABLE IF NOT EXISTS workbook_audit (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        field_path VARCHAR(255) NOT NULL,
        old_value TEXT,
        new_value TEXT,
        changed_by VARCHAR(100),
        changed_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS device_price_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
        price DECIMAL(12,2) NOT NULL,
        recorded_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS subcontractors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        trade TEXT,
        email TEXT,
        share_token TEXT UNIQUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS subcontractor_documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        subcontractor_id UUID REFERENCES subcontractors(id) ON DELETE CASCADE,
        filename TEXT NOT NULL,
        file_url TEXT NOT NULL,
        uploaded_by TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        assignee TEXT,
        subcontractor_id UUID REFERENCES subcontractors(id) ON DELETE SET NULL,
        status TEXT DEFAULT 'todo',
        priority TEXT DEFAULT 'medium',
        due_date TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS procurement_orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id),
        supplier_name TEXT,
        status TEXT DEFAULT 'pending',
        total_cost NUMERIC DEFAULT 0,
        generated_from TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS procurement_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID REFERENCES procurement_orders(id) ON DELETE CASCADE,
        description TEXT,
        quantity INTEGER DEFAULT 0,
        unit_cost NUMERIC DEFAULT 0,
        total_cost NUMERIC DEFAULT 0,
        lead_time_days INTEGER,
        tracking_number TEXT,
        received BOOLEAN DEFAULT FALSE
      );

      CREATE TABLE IF NOT EXISTS commissioning_checklists (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id),
        device_id TEXT,
        device_name TEXT,
        location TEXT,
        status TEXT DEFAULT 'pending',
        notes TEXT,
        photos JSONB DEFAULT '[]',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS project_assets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id),
        category TEXT NOT NULL,
        system TEXT NOT NULL,
        device_store_ref TEXT,
        cable_spec JSONB,
        unit_cost NUMERIC,
        quantity INTEGER DEFAULT 1,
        location TEXT,
        zone_id UUID,
        purpose TEXT,
        coverage_photos JSONB DEFAULT '[]',
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS inventory_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        device_id UUID REFERENCES devices(id),
        name TEXT NOT NULL,
        quantity_on_hand INTEGER DEFAULT 0,
        location TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS inventory_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
        user_name TEXT,
        action TEXT NOT NULL,
        quantity INTEGER,
        purpose TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS user_tutorial_progress (
        email TEXT NOT NULL,
        tutorial_key TEXT NOT NULL,
        seen_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (email, tutorial_key)
      );
    `);

    await client.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS lead_source TEXT`);
    await client.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS stage_history JSONB DEFAULT '[]'`);
    await client.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS pipeline_type TEXT DEFAULT 'sales'`);
    await client.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_stage TEXT DEFAULT 'planning'`);
    await client.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS support_type TEXT`);
    await client.query(`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS project_id UUID`);
    await client.query(`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC DEFAULT 163`);
    await client.query(`ALTER TABLE quote_categories ADD COLUMN IF NOT EXISTS system TEXT DEFAULT 'VSS'`);
    await client.query(`ALTER TABLE quote_categories ADD COLUMN IF NOT EXISTS section_number INTEGER DEFAULT 0`);
    await client.query(`ALTER TABLE quote_categories ADD COLUMN IF NOT EXISTS import_rate_percent NUMERIC DEFAULT 0`);
    await client.query(`ALTER TABLE devices ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'`);
    await client.query(`ALTER TABLE devices ADD COLUMN IF NOT EXISTS system TEXT DEFAULT 'VSS'`);
    await client.query(`ALTER TABLE install_zones ADD COLUMN IF NOT EXISTS is_quick_support BOOLEAN DEFAULT FALSE`);
    await client.query(`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE`);
    await client.query(`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS notification_type TEXT`);
    await client.query(`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS action_url TEXT`);
    await client.query(`ALTER TABLE subcontractors ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE`);
    await client.query(`ALTER TABLE project_assets ADD COLUMN IF NOT EXISTS unit_cost NUMERIC`);
    await client.query(`ALTER TABLE project_assets ADD COLUMN IF NOT EXISTS access_control_type TEXT`);
    await client.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS subcontractor_id UUID REFERENCES subcontractors(id) ON DELETE SET NULL`);
    await client.query(`ALTER TABLE quote_line_items ADD COLUMN IF NOT EXISTS project_asset_id UUID REFERENCES project_assets(id) ON DELETE SET NULL`);
    await client.query(`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS field_path TEXT`);
    await client.query(`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS old_value TEXT`);
    await client.query(`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS new_value TEXT`);
    await client.query(`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_email TEXT`);
    await client.query(`ALTER TABLE subcontractors DROP COLUMN IF EXISTS rating`);

    try {
      await client.query(`ALTER TABLE devices ADD CONSTRAINT devices_sku_unique UNIQUE (sku)`);
    } catch {}

    // The Axis Q1700-LE LPV Kit catalog entry points at a dead manufacturer image (404s) —
    // clear it so DeviceImage falls back to the placeholder icon instead of a broken image.
    // No current/working replacement URL was available to substitute in its place.
    await client.query(`UPDATE devices SET image_url = NULL WHERE image_url ILIKE '%q1700le_lpv_kit%'`);

    console.log("Database tables initialized");
  } finally {
    client.release();
  }
}

export default pool;