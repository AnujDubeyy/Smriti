# Locale capability matrix

| Locale | UI | Native review | STT | TTS | Conversation AI | Clinical instruments |
|---|---|---|---|---|---|---|
| en-IN | Implemented; browser checked | Not independently reviewed | Off | Off | Off | Off |
| hi-IN | Implemented; beta; browser checked | Pending | Off | Off | Off | Off |
| mr-IN | Implemented; beta; browser checked | Pending | Off | Off | Off | Off |

All dictionary keys, three pillar labels and three role-title sets are checked by the automated tests. Browser checks covered full-shell switching, preference retention across navigation, Hindi mobile layout and Marathi at 200% root text size. These are UI checks only, not speech-language or clinical validation.

## Phase 3 update — 2 November 2026

Voice adapters accept en-IN, hi-IN and mr-IN as experimental synthetic-test candidates. No live provider/native-speaker/device results are available; none is accepted for real care use. Mock speech is fixed English. The existing localized shell is preserved; new Phase 2/3 workflow instructions are primarily English pending translation and review. See `docs/progress/PHASE-03.md`.
