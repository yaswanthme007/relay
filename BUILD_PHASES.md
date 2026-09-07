# RELAY — Backend Build Phases

Execution order for `server/` and `evidence/`. Rules that must hold across every phase live in [CLAUDE.md](CLAUDE.md). The reasoning behind every decision below lives in [RELAY_PLAYBOOK.md](RELAY_PLAYBOOK.md) — this file does not repeat it.

**Current state:** `web/` is UI-complete and fully mocked. `server/` does not exist. Nothing below has been started.

**Cut line: phases 0–7 must be complete by hour 14.** After hour 14 the only remaining work is phase 8. If time runs short, phase 6 and the receipt half of phase 7 are the cut candidates. Phases 0–5 and phase 8 are not cuttable — evidence is 20% of the score and a fourth feature is worth nothing on its own (playbook §6).

---

## Phase 0 — Ground truth and scaffolding

**Goal:** Prove the platform actually behaves the way the playbook says before writing a line of FastAPI.

**Files:** `.env.example`, `RIME_EVIDENCE.md`, `docs/persona.md`, one throwaway script (scratch, not committed).

**Build:**
1. Check Rime's live model catalog. Confirm `mistv2` still exists and still supports `phonemizeBetweenBrackets`. Confirm the Groq model IDs (`whisper-large-v3-turbo`, `llama-3.3-70b-versatile`) are still live; substitute the current fastest JSON-mode model if not.
2. Send one raw Rime request with `modelId: "mistv2"`, `phonemizeBetweenBrackets: true`, and a bracketed phoneme string. Send the same text again with a deliberately different phoneme string.
3. Write `.env.example` with `RIME_API_KEY=`, `GROQ_API_KEY=`, `ALLOWED_ORIGIN=http://localhost:5173`, `PORT=8000` — placeholder values only.
4. Write `RIME_EVIDENCE.md` with the AT-1 / AT-2 / AT-3 claims and procedures stated and the results sections empty.
5. Write `docs/persona.md` declaring the persona synthetic.

**Done when:** the two clips from step 2 are audibly and byte-wise different. If they are identical, the phoneme flag is being ignored and everything downstream of it is worthless — stop and fix that first.

**Do not:** proceed on the assumption that the docs are current. Do not commit the throwaway script with a key in it.

---

## Phase 1 — Config and models

**Goal:** A FastAPI app the browser can reach, with schemas that mirror the frontend exactly.

**Files:** `server/config.py`, `server/models.py`, `server/main.py`, `server/requirements.txt`.

**Build:**
- `config.py`: pydantic `Settings` reading `RIME_API_KEY`, `GROQ_API_KEY`, `ALLOWED_ORIGIN`, `PORT`. Fail loudly at startup if a key is missing — never fall back to an unauthenticated path.
- `models.py`: `Candidate`, `HeardEntry`, `LedgerEntry` mirroring the TypeScript interfaces named in [CLAUDE.md §2](CLAUDE.md), plus the request/response models for the wire contract in the appendix below.
- `main.py`: app, CORS allowing `ALLOWED_ORIGIN`, route registration, `GET /health`.

**Done when:** `GET /health` returns 200 from the Vite dev server origin with no CORS error in the browser console.

**Do not:** invent field names. Read the two `.tsx` files and match them.

---

## Phase 2 — ASR round trip

**Goal:** Real speech in, real transcript on screen.

**Files:** `server/asr.py`, `POST /api/turn` in `main.py`; frontend `handleMicToggle` at [SessionPage.tsx:120-136](web/src/pages/SessionPage.tsx#L120-L136).

**Build:**
- `asr.py`: bytes in (webm/opus from `MediaRecorder`), transcript string out, via Groq Whisper. Nothing else in this module.
- `POST /api/turn` accepting the audio blob plus `situation` and `userId`, running ASR, returning the real transcript with `candidates` stubbed.
- Frontend: real `MediaRecorder` capture replacing the `setTimeout` simulation; `rawTranscript` fed from the response.

**Done when:** you speak into the mic and your actual (noisy) transcript appears in the Raw ASR panel.

**Do not:** touch the candidate rendering yet.

---

## Phase 3 — Reconstruction

**Goal:** Real candidates, ledger-aware.

**Files:** `server/reconstruct.py`.

**Build:**
- The prompt is given verbatim in playbook §4. Use it as written — do not paraphrase it, and do not copy it into this file.
- Groq call in JSON mode. Parse, validate against `Candidate`, clamp `confidence` into `0.0`–`1.0`, cap the list at 3, drop malformed entries rather than passing them through.
- Thread `{ledger_terms}` from the ledger (a static fixture list is fine until phase 5), `situation` from the session, and the last 3 exchanges as history.
- Handle the model returning prose instead of JSON: retry once, then surface the raw transcript as a single low-confidence candidate rather than crashing the turn.

**Done when:** `mockCandidates` is deleted, real candidates render in the existing cards, and the A/B fixture from playbook §4 demonstrably differs with the ledger in context versus without.

**Do not:** ask the model to "fix the sentence." The constrained-inference framing is the contribution.

---

## Phase 4 — Rime TTS streaming

**Goal:** The core product works — a tapped candidate is spoken in the user's voice.

**Files:** `server/rime_ws.py`, `server/session_ws.py`; frontend `web/src/audio/`.

**Build:**
- `rime_ws.py`: ws3 client. `modelId: "mistv2"` on every send with no exceptions. `phonemizeBetweenBrackets: true`, `pauseBetweenBrackets: true`, `speaker` from session, `audioFormat: mp3`. Per-context chunk accounting from the start — the counter structure must exist now, even though fencing arrives in phase 7 (retrofitting it later is exactly what [CLAUDE.md §4](CLAUDE.md) forbids).
- `session_ws.py`: the browser-facing socket. Handles `speak` and `clear`, emits `audio_chunk`, `context_cleared`, `heard_entry`. Forwards each Rime chunk the moment it arrives.
- Frontend: `AudioContext` playback queue; provider badge driven by real socket state.

**Done when:** you tap a candidate and hear it spoken in the selected voice, with chunks arriving incrementally rather than after a pause.

**Do not:** accumulate chunks server-side to send one blob. That silently invalidates AT-2.

---

## Phase 5 — Pronunciation ledger

**Goal:** The ledger page runs on real data and the phoneme pipeline is scriptable.

**Files:** `server/ledger.py`, `server/relay.db` (SQLite, stdlib `sqlite3`), `evidence/fixtures/vocabulary.json`.

**Build:**
- Coverage API wrapper: term in, `covered` boolean out.
- Phonemize API wrapper: `POST https://optimize.rime.ai/phonemize` with a WAV, returns `phonemeString`.
- SQLite store at `server/relay.db`, schema matching `LedgerEntry`, seeded from `evidence/fixtures/vocabulary.json` (the ~20-term synthetic fixture).
- Injection helper: given candidate text, wrap any known ledger term in its `{phoneme}` string before synthesis. `rime_ws.py` calls this.
- Routes: `GET /api/ledger`, `POST /api/ledger/entry`, `POST /api/ledger/phonemize`.

**Every API-calling function here must be importable and runnable outside FastAPI**, because `evidence/at1_pronunciation.py` reuses them in phase 8. No duplicated Coverage/Phonemize logic in the evidence script.

**Done when:** `initialLedger` is deleted, the Ledger page renders live DB rows, adding a term sets `covered` from a real Coverage call, and posting a recorded WAV returns a phoneme string and flips `verified` to true.

**Do not:** hand-type phoneme strings as the primary path. Hand-writing 8 of them is the documented fallback if the Phonemize round trip eats hours (playbook §10) — and if you take it, cut the AT-1 fixture from 20 terms to 8 rather than mixing methods.

---

## Phase 6 — Confidence-gated prosody

**Goal:** The system's uncertainty becomes audible.

**Files:** `server/prosody.py`.

**Build:**
- `confidence` → `'statement' | 'question' | 'silent'` using the exact thresholds from [CLAUDE.md §2](CLAUDE.md).
- Statement: text unchanged.
- Question: insert `<300>` before the uncertain span and terminate with `?` so intonation rises. `pauseBetweenBrackets: true` is already set in phase 4.
- Silent: return no synthesis request at all. The candidates stay on screen and nothing is spoken.

**Done when:** a >0.85 candidate speaks flat, a 0.5–0.85 candidate has an audible pause and rising intonation, and a <0.5 candidate produces zero audio.

**Do not:** let the silent branch fall through to speaking anyway. Silence is the safety property.

---

## Phase 7 — Floor-holding, barge-in fencing, Heard Receipt

**Goal:** The three system behaviours that no screen can do.

**Files:** `server/rime_ws.py` (fencing), `server/session_ws.py` (receipt), frontend `web/src/audio/`.

**Build:**
- **Floor-hold:** pre-synthesise 4 holding phrases in the session voice at session start, cache them client-side, rotate them. Fire only if reconstruction has not returned within ~400ms, so fast turns are never interrupted. This is why `floorHoldActive` exists in the settings panel.
- **Fencing:** on `clear` from the client, issue Rime's `clear` op, mark the context ID stale, and count every chunk that still arrives from it. Discard them from playback; do not discard them from the count.
- **Receipt:** emit `heard_entry` for what was actually played — `complete` for a finished utterance, `cut` with a real `cutAt` for an interrupted one.

**Done when:** a barge-in mid-playback stops audio in under 150ms, reports a **non-zero** discarded-chunk count, and the receipt shows the cut entry with a measured `cutAt`. `mockHeardLog` is deleted.

**Do not:** treat a zero discarded count as success. It means the test is not stressing the system — increase the injected delay.

---

## Phase 8 — Evidence

**Goal:** Real measured numbers, not planned ones.

**Files:** `evidence/at1_pronunciation.py`, `evidence/at2_latency.md`, `evidence/at3_bargein.py`, `evidence/results/*.csv`, `evidence/clips/at1/{before,after}/`, `RIME_EVIDENCE.md`.

**Build:** the three procedures exactly as specified in playbook §5. AT-1 reuses `server/ledger.py`; AT-2 is measured client-side from `AudioContext.currentTime` with cold and warm runs reported separately; AT-3 injects a fixed 3000ms reconstruction delay and asserts on the discarded-chunk count and the receipt.

**Done when:** every claim in `RIME_EVIDENCE.md` has a measured number and a saved artifact behind it, including the honest losses — terms already correct at baseline and terms still wrong after the ledger.

**Do not:** rewrite a claim to match a disappointing result. The claims were committed in phase 0 for exactly that reason.

---

## Appendix — Wire contract

The playbook describes the architecture but not the wire format. This is the concrete contract, derived from what the frontend already expects.

### `POST /api/turn`

Request: multipart form — `audio` (webm/opus blob), `situation` (`pharmacy` | `clinic` | `home` | `phone`), `userId` (string).

Response:
```json
{
  "transcript": "i nee a refil of met four min five hunred miligrams",
  "candidates": [
    { "text": "...", "confidence": 0.92, "reasoning": "one short clause" }
  ]
}
```

### `WS /ws/tts`

One connection per session, used for every spoken output — floor-hold phrases, confirmation questions, final selected sentence.

Client → server:
```json
{ "type": "speak", "text": "...", "voice": "meadow", "pauseHint": 300 }
{ "type": "clear" }
```
`pauseHint` is optional. `clear` means barge-in: cancel whatever is synthesizing or playing.

Server → client:
```json
{ "type": "audio_chunk", "contextId": "ctx_7f3a", "data": "<base64>" }
{ "type": "context_cleared", "contextId": "ctx_7f3a", "discardedChunks": 4 }
{ "type": "heard_entry", "entry": { "time": "14:32:19", "status": "cut", "text": "Metformin, two fifty—", "cutAt": "0.4s" } }
```
`entry` matches `HeardEntry` exactly. `discardedChunks` is the AT-3 assertion target.

### `GET /api/ledger`

Response: `LedgerEntry[]`, matching the interface exactly.

### `POST /api/ledger/entry`

Request: `{ "word": string, "category": "name" | "medication" | "clinician" | "location" | "phrase" }`

Response: the created `LedgerEntry`, with `covered` set from a real Coverage API call. When `covered` is false the response indicates that an audio recording is needed before the term can be phonemized.

### `POST /api/ledger/phonemize`

Request: multipart — `id` (ledger entry id), `audio` (WAV of the correct pronunciation).

Response: the updated `LedgerEntry` with `phoneme` set from the Phonemize API and `verified` true.
