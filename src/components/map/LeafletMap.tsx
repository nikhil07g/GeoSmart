import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";
import "leaflet/dist/leaflet.css";
import type { MapViewProps } from "./map-types";

const severityColor: Record<string, string> = {
  CRITICAL: "#b3261e",
  HIGH: "#c77700",
  MEDIUM: "#2f6fb0",
  LOW: "#2e7d52",
};

function pinIcon(color: string, label?: string) {
  return L.divIcon({
    className: "",
    html: `<div style="width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center"><span style="transform:rotate(45deg);color:#fff;font-size:11px;font-weight:700">${label ?? ""}</span></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    popupAnchor: [0, -24],
  });
}

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function Recenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
  }, [center[0], center[1]]);
  return null;
}

export default function LeafletMap({
  markers = [],
  circles = [],
  polyline,
  center = [17.385, 78.4867],
  zoom = 12,
  className = "h-[420px] w-full",
  pickable = false,
  onPick,
  pickedPosition,
}: MapViewProps) {
  return (
    <div className={`${className} overflow-hidden rounded-lg border border-border`}>
      <MapContainer center={center} zoom={zoom} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Recenter center={center} />
        {pickable && onPick ? <ClickHandler onPick={onPick} /> : null}

        {circles.map((c) => {
          const color = c.intensity >= 80 ? "#b3261e" : c.intensity >= 60 ? "#c77700" : c.intensity >= 40 ? "#2f6fb0" : "#2e7d52";
          return (
            <Circle
              key={c.id}
              center={[c.lat, c.lng]}
              radius={c.radius}
              pathOptions={{ color, fillColor: color, fillOpacity: 0.25, weight: 1 }}
            >
              <Popup>
                <strong>{c.label ?? "Hotspot"}</strong>
                <br />
                Density score: {c.intensity}
              </Popup>
            </Circle>
          );
        })}

        {polyline && polyline.length > 1 ? (
          <Polyline positions={polyline} pathOptions={{ color: "#2e7d52", weight: 4, opacity: 0.85, dashArray: "6 8" }} />
        ) : null}

        {markers.map((m) => (
          <Marker
            key={m.id}
            position={[m.lat, m.lng]}
            icon={pinIcon(severityColor[m.severity ?? "MEDIUM"] ?? "#2e7d52", m.order ? String(m.order) : undefined)}
          >
            <Popup>
              <div style={{ minWidth: 170 }}>
                <strong>{m.title}</strong>
                {m.badge ? <div style={{ fontSize: 12 }}>{m.badge}</div> : null}
                {m.subtitle ? <div style={{ fontSize: 12, opacity: 0.8 }}>{m.subtitle}</div> : null}
                {m.status ? <div style={{ fontSize: 12 }}>Status: {m.status}</div> : null}
                <div style={{ fontSize: 11, opacity: 0.7 }}>
                  {m.lat.toFixed(5)}, {m.lng.toFixed(5)}
                </div>
                {m.href ? (
                  <a href={m.href} style={{ fontSize: 12, color: "#2e7d52", fontWeight: 600 }}>
                    Open complaint
                  </a>
                ) : null}
              </div>
            </Popup>
          </Marker>
        ))}

        {pickedPosition ? (
          <Marker position={pickedPosition} icon={pinIcon("#2e7d52")}>
            <Popup>Selected location</Popup>
          </Marker>
        ) : null}
      </MapContainer>
    </div>
  );
}
