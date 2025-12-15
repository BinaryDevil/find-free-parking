# Localization Requirement

This project supports a multilingual front-end. 

## Rules

1. **No Hardcoded Strings**: All user-facing text must be localized. Do not hardcode English strings in React components.
2. **Use translation hooks**: Use `useTranslations` from `next-intl` for all text rendering.
3. **Update Generation Script**: When adding new text, add the keys to `scripts/generate_locales.ts` first, then run the script to regenerate `messages/*.json`.
4. **Consistency**: Ensure keys are added to the appropriate section (e.g., `HomePage`, `ReportModal`) in the generation script.
5. **Monitoring**: Regularly monitor user feedback for translation inaccuracies and context errors. Update `scripts/generate_locales.ts` to fix any reported issues.
