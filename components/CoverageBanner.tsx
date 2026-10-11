import { MapPinOff, X } from "lucide-react";
import { useTranslations } from "next-intl";

type CoverageBannerProps = {
  isVisible: boolean;
  onDismiss: () => void;
  onRequest?: () => void;
};

export default function CoverageBanner({
  isVisible,
  onDismiss,
  onRequest,
}: CoverageBannerProps) {
  const t = useTranslations("HomePage");
  if (!isVisible) return null;

  return (
    <div className="absolute bottom-20 left-4 right-4 md:bottom-24 md:left-1/2 md:-translate-x-1/2 md:w-auto md:max-w-lg z-[100] animate-in fade-in slide-in-from-bottom-4">
      <div className="bg-slate-900/95 backdrop-blur text-white p-4 rounded-lg shadow-lg border border-slate-700 flex items-start gap-3">
        <MapPinOff className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
        <div className="flex-1">
          <h3 className="font-semibold text-sm">{t("regionNotSupported")}</h3>
          <p className="text-xs text-slate-300 mt-1 mb-2">
            {t("regionNotSupportedDesc")}
          </p>
          {onRequest ? (
            <button
              onClick={onRequest}
              className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-md font-medium transition-colors"
            >
              {t("requestCity")}
            </button>
          ) : null}
        </div>
        <button
          onClick={onDismiss}
          className="text-slate-400 hover:text-white transition-colors"
        >
          <span className="sr-only">Dismiss</span>
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
