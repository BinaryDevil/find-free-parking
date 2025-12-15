"use client";

import { useState, useEffect } from "react";
import { X, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";

type ReportModalProps = {
  isOpen: boolean;
  onClose: () => void;
  targetId: string | null;
  targetType: "METER" | "STREET" | "ZONE" | null;
  defaultStatus?: "FREE" | "PAID";
};

export default function ReportModal({
  isOpen,
  onClose,
  targetId,
  targetType,
  defaultStatus,
}: ReportModalProps) {
  const [status, setStatus] = useState<"FREE" | "PAID" | "NO_PARKING">("FREE");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [selectedReasonOption, setSelectedReasonOption] = useState<string>("");
  const t = useTranslations("ReportModal");

  const REASON_OPTIONS = {
    FREE: [
      { key: "reasonMeterRemoved", label: t("reasonMeterRemoved") },
      { key: "reasonSignChanged", label: t("reasonSignChanged") },
      { key: "reasonAfterHoursFree", label: t("reasonAfterHoursFree") },
      { key: "reasonSundayHoliday", label: t("reasonSundayHoliday") },
      { key: "reasonOther", label: t("other") },
    ],
    PAID: [
      { key: "reasonNewMeter", label: t("reasonNewMeter") },
      { key: "reasonPayStationVisible", label: t("reasonPayStationVisible") },
      { key: "reasonPermitOnly", label: t("reasonPermitOnly") },
      { key: "reasonTimeLimitExceeded", label: t("reasonTimeLimitExceeded") },
      { key: "reasonOther", label: t("other") },
    ],
    NO_PARKING: [
      { key: "reasonConstruction", label: t("reasonConstruction") },
      { key: "reasonNoStopping", label: t("reasonNoStopping") },
      { key: "reasonPrivate", label: t("reasonPrivate") },
      { key: "reasonDriveway", label: t("reasonDriveway") },
      { key: "reasonOther", label: t("other") },
    ],
  };

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      if (defaultStatus) {
        setStatus(defaultStatus);
      } else {
        setStatus("FREE");
      }
      setReason("");
      setError(null);
      setSuccess(false);
      setIsSubmitting(false);
      setSelectedReasonOption(""); // Reset selected reason option
    }
  }, [isOpen, defaultStatus]);

  // When status changes, reset reason selection
  useEffect(() => {
    setSelectedReasonOption("");
    setReason("");
  }, [status]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!targetId || !targetType) return;

    let finalReason = reason;
    if (selectedReasonOption !== t("other")) {
      if (!selectedReasonOption) {
        // If user didn't select anything, maybe allow empty? or validation error?
        // "Simplify user input" -> likely optional based on user prompt "just let them check".
        // We'll treat unselected as empty string.
        finalReason = "";
      } else {
        finalReason = selectedReasonOption;
      }
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Get location if possible
      let location: { latitude: number; longitude: number } | undefined;
      try {
        if ("geolocation" in navigator) {
          const position = await new Promise<GeolocationPosition>(
            (resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                timeout: 5000,
              });
            }
          );
          location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
        }
      } catch (e) {
        console.warn("Could not get location", e);
      }

      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_id: targetId,
          target_type: targetType,
          reported_status: status,
          reason: finalReason,
          ...location,
        }),
      });

      if (!res.ok) {
        throw new Error(t("errorGeneric"));
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || t("errorGeneric"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white text-slate-900 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <h2 className="font-semibold text-gray-900">{t("title")}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {success ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                <CheckCircle size={24} />
              </div>
              <h3 className="text-lg font-medium text-gray-900">
                {t("thankYouTitle")}
              </h3>
              <p className="text-gray-500 mt-1">{t("submittedDesc")}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("actualStatus")}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["FREE", "PAID", "NO_PARKING"] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setStatus(opt)}
                      className={`
                        py-2 text-sm font-medium rounded-lg border transition-all
                        ${
                          status === opt
                            ? "bg-blue-600 text-white border-blue-600 ring-2 ring-blue-600 ring-offset-1"
                            : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                        }
                      `}
                    >
                      {opt === "FREE"
                        ? t("statusFree")
                        : opt === "PAID"
                        ? t("statusPaid")
                        : t("statusNoParking")}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("reasonLabel")}
                </label>
                <div className="space-y-2 mb-2">
                  {REASON_OPTIONS[status].map((opt) => (
                    <div key={opt.key} className="flex items-center">
                      <input
                        id={`reason-${opt.key}`}
                        name="reason-option"
                        type="radio"
                        checked={selectedReasonOption === opt.label}
                        onChange={() => setSelectedReasonOption(opt.label)}
                        className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <label
                        htmlFor={`reason-${opt.key}`}
                        className="ml-2 block text-sm text-gray-700"
                      >
                        {opt.label}
                      </label>
                    </div>
                  ))}
                </div>

                {selectedReasonOption === t("other") && (
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={t("detailsPlaceholder")}
                    className="w-full mt-2 rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 min-h-[80px] text-sm md:text-base p-2 border"
                    required
                  />
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 bg-white text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-50"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting && (
                    <Loader2 size={16} className="animate-spin" />
                  )}
                  {t("submit")}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
