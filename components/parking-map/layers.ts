import type { Map } from "maplibre-gl";

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
            "RESTRICTED",
            "#b45309",
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
          "circle-color": ["match", ["get", "classification"], "FREE", "#16a34a", "PAID", "#DC2626", "RESTRICTED", "#d97706", "#64748b"],
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

}
