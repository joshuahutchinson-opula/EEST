// As-built details recorded for an installed device (stored on install_devices).

export interface AsBuilt { serialNumber: string | null; macAddress: string | null; ipAddress: string | null; firmware: string | null; warrantyExpiry: string | null }

export const AS_BUILT_COLUMNS = "serial_number, mac_address, ip_address, firmware, warranty_expiry";

export function mapAsBuilt(row: any): AsBuilt {
  return {
    serialNumber: row.serial_number || null,
    macAddress: row.mac_address || null,
    ipAddress: row.ip_address || null,
    firmware: row.firmware || null,
    warrantyExpiry: row.warranty_expiry ? new Date(row.warranty_expiry).toISOString().slice(0, 10) : null,
  };
}

const text = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

function ipValid(ip: string): boolean {
  const v4 = ip.split(".");
  if (v4.length === 4 && v4.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255)) return true;
  return ip.includes(":") && /^[0-9a-fA-F:.]+$/.test(ip) && ip.length <= 45;
}

// Validates and normalises an as-built payload. Empty strings clear a field. Returns an error
// message for an invalid value.
export function parseAsBuilt(input: unknown): AsBuilt | string {
  const b = (input || {}) as Record<string, unknown>;
  const mac = text(b.macAddress, 32);
  if (mac && !/^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/.test(mac)) return "MAC address must look like AA:BB:CC:DD:EE:FF";
  const ip = text(b.ipAddress, 45);
  if (ip && !ipValid(ip)) return "IP address isn't valid";
  const warranty = text(b.warrantyExpiry, 10);
  if (warranty && (!/^\d{4}-\d{2}-\d{2}$/.test(warranty) || Number.isNaN(Date.parse(warranty)))) return "Warranty expiry must be a date (YYYY-MM-DD)";
  return {
    serialNumber: text(b.serialNumber, 100),
    macAddress: mac ? mac.toUpperCase().replace(/-/g, ":") : null,
    ipAddress: ip,
    firmware: text(b.firmware, 100),
    warrantyExpiry: warranty,
  };
}
