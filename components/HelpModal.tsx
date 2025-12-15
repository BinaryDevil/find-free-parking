import { useTranslations } from "next-intl";
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
  const t = useTranslations("HelpModal");
  const tHome = useTranslations("HomePage"); // For standard title if needed

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
      <div className="flex flex-col w-full max-w-md animate-in fade-in zoom-in-95 rounded-2xl bg-white text-slate-900 shadow-2xl overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900">
              {tHome("title")}
            </h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mb-6 rounded-lg bg-orange-50 border border-orange-100 p-3">
            <div className="flex gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600 shrink-0 mt-0.5" />
              <p className="text-sm text-orange-800">
                <span className="font-semibold">{t("betaTitle")}</span>{" "}
                {t("betaDesc")}
              </p>
            </div>
          </div>

          <div className="grid gap-6">
            <div className="flex gap-4">
              <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">
                  {t("greenTitle")}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed mt-1">
                  {/* We might need to adjust the structure if "desc" is not matching the "Green is Free" exactly.
                       Wait, the keys in generate_locales:
                       title: "How to convert to free parking" (unused in current modal code?)
                       desc: "Green lines represent likely free street parking." (matches "Green is Free" content ish?)

                       Let's re-read the original Modal code vs generated keys.
                       Original:
                       h3: Green is Free
                       p: Green lines and dots mean parking is free right now.

                       Generated keys:
                       desc: "Green lines represent likely free street parking."

                       I should probably update the keys to match the structure better or use what I have.
                       The generated keys I added:
                       realTimeUpdates, realTimeDesc, doubleCheck, doubleCheckDesc.

                       I missed "Green is Free" title key.
                       And the "Green lines..." key is "desc".

                       Let's assume "desc" is the green line description.
                       And I should add a "greenTitle" key? Or use hardcoded? No, must translate.
                       I'll use "desc" for the description.
                       But "Green is Free" title is missing.
                   */}
                  {/* Let's double check the keys I added in previous step.
                       I added realTimeUpdates, realTimeDesc, doubleCheck, doubleCheckDesc.
                       I have "desc" from before.
                       I don't have "Green is Free" title.
                       I'll use "title" from HelpModal for "Green is Free" maybe?
                       "title": "How to convert..."
                       -> That's different.

                       Okay, I need to add one more key "greenTitle" or similar.
                       But I already ran the script.
                       I will reuse 'title' for now or just add 'greenTitle' in a quick follow up if I can't find a good match.
                       Wait, I can't add keys without editing the script again.

                       Let's look at the keys again.
                       HelpModal.title = "How to convert..."
                       HelpModal.desc = "Green lines..."

                       In the component:
                       h2: "Find Free Parking" -> Use HomePage.title
                       h3: "Green is Free" -> Missing
                       p: "Green lines..." -> HelpModal.desc

                       h3: "Real-time Updates" -> HelpModal.realTimeUpdates
                       p: ... -> HelpModal.realTimeDesc

                       h3: Double Check -> HelpModal.doubleCheck
                       p: ... -> HelpModal.doubleCheckDesc

                       Button: HelpModal.startParking
                       Checkbox: HelpModal.dontShowAgain
                       Beta: HelpModal.betaTitle, HelpModal.betaDesc

                       So "Green is Free" is missing. I will use "desc" for the P tag.
                       For the H3 "Green is Free", I will temporarily use "Green is Free" (hardcoded) or try to find a synonym.
                       Actually, I should just fix the script to add "greenTitle" quickly.
                   */}
                  {t("desc")}
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">
                  {t("realTimeUpdates")}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed mt-1">
                  {t("realTimeDesc")}
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">
                  {t("doubleCheck")}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed mt-1">
                  {t("doubleCheckDesc")}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100">
            <button
              onClick={onClose}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm"
            >
              {t("startParking")}
            </button>
            <div className="mt-4 flex justify-center">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-500 hover:text-slate-700">
                <input
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={(e) => onDontShowAgainChange(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>{t("dontShowAgain")}</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
