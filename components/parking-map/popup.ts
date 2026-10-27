export function popupElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  style: string,
  text?: unknown
) {
  const element = document.createElement(tag);
  element.style.cssText = style;
  if (text !== undefined) element.textContent = String(text ?? "");
  return element;
}

export function parkingLabelKey(properties: Record<string, unknown>) {
  if (properties.classification === 'FREE') return 'verifiedFree';
  if (properties.classification === 'NO_RESTRICTION_FOUND') return 'noRestrictionFound.legend';
  if (properties.classification === 'RESTRICTED') return 'paidRestricted';
  if (properties.classification === 'PAID') return properties.kind ? 'paid' : 'paymentListed';
  return 'unknown';
}

const lineStyles = {
  title: "font-weight:600;font-size:15px;color:#1e3a8a",
  text: "margin-top:6px;color:#1f2937",
  note: "margin-top:4px;color:#475569;font-size:12px",
  heading: "margin-top:8px;font-weight:600;font-size:12px;color:#1f2937",
  item: "margin-top:2px;color:#475569;font-size:12px",
} as const;

// Text only: every line, including source names, goes through textContent.
export function popupLines(lines: { role: keyof typeof lineStyles; text: string }[]) {
  return lines.map(line => popupElement("div", lineStyles[line.role], line.text));
}
