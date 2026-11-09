---
name: XP and workout comparison rules
description: Product rules for lifetime XP and session-to-session progress reporting.
---

XP is lifetime progression and is awarded once per newly completed workout; saving updated values for the same dated session must not award XP again. Compare a workout with previous records for the same program day or exact workout name. Use total training volume (weight × repetitions), convert units before comparison, and show exercise-level changes only when set snapshots exist. “About a month ago” means the nearest matching session 23–37 days before the current one.

**Why:** The app works offline and must keep earned progression stable while still comparing the same workout across program changes and measurement units.

**How to apply:** Preserve total XP independently of editable/deletable program history, keep completion updates idempotent, and state clearly when a comparison has no matching recorded session.
