export type ParkingMode = "FREE" | "PAID";

type ParkingConfidenceInput = {
  streetUse?: string | null;
  hasMeter?: boolean;
  hasKnownMeterSchedule?: boolean;
  isMeterActive?: boolean;
  reportCounts?: Record<string, number> | null;
  excluded?: boolean;
};

export type ParkingConfidence = {
  free: number;
  paid: number;
  reasons: string[];
};

// This is intentionally conservative. A missing meter is weak evidence of
// free parking, while a current/explicit regulation is strong evidence.
export const DISPLAY_CONFIDENCE_THRESHOLD = 0.6;

function reportCount(
  reportCounts: Record<string, number> | null | undefined,
  status: "FREE" | "PAID",
) {
  return Number(reportCounts?.[status] ?? 0);
}

function applyCommunityEvidence(
  confidence: ParkingConfidence,
  reportCounts: Record<string, number> | null | undefined,
) {
  const freeReports = reportCount(reportCounts, "FREE");
  const paidReports = reportCount(reportCounts, "PAID");

  if (freeReports >= 3 && freeReports > paidReports) {
    return {
      free: Math.max(confidence.free, 0.75),
      paid: Math.min(confidence.paid, 0.2),
      reasons: [...confidence.reasons, "community reports favor free parking"],
    };
  }

  if (paidReports >= 3 && paidReports > freeReports) {
    return {
      free: Math.min(confidence.free, 0.2),
      paid: Math.max(confidence.paid, 0.75),
      reasons: [...confidence.reasons, "community reports favor paid parking"],
    };
  }

  return confidence;
}

export function scoreStreetParking({
  streetUse,
  hasMeter = false,
  hasKnownMeterSchedule = false,
  isMeterActive = false,
  reportCounts,
  excluded = false,
}: ParkingConfidenceInput): ParkingConfidence {
  if (excluded) {
    return { free: 0, paid: 0, reasons: ["street is excluded from parking"] };
  }

  const normalizedUse = (streetUse ?? "Unknown").toLowerCase();
  if (
    normalizedUse.includes("permit") ||
    normalizedUse.includes("no parking") ||
    normalizedUse.includes("restricted")
  ) {
    return {
      free: 0.05,
      paid: 0.05,
      reasons: ["known access or parking restriction"],
    };
  }

  let confidence: ParkingConfidence;
  if (hasMeter && isMeterActive) {
    confidence = { free: 0.1, paid: 0.88, reasons: ["linked meter is active"] };
  } else if (hasMeter && hasKnownMeterSchedule) {
    confidence = {
      free: 0.68,
      paid: 0.18,
      reasons: ["linked meter is outside its active schedule"],
    };
  } else if (normalizedUse.includes("paid")) {
    confidence = { free: 0.05, paid: 0.9, reasons: ["explicit paid street use"] };
  } else if (hasMeter) {
    confidence = {
      free: 0.2,
      paid: 0.72,
      reasons: ["linked meter has no usable schedule"],
    };
  } else if (
    normalizedUse.includes("residential") ||
    normalizedUse.includes("unrestricted") ||
    normalizedUse.includes("time limited")
  ) {
    confidence = {
      free: 0.65,
      paid: 0.1,
      reasons: ["street use suggests public parking and no meter is linked"],
    };
  } else {
    confidence = {
      free: 0.3,
      paid: 0.15,
      reasons: ["no parking regulation evidence"],
    };
  }

  return applyCommunityEvidence(confidence, reportCounts);
}

export function scoreMeterParking({
  hasKnownMeterSchedule = false,
  isMeterActive = false,
  reportCounts,
}: Pick<
  ParkingConfidenceInput,
  "hasKnownMeterSchedule" | "isMeterActive" | "reportCounts"
>): ParkingConfidence {
  const confidence = isMeterActive
    ? { free: 0.05, paid: 0.95, reasons: ["meter is active now"] }
    : hasKnownMeterSchedule
      ? {
          free: 0.78,
          paid: 0.1,
          reasons: ["meter is outside its active schedule"],
        }
      : {
          free: 0.15,
          paid: 0.8,
          reasons: ["meter has no usable schedule"],
        };

  return applyCommunityEvidence(confidence, reportCounts);
}

export function shouldDisplay(
  confidence: ParkingConfidence,
  mode: ParkingMode,
) {
  return mode === "FREE"
    ? confidence.free >= DISPLAY_CONFIDENCE_THRESHOLD
    : confidence.paid >= DISPLAY_CONFIDENCE_THRESHOLD;
}
