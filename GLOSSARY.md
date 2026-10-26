# Find Free Parking

Find Free Parking helps drivers who are unfamiliar with an area choose a nearby place where parking is permitted without payment. Its trust boundary is the difference between a parking rule and whether a space is available in the moment.

## Project context

The accepted direction is city-by-city recommendations backed by current authoritative rules, with precise location, schedule, and applicable vehicle conditions. Prefer trustworthy limited coverage over broad inferred coverage. Keep the map quick to understand on mobile, with clear costs, limits, and relevant warnings.

This is the intended product model, not a claim that every current result satisfies it. The [verified-rules spec](https://github.com/BinaryDevil/find-free-parking/issues/2) and its sub-issues record the implementation gap and unfinished work. [ADR-0001](docs/adr/0001-verified-rules-only.md) is the accepted decision.

## Language

**Parking Rule**:
An authoritative, time- and location-specific statement of whether a vehicle may park and under what conditions, such as payment, permit, or time-limit requirements.
_Avoid_: parking status, availability

**Free Parking Rule**:
A Parking Rule that permits parking without payment for the selected time and vehicle context. It does not assert that a physical space is vacant.
_Avoid_: free spot, unrestricted (unless the underlying rule is known)

**Verified Free Parking Rule**:
A Free Parking Rule supported by a current authoritative source whose location and schedule are precise enough for the service's stated context.
_Avoid_: inferred free parking, likely free parking

**Available Space**:
A physical place that a driver can occupy immediately and lawfully. It requires both a matching Parking Rule and a current vacancy observation.
_Avoid_: free parking, free street

**Coverage**:
A city or area for which the service has sufficiently current, authoritative Parking Rules for a stated product promise. A map boundary or generic road data alone is not Coverage.
_Avoid_: supported city, mapped city

**Driver Report**:
A user-submitted observation that may challenge or supplement a Parking Rule or describe availability, but is not itself an authoritative rule.
_Avoid_: verified data, correction

**Driver Warning**:
A visible caution derived from one or more Driver Reports that a place may not be usable. It does not change the underlying Parking Rule.
_Avoid_: corrected status, reported truth

**No Restriction Found** *(proposed, pending owner acceptance of the ADR-0001 amendment)*:
A weaker answer than a Verified Free Parking Rule. An official parking layer records the place, and none of the city's checked official sources shows a payment, restriction or condition there for the selected time and vehicle. It is shown as "No payment or restriction found in official data. Signs may differ: read them before you park." It is never called free and never counts as Coverage.
_Avoid_: free, likely free, probably free, unrestricted
