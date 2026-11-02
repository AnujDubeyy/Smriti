# SMRITI AI / स्मृति — CANONICAL DESIGN SYSTEM

**Document:** `DESIGN.md`  
**Status:** Agent implementation contract, v1.0 · 2026-11-02  
**Applies to:** every user-facing screen, responsive web view, motion state, patient workflow, caregiver portal, clinician portal, and future Smriti AI extension.

> **MISSION FOR ANY AI DESIGN/CODING AGENT:** Build a calm, human, rounded, accessible, multilingual experience for older adults and their caregivers. Use the bundled **real brand assets** and design tokens, not generic AI-generated illustrations or decorative UI. Implement behavior and responsive states, not a static screenshot. If an existing screen contradicts this specification, this file wins unless product or clinical safety requires otherwise. Do not invent clinical outcomes, speech-language availability, permissions, or data.

## 0. Agent's mandatory first steps

1. Read this entire file **before generating or changing UI**. Inspect the provided `/assets/` directory and use those assets as the visual source of truth. The SVG files are **illustrations/logo assets, not font files**; do not treat the ZIP name as evidence that fonts are bundled.
2. Determine **user role** (patient, caregiver, clinician), **workflow** (Assessment, Companionship, Monitoring), **locale** and **viewport** before laying out a screen.
3. Reuse established components, colors, spacing, semantic tokens, and motion curves. Do not choose aesthetically pleasing new hex colors per screen.
4. Implement loading, empty, partial, error, offline, interrupted, disabled, selected, focus and completed states. Don't use placeholders masquerading as live health information.
5. Check the acceptance criteria in §19 before marking the screen complete. Never claim testing not actually performed.

## 1. Product and reference intent

**Smriti AI** is an empathetic, voice-first assistant for people experiencing memory and cognitive difficulties, with separate controlled experiences for caregivers and clinicians. It has exactly three recognizable pillars:

| Pillar | Color | Mascot | Purpose | Primary user experience |
|---|---|---|---|---|
| **Assessment** | **RED** | dark-haired Indian woman, bun, red bindi | Clinician-approved, stage-appropriate cognitive/functional/behavioral tasks | Patient-facing one-question-at-a-time tasks |
| **Companionship** | **YELLOW** | swept brown hair, peach face, two oval eyes, **yellow flower by ear** | Patient-friendly, multilingual voice conversation grounded in caregiver-approved memories | Large live listening/speaking screen |
| **Monitoring** | **BLUE** | balding man with side hair, blue collar | Recordings, clinician/caregiver logs, careful longitudinal observations | Summary-first logs and audio-synced transcript |

**Important separation:** The **Monitoring recording player** is not the same screen as the **live voice conversation/test screen**. Patient-facing audio experience lives inside Companionship (yellow) or Assessment (red); archival recordings and AI overviews live inside Monitoring (blue).

The brand emblem shows a gentle grey-haired grandmother with three colored balloons behind the head; the native-script wordmark is `स्मृति`. The UI must feel like a personal companion, **not a hospital ERP, gamified quiz platform or generic AI SaaS dashboard**.

### Source references and interpretation

- **User-supplied dark Sessions screenshot:** take inspiration from its chronology, group headers, session duration and bottom navigation. **Do not** copy its tiny type, compressed controls, orange scribbles, dense layout, or low contrast.
- **Lemni pricing pop-out animation:** borrow **layered entry motion** only. Replace third-party logos and 3D marketing clutter with Smriti's own mascots. This must not block initial interaction.
- **Strawberry Browser FAQ:** borrow the **question appears like a conversational message** pattern; avoid decorative accordion-like bounce or layout jumps. MCQ question bubbles should not change location when selected.
- **GitHub contribution grid:** borrow compact **activity-day cells** and calendar overview; never present mere frequency as health improvement.
- **Apple Music-like synced lyric highlighting:** borrow **active transcript line + timing behavior** for **original patient recordings only**, not copyrighted lyrics or decorative full-screen music effects.

These are **interaction references**, not licenses to copy exact external visual assets.

## 2. Canonical asset manifest: use real files

Assets in this delivery package are under `assets/`. For exact original illustrations prefer the SVG. Do not re-create faces with emoji, CSS blobs, avatar libraries or generative images. **SVG source files may include large transparent/white artboard margins**: normalize by creating a *viewBox-cropped derivative* in the source repository after inspecting the vector geometry; do not stretch the original full page in a 48px icon slot. Keep the supplied source unchanged. Sanitize SVGs if loaded as untrusted markup.

| Path | Actual content | Approved use |
|---|---|---|
| `assets/svg/9.svg` | `स्मृति` wordmark + grey-haired grandmother/balloons | **Primary complete logo**. Preserve spelling, shape, aspect ratio, brand colors. |
| `assets/svg/8.svg` | grey-haired grandmother + balloons | Brand symbol, loading emblem, favicon candidate after cropping. |
| `assets/svg/1.svg` | trio of minimalist feature characters | Three-pillar illustration, onboarding / thoughtful brand moment. |
| `assets/svg/2.svg` | blue monitoring character, wide artboard | Monitoring mascot, small use after viewBox trim. |
| `assets/svg/3.svg` | blue character close-up | Monitoring mascot detail where larger face is required. |
| `assets/svg/4.svg` | bun-and-bindi character | Assessment mascot. |
| `assets/svg/5.svg` | red-bindi character close-up | Assessment large-face crop. |
| `assets/svg/6.svg` | additional small yellow-accent character | Alternate yellow character; **not** the approved flower-ear live companion. |
| `assets/svg/7.svg` | yellow circle/ladoo character close-up | Alternate yellow mascot/illustration; **not** a substitute for the flower-ear live bot. |
| `assets/mascots/companion-flower-reference.jpeg` | side-swept brown hair, yellow flower, no mouth | **Canonical visual reference for the Companionship live bot.** Prefer a faithful vector crop/trace, with no redesign or decorative additions. |
| `assets/mascots/assessment-bindi-reference.png` | bun-and-bindi illustration | Supplemental Assessment reference. |
| `assets/mascots/monitoring-uncle-reference.jpeg` | older male with blue collar | Supplemental Monitoring reference. |

**Asset priority:** exact approved mascot reference > original unmodified brand SVG > faithful cropped/optimized derivative > fallback icon. If the currently shipped vector conflicts with the approved yellow-flower character, **use the yellow-flower reference in the live bot**. Do not silently replace it with the child/ladoo illustration. Keep faces simple: peach skin, dark brown geometric hair, two oval black eyes, no added mouth, nose, neck, body, outlines, light rays or photorealism unless present in the source. No unauthorized redesign.

**Asset implementation:** crop whitespace with a vector `viewBox`, preserve aspect ratio, export optimized web images where necessary, provide meaningful alt text (or decorative empty alt), and prevent layout shift with explicit width/height or `aspect-ratio`. Avoid shipping 1 MB images for 48px icons. Use responsive image formats for the JPEG reference if it must be displayed directly. Fonts are **not included** in this package: acquire fonts through an appropriately licensed source and self-host/subset where permitted.

## 3. Visual identity: strict color system

The UI is **neutral-first**: warm near-white background, white cards, dark readable text, subtle dividers. Functional colors appear where they convey one of the three workflows. **No arbitrary gradients, dark glossy backgrounds, neon colors, fake glass panels or colorful ornaments.**

```css
:root {
  color-scheme: light;
  --bg: #FAF9F6;
  --surface: #FFFFFF;
  --surface-secondary: #F4F3F0;
  --text: #1A1A1A;
  --text-muted: #5D5F64;
  --border: #E6E4E0;
  --focus: #1D4ED8;

  --assessment: #D82832;
  --assessment-soft: #FFF0F0;
  --companionship: #FFCB25;
  --companionship-soft: #FFF7DA;
  --monitoring: #1556E8;
  --monitoring-soft: #EDF3FF;

  --success: #217344;
  --success-soft: #EAF6EE;
  --danger: #B42318;
  --danger-soft: #FFF0EF;
  --warning: #8A5B00;
  --warning-soft: #FFF2D4;

  --skin: #FED9BC;      /* illustration reference only, not UI surface */
  --hair: #53352A;      /* illustration reference only */
  --radius-input: 12px;
  --radius-row: 16px;
  --radius-card: 20px;
  --radius-modal: 24px;
  --radius-pill: 999px;
  --shadow-overlay: 0 12px 32px rgb(0 0 0 / 0.10);
}
```

- **Red is not a general error indicator.** It belongs to Assessment. Error states must also include clear wording and an error icon.
- **Yellow buttons must use dark ink**, never white text on saturated yellow. White on saturated yellow often fails text contrast.
- **Do not** randomly tint the background of informational cards. If a panel is not clickable, it should not look like a colorful CTA.
- Use semantic status (saved, ongoing, pending, error) with **words and icons** as well as color. Success green is separate from feature colors.
- In accessibility themes, colors may adjust to retain legibility without changing their semantic identity.

## 4. Typography: ROUNDY, but accurate in every script

**The entire app uses visually soft, rounded, highly legible typography, including buttons, forms, logs, labels, content and captions.** Preserve letter shapes, never faux-round via stroke effects.

### Font stack

| Script/context | Preferred | Fallback / limitation |
|---|---|---|
| Latin UI | **Nunito**, weights 400/500/600/700/800 | system-ui / sans-serif |
| Hindi/Marathi Devanagari short headings | **Baloo 2** | Noto Sans Devanagari for body or incomplete glyphs |
| Devanagari body | **Noto Sans Devanagari** | system sans, native shaper |
| Bengali | Baloo Da 2 (short labels); Noto Sans Bengali (body) | localized font |
| Gujarati | Baloo Bhai 2; Noto Sans Gujarati | localized font |
| Punjabi/Gurmukhi | Baloo Paaji 2; Noto Sans Gurmukhi | localized font |
| Tamil | Baloo Thambi 2; Noto Sans Tamil | localized font |
| Telugu | Baloo Tammudu 2; Noto Sans Telugu | localized font |
| Kannada | Baloo Tamma 2; Noto Sans Kannada | localized font |
| Malayalam | Baloo Chettan 2; Noto Sans Malayalam | localized font |
| Odia | Baloo Bhaina 2; Noto Sans Oriya | localized font |
| Urdu/Arabic-script languages | validated rounded-capable font where available; Noto Sans Arabic/Urdu | use native RTL shaping, not Latin font override |
| Other script-supported languages | script-appropriate Noto Sans or native accessible system font | **never** claim one font supports all languages |
| **Brand wordmark** | **Original `assets/svg/9.svg`** | not a live font. Do not substitute `Tiro Devanagari Hindi` automatically. |

Roundedness is a **visual target**, not a reason to break shaping or legibility. Script coverage takes priority when there is no sufficiently rounded font. Font downloads should be subset, versioned, self-hosted when licensing allows and loaded with `font-display: swap` plus sensible metric fallbacks. Long Hindi/Marathi body text should prioritize readability over playful display styling.

### Fixed hierarchy (responsive type range)

| Use | Mobile | Desktop | Weight / line-height |
|---|---|---|---|
| Hero/page title | 28–32px | 32–40px | 700 / 1.18 |
| Section heading | 22–24px | 24–28px | 700 / 1.28 |
| Card title | 19–21px | 20–22px | 700 / 1.32 |
| Ordinary body | **17–18px** | 17–18px | 400–500 / 1.55 |
| Primary button | **17–18px** | 17–18px | 700 / 1.35 |
| Field label | 16–17px | 16–17px | 600–700 / 1.4 |
| Metadata | 14–15px | 14–15px | 500–600 / 1.45 |
| Tiny legal text only | min 13–14px | 13–14px | 500 / 1.5 |

Limit long-form reading lines to **65–75 characters** (or comparable script-aware measure). Align text to the reading direction and **never use justified text** in the patient-facing app. Do not hard-code uppercase styles for translated labels. Do not truncate important information, patient names, questions, clinical warnings, or buttons. Let content wrap to additional lines; prefer auto-height. Validate all text at **200% zoom** and OS enlarged font settings.

## 5. Internationalization: language support is a system requirement

Smriti must be architected to support **all languages for which the chosen Gnani speech services actually expose the required capabilities**, but **UI locale support, speech-to-text, text-to-speech, translation and conversational AI are five separate capabilities**. Never hardcode a single advertised language count. A language becomes selectable for a *specific feature* only when that feature's complete capability path is tested and available.

**Required engineering contract:**

```ts
type LocaleCapability = {
  locale: string;              // BCP 47, e.g. 'hi-IN', 'mr-IN', 'ur-IN'
  script: string;              // ISO 15924, e.g. 'Deva', 'Arab'
  uiTranslation: boolean;
  speechToText: boolean;
  textToSpeech: boolean;
  conversationModel: boolean;
  preferredVoiceIds: string[];
  supportLevel: 'verified' | 'beta' | 'unavailable';
};
```

- Fetch capability data from verified provider/service configuration, not a static marketing number.
- All UI strings must use localization keys: heading, subtitle, question, MCQ options, transcript status, save toasts, permission dialogs, screen-reader labels, time formatting, validation and errors.
- Set `lang` and `dir` on the document and affected passages; preserve embedded English names in RTL content using bidi isolation. Use `margin-inline-*`, `padding-inline-*`, `inset-inline-*` and flex/grid reflow.
- Use Intl for numbers, dates, plural rules, list formatting, durations where appropriate. Test voice names and names of family members verbatim.
- Assume labels may take **200% of English width**. `min-width:0`, wrapping and content-derived height are mandatory; **do not** use fixed card heights or tiny fixed-width buttons.
- Store draft answers when locale switches; if a voice session cannot switch without interruption, explain why and ask permission first.
- Provide fallback text if TTS/STT is missing; never make a patient think the app supports spoken conversation when it only supports text.
- QA: Devanagari conjuncts and matras; Bengali, Tamil, Telugu, Kannada, Malayalam and other configured scripts; Urdu/RTL; CJK if supported; mixed scripts, numerals, names and 200%-expanded labels. Use native-speaker review for patient-facing wording.

## 6. Layout, responsiveness, geometry

- **Mobile-first** at 320px width and up; primary target phones 360–430px. No desktop UI squeezed into a phone.
- 4px base spacing: `4, 8, 12, 16, 24, 32, 48, 64`; mobile page gutters **20px** (16px only at 320px where necessary); desktop content max width around **1120px**.
- 1-column phone screens; medium devices may use 2-column sections; desktop uses an **actual sidebar + main reading column** or purposeful side-by-side detail panel. Avoid giant blank space surrounding a tiny phone-style card.
- **No hardcoded fixed-height content cards**; no overflowing localized labels, clipped bottom CTA, forced scale or content-hidden-to-fit hacks. Use `minmax(0,1fr)` in grid. Images: `max-width:100%`, `object-fit:contain`.
- Honor notches and safe area: `env(safe-area-inset-bottom)`. Use `100dvh` rather than unreliable mobile `100vh` when full-height interactions are required. Keep primary actions visible when onscreen keyboard appears.
- Responsive widths: **320–599px** single column; **600–899px** spacious single or two-column; **900–1199px** desktop navigation + main; **1200px+** max-width ~1120px main content. These are guidance breakpoints, not rigid rules; content can trigger earlier reflow.
- At **200% zoom and 320 CSS-px effective width**, there must be **no horizontal page scrollbar** and no hidden primary controls. On landscape phone, avoid forcing an overflowing fixed illustration.
- Shape should communicate hierarchy: inputs **12px**, lists **16px**, important navigation cards **20px**, dialogs **24px**, chips/pills **full rounded**. Do not give every shape the same pill radius. Borders 1px; no card gradient; shadows only for genuine overlays.
- Touch targets: **48×48px minimum** for primary controls; primary CTA height **56–60px**; answer options **64px+**. Provide clear 2px focus outline, hover only on interactive targets, pressed state and active state.

## 7. Navigation model by role

### Patient

Welcome (calm greeting) → **Talk to Smriti** (prominent yellow button) OR **Today's Assessment** (red, when assigned). No intimidating clinical analytics on patient home. The entry screen uses the main wordmark and large mascots. An explicit language picker is discoverable without opening settings. Controls should be so simple that a person can navigate by recognition and short labels.

### Caregiver

Patients/approved linked profiles → Sessions or planned activities → memory/story management (caregiver-approved) → clinician-shared Monitoring summaries where authorized → permissions. Caregiver does **not** see confidential clinician notes unless their authorization includes them.

### Clinician

Patient selection → **Monitoring** (blue) → structured observations → session detail → overview first → recording + synced transcript → notes/review. Assessments are clinician-configured and only use approved instruments/administration rules. Use a quieter, information-dense desktop layout without sacrificing clear typography.

### Main navigation rules

Maximum ~3–4 primary destinations per role; labels remain visible. On mobile use a reachable, clearly labeled bottom navigation **only when multiple comparable destinations exist**; do not duplicate every huge home card as an icon in a five-item nav. On laptop show a consistent sidebar/top navigation; maintain location and back behavior. Each screen has one **dominant action**, not five equal primary buttons. Navigation should not reset partially completed tests or unsaved notes.

## 8. Homepage + large-button components

Structure: simple top brand row (original `9.svg` logo, cropped appropriately) + role/locale control → concise welcome/guidance → **up to three large feature cards** with real mascot, text, one-line reason and clear arrow/CTA. Visual priority: 1) one next action 2) other available actions 3) history and supporting information.

**Cards are either: (a) fully clickable with accessible link semantics and an obvious arrow, or (b) purely informational and styled neutrally.** No accidental halfway-interactive surface. Prefer an explicit full-width button within complex cards rather than several hidden clickable zones.

**Semantic feature card examples:**

- Assessment (red): `Today's assessment` / `Begin activity`.
- Companionship (yellow): `Talk with Smriti` / `Start conversation`.
- Monitoring (blue): `Review sessions` / `Open recordings` (only authorized caregiver/clinician).

**No** fake success percentages, “AI insights” with no evidence, randomly colored category panels, repeated tabs, decorative badges or generic inspirational copy.

## 9. Sessions history + GitHub-style activity heatmap

Take the reference screenshot's *date grouping* and *compact session logs*, but rebuild them as larger, scan-friendly rows.

**Sessions page layout:** title `Sessions`, clear `+ New session` button where permitted; small descriptive subtitle; a compact `Activity` calendar; chronological date groups; large session rows with subject/type, start/end, duration, state, and single chevron. Rows ≥76px and expand naturally for translated text. Calendar and logs should be independent sections, not decorative overlapping cards.

**Heatmap must be semantically truthful:**

- **Each square represents a calendar day and number of recorded sessions**, not brain health, cognition, symptom severity or improvement.
- Explain legend `No activity`, `1 session`, `2 sessions`, `3+ sessions` (configurable thresholds); an empty day is not a negative clinical signal.
- Provide textual accessible alternative: `Tuesday, 10 November: 2 sessions` plus table/list and readable weekly summary.
- On phone, show 7×N date cells with adaptive number of weeks or a horizontally scrollable region with an explicit affordance; avoid making cells impossibly small. On laptop show 3–12 months depending on available width. Label months visibly.
- Tapping a day filters session list and exposes a clearly labeled `Clear filter`. Distinguish a day selected by the user from intensity level. Show real data only.
- Summary copy may say `You had 4 sessions this week`, **not** `Your memory has improved 40%`.
- If patient finds heatmap confusing, use a plain week-by-week list as the primary view and heatmap as a secondary optional visualization.

## 10. Assessment experience (RED)

One task/question at a time, with persistent **human-readable progress** `Question 2 of 5` and an accessible progressbar. Question arrives in a clean **message-like bubble**, using restrained Strawberry FAQ-style pop-up motion: **fade in, translateY(10–12px), scale(0.985→1), 220–280ms**. Disable decorative motion under reduced-motion settings. Never shift the answer rows when the question is answered.

**Forms are properly serialized/ordered**: explicit step number, input label, optional helper, validation adjacent to the field, review if needed, clear next/back control. Persist answers per step before navigation; account for offline/retry without duplicate writes. Don't advance automatically on select. Each step uses a stable question ID rather than display text.

### MCQ interaction — non-negotiable

- Each option is one **full-width ≥64px interactive row**, semantic `<label><input type="radio" ... /></label>` or accessible ARIA radio group, not random `div` click handlers.
- **Unselected:** neutral 1px border, hollow radio, dark text. **Selected but not submitted:** red-themed border / light tint + filled radio (not green). **Submitting:** locked controls + pending state. **Correct after confirmed submission:** success green border + check + explicit `Correct` label **only if clinical protocol permits immediate feedback**. **Incorrect:** neutral/error wording as protocol allows, never reveal sensitive scored answers by default.
- Never create tiny floating green selected HTML buttons next to MCQs. The **whole row** must represent selection unambiguously.
- Fixed-position action footer only if it doesn't cover answers or onscreen keyboard. Button `Continue` stays disabled until a valid selection; `Back` preserves selection. Confirm answer saved before advancing if the workflow requires persistence.
- For memory recall assessments, avoid leading feedback and test contamination. Some validated assessments forbid hints, retries and correctness cues; clinician configuration overrides ordinary quiz UI.

## 11. Companionship live voice (YELLOW)

The **yellow flower-ear mascot** is mandatory in the live conversational experience. **Do not replace it with grandmother logo, uncle mascot, or ladoo child.** A white/cream background, very subtle yellow halo/rings if used, and one large mascot centered. Label status in text: `Listening`, `Speaking`, `Paused`, `Reconnecting`, `Microphone off`; don't rely on waveform motion alone.

**Screen composition:** compact brand header + back → small feature label (`Companionship`) and clear live state → big mascot → conversation captions/message bubble (optional) → persistent large controls **Mute**, **Pause/Resume**, **Speaker**, **End**. No transcript logs, clinician cards, or assessment scores on this live screen. Elder-friendly, one main action per moment. Hide purely decorative controls if unused.

- Captions use gentle **message pop-out** as each question is spoken, synced to speech only when timing metadata supports it. Avoid bouncing and rapid full-screen text changes.
- Animations: mascot breathing/pulsing 1.6–2.4s; low amplitude. Never change mascot facial features or add mouth animations.
- Recordings require appropriate authorization/consent. Active mic and recording indicators must be clear. Ask permission clearly; do not imply conversations are recorded when they are not.
- Disconnect: tell user what happened and offer `Retry` and `End`; never silently close.
- Pause/end behavior must preserve consent and saved state; end may require confirmation if data could be lost.

## 12. Monitoring (BLUE) and recording playback

**Strict workflow:** `Monitoring → Session logs → Session detail with AI overview → Recording player → Synchronized transcript → Notes / review`.

Every recording item includes **date/time, duration, participants as permitted, recording availability and summary review state**. A click opens the detail; show **AI overview first**, because clinician/caregiver wants orientation before listening. Include `AI-generated summary • review before clinical use`, clearly separate **observed content** from **inferences and uncertainty**. No fabricated cognitive diagnosis, inferred symptom improvement, risk score or unsupported psychiatric interpretations.

**Player:** play/pause, seek, current/total time, -15/+15 seconds, playback speed and transcript toggle; keyboard and touch accessible. Recorded words shown as time-aligned sentences; currently playing line highlighted with readable typography, surrounding lines softened **without becoming inaccessible**. Tap transcript line to seek. Also offer a chronological non-animated text transcript for searching/accessibility; highlight should follow media time, **not** an invented approximate clock. If timestamp metadata is missing, show untimed transcript rather than fake synchronization.

For desktop: player/sidebar + transcript main column. On phone: player on top, transcript underneath; captions must not be hidden behind fixed controls. Logs and private audio require authenticated role-based access, explicit consent status and retention policy. The Monitoring color is **blue** throughout, even if session topics originated in red/yellow workflows.

## 13. Motion language: brand pop-out + quiet microinteractions

### One-time brand reveal inspired by Lemni

1. White/warm-cream canvas; use the authentic grey-haired grandmother + balloons symbol.
2. Three **real supplied pillar mascots** emerge from behind a simple neutral rounded panel/brand composition at small offsets, not third-party logos.
3. Each mascot rises 12–24px, scales from 0.92→1, with **80–140ms stagger** and subtle spring settle/overshoot ≤3%.
4. A wordmark appears at rest; transition directly into actionable home content without an artificial splash timeout.

**Duration target:** 1.0–1.5s if content is genuinely loading. Never postpone content to finish animation. If content is already available, use a shorter in-place first-visit reveal or skip. Avoid repeated pop-outs on every back navigation or tab switch.

### Interaction timings

| Event | Timing | Treatment |
|---|---|---|
| Button pressed | 100–150ms | solid-fill/border change, scale no smaller than 0.98 |
| Hover desktop | 140–180ms | meaningful pointer affordance, no fake hover on static cards |
| Drawer/page transition | 180–260ms | fade + max 8px translate |
| Question/message entrance | 220–280ms | subtle pop-out, no bounce-jitter |
| MCQ selected | 120–180ms | instant semantics, subtle border/fill transition |
| Mascot voice state | 1.6–2.4s | low-amplitude repeat; only while active |
| Save feedback | immediate after confirmed persistence | status text + subtle check; never announce success early |

Use `prefers-reduced-motion: reduce`: remove decorative motion and repeating loops while preserving all state changes visibly. Never use animation as the only signal. No parallax, random orbs, perpetual gradients, lottie overload, spinning mascots, wobbly health cards or fake loading sequences.

## 14. Forms and content hierarchy

**Order:** screen heading → one-line purpose → form step/section → field label → control → helper or error → action → secondary actions. Each field has visible persistent label; placeholders are examples only. Errors explain recovery and remain adjacent to the field. Group radios in `fieldset/legend` with one tab stop as appropriate. Progress bars have accessible labels. Confirm dangerous operations, avoid accidental discard, preserve draft on back and language change.

**Buttons:** action-oriented verb + object (`Start conversation`, `Review recording`, `Continue`); no vague `Explore`, `Discover`, `Unlock`. Use 1 primary button per panel/screen where possible, others outlined/plain. Spinner never replaces descriptive saving text entirely; use `aria-busy` and confirmation toasts.

**Content rules:** plain, empathetic, respectful adult language. Avoid patronizing speech, infantilizing graphics, generic AI hype, unvalidated clinical claims and repeated explanatory paragraphs. Text hierarchy must not collapse in Hindi/Marathi or other supported languages.

## 15. Accessibility and patient-sensitive experience

Target **WCAG 2.2 AA** as baseline. Use 4.5:1 contrast for ordinary text, 3:1 for large text and non-text UI controls; verify actual pairs. Support **200% text** without clipping, 320px phone width, landscape orientation, keyboard-only navigation, visible focus, screen readers, high-contrast OS mode, speech replay/repeat and clear user-control of audio. Prefer 48px targets even when standards permit smaller.

Never enforce timed completion unless clinically required. Do not auto-submit selected answers. Allow repeating spoken instructions when protocol permits; when not permitted, explain the restriction neutrally. Use written and spoken cues where feasible. Ask clear informed consent before recording, show listening state, and make end/pause discoverable. Never flash or rapidly pulse images.

Privacy/security design: mask personal details where appropriate; no raw audio on public URLs; show who can review conversations and why; clearly label inferred AI notes and unverified results. Keep separate clinician and caregiver permissions. User should never mistake a logged conversation for a diagnosis.

## 16. Sample React-style component contracts

```ts
type FeatureId = 'assessment' | 'companionship' | 'monitoring';
type PersonRole = 'patient' | 'caregiver' | 'clinician';
type VoiceState = 'idle' | 'requesting-permission' | 'listening' |
  'speaking' | 'paused' | 'reconnecting' | 'ended' | 'error';

type FeatureCardProps = {
  feature: FeatureId;
  titleKey: string;
  descriptionKey: string;
  href: string;
  disabledReasonKey?: string;
};

type AssessmentQuestionProps = {
  questionId: string;
  index: number;
  total: number;
  textKey: string;
  options: {id: string; labelKey: string}[];
  selectedId?: string;
  submissionState: 'unanswered' | 'selected' | 'saving' | 'saved' | 'error';
  feedbackPolicy: 'none' | 'post-submit' | 'end-only';
};

type SessionEntry = {
  sessionId: string;
  kind: FeatureId;
  startedAt: string;  // ISO-8601 date/time, storage timezone explicit
  durationSeconds?: number;
  recordingAvailable: boolean;
  summaryStatus: 'not-generated' | 'draft' | 'reviewed';
};

type TranscriptSegment = {
  id: string;
  startMs: number;
  endMs: number;
  text: string;
  speakerId?: string;
};
```

Recommended components: `AppShell`, `BrandLogo`, `FeatureCard`, `PrimaryButton`, `SecondaryButton`, `SessionRow`, `ActivityHeatmap`, `QuestionBubble`, `AccessibleOptionGroup`, `CompanionAvatar`, `VoiceControls`, `SummarySection`, `AudioPlayer`, `SyncedTranscript`, `LocalePicker`, `FormField`, `EmptyState`, `InlineError`. Tokens and state machines should be shared rather than copy-pasted per page.

## 17. CSS implementation baseline

```css
:root {
  --space-1: .25rem; --space-2: .5rem; --space-3: .75rem;
  --space-4: 1rem; --space-6: 1.5rem; --space-8: 2rem;
  --space-12: 3rem; --space-16: 4rem;
  --page-max: 70rem;
  font-family: 'Nunito', system-ui, sans-serif;
}
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body { margin: 0; background: var(--bg); color: var(--text); }
button, input, textarea, select { font: inherit; }
button, a, [role='radio'] { -webkit-tap-highlight-color: transparent; }
:focus-visible { outline: 3px solid var(--focus); outline-offset: 3px; }
.main { width: min(100% - 2.5rem, var(--page-max)); margin-inline: auto; }
.form-control { min-height: 3.5rem; border: 1px solid var(--border); border-radius: var(--radius-input); }
.primary-button { min-height: 3.5rem; border-radius: var(--radius-input); font-weight: 700; }
.feature-card { border: 1px solid var(--border); border-radius: var(--radius-card); padding: 1.5rem; }
.session-row { min-height: 4.75rem; border: 1px solid var(--border); border-radius: var(--radius-row); }
.responsive-grid { display: grid; grid-template-columns: minmax(0,1fr); gap: 1rem; }
@media (min-width: 48rem) { .responsive-grid { grid-template-columns: repeat(2,minmax(0,1fr)); } }
@media (min-width: 70rem) { .responsive-grid--three { grid-template-columns: repeat(3,minmax(0,1fr)); } }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; scroll-behavior: auto !important; }
}
```

Do not paste `font-family:Nunito` onto every multilingual element; apply script-aware typography via `[lang]`/locale class and appropriate font loading. Don't rely on CSS alone to implement semantics. Motion and keyboard focus must be supported by interactive elements.

## 18. Anti-slop blacklist and agent behavior

**NEVER create any of these without an explicit functional requirement:**

- random gradients, frosted glass, neon shadows, pastel blob backgrounds, decorative chart cards, glossy AI spheres;
- meaningless icons, duplicate CTAs, oversized floating plus button obscuring content, tiny outlined pills everywhere;
- bright cards that *look* tappable but are static information, or clickable cards without affordance;
- tiny body text, ellipsis-clipped translations, bad broken Devanagari glyphs, line-height that cuts matras;
- generic AI character instead of provided mascot, random flower/bindi removal, added mouth/moustache/body;
- fake audio bars that claim recording state when microphone inactive, fake progress or synthetic clinical analytics;
- automatic MCQ green selected badge before checking, incorrect keyboard focus order, disappearing answers;
- hover-only controls, inaccessible draggable widgets, scrolljacking, multi-second mandatory splash;
- invented clinical diagnoses and invented improvement percentages;
- aesthetic-only animation that prevents a user from acting.

**When in doubt, REMOVE.** A better interface is the simplest one that makes its primary task clear, retains sufficient context, and is clinically/technically honest.

## 19. Definition of done: screen QA acceptance checklist

An AI agent **must explicitly validate**:

- [ ] Exactly the **right pillar color and approved mascot** appear. Brand assets from this package used; no substitute illustrations.
- [ ] All core buttons have large tap targets, clear descriptive labels and visible focus states.
- [ ] A static information panel cannot be confused with a button.
- [ ] Typography uses rounded style with validated glyph coverage and line height in each tested locale.
- [ ] Layout works at **320, 360, 390, 430, 768, 1024, 1280, 1440px** widths and landscape; essential content does not cut off or vanish.
- [ ] At **200% zoom / increased font size**, controls remain available without horizontal page overflow.
- [ ] RTL and long-label locale tested; all key UI copy localized, not merely headings.
- [ ] Keyboard Tab/Shift+Tab/Enter/Space, labels, input focus, and screen-reader names behave correctly.
- [ ] Assessment MCQ states, submit persistence, save errors, back/forward and feedback policy work. No surprise auto-advancement.
- [ ] Voice screen reveals actual microphone state, permission error, paused/reconnecting and end confirmation.
- [ ] Monitoring overview distinguishes AI observation vs inference and supports accessible recording/transcript playback; no fabricated timestamps.
- [ ] Heatmap counts **activity only**, renders legibly on mobile, and has text alternative.
- [ ] No gradient-box/slop elements; no unexpected layout shift; reduced motion tested.
- [ ] No unverified user data or clinical claims. All screens provide real loading/empty/error states.
- [ ] Final change description lists which screens/components were modified, screenshots at phone+desktop, and actual tests performed (no invented assertions).

## 20. Agent handoff prompt (paste with this file)

> Implement or update Smriti AI UI strictly according to the bundled `DESIGN.md` and approved `assets/`. First inventory the repository, locate the existing design tokens/components and available artwork, and preserve functional behavior and clinical privacy boundaries. Use the exact logo and workflow mascots, round multilingual text with correct script shaping, 48px+ targets, meaningful border radii and minimal neutral cards. Keep Assessment red, Companionship yellow and Monitoring blue. Make mobile and desktop layouts **reflow** and test at listed breakpoints and 200% zoom. Include respectful motion (brand pop-out on initial reveal; question bubble pop-out; reduced-motion fallback), accessible MCQs with selection separate from correctness, true session activity heatmap, role-based monitoring logs with cautious AI overview, and synced audio transcript only when timecodes exist. Avoid *all* decorative AI slop. Implement working states and provide actual validation evidence. If any required asset or Gnani language capability is missing, identify the gap explicitly instead of making one up.

---

**Authority note:** This file freezes the intended design *language* and expected behaviors. The precise token HEX values and type stack are implementation recommendations subject to contrast/accessibility testing. Official source assets, feature-to-color mapping, user role separation and agreed mascot identities are higher-priority constraints. No external reference site overrides the Smriti brand.
