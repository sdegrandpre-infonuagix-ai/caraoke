# caraoke — Project Context

## Project Goals

Caraoke is a mobile app (iOS/Android) that lets two people in separate cars sing the same song together in real time, turning solitary car-singing into a shared duet that makes distance feel smaller. It targets pairs already traveling shared routes — parallel commuters and road-trip convoys — where both people sing alone today and wish they were singing together. The core problem is not technical novelty but emotional: people on the same road, minutes apart, have no hands-free way to share the music moment they're each already living. Caraoke's job is **presence** — the feeling of "you're here with me" across distance — delivered safely while driving.

The product works by pairing two phones into a session orchestrated by an **xAI Voice Agent** on each device. A user speaks a song request; the agents coordinate and trigger **simultaneous Spotify playback** on both phones (each user requires Spotify Premium) via a Spotify MCP integration, then open a **full-duplex, low-latency voice channel** so each person hears the other's live singing layered over their own backing track. Crucially, the song audio is *not* streamed peer-to-peer — only voice is — which makes the experience tractable but introduces backing-track drift between two independent Spotify streams as the central reliability risk.

### What Makes This Special

The differentiator is **frictionless, hands-free togetherness in the one place people most want it: the car.** The duct-tape alternative — speakerphone plus both users manually starting Spotify — is unusable while driving: it demands hands, manual countdown sync, and delivers muddy phone-call audio. Caraoke's unlock is the AI voice agent, which makes session coordination invisible enough to use behind the wheel, paired with real duet-quality voice instead of a phone call. The core insight is that every ingredient already exists — people sing alone in cars, already pay for Premium, already travel shared routes — and the only missing piece was hands-free coordination, which conversational voice agents now make possible for the first time. The product's north star is connection, not competition: scoring and karaoke-game mechanics are secondary to the feeling of singing *with* someone.

## Success Metrics

### User Success
The core signal that Caraoke delivers presence: after a session, the **xAI Voice Agent asks aloud "Did that feel like singing together?"** and captures the spoken answer — hands-free and eyes-free, consistent with the safety principle (no tap, no screen). Success = **≥75% "yes"** across sessions. This is the product's truest health metric — it measures the feeling, not the plumbing. Secondary user-success signals: pairs voluntarily start a second session within 7 days (repeat-together behavior), and median session reaches at least one full completed song.

### Business Success
Caraoke is a real venture targeting sustainable full-time operation for a two-person team (founder + Maria) by **March 2027**. Tracked metrics: Daily Active Users (DAU), **paired-retention** (the share of pairs still active after 4 weeks — the unit that matters, since value requires two committed people), and revenue.

- **3-month (Sep 2026):** Concept proven — 100 active pairs, ≥75% "felt together" rate, paired 4-week retention ≥30%.
- **12-month (Jun 2027):** Growth proven — 2,500+ active pairs, paired 4-week retention ≥40%, recurring revenue covering two salaries.
- **March 2027 milestone:** Revenue run-rate sufficient to sustain two full-time salaries. The billing rail is **Stripe** (per-user subscription on top of Spotify Premium). ⚠️ **ASSUMPTION:** the rail exists, but pricing and conversion are unvalidated — the narrow funnel (both users need Premium) makes willingness-to-pay the #1 business risk, and validating it early is an MVP priority.

### Technical Success
The product lives or dies on three real-time metrics, reframed for the simultaneous-independent-playback + voice-only-sync model:

- **Simultaneous-start accuracy:** voice agents trigger both Spotify streams within **≤200ms** of each other (the moment that makes the duet feel real).
- **Backing-track drift:** the two independent Spotify streams stay within **≤50ms** of each other, sustained across a full song (rhythm-coherence threshold). ⚠️ Perceptual threshold to be validated; may warrant research.
- **Voice latency:** one-way live-voice latency **≤150ms** (ceiling for natural duet timing).
- **Session continuity:** ≥90% of sessions keep voice + both backing tracks usable for a full song.
- **Scale:** sustain 50 concurrent paired sessions on target infra (MVP), horizontally scalable beyond.

### Measurable Outcomes
- ≥75% post-session "felt like singing together" rate
- Simultaneous-start within ≤200ms; backing-track drift ≤50ms; voice latency ≤150ms
- Session continuity ≥90% for a full song
- Paired 4-week retention ≥30% (3mo) → ≥40% (12mo)
- 100 active pairs (3mo) → 2,500+ active pairs (12mo)
- Revenue sustaining two full-time salaries by March 2027

## Scope Boundaries

### MVP — Minimum Viable Product
Prove the magic and the willingness to pay.
- Pair two phones into a session (invite link / pairing code).
- xAI Voice Agent on each device: hands-free, voice-driven session start and song request.
- Spotify MCP integration: agents trigger **simultaneous** playback on both phones (Premium required).
- Full-duplex low-latency voice channel between the two singers.
- Backing-track drift monitoring + correction to hold the ≤50ms target.
- Voice-asked post-session "Did that feel like singing together?" prompt, spoken by the xAI Voice Agent with spoken-answer capture (eyes-free, no tap).
- Microphone consent flow (native permission, explicit).
- Per-user **language preference** stored on profile; the xAI Voice Agent converses in that language (25 supported, independently per user — cross-language pairs each hear their own).
- **Full UI localization in all 25 supported languages** (externalized strings, locale-aware formatting, RTL where applicable), matching the Voice Agent's language coverage.
- **"Discover nearby Caraokes"** — a vocal MCP call where the xAI Voice Agent reads out opted-in nearby users looking for a duet partner. Discovery is **strictly opt-in, off by default**, and **coarse-location only** via Google Plus Codes: User A sees opted-in User B *only if* B is currently visible within A's surrounding (deliberately coarse) Plus Code area; A may add B from that momentary list, after which **B's location is never exposed to A again** (one-shot ephemeral handshake — no live location share, no tracking, no trail).
- **Trust & safety baseline** (required because stranger interaction is in MVP): mute, block, report; **stranger discovery restricted to verified adults (18+)** via age verification; abuse handling for real-time stranger voice.
- **Stripe billing** in the user profile (payment method, subscription, receipts) — the real monetization rail — plus an **administrator console** for billing/payments and trust-&-safety management. Willingness-to-pay validation remains an explicit early priority.

### Growth Features (Post-MVP)
- Song selection UI, queue, and history.
- Invitations via QR/link; faster re-pairing of known partners.
- Optional, lightweight **scoring** — reframed as playful, never the focus (connection stays the heart).
- Social sharing of moments; offline caching of lyrics/metadata.
- Convoy/parallel-commute discovery (find your partner faster).

### Vision (Future)
- Group sessions beyond two cars; real-time duet/harmony modes; themed challenges.
- Integration with streaming services beyond Spotify and with in-car audio systems.
- Caraoke as the default way distant people share live music presence — not just in cars.

## Non-Functional Requirements

### Performance
- **NFR1:** Voice-agent simultaneous start triggers both Spotify streams within **≤200ms** of each other.
- **NFR2 (Provisional — pending Phase 0 confirmation):** Backing-track drift between the two devices stays within **≤50ms**, sustained across a full song. This is a perceptual threshold; the Phase 0 validation prototype must empirically confirm (or revise) the value before it is treated as a committed target.
- **NFR3 (Provisional — pending Phase 0 confirmation):** One-way live-voice latency is **≤150ms** under typical mobile/cellular conditions. Phase 0 must confirm this ceiling holds for natural duet timing on real highway/cellular conditions before it is treated as committed.
- **NFR4:** App UI and lyrics/feedback updates respond within **≤200ms** of the triggering event.
- **NFR5:** Latency-critical media (voice relays, signaling) is served from the nearest available edge location, degrading to regional endpoints without breaking sessions.

### Security
- **NFR6 (Encryption everywhere):** All data **in transit** uses TLS 1.2+ (API, signaling, push); all real-time **voice media** is encrypted end-to-end (SRTP/DTLS-class); all data **at rest** (profiles, language prefs, partner lists, telemetry, ephemeral location) is encrypted with strong, centrally-managed keys via a managed key-management service (KMS). No personal, voice, or location data is ever stored or transmitted in plaintext.
- **NFR7 (Payments / PCI):** Card data is handled exclusively by **Stripe**; Caraoke never stores or transmits raw cardholder data, minimizing PCI scope to **SAQ-A**.
- **NFR8 (Voice data):** Singing/voice audio is treated as sensitive and handled **ephemerally** — not retained beyond the session unless the user explicitly opts in. **No voiceprints/biometric identity** (explicit non-goal).
- **NFR9 (Location):** Discovery uses **coarse area only** (never precise coordinates); location is never persisted as a trail and is never exposed after a partner is added.
- **NFR10 (Privacy/compliance):** GDPR/CCPA-aligned and — for the Montreal/Canada launch — compliant with **PIPEDA and Quebec Law 25**: consent, data-subject access/export/deletion, data minimization, documented retention windows, cross-border transfer disclosure, and disclosed third-party processors (Spotify, xAI, Stripe, Google). Personal, voice, and (coarse, ephemeral) location data **reside in Canada (`ca-central-1`) by default.**
- **NFR11 (Access control):** Authenticated access enforced; administrator console restricted to authorized operators; age-verification gate enforced for stranger discovery (18+).

### Scalability
- **NFR12:** Sustain **≥50 concurrent paired sessions** on MVP infrastructure, horizontally scalable beyond via additional edge/regional capacity.
- **NFR13:** Support **10×** growth in active pairs with **<10%** degradation of the real-time performance targets (NFR1–3).

### Reliability & Availability
- **NFR14:** **≥90%** of sessions keep voice + both backing tracks usable for a full song (session continuity).
- **NFR15:** Auto-reconnect a dropped session within the continuity window (target **≤60s**) and resync on recovery; fail gracefully (by voice) when impossible.
- **NFR16:** Backend service availability target **≥99.5%**; third-party outages (Spotify/xAI) degrade gracefully with clear voice messaging rather than silent failure.

### Accessibility
- **NFR17:** **Eyes-free / hands-free by default** — all in-session interaction is operable by voice without screen attention (a safety *and* motor/visual-accessibility property).
- **NFR18:** Visual UI (out-of-session setup) targets **WCAG 2.1 AA** (contrast, touch-target size, screen-reader labels).
- **NFR19:** Full UI + agent speech localized across **25 languages** (with RTL where applicable) as an inclusivity baseline.
- *Note:* the product is inherently audio-centric (singing) — a known limitation for profoundly deaf users; not a target audience for MVP.

### Integration
- **NFR20:** Each critical third party (**Spotify Premium API/MCP, xAI Voice Agent, Stripe, Google Plus Codes, APNs/FCM**) is accessed behind an internal abstraction so a provider can be swapped, and each is treated as a tracked critical-path dependency.
- **NFR21:** Honor each provider's terms as hard constraints — notably **no peer-to-peer re-streaming of Spotify audio** and respect of API rate limits.

## Design Guidelines

Foundation

### Design System Choice

**Visual UI: NativeWind (Tailwind CSS for React Native)** — utility-first styling with Expo SDK 56 compatibility. No component library; all components are custom-built to match the brand's warm, playful aesthetic.

**Sonic UI: Custom audio design system** — a parallel design system for the voice-first driving surface, defining audio cues, Riff voice characteristics, ducking parameters, and ambient textures.

### Rationale for Selection

- **Two-person team, 9-month timeline:** utility-first styling is the fastest path to custom UI without fighting a component library's opinions. No time for override wars.
- **Brand-defining visual identity:** Caraoke's warm, playful visual identity (waveform motifs, spacious layouts, big touch targets) would be diluted by Material Design or any opinionated component library.
- **Small visual surface:** only ~8-10 screens need visual UI. The effort to set up and learn a full component library isn't justified; utility classes + custom components are faster at this scale.
- **Sonic surface is primary:** the most-used "interface" is Riff's voice + audio cues, which no visual design system covers. Defining the sonic system is equally (or more) important than the visual system.
- **Expo SDK 56 compatibility:** NativeWind v4 is stable and maintained for Expo managed workflow with CNG.

### Implementation Approach

**Visual foundation:**
- NativeWind v4 with custom `tailwind.config.js` defining brand tokens (colors, spacing, typography, border-radius)
- Custom components built per-screen need: `WaveformVisualizer`, `AgentBubble`, `PermissionCard`, `PartnerAvatar`, `SessionControls`
- No shared component library dependency; components live in `apps/mobile/src/components/`
- Dark mode support from day one (OLED black for driving-mode remnants; warm dark for nighttime stationary use)

**Sonic foundation:**
- Audio cue library: distinct sounds for Riff listening, Riff processing, partner connected, countdown, error, session end, driving mode on/off
- Riff voice characteristics: warm tone, moderate pace, concise phrasing, calm error delivery
- Audio ducking parameters: Riff speech ducks backing track ~12dB, restores over 500ms; partner voice ducks ~6dB
- Ambient presence texture: subtle low-frequency tone on black screen signaling "app alive"

### Customization Strategy

**Design tokens (visual):**
- `--ink` (#2b2b2b) — primary text/borders
- `--paper` (#fff) — backgrounds
- `--accent` (#ff4d6d) — highlight, waveform accent, active states
- `--muted` (#8a877f) — secondary text
- `--line` (#cfccc4) — dividers, inactive borders
- Typography: **TBD — to be selected during visual design.** Criteria: warm but legible, supports 25 languages + RTL, renders well at large sizes on mobile. Consider a friendly geometric sans (e.g., Nunito, Quicksand class) for body and a bolder weight or distinct display face for headers. Must feel playful without sacrificing readability at driving-glance distance.
- Border radius: large (38px phone frame, 16px cards) — rounded, friendly, never sharp
- Touch targets: minimum 48px (exceeds Apple/Google 44px guideline)

**Design tokens (sonic):**
- Defined as named audio assets + parameter specifications in the UX spec
- Implemented as preloaded audio files in the native audio module
