---
name: Gallery pagination masonry
description: The Universal Gallery's append-only pagination behavior and CSS multi-column constraint.
---

The Universal Gallery must retain each successfully loaded provider page as an append-only batch and render each batch in its own existing masonry block. Keep page-level deduplication and loading locks in place.

**Why:** CSS multi-column layouts with auto height rebalance their children when new cards are appended. A single growing `columns` container can visually move new cards toward column tops even when the React array uses `[...previous, ...next]`.

**How to apply:** When changing gallery pagination, preserve immutable page batches, append only genuinely new records, keep the IntersectionObserver sentinel after all batches, and avoid replacing the accumulated result list during load-more requests.