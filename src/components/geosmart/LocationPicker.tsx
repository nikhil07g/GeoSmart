import { useState } from "react";
import { LocateFixed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapView } from "@/components/map/MapView";
import { DEFAULT_CENTER } from "@/lib/geosmart/constants";
import { toast } from "sonner";

export function LocationPicker({
  lat,
  lng,
  onChange,
}: {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
}) {
  const [locating, setLocating] = useState(false);
  const center: [number, number] = lat != null && lng != null ? [lat, lng] : DEFAULT_CENTER;

  const useMyLocation = () => {
    if (!("geolocation" in navigator)) {
      toast.error("Geolocation is not supported by this browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange(pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
        toast.success("Location captured");
      },
      () => {
        setLocating(false);
        toast.error("Could not read your location. Pick it on the map instead.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" onClick={useMyLocation} disabled={locating}>
          <LocateFixed className="mr-2 h-4 w-4" />
          {locating ? "Locating…" : "Use my current location"}
        </Button>
        <p className="text-xs text-muted-foreground">or tap the map to drop a pin</p>
      </div>

      <MapView
        className="h-64 w-full"
        center={center}
        zoom={lat != null ? 16 : 12}
        pickable
        onPick={onChange}
        pickedPosition={lat != null && lng != null ? [lat, lng] : null}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="lat">Latitude</Label>
          <Input
            id="lat"
            value={lat ?? ""}
            onChange={(e) => onChange(Number(e.target.value), lng ?? 0)}
            placeholder="17.3850"
          />
        </div>
        <div>
          <Label htmlFor="lng">Longitude</Label>
          <Input
            id="lng"
            value={lng ?? ""}
            onChange={(e) => onChange(lat ?? 0, Number(e.target.value))}
            placeholder="78.4867"
          />
        </div>
      </div>
    </div>
  );
}
