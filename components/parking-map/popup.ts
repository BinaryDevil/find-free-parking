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
  if (properties.classification === 'RESTRICTED') return 'paidRestricted';
  if (properties.classification === 'PAID') return properties.kind ? 'paid' : 'paymentListed';
  return 'unknown';
}

