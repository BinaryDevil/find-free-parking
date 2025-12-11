"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import maplibregl, {
  Map,
  MapGeoJSONFeature,
  StyleSpecification,
} from "maplibre-gl";
import { LocateFixed, Loader2, Search } from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { FeatureCollection, Point } from "geojson";

const DEFAULT_CENTER: [number, number] = [-123.1207, 49.2827]; // Vancouver
const DEFAULT_ZOOM = 15;
const MIN_ZOOM = 12; // prevents zooming out beyond a city-scale view
const FIVE_MINUTES = 5 * 60 * 1000;

function roundToNearestFiveMinutes(date: Date) {
  const ms = date.getTime();
  const rounded = Math.round(ms / FIVE_MINUTES) * FIVE_MINUTES;
  return new Date(rounded);
}

function formatInputDateValue(date: Date) {
  const rounded = roundToNearestFiveMinutes(date);
  const pad = (n: number) => n.toString().padStart(2, "0");
  const year = rounded.getFullYear();
  const month = pad(rounded.getMonth() + 1);
  const day = pad(rounded.getDate());
  const hours = pad(rounded.getHours());
  const minutes = pad(rounded.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function formatDisplayDate(value: string, isCustom: boolean) {
  if (!isCustom) return "now";
  const date = new Date(value);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

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
    metadata?: any;
    // Meter specific
    pay_station_id?: string;
    meter_head?: string;
    time_in_effect?: string;
    credit_card?: boolean;
    rate?: string;
  };
};

type ZoneFeature = {
  type: "Feature";
  geometry: { type: "Polygon" | "MultiPolygon"; coordinates: any };
  properties: {
    id: string;
    city: string;
    type: string;
    timeLimitMinutes?: number | null;
    notes?: string | null;
    metadata?: any;
  };
};

type StreetFeature = {
  type: "Feature";
  geometry: { type: "LineString"; coordinates: [number, number][] };
  properties: {
    id: string;
    block_id: string;
    street_use: string;
    meter_infos?: Array<{
      time_in_effect: string;
      rate: string;
    }>;
    is_free?: boolean; // Calculated on client
  };
};

export default function Home() {
  const mapRef = useRef<Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [featureCounts, setFeatureCounts] = useState({ meters: 0, streets: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showCurrentLocationPlaceholder, setShowCurrentLocationPlaceholder] =
    useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null
  );
  const [parkingTime, setParkingTime] = useState<string>(() =>
    formatInputDateValue(new Date())
  );
  const [isCustomTime, setIsCustomTime] = useState(false);
  const timeInputRef = useRef<HTMLInputElement | null>(null);
  const [filterType, setFilterType] = useState<"FREE" | "PAID">("FREE");
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [dontShowHelp, setDontShowHelp] = useState(false);

  // Destination state (from search)
  const [destinationLocation, setDestinationLocation] = useState<
    [number, number] | null
  >(null);
  const destinationLocationRef = useRef<[number, number] | null>(null);

  // Refs for map event listeners to avoid stale closures
  const filterTypeRef = useRef(filterType);
  const parkingTimeRef = useRef(parkingTime);

  useEffect(() => {
    filterTypeRef.current = filterType;
    parkingTimeRef.current = parkingTime;
    destinationLocationRef.current = destinationLocation;
  }, [filterType, parkingTime, destinationLocation]);

  useEffect(() => {
    // Check local storage on mount
    const seen = localStorage.getItem("find-free-parking-help-seen");
    if (seen !== "true") {
      setIsHelpOpen(true);
    }
  }, []);

  function handleCloseHelp() {
    setIsHelpOpen(false);
    if (dontShowHelp) {
      localStorage.setItem("find-free-parking-help-seen", "true");
    }
  }

  // Simple Haversine distance and walking time estimate
  function getWalkingEstimates(start: [number, number], end: [number, number]) {
    const R = 6371e3; // metres
    const φ1 = (start[1] * Math.PI) / 180;
    const φ2 = (end[1] * Math.PI) / 180;
    const Δφ = ((end[1] - start[1]) * Math.PI) / 180;
    const Δλ = ((end[0] - start[0]) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // distance in meters

    // Walking speed ~1.4 m/s (5 km/h)
    const timeSeconds = d / 1.4;
    const timeMinutes = Math.ceil(timeSeconds / 60);

    return {
      distance: Math.round(d),
      minutes: timeMinutes,
    };
  }

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
      minZoom: MIN_ZOOM,
      attributionControl: false,
    });

    map.addControl(
      new maplibregl.NavigationControl({ visualizePitch: true }),
      "bottom-right"
    );
    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-left"
    );

    map.on("load", () => {
      map.addSource("spots", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterRadius: 50,
        clusterMaxZoom: 15,
      });
      map.addSource("user-location", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addSource("zones", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addSource("streets", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "zones-fill",
        type: "fill",
        source: "zones",
        paint: {
          "fill-color": "#16a34a",
          "fill-opacity": 0.4,
        },
      });
      map.addLayer({
        id: "zones-line",
        type: "line",
        source: "zones",
        paint: {
          "line-color": "#15803d",
          "line-width": 2,
        },
      });

      // Streets Layer
      map.addLayer({
        id: "streets-line",
        type: "line",
        source: "streets",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": [
            "case",
            ["==", ["get", "is_free"], true],
            "#4ade80", // Green (Free)
            "#ef4444", // Red (Paid)
          ],
          "line-width": 4,
          "line-opacity": 0.8,
        },
      });

      map.addLayer({
        id: "spots-clusters",
        type: "circle",
        source: "spots",
        filter: ["has", "point_count"],
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["get", "point_count"],
            10,
            14,
            200,
            24,
          ],
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
      map.addLayer({
        id: "user-location",
        type: "circle",
        source: "user-location",
        paint: {
          "circle-radius": 7,
          "circle-color": "#2563eb",
          "circle-stroke-color": "#fff",
          "circle-stroke-width": 2,
        },
      });

      map.on("click", "spots-unclustered", (e) => {
        const feature = e.features?.[0] as MapGeoJSONFeature | undefined;
        if (!feature) return;
        const coords =
          feature.geometry.type === "Point"
            ? feature.geometry.coordinates
            : null;
        if (!coords) return;
        const props = feature.properties ?? {};

        // Calculate walking info if destination is set
        let walkingHtml = "";
        const dest = destinationLocationRef.current;
        if (dest) {
          const { distance, minutes } = getWalkingEstimates(
            coords as [number, number],
            dest
          );
          walkingHtml = `
            <div style="margin-top:8px;padding-top:8px;border-top:1px solid #e2e8f0;">
              <div style="font-weight:600;font-size:13px;color:#0f172a;">To Destination:</div>
              <div style="font-size:13px;color:#475569;">
                🚶 ${minutes} min walk (${distance}m)
              </div>
            </div>
          `;
        }

        new maplibregl.Popup()
          .setLngLat(coords as [number, number])
          .setHTML(
            `<div style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.4">
               <div style="font-weight:600;color:#0f172a">${
                 props.type ?? "Parking"
               }</div>
               <div style="color:#475569">${props.city ?? ""}</div>
               ${walkingHtml}
               ${
                 props.timeLimitMinutes
                   ? `<div style="margin-top:4px;color:#1f2937">${props.timeLimitMinutes} min limit</div>`
                   : ""
               }
                ${
                  props.t_mf_9a_6p
                    ? `<div style="margin-top:4px;color:#1f2937">Max Stay: ${props.t_mf_9a_6p}</div>`
                    : ""
                }
                ${
                  props.r_mf_9a_6p
                    ? `<div style="margin-top:4px;color:#475569">Rate: ${props.r_mf_9a_6p}</div>`
                    : ""
                }
                ${
                  props.notes
                    ? `<div style="margin-top:4px;color:#4b5563">${props.notes}</div>`
                    : ""
                }
                ${
                  props.timeineffe
                    ? `<div style="margin-top:4px;font-weight:600;color:#1f2937;font-size:12px">${props.timeineffe}</div>`
                    : ""
                }
                <div style="margin-top:8px;padding-top:8px;border-top:1px solid #e2e8f0;font-size:11px;color:#ef4444;">
                  ⚠️ Check signs for rush hour restrictions
                </div>
                ${
                  props.creditcard === "Yes"
                    ? `<div style="margin-top:4px;color:#16a34a;font-size:12px">Accepts Credit Card</div>`
                    : ""
                }
                <a href="https://www.google.com/maps/dir/?api=1&destination=${
                  coords[1]
                },${
              coords[0]
            }" target="_blank" rel="noopener noreferrer" style="display:block;margin-top:12px;background:#2563eb;color:#fff;text-align:center;padding:8px 12px;border-radius:6px;font-size:13px;font-weight:600;text-decoration:none;">
                  Get Directions
                </a>
             </div>`
          )
          .addTo(map);
      });

      map.on("click", "spots-clusters", (e) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: ["spots-clusters"],
        });
        const clusterId = features[0]?.properties?.cluster_id;
        if (clusterId === undefined) return;
        const source = map.getSource("spots") as maplibregl.GeoJSONSource;
        source
          .getClusterExpansionZoom(clusterId)
          .then((zoom) => {
            if (features[0].geometry.type === "Point") {
              map.easeTo({
                center: features[0].geometry.coordinates as [number, number],
                zoom,
              });
            }
          })
          .catch((err) => {
            console.error("Failed to expand cluster", err);
          });
      });

      map.on("click", "zones-fill", (e) => {
        const feature = e.features?.[0] as MapGeoJSONFeature | undefined;
        if (!feature) return;

        // Calculate walking info if destination is set
        let walkingHtml = "";
        const dest = destinationLocationRef.current;
        if (dest) {
          const { distance, minutes } = getWalkingEstimates(
            [e.lngLat.lng, e.lngLat.lat],
            dest
          );
          walkingHtml = `
            <div style="margin-top:8px;padding-top:8px;border-top:1px solid #e2e8f0;">
              <div style="font-weight:600;font-size:13px;color:#0f172a;">To Destination:</div>
              <div style="font-size:13px;color:#475569;">
                🚶 ${minutes} min walk (${distance}m)
              </div>
            </div>
          `;
        }

        new maplibregl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(
            `<div style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.4">
               <div style="font-weight:600;color:#0f172a">${
                 feature.properties?.type ?? "Zone"
               }</div>
               <div style="color:#475569">${
                 feature.properties?.city ?? ""
               }</div>
               ${walkingHtml}
                ${
                  feature.properties?.notes
                    ? `<div style="margin-top:4px;color:#4b5563">${feature.properties.notes}</div>`
                    : ""
                }
                <a href="https://www.google.com/maps/dir/?api=1&destination=${
                  e.lngLat.lat
                },${
              e.lngLat.lng
            }" target="_blank" rel="noopener noreferrer" style="display:block;margin-top:12px;background:#2563eb;color:#fff;text-align:center;padding:8px 12px;border-radius:6px;font-size:13px;font-weight:600;text-decoration:none;">
                  Get Directions
                </a>
             </div>`
          )
          .addTo(map);
      });

      // Valid click handler for Streets
      map.on("click", "streets-line", (e) => {
        const feature = e.features?.[0] as MapGeoJSONFeature | undefined;
        if (!feature) return;

        const props = feature.properties ?? {};
        const isFree = props.is_free;
        let meterInfos: any[] = [];
        try {
          if (typeof props.meter_infos === "string") {
            meterInfos = JSON.parse(props.meter_infos);
          } else if (Array.isArray(props.meter_infos)) {
            meterInfos = props.meter_infos;
          }
        } catch (e) {
          console.error("Error parsing meter_infos", e);
        }

        let contentHtml = `<div style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.4">`;

        // Header
        contentHtml += `<div style="font-weight:600;font-size:15px;margin-bottom:4px;color:#0f172a">${
          isFree ? "Free Parking" : "Paid / Restricted"
        }</div>`;

        // Street Use / Block info
        contentHtml += `<div style="color:#475569;font-size:12px;margin-bottom:4px;">${
          props.street_use ?? "Street"
        } • Block ${props.block_id ?? "?"}</div>`;

        // Calculate walking info if destination is set
        const dest = destinationLocationRef.current;
        if (dest) {
          const { distance, minutes } = getWalkingEstimates(
            [e.lngLat.lng, e.lngLat.lat],
            dest
          );
          contentHtml += `
            <div style="margin-top:8px;padding-top:8px;border-top:1px solid #e2e8f0;">
              <div style="font-weight:600;font-size:13px;color:#0f172a;">To Destination:</div>
              <div style="font-size:13px;color:#475569;">
                🚶 ${minutes} min walk (${distance}m)
              </div>
            </div>
          `;
        }

        // Meter Infos
        if (meterInfos.length > 0) {
          contentHtml += `<div style="margin-top:8px;font-size:12px;color:#1f2937;font-weight:600">Rates:</div>`;
          meterInfos.forEach((info) => {
            contentHtml += `<div style="color:#4b5563;font-size:12px;margin-top:2px;">• ${
              info.time_in_effect ?? ""
            }: ${info.rate ?? ""}</div>`;
          });
        } else {
          if (isFree) {
            contentHtml += `<div style="margin-top:8px;color:#16a34a;font-size:13px;">Likely free parking (residential/unmetered).</div>`;
          } else {
            contentHtml += `<div style="margin-top:8px;color:#ef4444;font-size:13px;">Restrictions may apply (e.g. No Parking, Arterial). Check signs.</div>`;
          }
        }

        // Warning
        contentHtml += `<div style="margin-top:8px;padding-top:8px;border-top:1px solid #e2e8f0;font-size:11px;color:#ef4444;">
          ⚠️ Verification required. Check local signs.
        </div>`;

        // Directions Button
        contentHtml += `<a href="https://www.google.com/maps/dir/?api=1&destination=${e.lngLat.lat},${e.lngLat.lng}" target="_blank" rel="noopener noreferrer" style="display:block;margin-top:12px;background:#2563eb;color:#fff;text-align:center;padding:8px 12px;border-radius:6px;font-size:13px;font-weight:600;text-decoration:none;">
          Get Directions
        </a>`;

        contentHtml += `</div>`;

        new maplibregl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(contentHtml)
          .addTo(map);
      });

      // Cursor pointer events
      [
        "spots-unclustered",
        "spots-clusters",
        "zones-fill",
        "streets-line",
      ].forEach((layer) => {
        map.on("mouseenter", layer, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", layer, () => {
          map.getCanvas().style.cursor = "";
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

  useEffect(() => {
    // Reload spots when map bounds, filter type, or parking time change.
    // Note: We might want to debounce this or only trigger on specific actions,
    // but for now, reacting to these changes ensures the view is always up to date.
    if (mapRef.current) {
      void loadSpots(mapRef.current);
    }
  }, [filterType, parkingTime]); // Add other dependencies if needed, but loadSpots uses map bounds so it's tricky.
  // Actually, loadSpots gets bounds from main map. The 'moveend' event handles map moves.
  // We need to trigger loadSpots manually when filter/time changes.

  async function loadSpots(map: Map) {
    const bounds = map.getBounds();
    // Using simple query params for API
    const queryParams = new URLSearchParams({
      north: bounds.getNorth().toString(),
      south: bounds.getSouth().toString(),
      east: bounds.getEast().toString(),
      west: bounds.getWest().toString(),
      // limit: "1000", // API has hardcoded limit
    });

    setStatus("loading");
    setError(null);
    try {
      // 1. Fetch Parking Meters & Streets
      const res = await fetch(`/api/parking?${queryParams.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const meters = (data.meters ?? []) as SpotFeature[];
      const streets = (data.streets ?? []) as StreetFeature[];

      // Map Meters to Spots Source (Clusters)
      // Enhance properties for display
      const meterFeatures: SpotFeature[] = meters.map((m: any) => ({
        type: "Feature",
        geometry: m.geom,
        properties: {
          id: m.id,
          city: "Vancouver",
          type: "Meter",
          pay_station_id: m.pay_station_id,
          meter_head: m.meter_head,
          time_in_effect: m.time_in_effect,
          credit_card: m.credit_card,
          // Flattened metadata for MapLibre compatibility
          timeineffe: m.time_in_effect,
          creditcard: m.credit_card ? "Yes" : "No",
          r_mf_9a_6p: m.r_mf_9a_6p,
          t_mf_9a_6p: m.t_mf_9a_6p,
          r_mf_6p_10: m.r_mf_6p_10,
          r_sa_9a_6p: m.r_sa_9a_6p,
          r_su_9a_6p: m.r_su_9a_6p,
        },
      }));

      const currentDateTime = new Date(parkingTimeRef.current);
      const filteredMeterFeatures = meterFeatures.filter((m) => {
        const isActive = isMeterActive(
          m.properties.time_in_effect,
          currentDateTime
        );
        if (filterTypeRef.current === "FREE") {
          // In Free mode, only show Meters that are NOT active (i.e. free right now)
          return !isActive;
        } else {
          // In Paid mode, show Meters that ARE active
          return isActive;
        }
      });

      const source = map.getSource("spots") as
        | maplibregl.GeoJSONSource
        | undefined;
      if (source) {
        source.setData({
          type: "FeatureCollection",
          features: filteredMeterFeatures,
        });
      }
      const meterCount = filteredMeterFeatures.length;

      // Map Streets with Logic
      const streetFeatures: StreetFeature[] = streets.map((s: any) => {
        const meterInfos = s.meter_infos ?? [];
        // Determine if free:
        // 1. No meters -> Free
        // 2. Meters exist but INACTIVE at currentDateTime -> Free
        // 3. Meters exist and ACTIVE -> Paid

        let isFree = false; // Default to Restricted/Paid for non-residential or unknown

        if (meterInfos.length > 0) {
          // Check if ANY meter is active
          const isAnyActive = meterInfos.some((info: any) =>
            isMeterActive(info.time_in_effect, currentDateTime)
          );
          // If meters exist, and none are active, it is Free (Green).
          // If any is active, it is Paid (Red).
          isFree = !isAnyActive;
        } else {
          // No meters. Only Residential streets are likely free.
          // Arterial, Collector, etc defined as 'Red' (Restricted/No Stopping likely)
          if (s.street_use === "Residential") {
            isFree = true;
          }
        }

        return {
          type: "Feature",
          geometry: s.geom,
          properties: {
            id: s.id,
            block_id: s.block_id,
            street_use: s.street_use,
            meter_infos: meterInfos,
            is_free: isFree,
          },
        };
      });

      const streetSource = map.getSource("streets") as
        | maplibregl.GeoJSONSource
        | undefined;
      if (streetSource) {
        streetSource.setData({
          type: "FeatureCollection",
          features: streetFeatures,
        });
      }

      // Count streets based on filter alignment
      const streetCount = streetFeatures.filter((s) => {
        if (filterTypeRef.current === "FREE") {
          return s.properties.is_free === true;
        } else {
          return s.properties.is_free === false;
        }
      }).length;

      setFeatureCounts({ meters: meterCount, streets: streetCount });

      // Also load zones (Legacy/Permit zones if needed, probably distinct from meters)
      // Keeping this fetch but maybe it effectively returns nothing or irrelevant data if tables empty?
      // const zonesRes = await fetch(`/api/parking/zones?bbox=${bbox}...`);
      // Skipping zones for now to focus on Regulation Logic as per plan.

      setStatus("idle");
    } catch (err) {
      console.error("Failed to load spots", err);
      setStatus("error");
      setError((err as Error).message);
    }
  }

  function moveToLocation(center: [number, number], zoom = 16) {
    const map = mapRef.current;
    if (!map) return;
    map.easeTo({ center, zoom });
  }

  function openTimePicker() {
    const input = timeInputRef.current;
    if (!input) return;
    if ("showPicker" in input && typeof input.showPicker === "function") {
      input.showPicker();
    } else {
      input.focus();
    }
  }

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const source = map.getSource("user-location") as
      | maplibregl.GeoJSONSource
      | undefined;
    if (!source) return;
    const data: FeatureCollection<Point> = userLocation
      ? {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: { type: "Point", coordinates: userLocation },
              properties: {},
            },
          ],
        }
      : { type: "FeatureCollection", features: [] };
    source.setData(data);
  }, [userLocation]);

  function handleUseMyLocation() {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }
    setSearchQuery("");
    setShowCurrentLocationPlaceholder(true);
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        setError(null);
        const coords: [number, number] = [
          pos.coords.longitude,
          pos.coords.latitude,
        ];
        setUserLocation(coords);
        setShowCurrentLocationPlaceholder(true);
        moveToLocation(coords);
      },
      (err) => {
        setIsLocating(false);
        setShowCurrentLocationPlaceholder(false);
        setUserLocation(null);
        setError(err.message || "Unable to get your location.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;
    setShowCurrentLocationPlaceholder(false);
    setIsSearching(true);
    setError(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          query
        )}&format=json&limit=1`
      );
      if (!res.ok) throw new Error(`Search failed (HTTP ${res.status})`);
      const results = (await res.json()) as Array<{
        lat: string;
        lon: string;
        display_name: string;
      }>;
      if (!results.length) throw new Error(`No results for "${query}".`);
      const { lat, lon } = results[0];
      const coords: [number, number] = [parseFloat(lon), parseFloat(lat)];
      setUserLocation(null);
      setDestinationLocation(coords); // Set the destination
      moveToLocation(coords);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div className="relative bg-black text-white h-full w-full">
      <div ref={containerRef} className="h-full w-full" />

      {/* Destination Marker (Hidden visual, logic only, or we could add a marker later) */}

      {/* Help Button - Bottom Right above Map Controls */}
      <div className="absolute bottom-40 right-2.5 z-10">
        <button
          onClick={() => setIsHelpOpen(true)}
          className="flex h-[29px] w-[29px] items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          title="How to use"
          aria-label="How to use"
        >
          <span className="text-sm font-bold">?</span>
        </button>
      </div>

      <div className="pointer-events-none absolute top-0 left-0 right-0 flex justify-center px-4 pt-4">
        <div className="pointer-events-auto w-full max-w-3xl">
          <form
            onSubmit={handleSearch}
            className="flex w-full items-center gap-3 rounded-full border border-black/5 bg-white text-slate-900 shadow-[0_4px_14px_rgba(0,0,0,0.18)] ring-1 ring-black/5 transition focus-within:ring-2 focus-within:ring-blue-500/70"
          >
            <div className="pl-4 text-slate-500">
              <Search className="h-4 w-4" aria-hidden="true" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                const value = e.target.value;
                setSearchQuery(value);
                if (value) setShowCurrentLocationPlaceholder(false);
              }}
              placeholder={
                showCurrentLocationPlaceholder
                  ? "Current location"
                  : "Search for an address or place"
              }
              className="w-full bg-transparent py-3 pr-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none"
            />
            <button
              type="button"
              onClick={handleUseMyLocation}
              className={`mr-2 inline-flex h-10 w-10 items-center justify-center rounded-full border shadow-[0_2px_8px_rgba(0,0,0,0.12)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:opacity-70 ${
                showCurrentLocationPlaceholder || isLocating
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
              }`}
              title="Use current location"
              aria-label="Use current location"
              disabled={isLocating}
            >
              {isLocating ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <LocateFixed className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </form>
          <div className="mt-3 w-full">
            <div className="flex w-full flex-wrap items-center gap-3 sm:flex-nowrap">
              <label className="relative inline-flex cursor-pointer shrink-0">
                <div className="flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-slate-800 shadow ring-1 ring-black/5">
                  <span className="text-slate-500">Start parking</span>
                  <span className="text-slate-900">
                    {formatDisplayDate(parkingTime, isCustomTime)}
                  </span>
                </div>
                <input
                  ref={timeInputRef}
                  type="datetime-local"
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  value={parkingTime}
                  step={300}
                  onClick={openTimePicker}
                  onChange={(e) => {
                    setParkingTime(e.target.value);
                    setIsCustomTime(true);
                  }}
                  aria-label="Select start parking time"
                />
              </label>
              <div className="flex flex-1 items-center gap-2 min-w-[200px]">
                <button
                  type="button"
                  onClick={() => setFilterType("FREE")}
                  className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold shadow ring-1 ring-black/5 ${
                    filterType === "FREE"
                      ? "bg-white text-blue-600"
                      : "bg-white/80 text-slate-600 hover:bg-white"
                  }`}
                  aria-pressed={filterType === "FREE"}
                >
                  Free
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType("PAID")}
                  className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold shadow ring-1 ring-black/5 ${
                    filterType === "PAID"
                      ? "bg-white text-blue-600"
                      : "bg-white/80 text-slate-600 hover:bg-white"
                  }`}
                  aria-pressed={filterType === "PAID"}
                >
                  Paid
                </button>
              </div>
            </div>
          </div>
          <div className="mt-3 flex justify-center">
            <div className="rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-slate-800 shadow">
              {filterType === "FREE" ? "Free parking" : "Paid parking"}
              {status === "loading" || isSearching
                ? " · Loading…"
                : ` · ${
                    featureCounts.meters > 0
                      ? `${featureCounts.meters} spots`
                      : ""
                  }${
                    featureCounts.meters > 0 && featureCounts.streets > 0
                      ? " · "
                      : ""
                  }${
                    featureCounts.streets > 0
                      ? `${featureCounts.streets} blocks`
                      : ""
                  }${
                    featureCounts.meters === 0 && featureCounts.streets === 0
                      ? "None found"
                      : ""
                  }`}
            </div>
          </div>
          {error ? (
            <div className="mt-2 flex justify-center">
              <div className="rounded-full bg-red-600/90 px-4 py-2 text-sm font-medium text-white shadow">
                Error: {error}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Help Modal */}
      {isHelpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md animate-in fade-in zoom-in-95 rounded-2xl bg-white p-6 text-slate-900 shadow-2xl">
            <h2 className="mb-4 text-xl font-bold text-slate-900">
              How to Find Free Parking
            </h2>
            <div className="space-y-4 text-sm leading-relaxed">
              <div className="rounded-lg bg-yellow-50 p-3 border border-yellow-200">
                <div className="flex items-center gap-2 font-bold text-yellow-800">
                  <span>🚧 Under Development</span>
                </div>
                <p className="mt-1 text-yellow-700">
                  This site is currently in <strong>Beta</strong>. Features and
                  data might change. We are actively adding new cities and
                  features.
                </p>
              </div>

              <p>
                We show you where you can park <strong>right now</strong> based
                on real-time regulations.
              </p>

              <div className="rounded-lg bg-green-50 p-3">
                <div className="flex items-center gap-2 font-semibold text-green-700">
                  <div className="h-3 w-3 rounded-full bg-green-500"></div>
                  <span>Green Points (Meters)</span>
                </div>
                <p className="mt-1 text-slate-600">
                  Meters that are <strong>currently inactive</strong> (FREE).
                  <br />
                  <span className="font-semibold text-amber-600">
                    ⚠️ Important:
                  </span>{" "}
                  Check signs for Rush Hour restriction (e.g. 7-9AM, 3-6PM).
                </p>
              </div>

              <div className="rounded-lg bg-green-50 p-3">
                <div className="flex items-center gap-2 font-semibold text-green-700">
                  <div className="h-1 w-6 rounded-full bg-green-400"></div>
                  <span>Green Lines (Streets)</span>
                </div>
                <p className="mt-1 text-slate-600">
                  Residential streets with no meters.
                  <br />
                  <span className="font-semibold text-amber-600">
                    ⚠️ Note:
                  </span>{" "}
                  Often requires a Resident Permit or has a 2-3 hour limit for
                  visitors. Check signs!
                </p>
              </div>

              <div className="rounded-lg bg-red-50 p-3">
                <div className="flex items-center gap-2 font-semibold text-red-700">
                  <div className="h-1 w-6 rounded-full bg-red-500"></div>
                  <span>Red Lines / Dots</span>
                </div>
                <p className="mt-1 text-slate-600">
                  Paid meters or restricted zones (Arterial roads, etc).
                </p>
              </div>

              <div className="mt-4 border-t border-slate-100 pt-4 text-xs text-slate-500">
                <p>
                  <strong>Disclaimer:</strong> This app uses open data from
                  municipal sources. Regulations can change. Data might be
                  incorrect or outdated. Always verify with local signs. Use
                  strictly at your own risk.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dontShowHelp}
                  onChange={(e) => setDontShowHelp(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Don't show this again
              </label>

              <button
                onClick={handleCloseHelp}
                className="w-full rounded-full bg-blue-600 py-2.5 font-semibold text-white shadow-lg transition hover:bg-blue-700 active:scale-95"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function isMeterActive(
  timeInEffect: string | undefined,
  currentDateTime: Date
): boolean {
  if (!timeInEffect) return false; // Assume inactive if missing (or maybe 24/7? Safe default is Paid=True, but missing usually means no data)
  // Format: "9:00 AM TO 10:00 PM"
  // Also "METER IN EFFECT: 9:00 AM TO 10:00 PM"

  // Normalize
  const str = timeInEffect.toUpperCase().replace("METER IN EFFECT:", "").trim();

  // Regex for time range
  const rangeMatch = str.match(
    /(\d{1,2}):(\d{2})\s*(AM|PM)\s*TO\s*(\d{1,2}):(\d{2})\s*(AM|PM)/
  );
  if (!rangeMatch) return true; // Fail safe: assume active if parse fails

  const [_, h1, m1, ap1, h2, m2, ap2] = rangeMatch;

  // Convert to minutes from midnight
  const getMinutes = (h: string, m: string, ap: string) => {
    let hour = parseInt(h, 10);
    const minute = parseInt(m, 10);
    if (ap === "PM" && hour !== 12) hour += 12;
    if (ap === "AM" && hour === 12) hour = 0;
    return hour * 60 + minute;
  };

  const start = getMinutes(h1, m1, ap1);
  const end = getMinutes(h2, m2, ap2);

  const currentMinutes =
    currentDateTime.getHours() * 60 + currentDateTime.getMinutes();

  // Check range
  // Usually start < end (e.g. 9AM to 10PM)
  if (start <= end) {
    return currentMinutes >= start && currentMinutes <= end;
  } else {
    // Overnight? (e.g. 6PM to 2AM)
    return currentMinutes >= start || currentMinutes <= end;
  }
}
