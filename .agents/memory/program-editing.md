---
name: Program edit behavior
description: Preserve workout progress while applying program edits to future days.
---

When editing a saved program, the current day is editable: if incomplete, apply changes immediately while preserving entered values for matching sets; if completed, preserve its saved workout and apply the change from its next occurrence. Edits to other days propagate forward, and all edits persist into the next cycle. New programs start on the user's chosen date; a future-dated plan is scheduled while the current program remains active until then.

**Why:** The user wants an unsaved workout to reflect edits immediately, a completed workout to remain historically accurate, and new programs to begin on a date they choose.

**How to apply:** Preserve day and exercise IDs where possible. Keep saved logs unchanged, retain matching current set entries for immediate edits, apply completed-day changes at their next recurrence, and auto-activate scheduled programs on their start date.
