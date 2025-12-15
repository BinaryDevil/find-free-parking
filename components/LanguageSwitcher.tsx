"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";
import { ChangeEvent, useTransition } from "react";

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const pathname = usePathname();

  function onSelectChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextLocale = event.target.value;
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
    });
  }

  return (
    <select
      defaultValue={locale}
      disabled={isPending}
      onChange={onSelectChange}
      className="bg-white/90 border border-slate-300 text-slate-700 text-sm rounded-md p-1 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer pointer-events-auto"
      aria-label="Select language"
    >
      <option value="en">English</option>
      <option value="zh">中文</option>
      <option value="es">Español</option>
      <option value="fr">Français</option>
      <option value="hi">हिन्दी</option>
      <option value="ar">العربية</option>
      <option value="bn">বাংলা</option>
      <option value="pt">Português</option>
    </select>
  );
}
