"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import * as maplibregl from "maplibre-gl";
import { Map, MapGeoJSONFeature } from "maplibre-gl";
import { checkCoverage } from "@/app/actions/coverage";
import { submitCoverageRequest } from "@/app/actions/request-coverage";
import { LocateFixed, Loader2, Search } from "lucide-react";
import { FormEvent, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import type { FeatureCollection, Point } from "geojson";
import ReportModal from "@/components/ReportModal";
import HelpModal from "@/components/HelpModal";
import CoverageBanner from "@/components/CoverageBanner";
import { useLocale, useTranslations } from "next-intl";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { classifyParking, isVisibleInParkingView } from "@/lib/parking-classification";

maplibregl.setWorkerUrl(
  new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href
);

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

function popupElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  style: string,
  text?: unknown
) {
  const element = document.createElement(tag);
  element.style.cssText = style;
  if (text !== undefined) element.textContent = String(text ?? "");
  return element;
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

type MeterRow = {
  id: string;
  geom: SpotFeature["geometry"];
  pay_station_id?: string;
  meter_head?: string;
  schedules?: unknown;
  driver_warnings?: unknown;
  raw_data?: Record<string, string> | string;
};
type StreetRow = {
  id: string;
  geom: { type: "LineString"; coordinates: [number, number][] };
  block_id: string;
  street_use: string;
  driver_warnings?: unknown;
};

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
    report_counts?: string | Record<string, number>;
    classification?: string;
    driver_warnings?: unknown;
    schedules?: string | any[]; // JSONB
  };
};

type ZoneFeature = {
  type: "Feature";
  geometry: { type: "Polygon" | "MultiPolygon"; coordinates: any };
  properties: {
    id: string;
    city: string;
    name?: string | null;
    type: string;
    timeLimitMinutes?: number | null;
    notes?: string | null;
    metadata?: any;
    classification?: string;
  };
};

type StreetFeature = {
  type: "Feature";
  geometry: { type: "LineString"; coordinates: [number, number][] };
  properties: {
    id: string;
    block_id: string;
    street_use: string;
    meter_infos?: string | any[];
    classification?: string;
    driver_warnings?: unknown;
    report_counts?: string | Record<string, number>;
    schedules?: string | any[];
  };
};

interface MainMapProps {
  initialCenter?: [number, number];
  initialZoom?: number;
  cityName?: string;
}

export default function MainMap({
  initialCenter,
  initialZoom,
  cityName,
}: MainMapProps) {
  const t = useTranslations("HomePage");
  const locale = useLocale();
  const initialCenterRef = useRef(initialCenter);
  const mapRef = useRef<Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [featureCounts, setFeatureCounts] = useState({
    meters: 0,
    streets: 0,
    zones: 0,
    unknown: 0,
  });
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

  // Coverage check state
  const [showCoverageBanner, setShowCoverageBanner] = useState(false);
  const [coverageDismissed, setCoverageDismissed] = useState(false);

  // Destination state (from search)
  const [destinationLocation, setDestinationLocation] = useState<
    [number, number] | null
  >(null);

  const destinationLocationRef = useRef<[number, number] | null>(null);

  // Reporting state
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportTargetId, setReportTargetId] = useState<string | null>(null);
  const [reportTargetType, setReportTargetType] = useState<
    "METER" | "STREET" | "ZONE" | null
  >(null);
  const [reportDefaultStatus, setReportDefaultStatus] = useState<
    "FREE" | "PAID"
  >("FREE");

  // Refs for map event listeners to avoid stale closures
  const filterTypeRef = useRef(filterType);
  const parkingTimeRef = useRef(parkingTime);
  const isCustomTimeRef = useRef(isCustomTime);
  const loadSpotsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Incremented on every loadSpots call so slower, older responses
  // cannot overwrite the results of a newer request.
  const loadSpotsRequestIdRef = useRef(0);

  useEffect(() => {
    filterTypeRef.current = filterType;
    parkingTimeRef.current = parkingTime;
    isCustomTimeRef.current = isCustomTime;
    destinationLocationRef.current = destinationLocation;
  }, [filterType, parkingTime, isCustomTime, destinationLocation]);

  // When the user has not picked a time, "now" must mean the current time,
  // not the time the page was first loaded.
  function getEffectiveParkingTime() {
    return isCustomTimeRef.current
      ? new Date(parkingTimeRef.current)
      : new Date();
  }

  useEffect(() => {
    // Check local storage on mount
    const seen = localStorage.getItem("find-free-parking-help-seen");
    if (seen !== "true") {
      setIsHelpOpen(true);
    }
    const coverageSeen = sessionStorage.getItem("coverage-banner-dismissed");
    if (coverageSeen === "true") {
      setCoverageDismissed(true);
    }

    // Auto-locate on load without blocking UI
    // We do this silently (visualizePitch: false logic?) or just reuse handleUseMyLocation
    // But handleUseMyLocation sets 'isLocating' spinner. That is fine.
    if (!initialCenterRef.current) handleUseMyLocation(true);

    // Event listener for report modal
    const handleReportEvent = (e: CustomEvent) => {
      console.log("Opening report modal for", e.detail);
      setReportTargetId(e.detail.id);
      setReportTargetType(e.detail.type);
      setReportDefaultStatus(e.detail.status || "FREE");
      setReportModalOpen(true);
    };

    window.addEventListener(
      "open-report-modal" as any,
      handleReportEvent as any
    );
    return () => {
      window.removeEventListener(
        "open-report-modal" as any,
        handleReportEvent as any
      );
    };
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

  function appendWalkingInfo(content: HTMLElement, coords: [number, number]) {
    const dest = destinationLocationRef.current;
    if (!dest) return;
    const { distance, minutes } = getWalkingEstimates(coords, dest);
    const walking = popupElement(
      "div",
      "margin-top:8px;padding-top:8px;border-top:1px solid #e2e8f0;"
    );
    walking.append(
      popupElement(
        "div",
        "font-weight:600;font-size:13px;color:#0f172a;",
        t("toDestination")
      ),
      popupElement(
        "div",
        "font-size:13px;color:#475569;",
        `🚶 ${t("walkEstimates", { minutes, distance })}`
      )
    );
    content.append(walking);
  }

  const appendDriverWarnings = useEffectEvent((content: HTMLElement, raw: unknown) => {
    let warnings = raw;
    if (typeof warnings === "string") {
      try { warnings = JSON.parse(warnings); } catch { return; }
    }
    if (!Array.isArray(warnings)) return;
    const statuses: Record<string, string> = {
      FREE: t("free"), PAID: t("paid"), NO_PARKING: t("noParkingReported"),
    };
    for (const warning of warnings) {
      if (!warning || typeof warning !== "object" || !statuses[warning.status]) continue;
      const date = new Date(warning.latest_at);
      if (!Number.isFinite(date.getTime())) continue;
      content.append(popupElement("div", "margin-top:8px;color:#92400e;font-size:12px;",
        t("driverWarning", { status: statuses[warning.status], count: warning.count,
          date: date.toLocaleDateString(locale) })));
    }
  });

  function appendPopupControls(
    content: HTMLElement,
    coords: [number, number],
    id: unknown,
    type: "METER" | "ZONE" | "STREET",
    status: "FREE" | "PAID"
  ) {
    const directions = popupElement(
      "a",
      "display:block;margin-top:12px;background:#2563eb;color:#fff;text-align:center;padding:8px 12px;border-radius:6px;font-size:13px;font-weight:600;text-decoration:none;",
      t("getDirections")
    );
    directions.href = `https://www.google.com/maps/dir/?api=1&destination=${coords[1]},${coords[0]}`;
    directions.target = "_blank";
    directions.rel = "noopener noreferrer";
    const report = popupElement(
      "button",
      "display:block;width:100%;margin-top:8px;background:#f1f5f9;color:#475569;text-align:center;padding:8px 12px;border:1px solid #cbd5e1;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;",
      t("updateStatus")
    );
    report.type = "button";
    report.addEventListener("click", () => {
      window.dispatchEvent(
        new CustomEvent("open-report-modal", {
          detail: { id: String(id ?? ""), type, status },
        })
      );
    });
    content.append(directions, report);
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
    const fallbackStyle: ReturnType<Map["getStyle"]> = {
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
      center: initialCenter || DEFAULT_CENTER,
      zoom: initialZoom || DEFAULT_ZOOM,
      minZoom: MIN_ZOOM,
      attributionControl: false,
    });

    // Leave room for the search, city Coverage label, filters and counts.
    map.setPadding({ top: 260 });

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
        promoteId: "id",
      });

      map.addLayer({
        id: "zones-fill",
        type: "fill",
        source: "zones",
        paint: {
          "fill-color": [
            "match",
            ["get", "classification"],
            "FREE",
            "#16a34a",
            "PAID",
            "#ef4444",
            "#94a3b8", // Default gray
          ],
          "fill-opacity": 0.4,
        },
      });
      map.addLayer({
        id: "zones-line",
        type: "line",
        source: "zones",
        paint: {
          "line-color": [
            "match",
            ["get", "classification"],
            "FREE",
            "#15803d",
            "PAID",
            "#b91c1c",
            "#64748b",
          ],
          "line-width": 2,
        },
      });

      // Streets Outline Layer (Background for contrast)
      map.addLayer({
        id: "streets-line-outline",
        type: "line",
        source: "streets",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#ffffff",
          "line-width": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            8, // Outline width when hovered
            6, // Normal outline width (4px line + 1px border)
          ],
          "line-opacity": 1,
        },
      });

      // Streets Layer (Main)
      map.addLayer({
        id: "streets-line",
        type: "line",
        source: "streets",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": ["match", ["get", "classification"], "FREE", "#00A651", "PAID", "#DC2626", "#64748b"],
          "line-dasharray": ["case", ["==", ["get", "classification"], "UNKNOWN"], ["literal", [2, 2]], ["literal", [1, 0]]],
          "line-width": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            6, // Width when hovered
            4, // Normal width
          ],
          "line-opacity": 1.0,
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
          "circle-color": ["match", ["get", "classification"], "FREE", "#16a34a", "PAID", "#DC2626", "#64748b"],
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

        const content = popupElement(
          "div",
          "font-family:system-ui,sans-serif;font-size:14px;line-height:1.4"
        );
        content.append(
          popupElement(
            "div",
            "font-weight:600;color:#0f172a",
            props.classification === "PAID" ? t("paymentListed") : t("unknown")
          ),
          popupElement(
            "div",
            "color:#475569",
            props.location_desc ?? props.city ?? ""
          )
        );
        appendWalkingInfo(content, coords as [number, number]);
        if (props.timeLimitMinutes) {
          content.append(
            popupElement(
              "div",
              "margin-top:4px;color:#1f2937",
              t("timeLimitLabel", { minutes: props.timeLimitMinutes })
            )
          );
        }

        // Parse schedules if generic data
        let schedules = [];
        try {
          if (typeof props.schedules === "string") {
            schedules = JSON.parse(props.schedules);
          } else if (Array.isArray(props.schedules)) {
            schedules = props.schedules;
          }
        } catch (e) {
          /* ignore */
        }
        if (schedules.length > 0) {
          content.append(
            popupElement(
              "div",
              "margin-top:8px;font-size:12px;color:#1f2937;font-weight:600",
              "Rates:"
            )
          );
          schedules.forEach((s: any) => {
            const days = Array.isArray(s.days) ? s.days.join(", ") : s.days;
            const rateDisplay = s.rate
              ? `$${parseFloat(s.rate).toFixed(2)}/hr`
              : t("unknown");
            const rule = popupElement(
              "div",
              "color:#4b5563;font-size:12px;margin-top:2px;"
            );
            const day = popupElement("span", "", `📅 ${days ?? ""}`);
            const hours = popupElement(
              "span",
              "",
              `⏱ ${s.start ?? ""} - ${s.end ?? ""}: `
            );
            rule.append(
              day,
              document.createElement("br"),
              hours,
              popupElement("b", "", rateDisplay)
            );
            content.append(rule);
          });
        } else if (props.rate) {
          content.append(
            popupElement(
              "div",
              "margin-top:4px;color:#475569",
              t("rate", { rate: props.rate })
            )
          );
        }
        if (props.notes) {
          content.append(
            popupElement("div", "margin-top:4px;color:#4b5563", props.notes)
          );
        }
        appendDriverWarnings(content, props.driver_warnings);
        content.append(
          popupElement(
            "div",
            "margin-top:8px;padding-top:8px;border-top:1px solid #e2e8f0;font-size:11px;color:#ef4444;",
            t("unknownGuidance")
          )
        );
        appendPopupControls(
          content,
          coords as [number, number],
          props.id,
          "METER",
          filterTypeRef.current
        );
        new maplibregl.Popup()
          .setLngLat(coords as [number, number])
          .setDOMContent(content)
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

        const props = feature.properties ?? {};
        const content = popupElement(
          "div",
          "font-family:system-ui,sans-serif;font-size:14px;line-height:1.4"
        );
        content.append(
          popupElement("div", "font-weight:600;font-size:15px;color:#0f172a", props.name || t("parkingLot")),
          popupElement("div", "margin-top:4px;color:#64748b", t("unknown")),
          popupElement("div", "margin-top:8px;color:#475569", t("unverifiedLot")),
          popupElement("div", "margin-top:8px;color:#475569", t("unknownGuidance"))
        );
        appendWalkingInfo(content, [e.lngLat.lng, e.lngLat.lat]);
        appendDriverWarnings(content, props.driver_warnings);
        appendPopupControls(
          content,
          [e.lngLat.lng, e.lngLat.lat],
          props.id,
          "ZONE",
          "PAID"
        );
        new maplibregl.Popup()
          .setLngLat(e.lngLat)
          .setDOMContent(content)
          .addTo(map);
      });

      // Valid click handler for Streets
      map.on("click", "streets-line", (e) => {
        const feature = e.features?.[0] as MapGeoJSONFeature | undefined;
        if (!feature) return;

        const props = feature.properties ?? {};
        const content = popupElement(
          "div",
          "font-family:system-ui,sans-serif;font-size:14px;line-height:1.4"
        );
        content.append(
          popupElement("div", "font-weight:600;font-size:15px;color:#0f172a", t("unknown")),
          popupElement("div", "color:#475569;font-size:12px", props.block_id ?? t("unknownLocation")),
          popupElement("div", "margin-top:8px;color:#475569", t("unknownGuidance"))
        );
        appendWalkingInfo(content, [e.lngLat.lng, e.lngLat.lat]);
        appendDriverWarnings(content, props.driver_warnings);
        appendPopupControls(
          content,
          [e.lngLat.lng, e.lngLat.lat],
          props.id,
          "STREET",
          "PAID"
        );
        new maplibregl.Popup()
          .setLngLat(e.lngLat)
          .setDOMContent(content)
          .addTo(map);
      });

      // Interactive hover effect for streets
      let hoveredStreetId: string | number | null = null;

      map.on("mousemove", "streets-line", (e) => {
        map.getCanvas().style.cursor = "pointer";
        if (e.features && e.features.length > 0) {
          if (hoveredStreetId !== null) {
            map.setFeatureState(
              { source: "streets", id: hoveredStreetId },
              { hover: false }
            );
          }
          hoveredStreetId = e.features[0].id ?? null;
          if (hoveredStreetId !== null) {
            map.setFeatureState(
              { source: "streets", id: hoveredStreetId },
              { hover: true }
            );
          }
        }
      });

      map.on("mouseleave", "streets-line", () => {
        map.getCanvas().style.cursor = "";
        if (hoveredStreetId !== null) {
          map.setFeatureState(
            { source: "streets", id: hoveredStreetId },
            { hover: false }
          );
        }
        hoveredStreetId = null;
      });

      // Cursor pointer events for other layers
      ["spots-unclustered", "spots-clusters", "zones-fill"].forEach((layer) => {
        map.on("mouseenter", layer, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", layer, () => {
          map.getCanvas().style.cursor = "";
        });
      });

      map.on("moveend", () => {
        if (loadSpotsTimeoutRef.current) {
          clearTimeout(loadSpotsTimeoutRef.current);
        }
        loadSpotsTimeoutRef.current = setTimeout(() => {
          void loadSpots(map);
        }, 700);
      });

      // Initial load
      void loadSpots(map);
    });

    map.on("error", (e) => {
      console.error("Map error", e.error);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      if (loadSpotsTimeoutRef.current) {
        clearTimeout(loadSpotsTimeoutRef.current);
      }
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

  // Helper to ensure MapLibre only gets primitives
  const sanitizeFeatureProperties = (props: Record<string, any>) => {
    const clean: Record<string, any> = {};
    Object.keys(props).forEach((key) => {
      const val = props[key];
      if (val === null || val === undefined) return;
      if (typeof val === "object") {
        clean[key] = JSON.stringify(val);
      } else {
        clean[key] = val;
      }
    });
    return clean;
  };

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

    const requestId = ++loadSpotsRequestIdRef.current;
    const isStale = () => requestId !== loadSpotsRequestIdRef.current;

    setStatus("loading");
    setError(null);
    try {
      // 1. Fetch Parking Meters & Streets
      const res = await fetch(`/api/parking?${queryParams.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (isStale()) return;

      const meters = (data.meters ?? []) as MeterRow[];
      const streets = (data.streets ?? []) as StreetRow[];

      // Map Meters to Spots Source (Clusters)
      // Enhance properties for display
      const currentDateTime = getEffectiveParkingTime();

      // --- Process Meters ---
      // 1. Filter raw meters based on logic
      const filteredMeters = meters.map((m) => ({
        ...m,
        classification: classifyParking("METER", m, currentDateTime),
      })).filter((m) => isVisibleInParkingView(m.classification, filterTypeRef.current));

      // 2. Map valid meters to features (Sanitize properties)
      const meterFeatures: SpotFeature[] = filteredMeters.map((m) => {
        let raw: Record<string, string> = {};
        // If raw_data came as string (unlikely with pg jsonb but possible in some adapters), parse it
        if (typeof m.raw_data === "string") {
          try {
            raw = JSON.parse(m.raw_data);
          } catch { /* Unparsed source text cannot establish permission. */ }
        } else raw = m.raw_data || {};

        return {
          type: "Feature",
          geometry: m.geom,
          properties: sanitizeFeatureProperties({
            id: m.id,
            city: raw.city || "Unknown City",
            type: "Meter",
            pay_station_id: m.pay_station_id,
            meter_head: m.meter_head,
            driver_warnings: m.driver_warnings,
            schedules: m.schedules,
            classification: m.classification,
            notes: raw.payment_info, // Use payment info as notes/subtitle context
            location_desc: raw.on_street, // Capture street name if available
          }) as any,
        };
      });

      const map = mapRef.current;
      if (!map) return;

      const source = map.getSource("spots") as
        | maplibregl.GeoJSONSource
        | undefined;
      if (source) {
        source.setData({
          type: "FeatureCollection",
          features: meterFeatures,
        });
      }
      const meterCount = filteredMeters.filter((m) => m.classification === filterTypeRef.current).length;
      let unknownCount = filteredMeters.filter((m) => m.classification === "UNKNOWN").length;

      // Nearby meters and road categories do not establish a street rule.
      const filteredStreets = streets.map((s) => ({
        ...s,
        classification: classifyParking("STREET", s, currentDateTime),
      })).filter((s) => isVisibleInParkingView(s.classification, filterTypeRef.current));
      const streetFeatures: StreetFeature[] = filteredStreets.map((s) => ({
        type: "Feature",
        geometry: s.geom,
        properties: sanitizeFeatureProperties({
          id: s.id,
          block_id: s.block_id,
          street_use: s.street_use,
          classification: s.classification,
          driver_warnings: s.driver_warnings,
        }) as StreetFeature["properties"],
      }));

      const streetSource = map.getSource("streets") as
        | maplibregl.GeoJSONSource
        | undefined;

      if (streetSource) {
        streetSource.setData({
          type: "FeatureCollection",
          features: streetFeatures,
        });
      }
      const streetCount = filteredStreets.filter((s) => s.classification === filterTypeRef.current).length;
      unknownCount += filteredStreets.filter((s) => s.classification === "UNKNOWN").length;

      let zoneCount = 0;

      // 2. Fetch Parking Zones (Lots)
      const bboxParam = `${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()}`;
      const zonesRes = await fetch(
        `/api/parking/zones?bbox=${bboxParam}&limit=200`
      );
      if (isStale()) return;
      if (zonesRes.ok) {
        const zonesData = await zonesRes.json();
        if (isStale()) return;
        const zonesSource = map.getSource("zones") as
          | maplibregl.GeoJSONSource
          | undefined;
        if (zonesSource) {
          const rawFeatures = zonesData.features ?? [];
          const zoneFeatures = rawFeatures.map((f: ZoneFeature) => ({
            ...f,
            properties: sanitizeFeatureProperties({
              ...f.properties,
              classification: classifyParking("ZONE", f.properties, currentDateTime),
            }),
          }));

          zonesSource.setData({
            type: "FeatureCollection",
            features: zoneFeatures,
          });
          zoneCount = zoneFeatures.filter((f: ZoneFeature) => f.properties.classification === filterTypeRef.current).length;
          unknownCount += zoneFeatures.filter((f: ZoneFeature) => f.properties.classification === "UNKNOWN").length;
        }
      }

      setFeatureCounts({
        meters: meterCount,
        streets: streetCount,
        zones: zoneCount,
        unknown: unknownCount,
      });

      setStatus("idle");
    } catch (err) {
      if (isStale()) return;
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

  function handleUseMyLocation(isInitial = false) {
    if (!navigator.geolocation) {
      if (!isInitial) setError("Geolocation is not supported by your browser.");
      return;
    }
    setSearchQuery("");
    if (!isInitial) setShowCurrentLocationPlaceholder(true);
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsLocating(false);
        setError(null);
        const coords: [number, number] = [
          pos.coords.longitude,
          pos.coords.latitude,
        ];
        setUserLocation(coords);
        setShowCurrentLocationPlaceholder(true);
        moveToLocation(coords);

        // Check coverage
        if (!coverageDismissed) {
          try {
            const result = await checkCoverage();
            if (!result.isCovered) {
              setShowCoverageBanner(true);
            } else {
              setShowCoverageBanner(false);
            }
          } catch (e) {
            console.error("Coverage check failed", e);
          }
        }
      },
      (err) => {
        setIsLocating(false);
        // On initial load, silent fail if denied. On explicit click, show error.
        if (!isInitial) {
          setShowCurrentLocationPlaceholder(false);
          setUserLocation(null);
          setError(err.message || "Unable to get your location.");
        } else {
          setShowCurrentLocationPlaceholder(false);
        }
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
      <div className="absolute bottom-28 right-2.5 z-10">
        <button
          onClick={() => setIsHelpOpen(true)}
          className="flex h-[29px] w-[29px] items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          title="How to use"
          aria-label="How to use"
        >
          <span className="text-sm font-bold">?</span>
        </button>
      </div>

      <div className="absolute top-4 right-4 z-20 hidden md:block">
        <LanguageSwitcher />
      </div>

      {/* Language Switcher - Bottom Right (Mobile) */}
      <div className="absolute bottom-36 right-2.5 z-10 md:hidden">
        <LanguageSwitcher />
      </div>

      <div className="pointer-events-none absolute top-0 left-0 right-0 flex justify-center px-4 pt-4">
        <div className="pointer-events-auto w-full max-w-3xl">
          <form
            onSubmit={handleSearch}
            className="flex w-full items-center gap-3 rounded-full border border-slate-200 bg-white text-slate-900 shadow-[0_8px_30px_rgb(0,0,0,0.12)] ring-1 ring-black/5 transition focus-within:ring-2 focus-within:ring-blue-500/70"
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
                  ? t("useMyLoc")
                  : t("searchPlaceholder")
              }
              className="w-full bg-transparent py-3 pr-2 text-sm text-slate-900 placeholder:text-slate-500 outline-none"
            />
            <button
              type="button"
              onClick={() => handleUseMyLocation(false)}
              className={`mr-2 inline-flex h-10 w-10 items-center justify-center rounded-full border shadow-[0_2px_8px_rgba(0,0,0,0.12)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:opacity-70 ${
                showCurrentLocationPlaceholder || isLocating
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
              }`}
              title={t("useMyLoc")}
              aria-label={t("useMyLoc")}
              disabled={isLocating}
            >
              {isLocating ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <LocateFixed className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </form>
          {cityName ? <p className="mt-2 rounded-lg bg-slate-900/90 px-3 py-2 text-sm text-white">{t("cityNotCovered", { city: cityName })}</p> : null}
          <div className="mt-3 w-full">
            <div className="flex w-full items-center gap-2 overflow-x-auto no-scrollbar">
              <label className="relative inline-flex cursor-pointer shrink-0">
                <div className="flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-slate-800 shadow ring-1 ring-black/5">
                  <span className="text-slate-500">{t("startParking")}</span>
                  <span className="text-slate-900">
                    {isCustomTime
                      ? formatDisplayDate(parkingTime, true)
                      : t("now")}
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
              <div className="flex flex-1 items-center gap-2 min-w-[140px]">
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
                  {t("free")}
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
                  {t("paid")}
                </button>
              </div>
            </div>
          </div>
          <div className="mt-3 flex justify-center">
            <div className="rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-slate-800 shadow">
              {filterType === "FREE" ? t("freeParking") : t("paidParking")}
              {status === "loading" || isSearching
                ? ` · ${t("loading")}`
                : ` · ${
                    [
                      featureCounts.meters > 0
                        ? t("spots", { count: featureCounts.meters })
                        : null,
                      featureCounts.streets > 0
                        ? t("blocks", { count: featureCounts.streets })
                        : null,
                      featureCounts.zones > 0
                        ? t("lots", { count: featureCounts.zones })
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || t("noneFound")
                  }`}
              {featureCounts.unknown > 0 ? ` · ${t("unknownCount", { count: featureCounts.unknown })}` : ""}
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

      {/* Coverage Banner */}
      <CoverageBanner
        isVisible={showCoverageBanner && !coverageDismissed}
        onDismiss={() => {
          setShowCoverageBanner(false);
          setCoverageDismissed(true);
          sessionStorage.setItem("coverage-banner-dismissed", "true");
        }}
        onRequest={() => {
          // If we have user location, try to request coverage
          if (userLocation) {
            // Need async handler
            const request = async () => {
              try {
                // Reverse geocode to get city details
                const res = await fetch(
                  `https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLocation[1]}&lon=${userLocation[0]}`
                );
                if (!res.ok) return;
                const data = await res.json();
                const address = data.address || {};

                await submitCoverageRequest({
                  city:
                    address.city ||
                    address.town ||
                    address.village ||
                    address.hamlet ||
                    "Unknown",
                  state: address.state,
                  country: address.country || "Unknown",
                  latitude: userLocation[1],
                  longitude: userLocation[0],
                });

                // Done - simple alert or just dismiss
                alert("Thanks! We've recorded your interest in this area.");
                setShowCoverageBanner(false);
                setCoverageDismissed(true);
                sessionStorage.setItem("coverage-banner-dismissed", "true");
              } catch (e) {
                console.error("Failed to request coverage", e);
                alert("Failed to submit request. Please try again later.");
              }
            };
            void request();
          }
        }}
      />

      {/* Help Modal */}
      <HelpModal
        isOpen={isHelpOpen}
        onClose={handleCloseHelp}
        dontShowAgain={dontShowHelp}
        onDontShowAgainChange={setDontShowHelp}
      />
      {/* Report Modal */}
      <ReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        targetId={reportTargetId}
        targetType={reportTargetType}
        defaultStatus={reportDefaultStatus}
      />
    </div>
  );
}
