# Prototype QA

Date: 2026-11-10 UTC. Source: local unpublished prototype.

## Automated checks

`npm run check` passes all syntax checks and 40 automated tests (0 failures, 0 skipped). Coverage includes:

- Four-by-sixteen project shape, independent presets, type/bounds/version errors, dense arrays, defensive copies, atomic validation, unknown-key removal and prototype-like JSON fields.
- Event order, audio-clock timing, duplicate play, stop during pending resume, source/timer cleanup, restart, suspended/unsupported audio, and interruption handling.
- Finite audible synthesis, deterministic rendering, expected durations, blank/muted silence, dense-mix peak safety, release tails, PCM headers and sample interleaving.
- HTTP server asset types, loopback serving, unsupported methods, and denied hidden paths.

## Actual browser checks

Chromium through the controlled browser, served by the managed localhost preview at `http://127.0.0.1:4173/`. No direct filesystem browser testing.

Passed:

- Loaded the four-voice starter loop; no automatic playback.
- Toggled a step and verified the accessible pressed state and step count.
- Undid the change; the original pattern returned.
- Started playback, observed transport state, then stopped to beat 1/subdivision 1.
- Edited tempo with native keyboard input to 120 BPM; loop duration changed to 2.00 seconds.
- Arrow/Enter grid editing worked. End reached step 16 on a narrow screen.
- Clear confirmation's Cancel preserved the loop.
- Preset replacement confirmation restored the starter loop.
- Reload restored the saved project state.
- Exported an actual WAV download and independently inspected it: two channels, 44,100 Hz, 16-bit PCM, 136,710 frames / 3.10 seconds for the 96 BPM starter, peak 0.4683 and RMS 0.0801.
- Exported a JSON project, reimported it through the browser file chooser, and confirmed replacement.
- Imported an incomplete JSON fixture; it was rejected without changing the current loop.
- Opened and closed the guide dialog.
- Reviewed desktop and narrow screenshots. Fixed page-wide overflow found during narrow QA. The final narrow DOM measured viewport/page width 485/485 CSS pixels; rack alone remained horizontally scrollable.
- Browser console inspection showed no app-origin errors. The cloud browser extension logged unrelated metadata errors.

## Screenshots

`desktop.jpg`: 1165 × 1122, full-page desktop browser capture.

`mobile.jpg`: 485 × 1559, full-page browser capture at a narrow desktop browser width. This is responsive-layout evidence, **not a physical-phone test**.

Both are original screenshot bytes returned by the browser, in JPEG format. They have not been composited, edited, or AI-generated. `app.json` records source, capture method, timestamps, and SHA-256 checksums.

## Verification limits

Audio synthesis, buffer scheduling, and exported PCM were tested. Human listening through actual speakers/headphones was not performed. Physical iOS/Android devices, Safari, Firefox, screen-reader sessions, and prolonged background/recovery behavior were not tested. Automated tests cover the interruption and pending-resume cases, but do not prove every mobile browser's autoplay behavior.

No remote repository, public URL, or production deployment was created in this task. Tool Shed integration is prepared via the manifest and screenshots, not published.
