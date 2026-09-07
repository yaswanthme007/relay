# RELAY — Rules

**Read `RELAY_PLAYBOOK.md` first.** It is the single source of truth for what this product is, why each decision was made, and what the acceptance tests assert. `BUILD_PHASES.md` is the execution order.

This file is rules only. It deliberately carries no rationale that the playbook already carries — where a rule needs a reason, it cites `playbook §N`. Do not copy playbook content into this file or into `BUILD_PHASES.md`.

---

## 1. Eligibility rules — breaking any one of these can disqualify the submission

**`modelId: "mistv2"` explicit on every single Rime request.** HTTP, WebSocket, and evidence scripts alike. Never omit it, never rely on a default, never pass a variable that could be empty. Omitting it silently routes to Mist v3, which ignores `{phoneme}` strings and returns no error (playbook §2). This is the most likely silent failure in the project.

**Credentials never reach the browser.** `RIME_API_KEY` and `GROQ_API_KEY` live only in server-side environment variables read by `server/config.py`. Never in `web/`, never in a `VITE_*` variable, never in a committed file, a doc, a screenshot, or the demo recording. The browser talks only to the FastAPI server; the server is the only thing that opens `wss://users-ws.rime.ai/ws3`.

**`.env.example` carries placeholders only.** No live values, ever, not even briefly.

**Persona data is synthetic.** `Ananya Sharma`, `Dr. Raghunathan`, the prescriptions, the pharmacy — all invented. Document that they are invented in `docs/persona.md`. No real patient data, no clinical recordings.

**Fallbacks are disclosed, never silent.** If any path falls back off Rime, it must be visible in the UI and written into the README.

**Rime is the default path in the judged flow, and the active provider is observable in the UI.** The provider badge already exists at [SessionPage.tsx:243-245](web/src/pages/SessionPage.tsx#L243-L245) — it must reflect real connection state, not a hardcoded string.

**Verify model IDs against the live catalog before hardcoding them.** Rime's model support and Groq's model IDs both rotate; `llama-3.3-70b-versatile` in particular. Do not copy an ID out of a document and assume it is live.

---

## 2. Contract rules

**The frontend's TypeScript interfaces are the contract. The Pydantic models mirror them — not the reverse.**

| Type | Defined at |
|---|---|
| `Candidate` | [SessionPage.tsx:10-14](web/src/pages/SessionPage.tsx#L10-L14) |
| `HeardEntry` | [SessionPage.tsx:16-21](web/src/pages/SessionPage.tsx#L16-L21) |
| `LedgerEntry` | [LedgerPage.tsx:10-17](web/src/pages/LedgerPage.tsx#L10-L17) |

Renaming a field or changing a type is a two-sided change or it is a bug. If a backend need genuinely requires a new field, add it to both sides in the same change.

**Confidence thresholds are defined once and used identically on both sides.** The frontend uses `> 0.85` (high / statement) and `>= 0.5` (medium / question) in `getConfidenceLabel`, `getConfidenceClass`, and `getDeliveryMode` at [SessionPage.tsx:37-53](web/src/pages/SessionPage.tsx#L37-L53). `server/prosody.py` must use those exact boundaries. Do not introduce a third set of thresholds anywhere.

**`confidence` is a float `0.0`–`1.0`.** Not a percentage, not a string. The UI multiplies by 100 for display.

**`HeardEntry.time` is `"HH:MM:SS"`, 24-hour.** `cutAt` is present only when `status === 'cut'`.

**`LedgerEntry.phoneme` is the full Rime bracket string including braces** (e.g. `{m1Etf1OrmIn}`), or `""` when not yet phonemized. `covered` means the term was already in Rime's dictionary before the ledger. `verified` means a human confirmed the phoneme string.

---

## 3. Frontend rules

**The UI is finished. Do not redesign it.** No restyling, no re-layout, no swapping component libraries, no rewriting copy, no adding a fourth route.

**Replace mocks in place.** Delete `mockCandidates` and `mockHeardLog` ([SessionPage.tsx:24-34](web/src/pages/SessionPage.tsx#L24-L34)) and `initialLedger` ([LedgerPage.tsx:20-33](web/src/pages/LedgerPage.tsx#L20-L33)), and feed the same existing state variables — `rawTranscript`, `heardLog`, `ledger`, `selectedCandidate` — from real data. The render tree should not need to change.

**Session settings become real, not new.** `voiceName`, `situation`, `floorHoldActive` already exist as local state. Wire them to the backend; do not add new controls for them.

---

## 4. Engineering rules

**Stream Rime audio chunks straight through to the client as they arrive.** Never accumulate a full clip server-side. Hidden buffering defeats AT-2, which measures what the user actually hears (playbook §5).

**Every stale-context audio chunk is counted, then discarded.** Never silently dropped. `rime_ws.py` exposes a per-context discarded-chunk counter and `session_ws.py` forwards it to the client. That counter is AT-3's assertion target — a zero count during a real barge-in test means the test is not stressing the system, not that fencing works (playbook §5).

**The mic stays open while Rime audio is playing.** Full-duplex is an explicit requirement.

**Audio out uses Web Audio `AudioContext`, not `<audio>` tags.** Sample-accurate timing for AT-2 and instant flush for AT-3 both require it.

---

## 5. Out of scope — do not reopen

- **Multilingual / Tamil / Hindi.** Killed deliberately: Coda supports those languages but not `phonemizeBetweenBrackets`, and deterministic pronunciation of the user's own name is the point of the product (playbook §2). It belongs in README "Future work" as a documented trade-off, not in the build.
- **Telephony.**
- **Any new feature after the hour-14 cut line.** After hour 14 the only work is evidence (playbook §6).

If someone argues for one of these mid-build, the answer is no.

---

## 6. Process rules

- **No git commits unless explicitly asked.**
- **`RIME_EVIDENCE.md` with the AT-1/AT-2/AT-3 claims stated is committed before the build starts**, so git history proves the tests predated the results. Results get filled in later; the claims do not get rewritten to match whatever happened.
- **Disclose honest losses in the evidence.** Terms already correct at baseline are not wins; terms still wrong after the ledger are recorded as losses.
