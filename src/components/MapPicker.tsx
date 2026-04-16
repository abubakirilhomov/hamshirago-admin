"use client";

import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default leaflet icon
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface Props {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
  label?: string;
}

function ClickHandler({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function MapPicker({ lat, lng, onChange, label }: Props) {
  const DEFAULT_CENTER: [number, number] = [41.2995, 69.2401]; // Ташкент
  const center: [number, number] = lat && lng ? [lat, lng] : DEFAULT_CENTER;

  // Delay map render until container has final dimensions (dialog animation)
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setReady(true), 80);
    return () => clearTimeout(id);
  }, []);

  function getLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => onChange(pos.coords.latitude, pos.coords.longitude),
      () => {},
    );
  }

  return (
    <div className="space-y-2">
      {label && <p className="text-sm font-medium text-foreground">{label}</p>}

      <div className="relative rounded-xl overflow-hidden border border-border" style={{ height: 240 }}>
        {ready ? (
          <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            <ClickHandler onChange={onChange} />
            {lat && lng && <Marker position={[lat, lng]} />}
          </MapContainer>
        ) : (
          <div style={{ height: "100%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 13, color: "#94a3b8" }}>Загрузка карты...</span>
          </div>
        )}

        {/* Geolocation button */}
        <button
          type="button"
          onClick={getLocation}
          className="absolute top-2 right-2 z-[1000] bg-white dark:bg-slate-800 border border-border rounded-lg p-2 shadow-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          title="Моё местоположение"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal-600">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
            <path d="M12 8a4 4 0 100 8 4 4 0 000-8z" strokeOpacity="0"/>
          </svg>
        </button>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-xs text-muted-foreground">Широта (lat)</label>
          <input
            type="number"
            step="0.000001"
            value={lat ?? ""}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0, lng ?? 0)}
            placeholder="41.299496"
            className="w-full mt-1 px-3 py-1.5 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-muted-foreground">Долгота (lng)</label>
          <input
            type="number"
            step="0.000001"
            value={lng ?? ""}
            onChange={(e) => onChange(lat ?? 0, parseFloat(e.target.value) || 0)}
            placeholder="69.240073"
            className="w-full mt-1 px-3 py-1.5 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Кликните на карту или нажмите кнопку геолокации</p>
    </div>
  );
}
