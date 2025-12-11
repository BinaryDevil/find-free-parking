---
trigger: always_on
---

# Purpose of this app

We need to provide information to our users, as brief and directly as possible, as to let user know "Where can I park my car, FREE, at right now, or any given time". Also user can check paid parking as well.

## Tenets

- **Speed over feature-bloat**: If a feature adds clicks to finding parking, question it. The user is likely driving and needs info FAST.
- **Map First**: The map is the primary interface and source of truth. Lists/Menus are secondary.
- **Clarity adds Value**: Distinguish Paid vs Free clearly (e.g., Green for Free, Red for Paid). Don't hide costs.
- **Mobile Optimized**: The user is likely on a phone. Controls must fit small screens, be touch-friendly, and not wrap unexpectedly.
- **Context Dependent**: Show warnings/errors only when relevant to the user's current action (e.g., location errors only when locating).

We shouldn't do anything that violates this purpose.
