import { X, CheckCircle, Clock, AlertTriangle } from "lucide-react";

type HelpModalProps = {
  isOpen: boolean;
  onClose: () => void;
  dontShowAgain: boolean;
  onDontShowAgainChange: (checked: boolean) => void;
};

export default function HelpModal({
  isOpen,
  onClose,
  dontShowAgain,
  onDontShowAgainChange,
}: HelpModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
      <div className="flex flex-col w-full max-w-md animate-in fade-in zoom-in-95 rounded-2xl bg-white text-slate-900 shadow-2xl overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900">
              Find Free Parking
            </h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid gap-6">
            <div className="flex gap-4">
              <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Green is Free</h3>
                <p className="text-sm text-slate-600 leading-relaxed mt-1">
                  Green lines and dots mean parking is free{" "}
                  <strong>right now</strong>.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">
                  Real-time Updates
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed mt-1">
                  We check regulations instantly so you don't have to guess.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">
                  Double Check Signs
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed mt-1">
                  Data can be imperfect. Always verify local signs before
                  leaving your car.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100">
            <button
              onClick={onClose}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm"
            >
              Start Parking
            </button>
            <div className="mt-4 flex justify-center">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-500 hover:text-slate-700">
                <input
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={(e) => onDontShowAgainChange(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Don't show this again</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
