"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import maplibregl, {
  Map,
  MapGeoJSONFeature,
  StyleSpecification,
} from "maplibre-gl";
import { useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_CENTER: [number, number] = [-123.1207, 49.2827]; // Vancouver
const DEFAULT_ZOOM = 12;

type SpotFeature = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: {
    id: string;
    city: string;
    type: string;
    timeLimitMinutes?: number | null;
    notes?: string | null;
    distanceMeters?: number;
  };
};

export default function Home() {
  const mapRef = useRef<Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [lastCount, setLastCount] = useState(0);

  const mapStyle = useMemo(() => {
    const key =
      process.env.NEXT_PUBLIC_MAPTILER_KEY ??
      process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (key) {
      // MapTiler Streets (works with MapLibre); swap if you use a different provider.
      return `https://api.maptiler.com/maps/streets-v2/style.json?key=${key}`;
    }
    // Fallback raster OSM tiles for local dev without a key.
    const fallbackStyle: StyleSpecification = {
      version: 8,
      sources: {
        osm: {
          type: "raster",
          tiles: ["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"],
          tileSize: 256,
          attribution:
            '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        },
      },
      layers: [
        {
          id: "osm",
          type: "raster",
          source: "osm",
        },
      ],
    };
    return fallbackStyle;
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: mapStyle,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "bottom-right");
    map.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: false,
      }),
      "bottom-right",
    );
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left");

    map.on("load", () => {
      map.addSource("spots", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterRadius: 50,
        clusterMaxZoom: 15,
      });

      map.addLayer({
        id: "spots-clusters",
        type: "circle",
        source: "spots",
        filter: ["has", "point_count"],
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["get", "point_count"], 10, 14, 200, 24],
          "circle-color": "#2563eb",
          "circle-opacity": 0.9,
        },
      });

      map.addLayer({
        id: "spots-cluster-count",
        type: "symbol",
        source: "spots",
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
          "text-size": 12,
        },
        paint: { "text-color": "#fff" },
      });

      map.addLayer({
        id: "spots-unclustered",
        type: "circle",
        source: "spots",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": 6,
          "circle-color": "#16a34a",
          "circle-stroke-color": "#fff",
          "circle-stroke-width": 1.5,
        },
      });

      map.on("click", "spots-unclustered", (e) => {
        const feature = e.features?.[0] as MapGeoJSONFeature | undefined;
        if (!feature) return;
        const coords = feature.geometry.type === "Point" ? feature.geometry.coordinates : null;
        if (!coords) return;
        const props = feature.properties ?? {};
        new maplibregl.Popup()
          .setLngLat(coords as [number, number])
          .setHTML(
            `<div style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.4">
               <div style="font-weight:600">${props.type ?? "Parking"}</div>
               <div style="color:#475569">${props.city ?? ""}</div>
               ${
                 props.timeLimitMinutes
                   ? `<div style="margin-top:4px;color:#1f2937">${props.timeLimitMinutes} min limit</div>`
                   : ""
               }
               ${props.notes ? `<div style="margin-top:4px;color:#4b5563">${props.notes}</div>` : ""}
             </div>`,
          )
          .addTo(map);
      });

      map.on("click", "spots-clusters", (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ["spots-clusters"] });
        const clusterId = features[0]?.properties?.cluster_id;
        if (clusterId === undefined) return;
        const source = map.getSource("spots") as maplibregl.GeoJSONSource;
        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err) return;
          map.easeTo({
            center: (features[0].geometry as any).coordinates,
            zoom,
          });
        });
      });

      map.on("moveend", () => {
        void loadSpots(map);
      });

      void loadSpots(map);
    });

    map.on("error", (e) => {
      console.error("Map error", e.error);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [mapStyle]);

  async function loadSpots(map: Map) {
    const bounds = map.getBounds();
    const bbox = `${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()}`;
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch(`/api/parking/spots?bbox=${bbox}&limit=500`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const features = (data.features ?? []) as SpotFeature[];
      const source = map.getSource("spots") as maplibregl.GeoJSONSource | undefined;
      if (source) {
        source.setData({ type: "FeatureCollection", features });
      }
      setLastCount(features.length);
      setStatus("idle");
    } catch (err) {
      console.error("Failed to load spots", err);
      setStatus("error");
      setError((err as Error).message);
    }
  }

  return (
    <div
      className="relative bg-black text-white h-full w-full"
    >
      <div ref={containerRef} className="h-full w-full" />
      <div className="pointer-events-none absolute top-0 left-0 right-0 flex items-start justify-between p-4">
        <div className="pointer-events-auto rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-slate-800 shadow">
          Find free parking
          {status === "loading" ? " · Loading…" : ` · ${lastCount} spots`}
        </div>
        {error ? (
          <div className="pointer-events-auto rounded-full bg-red-600/90 px-4 py-2 text-sm font-medium text-white shadow">
            Error: {error}
          </div>
        ) : null}
      </div>
    </div>
  );
}
