"use client";

import { useEffect, useState } from "react";
import { checkCoverage } from "@/app/actions/coverage";
import { Loader2, MapPinOff } from "lucide-react";

//TODO: SQL 7 is not ran yet
export function CoverageCheck() {
  const [isVisible, setIsVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if dismissed previously in this session
    if (sessionStorage.getItem("coverage-banner-dismissed")) {
      setLoading(false);
      return;
    }

    if (!navigator.geolocation) {
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        // Basic check if we are already in execution
        try {
          const result = await checkCoverage(latitude, longitude);
          if (!result.isCovered) {
            setIsVisible(true);
          }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
      },
      (error) => {
        // User denied or error, do nothing
        console.log("Geolocation error or denied:", error);
        setLoading(false);
      }
    );
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    setDismissed(true);
    sessionStorage.setItem("coverage-banner-dismissed", "true");
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-auto md:max-w-lg z-[9999] animate-in fade-in slide-in-from-bottom-4">
      <div className="bg-slate-900/95 backdrop-blur text-white p-4 rounded-lg shadow-lg border border-slate-700 flex items-start gap-3">
        <MapPinOff className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
        <div className="flex-1">
          <h3 className="font-semibold text-sm">Region Not Supported</h3>
          <p className="text-xs text-slate-300 mt-1">
            It looks like you are outside our current coverage area. Map data may be incomplete or missing here.
          </p>
        </div>
        <button 
          onClick={handleDismiss}
          className="text-slate-400 hover:text-white transition-colors"
        >
          <span className="sr-only">Dismiss</span>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
