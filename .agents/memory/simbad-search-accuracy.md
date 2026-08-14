---
name: SIMBAD search accuracy
description: Provider-specific constraints for canonical star ranking and ADQL compatibility in Cosmic Atlas
---

Known bright-star names do not always equal SIMBAD `basic.main_id` values. Sirius resolves to `* alf CMa`, and Polaris resolves to `* alf UMi`; exact canonical identifiers should be preferred for these profile searches.

**Why:** SIMBAD can return no row for the display name, and its ADQL endpoint rejects Unicode alias terms such as `α CMa` and `α UMi` with HTTP 400. Broad wildcard queries can also time out.

**How to apply:** Keep display aliases in normalized objects, but send only ASCII-safe terms to SIMBAD. For profiled bright stars, use exact canonical-ID queries and avoid the broad wildcard query when the exact record is sufficient.