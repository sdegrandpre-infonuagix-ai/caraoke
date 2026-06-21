---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish', 'step-12-complete']
inputDocuments:
  - PRD.md
  - USER_STORIES.md
  - ARCHITECTURE.md
documentCounts:
  briefs: 0
  research: 0
  brainstorming: 0
  projectDocs: 3
classification:
  projectType: mobile_app
  domain: general
  complexity: high
  projectContext: brownfield
workflowType: 'prd'
---

# Product Requirements Document - caraoke

**Author:** BMad
**Date:** 2026-06-21

> **Supersedes:** This PRD replaces the legacy root-level `PRD.md`, `USER_STORIES.md`, and `ARCHITECTURE.md`, which described an earlier peer-to-peer playback-sync model with on-device scoring/lyrics as core. Those documents are **deprecated** — this PRD's voice-only-sync + simultaneous-independent-playback model is the authoritative source for all downstream work (UX, Architecture, Epics).

## Executive Summary

Caraoke is a mobile app (iOS/Android) that lets two people in separate cars sing the same song together in real time, turning solitary car-singing into a shared duet that makes distance feel smaller. It targets pairs already traveling shared routes — parallel commuters and road-trip convoys — where both people sing alone today and wish they were singing together. The core problem is not technical novelty but emotional: people on the same road, minutes apart, have no hands-free way to share the music moment they're each already living. Caraoke's job is **presence** — the feeling of "you're here with me" across distance — delivered safely while driving.

The product works by pairing two phones into a session orchestrated by an **xAI Voice Agent** on each device. A user speaks a song request; the agents coordinate and trigger **simultaneous Spotify playback** on both phones (each user requires Spotify Premium) via a Spotify MCP integration, then open a **full-duplex, low-latency voice channel** so each person hears the other's live singing layered over their own backing track. Crucially, the song audio is *not* streamed peer-to-peer — only voice is — which makes the experience tractable but introduces backing-track drift between two independent Spotify streams as the central reliability risk.

### What Makes This Special

The differentiator is **frictionless, hands-free togetherness in the one place people most want it: the car.** The duct-tape alternative — speakerphone plus both users manually starting Spotify — is unusable while driving: it demands hands, manual countdown sync, and delivers muddy phone-call audio. Caraoke's unlock is the AI voice agent, which makes session coordination invisible enough to use behind the wheel, paired with real duet-quality voice instead of a phone call. The core insight is that every ingredient already exists — people sing alone in cars, already pay for Premium, already travel shared routes — and the only missing piece was hands-free coordination, which conversational voice agents now make possible for the first time. The product's north star is connection, not competition: scoring and karaoke-game mechanics are secondary to the feeling of singing *with* someone.

## Project Classification

- **Project Type:** Mobile App (iOS/Android via React Native + native audio modules)
- **Domain:** Consumer Entertainment / Social-Audio (general — the "car" is context, not an automotive-safety domain)
- **Complexity:** High — three hard problems stacked: real-time full-duplex voice (WebRTC-class), drift between two independent Spotify playback streams with no shared timeline, and multiple third-party dependencies on the critical path (Spotify Premium API/MCP, xAI Voice Agents, Stripe payments, Google Plus Codes)
- **Project Context:** Brownfield (planning) — building on an existing `PRD.md`, `USER_STORIES.md`, and `ARCHITECTURE.md`, with this PRD correcting the architecture model from peer-to-peer playback sync to simultaneous-independent-playback + voice-only sync

## Success Criteria

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

## Product Scope

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

## User Journeys

### Journey 1 — The Initiator (happy path): Liam, parallel commuter
**Situation:** Liam and his partner Sofia leave for different offices every morning, 8 minutes apart on the same highway. They used to call on speaker — awkward silences, can't both pick music, and he hates holding the phone while driving. **Goal:** feel like they started the day *together*, hands-free, legally, safely.

- **Opening:** Sun's up, Liam pulls onto the on-ramp. He says aloud, *"Caraoke, sing Mr. Brightside with Sofia."* No tapping, no looking down.
- **Rising action:** His xAI agent confirms by voice, pings Sofia's session, and waits for her to be ready. Liam keeps both hands on the wheel and eyes on the road.
- **Climax:** A soft *"3, 2, 1"* — both phones launch the same Spotify track within a heartbeat of each other. Liam hears the opening riff *and Sofia's actual voice* come in on the first line. For a second it feels like she's in the passenger seat.
- **Resolution:** The last note fades. The agent asks aloud, *"Did that feel like singing together?"* Liam, eyes still on the road, just says *"Yeah, that was great."* Captured. He's grinning. He'll do it again tomorrow.

*Reveals:* voice-driven session start, partner-ready handshake, simultaneous-start, live voice mix over local playback, voice-asked feeling capture, hands-free/eyes-free safety design.

### Journey 2 — The Joiner (first-time, with a failure branch): Sofia
**Situation:** Sofia gets Liam's invite. She's never used Caraoke. **Goal:** join *fast*, before the moment passes — she's already driving.

- **Opening:** Her phone announces *"Liam wants to sing with you on Caraoke."* She taps once to accept (or says yes).
- **Rising action:** First-run asks for **microphone permission** (native prompt, clear why), checks her **Spotify Premium**, and sets her **language preference** (defaults to device locale, confirmed by voice) — one of the 25 languages the xAI Voice Agent supports. From then on, the agent converses with her, and the app UI renders, in that language.
- **Climax / failure branch:** If Sofia *isn't* Premium, the agent says so plainly and offers a path (link to upgrade, or "remind me later") — it does **not** silently fail mid-duet. If she's good, she's pulled straight into Liam's session and the duet begins.
- **Resolution:** She sang without ever taking her eyes off the road. Next time, re-pairing with Liam is one word.

*Reveals:* invite/accept flow, first-run permissions, language-preference setup, **Premium gate with graceful recovery**, fast known-partner re-pairing, zero-config join.

### Journey 3 — Mid-drive failure (safety-critical edge case)
**Situation:** Mid-song, Liam hits a dead-zone tunnel. **Goal:** don't turn a dropped connection into a dangerous distraction.

- **Opening:** Voice cuts out; backing tracks start drifting apart.
- **Rising action:** The app detects the drop and **handles it by voice, not by demanding screen interaction** — *"Lost Sofia, trying to reconnect."* No modal Liam feels compelled to poke at while driving.
- **Climax:** Within the reconnection window, the session restores and resyncs both tracks — or, if it can't, the agent cleanly ends with *"Couldn't reconnect — want to restart at the next stop?"*
- **Resolution:** Liam was never tempted to look down. Safety beat the feature.

*Reveals:* drift detection, auto-reconnect within continuity window, **voice-first (eyes-free) error handling**, safe graceful-failure, resync-on-recovery.

### Journey 4 — Founder / Ops: Maria watches the venture's pulse
**Situation:** It's the road to March 2027. Maria (employee) needs to know if Caraoke is *actually working* — not vibes, numbers. **Goal:** see the metrics that decide whether this becomes two full-time jobs.

- **Opening:** Maria opens an internal dashboard over coffee.
- **Rising action:** She checks the signals that matter: **"felt like singing together" rate**, **simultaneous-start accuracy / drift / voice-latency** distributions, **paired 4-week retention**, active pairs, and any spike in failed sessions or Premium-gate drop-offs.
- **Climax:** Drift p95 crept above 50ms on Android yesterday — she flags it to engineering before it dents the "felt together" rate.
- **Resolution:** Decisions are driven by the exact metrics the PRD defined, not guesswork.

*Reveals:* session-health telemetry, the "felt together" analytics pipeline, real-time-metric dashboards, Premium-funnel drop-off tracking, retention/active-pair reporting.

### Journey Requirements Summary
- **Session lifecycle:** voice-driven start, invite/accept, partner-ready handshake, simultaneous-start, end.
- **Nearby discovery (opt-in):** vocal "Discover nearby Caraokes" call; coarse Plus-Code area handshake; add-then-go-dark (no post-add tracking); adults-only.
- **Real-time media:** live full-duplex voice over local Spotify playback, drift detection + correction, resync-on-recovery.
- **Onboarding & access:** native mic-permission flow, **Spotify Premium gate with graceful recovery**, fast known-partner re-pairing.
- **Profile & localization:** each Caraoke user profile stores a **language preference** (one of 25 supported by the xAI Voice Agent). **Both** the agent's spoken interaction **and the full app UI** are localized to that language — independently per user, so a cross-language pair each gets agent *and* interface in their own tongue.
- **Safety (product law):** eyes-free / hands-free by default — *every* in-session interaction (start, ready-handshake, errors, reconnection, feedback capture) is voice-first. Screen taps are permitted only when stationary or for out-of-session setup (install, permissions, Premium upgrade).
- **Reliability:** auto-reconnect within continuity window, clean graceful failure.
- **Feeling capture:** voice-asked post-session prompt spoken by the agent, with spoken-answer capture — **never a tap or screen interaction.**
- **Ops/telemetry:** session-health metrics, "felt together" analytics, real-time-metric dashboards, Premium-funnel and retention reporting.

## Domain-Specific Requirements

Caraoke is not in a regulated domain (no HIPAA/PCI/FDA). But three cross-cutting, non-negotiable constraint areas shape the product — elevated because the app is used **while driving**, processes **voice through a third party**, and performs **real-time stranger discovery** in MVP.

### Driving Safety & Liability
- **Eyes-free / hands-free is a product law, not a feature.** Every in-session interaction (start, ready-handshake, song request, errors, reconnection, nearby-discovery, feedback capture) is voice-first. Screen interaction is permitted only when the vehicle is stationary or for out-of-session setup (install, permissions, Premium upgrade, discoverability toggle).
- Comply with **Apple/Google app-store guidelines for in-vehicle/driving apps** and avoid UI patterns that incentivize looking at the screen while moving.
- Surface a clear **safe-use disclaimer / driver-responsibility notice**; never require the driver to read or tap to recover from a failure.

### Privacy, Voice & Location
- **Microphone:** explicit native consent before any capture; clear disclosure that voice is processed by the xAI Voice Agent (third party). Define audio **retention** (default: ephemeral / not stored beyond session unless the user opts in).
- **Voice data sensitivity:** treat singing/voice as potentially sensitive personal data; document lawful basis. **No voiceprints / biometric identity in MVP — explicit non-goal** (keeps the product out of biometric-privacy law's scope).
- **Location (Discover nearby Caraokes):** **strictly opt-in, off by default.** Use **Google Plus Codes at a deliberately coarse granularity** (neighborhood-level, never a single-cell ~14m precision). Discovery is a **one-shot, ephemeral, area-level handshake** — after User A adds User B, B's location is **never** exposed to A again. No continuous location sharing, no history, no trail. Enforced by design, not policy.
- **Regulatory posture:** GDPR/CCPA-aligned data handling — consent, data-subject access/deletion, data minimization, and clear retention windows for profile, language preference, voice, and (coarse, ephemeral) location.

### Trust & Safety (stranger interaction)
- Required because stranger duet matching is in MVP: **mute, block, and report** for any session; **rapid disconnect** from an uncomfortable session by voice command.
- **Stranger discovery is restricted to verified adults (18+)** via age verification; known-partner duets are exempt from the heaviest controls.
- Define **abuse-handling** for real-time stranger voice (reporting pipeline, repeat-offender handling).

### Third-Party Terms as Hard Constraints
- **Spotify:** Premium-only playback control; **no peer-to-peer re-streaming of Spotify audio** (the voice-only-sync model already honors this); respect API rate limits and MCP terms. Spotify policy change = top product risk.
- **xAI Voice Agent:** operate within usage and data-processing terms; understand how user voice/data is handled by xAI and disclose it. xAI availability/terms = critical-path dependency.
- **Google Plus Codes / location services:** comply with platform location-permission requirements and relevant licensing for Plus Code (Open Location Code) usage.

### Risk Mitigations (summary)
- *Distracted driving* → eyes-free product law + voice-first failure handling + safe-use notice.
- *Stalking via discovery* → coarse Plus Codes + one-shot ephemeral handshake + no post-add tracking (structural, not policy).
- *Harassment in stranger voice* → mute/block/report + adults-only discovery + abuse pipeline.
- *Third-party lock-in* → treat Spotify/xAI/Google as critical-path risks with explicit fallbacks tracked in architecture.

## Innovation & Novel Patterns

### Detected Innovation Areas
1. **Voice-only sync over independent simultaneous playback.** Rather than streaming one shared song peer-to-peer (the obvious-but-licensing-fraught approach), Caraoke plays the *same* track independently on each phone via each user's own Spotify, started in lockstep — and syncs **only the human voices**. This sidesteps music re-streaming/licensing entirely and makes a "hard" real-time-media problem tractable. The novel part isn't any single piece; it's the *decomposition*.
2. **AI Voice Agent as hands-free session orchestrator.** The xAI agent isn't a chatbot bolted on — it's the **control plane**: it interprets intent ("sing X with Y"), fires **MCP tool calls** to Spotify, negotiates the ready-handshake and simultaneous start, and runs all error/feedback flows by voice. Conversational-agent-as-coordinator for a real-time multiplayer session is the actual unlock, and it's only viable now.
3. **Privacy-preserving ephemeral proximity discovery.** "Discover nearby Caraokes" via **coarse Google Plus Codes** with a **one-shot, add-then-go-dark** model is a structurally anti-stalking take on location social discovery — the system *can't* track post-add by design, not by policy.
4. **The reframe itself:** converting a ubiquitous solo ritual (singing alone in the car) into shared **presence across distance** — a genuinely new social-audio category.

### Market Context & Competitive Landscape
- **Single-device karaoke** (Smule, Spotify/Apple lyrics, StarMaker): same-room or async/recorded — not real-time, not cross-car, not hands-free.
- **Group voice / watch-party** (Discord, Spotify Group Session, Airbuds): share *a stream or a call*, but don't solve simultaneous-start + low-latency *duet* voice, and none are built eyes-free for driving.
- **The white space:** real-time, hands-free, **paired** singing presence designed for the car. No incumbent occupies "AI-orchestrated duet over independent Premium playback." Defensibility is the *integration*, not any one component.

### Validation Approach
Validate the riskiest assumption before building the expensive stack.
- **#1 risk — does it *feel* like singing together?** Build a throwaway prototype FIRST: two phones, *manual* simultaneous start, a WebRTC voice channel, no AI agent. Measure real backing-track **drift** and one-way **voice latency** in the wild (highway, cellular), and run the **"felt together?"** test on real pairs. If the feeling isn't there at achievable drift/latency, nothing else matters. **This is the validation north star.**
- **#2 — simultaneous-start & drift empirically:** confirm two independent Spotify streams can be started within ≤200ms and held within ≤50ms over a full song on real networks; if not, learn the correction strategy needed.
- **#3 — willingness-to-pay:** test the monetization probe early (March 2027 clock).
- **#4 — discovery feels safe:** user-test that the Plus-Code/go-dark model is *perceived* as safe, especially by women drivers, before promoting it.

### Risk Mitigation (innovation-specific)
- *Drift exceeds 50ms* → periodic re-sync anchors / lightweight clock-correction nudge; degrade gracefully ("you're slightly ahead") rather than fail; worst case, narrow song catalog to well-behaved tracks first.
- *Voice latency too high on cellular* → regional media relays, codec/jitter-buffer tuning, prioritize voice QoS.
- *xAI/Spotify/Plus-Code dependency breaks* → abstract each behind an internal interface so a provider can be swapped; treat as tracked critical-path risks in architecture.
- *"Feeling" doesn't survive real conditions* → prototype-first plan means we find out cheaply, before committing the build.

## Mobile App Specific Requirements

### Project-Type Overview
Caraoke is a **React Native** app for iOS and Android, with **native audio modules** handling the latency-critical path (mic capture, WebRTC voice, audio-focus management over Spotify playback). The RN layer covers UI, navigation, localization, profile, and the discovery/session flows; anything real-time-audio drops to native. It is **online-only** — the core duet loop requires live connectivity, Spotify streaming, the xAI agent, and signaling.

### Technical Architecture Considerations
- **Hybrid runtime:** RN UI shell + native (Swift/Kotlin) audio engine. Define a clean RN↔native bridge for session/audio events; keep latency-sensitive logic off the JS thread entirely.
- **Real-time audio:** native full-duplex voice (WebRTC-class) layered over each device's local Spotify playback; native audio-focus/session handling so voice and music coexist and survive interruptions (calls, nav prompts).
- **AWS edge-first infrastructure:** host on AWS, and place latency-critical components (voice media relays/TURN, session signaling) at **the edge where available** — AWS Wavelength (carrier/5G edge), Local Zones, and Global Accelerator — to minimize one-way voice latency and tighten simultaneous-start. Fall back to nearest standard AWS region where edge isn't available. CloudFront for localized static assets. This is the primary infrastructure lever for the ≤150ms voice / ≤200ms start targets.
- **Connectivity:** assume mobile/cellular conditions on the road; signaling + media must tolerate handoffs and degrade gracefully (ties to drift/reconnect requirements).

### Platform Requirements
- iOS and Android via React Native; native audio modules per platform.
- Minimum OS versions chosen for reliable low-latency audio + background-audio APIs (set in architecture).
- **No offline mode in MVP** — online-only; lyric/metadata caching deferred to Growth.

### Device Permissions
- **Microphone** — core; explicit native consent with clear purpose; ephemeral handling (no storage by default).
- **Location (coarse)** — only for opt-in "Discover nearby Caraokes"; coarse Plus-Code granularity, requested only when the user enables discovery, never background-tracked.
- **Notifications** — for invitations, partner-ready, and discovery alerts.
- Each permission requested **just-in-time** with a plain-language rationale; full functionality degrades gracefully if location/notifications are declined (mic is the only hard requirement).

### Push Notification Strategy
- **Critical path** for the social loop: session invitations (*"Liam wants to sing"*), partner-ready pings, nearby-discovery alerts, and reconnection prompts.
- Time-sensitive delivery for invites (the moment is fleeting); respect quiet-hours/driving context where possible.
- Platform services (APNs / FCM); plan for token lifecycle and per-user language-localized notification copy (matches the 25-language requirement).

### Store Compliance
- **Driving-app guidelines:** adhere to Apple/Google in-vehicle/driver-distraction policies; the eyes-free product law is the primary compliance mechanism; include a safe-use/driver-responsibility notice.
- **Permission justifications:** mic and location usage strings clearly explained; no over-collection.
- **Age verification:** stranger discovery restricted to **verified adults (18+)**; age gating disclosed and enforced.
- **Data-safety disclosures:** accurately declare voice (processed via xAI), coarse location, and profile data handling in App Store Privacy / Play Data Safety; document retention and third-party processors (Spotify, xAI, Google Plus Codes).
- **Account & data controls:** account deletion and data-deletion paths to satisfy store policy and GDPR/CCPA.

### Implementation Considerations
- Externalize all strings from day one (25-language UI localization is MVP) — bake i18n into the RN foundation, not retrofitted.
- Prototype-first mandate (from Innovation) applies here: validate native-audio drift/latency on real devices/networks before building the full RN feature set.
- Treat **edge availability as variable**: design relays to route to the nearest edge when present and degrade gracefully to regional endpoints, so coverage gaps never break a session — they only cost latency.
- Two-person team reality: lean on RN for breadth, isolate native complexity to the audio module to keep maintenance tractable.

## Project Scoping & Phased Development

### MVP Strategy & Philosophy
**MVP Approach:** Blended **experience MVP** (prove the duet *feels* like presence) + **revenue MVP** (prove pairs will pay) — these are the two things the build must validate before March 2027.
**Resource Requirements:** Two people (founder + Maria). React Native breadth + isolated native audio module to keep the surface tractable.

> ⚠️ **Scope-risk note (PM flag).** The MVP as scoped is heavy for a two-person team against a ~9-month revenue deadline: real-time voice, dual-Spotify drift correction, AI-agent orchestration, 25-language full UI localization, stranger discovery + age verification + trust & safety, AWS edge infra, and a monetization probe. The following are **recommended deferral candidates** if capacity proves tight (decision deferred to sprint-planning, MVP recorded as-is per founder's call):
> - **Stranger discovery + age-verification + T&S** → Growth (proves neither magic nor money; biggest single de-risk).
> - **Full 25-language UI localization** → ship a few launch languages first; keep agent *speech* localization; expand UI in Growth. (Note: founder has currently elected to keep full localization in MVP.)
> - **CarPlay/Android Auto** → already Growth.

### Phase 0 — Validation Prototype (the north star)
Two phones, manual simultaneous start, native WebRTC voice, no AI agent. Measure backing-track drift and one-way voice latency on real highways/cellular; run the "felt together?" test on real pairs. **Gate:** if the feeling doesn't hold at achievable drift/latency, stop and rethink before building the full stack.

### MVP Feature Set (Phase 1)
**Core User Journeys Supported:** Initiator (happy path), Joiner (first-run + Premium gate), Mid-drive failure (safe recovery), Founder/Ops (telemetry).
**Must-Have Capabilities:**
- Known-partner pairing (invite link / pairing code) + fast re-pairing.
- xAI Voice Agent session orchestration (intent → simultaneous start → ready-handshake → errors → feedback), fully voice-first/eyes-free.
- Spotify MCP integration: simultaneous independent playback (Premium required).
- Full-duplex low-latency voice + backing-track drift monitoring/correction.
- Voice-asked post-session "Did that feel like singing together?" capture.
- Microphone consent; per-user language preference; 25-language UI localization.
- "Discover nearby Caraokes" (opt-in, coarse Plus-Code, add-then-go-dark, adults-only) + trust & safety baseline (mute/block/report).
- Stripe billing in profile + administrator console (billing/payments + account/T&S management).
- AWS edge-first infrastructure; session-health + "felt together" telemetry; willingness-to-pay validation.

### Post-MVP Features
**Phase 2 (Growth):** song selection/queue/history; QR/link re-pairing; optional lightweight scoring (playful, never the focus); social sharing; offline lyric/metadata caching; CarPlay/Android Auto; convoy/parallel-commute discovery.
**Phase 3 (Expansion/Vision):** group sessions beyond two cars; real-time duet/harmony modes; themed challenges; streaming integrations beyond Spotify; in-car-system integration.

### Risk Mitigation Strategy
**Technical Risks:** prototype-first validation (Phase 0); provider abstraction for Spotify/xAI/Plus-Code; AWS edge with regional fallback; native audio isolated from JS thread.
**Market Risks:** willingness-to-pay probe early; "felt together" rate and paired retention as truth metrics; validate discovery is *perceived* safe before promoting it.
**Resource Risks:** deferral candidates (stranger discovery, full UI localization) are the pressure-release valves if two people prove too few to hit the timeline.

## Functional Requirements

This FR list is the **binding capability contract**: any feature not listed here will not be designed, architected, or built unless explicitly added.

### Account, Profile & Localization
- **FR1:** A user can create and manage a Caraoke account.
- **FR2:** A user can connect their Spotify Premium account, and the system verifies Premium status.
- **FR3:** A user can set a **language preference** from the 25 supported languages, stored on their profile.
- **FR4:** A user receives all Voice-Agent speech in their own profile language, independently of their partner's language.
- **FR5:** A user receives the full app UI in their own profile language.
- **FR6:** A user can delete their account and associated personal data.

### Session Pairing & Partner Management
- **FR7:** A user can create a duet session and generate an invite (link or pairing code).
- **FR8:** A user can join a duet session via a valid invite link or pairing code.
- **FR9:** A user can save known partners and re-pair with a known partner in **≤10 seconds** (from intent to ready-handshake).
- **FR10:** The system confirms both partners are paired and ready before a song begins (ready-handshake).
- **FR11:** A user is notified (push) of incoming invitations, partner-ready status, and reconnection events.

### Voice-Agent Orchestration (hands-free)
- **FR12:** A user can start and control a session entirely by voice via the xAI Voice Agent (no screen interaction required while in motion).
- **FR13:** A user can request a specific song by voice, and the agent initiates it for the session.
- **FR14:** The Voice Agent coordinates a simultaneous start of the song across both devices.
- **FR15:** The Voice Agent handles errors and interruptions by voice (e.g., announces a lost connection, offers options aloud).
- **FR16:** The Voice Agent asks the post-session feedback question aloud and captures the spoken answer.
- **FR17:** All in-session user interactions are available eyes-free; screen taps are only required when stationary or for out-of-session setup.

### Synchronized Playback
- **FR18:** The system plays the same song independently on each device via each user's Spotify, started in lockstep.
- **FR19:** The system monitors backing-track drift between the two devices during playback.
- **FR20:** The system corrects or compensates for backing-track drift to keep the two streams aligned.
- **FR21:** A user can start, pause, and stop session playback (by voice), reflected on both devices.

### Live Voice Duet
- **FR22:** The system captures each user's microphone input during a session, only after explicit consent.
- **FR23:** The system transmits each user's live voice to their partner in full duplex during the session.
- **FR24:** A user hears their partner's live voice layered over their own backing-track playback.
- **FR25:** The system automatically attempts to reconnect a dropped session within the continuity window and resyncs on recovery.
- **FR26:** The system ends a session gracefully (by voice) when reconnection is not possible.

### Nearby Discovery (opt-in)
- **FR27:** A user can opt in to be discoverable to nearby users looking for a partner (off by default).
- **FR28:** A user can ask the Voice Agent to read out nearby discoverable users within their coarse surrounding area.
- **FR29:** A user is surfaced to others only by coarse area, never by precise location.
- **FR30:** A user can add a discovered nearby user as a partner.
- **FR31:** After a user is added, their location is never exposed to the adder again (no ongoing tracking).
- **FR32:** Nearby discovery is available only to age-verified adults (18+).

### Trust, Safety & Privacy
- **FR33:** A user can mute, block, and report another user during or after a session.
- **FR34:** A user can rapidly disconnect from a session by voice command.
- **FR35:** A user can grant or deny microphone, location, and notification permissions independently, with the app degrading gracefully when optional permissions are denied.
- **FR36:** A user can view and control how their voice, location, and profile data are handled (consent, retention, deletion).
- **FR37:** The system handles abuse reports for stranger voice interactions (reporting pipeline, repeat-offender handling).

### Billing & Payments (user-facing)
- **FR38:** A user can manage a payment method and subscription via **Stripe** from a payment section in their profile.
- **FR39:** A user can view their plan, subscribe, upgrade/downgrade, and cancel.
- **FR40:** A user can view billing history and receipts.
- **FR41:** The system processes payments through Stripe such that **raw card data is never stored by Caraoke** (Stripe handles cardholder data / PCI scope).

### Feedback & Telemetry
- **FR42:** The system records the post-session "felt like singing together" response.
- **FR43:** The system captures session-health metrics (simultaneous-start accuracy, drift, voice latency, continuity, failures).

### Administration & Operations
- **FR44:** An administrator (founder/Maria) can view dashboards of "felt together" rate, real-time-metric distributions, paired retention, active pairs, and Premium-funnel drop-off.
- **FR45:** An administrator can access a billing & payments admin console.
- **FR46:** An administrator can view and manage subscriptions, transactions, refunds, and failed/disputed payments.
- **FR47:** An administrator can view revenue and payment reporting (MRR, churn, failed-payment rate).
- **FR48:** An administrator can manage user accounts in support of billing and trust-&-safety actions (e.g., suspend, resolve disputes).

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
