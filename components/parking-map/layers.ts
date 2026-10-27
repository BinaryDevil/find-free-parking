import type { ExpressionSpecification, Map } from "maplibre-gl";

// No Restriction Found (#136): a hollow blue outline, a wide blue line with a
// narrower inner line in the background colour. Its shape differs from solid
// Verified Free and dashed Unknown, so colour is not the only cue.
export const NO_RESTRICTION_FOUND_STYLE = { outline: "#1d4ed8", inner: "#ffffff", outerWidth: 8, innerWidth: 3 } as const;
const isNrf: ExpressionSpecification = ["==", ["get", "classification"], "NO_RESTRICTION_FOUND"];
const notNrf: ExpressionSpecification = ["!=", ["get", "classification"], "NO_RESTRICTION_FOUND"];

export function addParkingLayers(map: Map) {
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
            "RESTRICTED",
            "#d97706",
            "#94a3b8", // Default gray
          ],
          "fill-opacity": ["case", isNrf, 0, 0.4],
        },
      });
      map.addLayer({
        id: "zones-nrf-outer",
        type: "line",
        source: "zones",
        filter: isNrf,
        paint: { "line-color": NO_RESTRICTION_FOUND_STYLE.outline, "line-width": NO_RESTRICTION_FOUND_STYLE.outerWidth - 2 },
      });
      map.addLayer({
        id: "zones-nrf-inner",
        type: "line",
        source: "zones",
        filter: isNrf,
        paint: { "line-color": NO_RESTRICTION_FOUND_STYLE.inner, "line-width": NO_RESTRICTION_FOUND_STYLE.innerWidth - 1 },
      });
      map.addLayer({
        id: "zones-line",
        type: "line",
        source: "zones",
        filter: notNrf,
        paint: {
          "line-color": [
            "match",
            ["get", "classification"],
            "FREE",
            "#15803d",
            "PAID",
            "#b91c1c",
            "RESTRICTED",
            "#b45309",
            "#64748b",
          ],
          "line-width": 2,
        },
      });

      // Drawn first so Verified Free and other answers rank above it.
      map.addLayer({
        id: "streets-nrf-outer",
        type: "line",
        source: "streets",
        filter: isNrf,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": NO_RESTRICTION_FOUND_STYLE.outline,
          "line-width": ["case", ["boolean", ["feature-state", "hover"], false], NO_RESTRICTION_FOUND_STYLE.outerWidth + 2, NO_RESTRICTION_FOUND_STYLE.outerWidth],
        },
      });
      map.addLayer({
        id: "streets-nrf-inner",
        type: "line",
        source: "streets",
        filter: isNrf,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": NO_RESTRICTION_FOUND_STYLE.inner, "line-width": NO_RESTRICTION_FOUND_STYLE.innerWidth },
      });

      // Streets Outline Layer (Background for contrast)
      map.addLayer({
        id: "streets-line-outline",
        type: "line",
        source: "streets",
        filter: notNrf,
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
        filter: notNrf,
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": ["match", ["get", "classification"], "FREE", "#00A651", "PAID", "#DC2626", "RESTRICTED", "#d97706", "#64748b"],
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
          "circle-color": ["match", ["get", "classification"], "FREE", "#16a34a", "PAID", "#DC2626", "RESTRICTED", "#d97706",
            "NO_RESTRICTION_FOUND", NO_RESTRICTION_FOUND_STYLE.inner, "#64748b"],
          "circle-stroke-color": ["case", isNrf, NO_RESTRICTION_FOUND_STYLE.outline, "#fff"],
          "circle-stroke-width": ["case", isNrf, 3, 1.5],
        },
        // Higher keys draw on top, so No Restriction Found ranks below.
        layout: { "circle-sort-key": ["case", isNrf, 0, 1] },
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

}
