import { useState } from "react";
import { Camera } from "lucide-react";

// Catalog image URLs are external (manufacturer sites) and go dead over time — falls back to
// the same placeholder used for devices with no image at all, instead of a broken-image icon.
export function DeviceImage({ device, className, iconClassName, style }: { device: { imageUrl?: string; model: string }; className: string; iconClassName: string; style?: React.CSSProperties }) {
  const [failed, setFailed] = useState(false);
  if (!device.imageUrl || failed) {
    return <div className="w-full h-full flex items-center justify-center"><Camera className={iconClassName} /></div>;
  }
  return <img src={device.imageUrl} alt={device.model} className={className} style={style} onError={() => setFailed(true)} />;
}
