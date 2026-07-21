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
        stage TEXT DEFAULT 'assessment-scheduled',
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
        quote_type TEXT DEFAULT 'Both',
        exchange_rate NUMERIC DEFAULT 157.4,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS quote_categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        type TEXT DEFAULT 'Both',
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
    `);

    // Add columns if they don't exist (for existing tables)
    await client.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS lead_source TEXT`);
    await client.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS stage_history JSONB DEFAULT '[]'`);
    await client.query(`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS project_id UUID`);
    await client.query(`ALTER TABLE devices ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'`);
    
    // Add unique constraint on sku if not exists
    try {
      await client.query(`ALTER TABLE devices ADD CONSTRAINT devices_sku_unique UNIQUE (sku)`);
    } catch {}

    console.log("Database tables initialized");
  } finally {
    client.release();
  }
}

export default pool;
