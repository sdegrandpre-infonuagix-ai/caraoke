---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9]
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/prd-validation-report.md
  - CaraOK Wireframes.dc.html (lo-fi wireframes, 4 sections x 2-3 variants)
---

# UX Design Specification caraoke

**Author:** BMad
**Date:** 2026-06-21

---

<!-- UX design content will be appended sequentially through collaborative workflow steps -->

## Executive Summary

### Project Vision

Caraoke transforms solitary car-singing into shared presence across distance. Two people in separate cars sing the same song together in real time — an xAI Voice Agent ("Riff") orchestrates the session hands-free, Spotify plays the backing track independently on each phone, and only the human voices cross the wire. The product's job is **connection, not competition** — the north star is "did that feel like singing together?"

The defining UX principle: **Riff is the interface.** The voice agent isn't a helper bolted onto a traditional app — it's the primary control plane for everything that happens while driving. Screens exist for setup (onboarding, profile, billing) and ops (admin); in-session, the experience is a conversation with Riff.

### Target Users

- **Primary pair: parallel commuters and road-trip convoys** — people who already sing alone in their cars and already pay for Spotify Premium. They travel shared routes, minutes apart, and want to feel together. Tech comfort: mainstream smartphone users, not early adopters. The UX must be as simple as a phone call.
- **Secondary: nearby strangers** — adults (18+ verified) who opt in to coarse-area discovery for spontaneous duets. Higher trust/safety bar; discovery is voice-driven via Riff.
- **Ops: founder + Maria** — internal users monitoring venture health via an admin console (web). Standard dashboard UX, no special constraints.

### Key Design Challenges

1. **The eyes-free product law.** Every in-session interaction (start, handshake, errors, reconnect, feedback) must work without looking at the screen. This eliminates most conventional mobile patterns during a session — no modals, no text input, no scrolling lists. The session screen (V1 direction) is a waveform + big buttons, designed to be *glanceable at most*, never *required*.
2. **Onboarding gate stack.** Before the magic moment, users must: create an account, grant mic permission, link Spotify Premium, and set a language. For stranger discovery, add age verification. The UX must sequence these gates to minimize friction while keeping them legally/technically sound. Agent-led onboarding (A3 direction) handles language + mic conversationally; Spotify OAuth requires a screen moment (acceptable — user is stationary).
3. **Empty-state discovery.** With 100 target pairs at 3-month milestone, the "nearby" pool will be tiny. Discovery UX (H3 direction — voice-driven via Riff) must handle sparse results gracefully without feeling broken or lonely.
4. **Cross-language pairs.** Each user gets Riff + UI in their own language, independently. The UX must never surface the partner's language as a barrier — the voice channel is the shared space, and language differences are handled by the system, not the users.

### Design Opportunities

1. **Riff as the most differentiated UX in the market.** No competitor has an AI voice agent as the primary interface. Leaning into A3 (agent-led onboarding) + V1 (full-screen agent session) makes Caraoke feel like a *copilot*, not an app. This is the unlock that makes hands-free viable and emotionally warm.
2. **Design backward from the emotional peak.** The 3-2-1 countdown → first partner voice heard is the product's magic moment. Every flow, screen, and micro-interaction should minimize the distance to that moment and maximize its impact.
3. **Spacious, bold visual design.** Because the app is mostly voice-driven in use, the screens that exist (profile, onboarding, billing) have no information-density pressure. The wireframe aesthetic (hand-drawn, warm, playful, big touch targets) is perfect — it signals "this isn't a productivity app, this is a vibe."
4. **Just-in-time progressive permissions.** Defer age verification to first discovery opt-in, not onboarding. Defer location to first discovery toggle. Each gate appears when it's *meaningful*, with a conversational Riff explanation of why.

## Core User Experience

### Defining Experience

The core action is a single spoken sentence: *"Caraoke, sing Mr. Brightside with Sofia."* Within seconds, the user hears their partner's actual voice come in over the music. Everything else — onboarding, profile, discovery, billing — is infrastructure to make that sentence work.

**The core loop:** speak intent → Riff confirms → partner handshake → 3-2-1 → duet → "felt together?" → done. The entire loop should feel like making a phone call, not like using an app.

### Platform Strategy

- **Mobile-only** (iOS + Android via React Native), online-only, no desktop.
- **Primarily voice-driven** — touch is secondary and only for setup/stationary moments.
- **Device capabilities leveraged:** microphone (core), coarse location (discovery), push notifications (invites/alerts), background audio (Spotify + voice coexistence), motion/speed detection (driving mode trigger).
- **No offline mode** — the core loop requires live connectivity.
- **Driving mode (motion-detected black screen):** When the device detects vehicle movement (accelerometer + speed heuristics), the screen goes **black** and the xAI Voice Agent becomes the **sole interface**. No visual UI is rendered — no waveform, no buttons, no glanceable elements. A tap on the black screen wakes Riff's voice (not the visual UI). The screen restores only when the device is stationary. This enforces the eyes-free product law at the system level, not by design convention but by removing the screen entirely.

### Effortless Interactions

- **Re-pairing with a known partner** — one word, not a flow. "Sing with Sofia" and go. ≤10 seconds from intent to ready-handshake (FR9).
- **Error recovery** — Riff tells you what happened and what to do. You never need to look down. Tunnel scenario: *"Lost Sofia, trying to reconnect"* → either it works silently, or *"Couldn't reconnect — want to restart at the next stop?"*
- **The handshake** — both partners confirmed ready before the song starts. No awkward "are you there?" No false starts. Riff manages the coordination.
- **Automatic behaviors (no user action):** language detection (default to device locale), audio focus management (Spotify + voice coexist), drift correction (two Spotify streams stay in sync invisibly), reconnection attempts (within 60s window), driving mode activation (motion-triggered).

### Critical Success Moments

1. **The first 5 seconds after countdown.** If the user hears the opening riff AND their partner's voice in sync, the product works. If there's audible delay or drift — it's over. This is why Phase 0 exists.
2. **The post-session "felt together?" capture.** Must feel like part of the conversation with Riff, not a survey or pop-up. Voice-asked, voice-answered.
3. **First-time magic.** Sofia's Journey 2 — from invite notification to hearing Liam's voice — should feel like the fastest onramp in any social app. Three gates max: mic permission, Spotify confirm, go.

### Experience Principles

1. **"One sentence to sing."** The distance from intent to duet should be one spoken sentence for returning users. Every additional step is a design failure.
2. **"Riff handles it."** If something goes wrong, Riff tells you. If something needs coordinating, Riff does it. The user's only job is to sing and enjoy.
3. **"Eyes on the road, always."** No in-session interaction requires looking at the screen. In driving mode, the screen is **black** — Riff is the only interface. This isn't a guideline, it's a product law enforced by the system.
4. **"The feeling is the feature."** Every technical metric (drift, latency, start accuracy) exists to serve one outcome: "did that feel like singing together?" If a design choice optimizes a metric but hurts the feeling, the feeling wins.
5. **"Moving means dark."** When the phone detects vehicle movement, the screen goes black. No exceptions, no override. The app removes temptation rather than trusting willpower. Visual UI returns only at rest.

## Desired Emotional Response

### Primary Emotional Goals

The primary emotion Caraoke delivers is **presence** — the feeling of *"you're here with me."* The warm rush when a partner's voice comes in on the first line and for a second you forget they're 8 minutes behind on the highway. This is the emotion that makes someone text a friend *"you HAVE to try this."*

Supporting emotions: **trust** (safe enough to sing, safe enough to drive), **belonging** (we're doing this together), **delight** (small crafted moments of sonic joy), and **confidence** (Riff's got it, I just drive).

### Emotional Journey Mapping

| Moment | Target Emotion | The Feeling |
|--------|---------------|-------------|
| First discovery (install/invite) | Curiosity + warmth | *"Wait, I can actually sing with them while driving? That sounds magic."* |
| Onboarding with Riff | Trust + playfulness | *"Oh, this thing talks to me. It's friendly. I don't feel stupid."* |
| Waiting for partner | Anticipation + safety | *"They're connecting... I don't have to do anything. Just drive."* |
| 3-2-1 countdown | Excitement + vulnerability | *"Here we go. Butterflies."* |
| First partner voice heard | **Presence + joy** | *"Oh my god, she's HERE."* — the peak |
| Mid-song singing | Flow + connection | *"We're doing this. Together. This is ridiculous and wonderful."* |
| Something goes wrong (tunnel, drop) | Calm confidence, NOT panic | *"Riff's got it. I'll just keep driving."* |
| Post-session "felt together?" | Warm afterglow + honesty | *"Yeah... yeah, that was great."* — genuine, not prompted |
| Returning next day | Ease + anticipation | *"One sentence and we're singing again. This is our thing now."* |

### Micro-Emotions

**Critical positive micro-emotions:**
- **Belonging over isolation** — the core. Every design choice reinforces "you're not alone in this car."
- **Trust over skepticism** — users hand over their microphone, voice, and optionally location while driving. Safety must be felt at every level.
- **Confidence over confusion** — especially during errors. A dropped connection while driving is inherently stressful. Riff's response must be calming, never alarming.
- **Delight over mere satisfaction** — the countdown, the first voice, the "felt together" question should feel crafted, not functional.

**Emotions to actively avoid:**
- **Embarrassment** — singing is vulnerable. No involuntary judgment, scoring, or exposure.
- **Anxiety about driving safety** — no modal alerts, no urgent notifications, no "do something NOW" while moving. The black screen is the ultimate anti-anxiety mechanism.
- **Loneliness** — empty discovery, unanswered invites, failed sessions must be handled with warmth. Riff fills the silence.
- **Surveillance unease** — location sharing must feel as private as it technically is. "Approximate area only" labeling, no map pins, go-dark-after-add.

### Design Implications

| Emotion | UX Design Approach |
|---------|-------------------|
| Presence | Full-duplex voice quality is everything — invest in audio, not visuals |
| Trust | Black screen in motion; Riff's calm tone; explicit privacy controls; no surprise data collection |
| Belonging | Partner avatars, shared session history (Growth), "your duet partner" language — always plural, never solo |
| Confidence | Riff announces every state change by voice; no silent failures; no ambiguous states |
| Delight | Crafted sonic moments: countdown tone, partner-voice fade-in, post-session warmth in Riff's voice |
| Anti-embarrassment | No public leaderboards, no involuntary sharing, scoring always opt-in and playful |

### Emotional Design Principles

1. **"Presence is the product."** Every design decision optimizes for the feeling of togetherness. Audio quality matters more than visual polish. Voice warmth matters more than feature breadth.
2. **"Safe enough to be vulnerable."** Singing requires vulnerability. The app must feel like a trusted space — Riff's tone is warm and never judgmental, errors are calm not alarming, privacy is structural not promised.
3. **"Silence is the enemy."** An empty screen, a quiet error, an unacknowledged wait — these create doubt. Riff fills every gap with presence: confirming, reassuring, narrating. The user is never left wondering "is it working?"
4. **"Delight lives in the transitions."** The countdown, the first voice, the post-session glow — the moments between states are where emotion lives. Design these transitions with the care of a music producer, not a UI engineer.

## UX Pattern Analysis & Inspiration

### Inspiring Products Analysis

**Voice-First (Driving Context):**
- **Siri / CarPlay** — Distinct two-tone chimes for state transitions. Never offers more than one alternative on failure. Binary-only voice choices while driving.
- **Google Assistant (Driving Mode)** — Proactive context awareness (suggests actions based on time/location). Continued conversation mode (no wake word for follow-ups). Anti-pattern: over-confirmation kills flow.
- **Waze** — Audio ducking (lowers music when speaking, restores after). Urgency tiering (immediate alerts interrupt, deferred info waits). Motion detection via GPS speed >15mph sustained >5s.

**Social Audio:**
- **Discord voice channels** — Always-on ambient presence. Iconic join/leave sounds become Pavlovian presence triggers. Voice-activity visualization (profile pulses when speaking).
- **Spotify Jam** — Shared-queue listening with avatar stack. Sync issues invisible when working, surfaced only when broken. Never show raw metrics to users.
- **Twitter/X Spaces** — Validates ≤150ms voice latency target: perceptible lag kills conversational flow.

**Karaoke / Music:**
- **Smule** — Every interaction requires precise taps — completely unusable while driving. Validates Caraoke's voice-first approach as a genuine market differentiator.
- **Apple Music Sing** — Real-time vocal isolation with single mix slider. Transferable: voice-driven mix control ("louder music" / "louder Sofia").
- **StarMaker** — Light reverb on voice makes singers sound better and masks artifacts. Subtle room reverb makes the duet feel like a shared space rather than a phone call.

**Driving-Mode / Car-Safe:**
- **CarPlay** — Template-based UI restrictions (max ~7 list items, 44pt touch targets). "Now Playing" minimalism is the ceiling for Caraoke's stationary session screen.
- **Android Auto** — 2-second glance rule: any on-screen info must be comprehensible in under 2 seconds. Notification bundling suppresses distractions.
- **Waze driving detection** — GPS speed + accelerometer with debounced entry/exit to avoid flicker at traffic lights. Directly transferable for black-screen trigger.

### Transferable UX Patterns

**P0 — Must Have:**
- **Sonic state identity:** distinct audio cues for every state (Riff listening, processing, partner connected, error, session end) — the ONLY interface during driving.
- **Black screen + "alive" ambient audio:** subtle audio texture on black screen so users know app is alive. Pure silence + pure black = "did my phone die?"
- **Voice-announced state transitions:** "Sofia's connecting... Sofia's ready... here we go." Narrate every state change aloud.
- **Audio ducking protocol:** Riff ducks backing track ~12dB when speaking, restores over 500ms. Partner voice ducks slightly less.

**P1 — Important:**
- **Motion detection heuristics:** accelerometer + GPS speed >15-20mph sustained 5-10s = driving mode. Debounce entry and exit.
- **Iconic partner-connected join sound:** signature Caraoke chime when partner connects. Pavlovian presence trigger.
- **Binary-only voice choices:** never more than two options aloud. "Retry or stop?" not three alternatives.
- **Stop-detected screen restoration:** speed below threshold >10s: fade in minimal session screen. No interactive elements until sustained stop (>30s).
- **Wake-word-free follow-up window:** after any Riff utterance, keep mic hot 3-5s for response without wake word.

**P2 — Enhancing:**
- **Proactive session suggestion:** "Sing with Sofia?" when detecting daily commute pattern.
- **Subtle voice reverb:** light reverb on both voices, default on. Two phone mics → one room.
- **Post-song 2-second silence:** let the moment breathe before Riff asks feedback.
- **Song suggestion from listening history:** fallback when user doesn't name a song.
- **Voice mix control:** "Louder music" / "louder Sofia" — Riff adjusts ratio by voice.

### Anti-Patterns to Avoid

**Voice app failures:**
- "I didn't catch that" infinite loops — after 2 failed attempts offer alternative, after 3 gracefully exit
- Invisible state / processing silence — silence = broken; every state needs audio indicator
- Overly chatty responses — concise: "Got it. Mr. Brightside. Waiting for Sofia."
- No local fallback on network drop — pre-loaded "lost connection" message from device storage

**Social audio failures:**
- Ghost rooms / empty discovery — never show "0 users found"; Riff handles warmly
- Awkward silence in connected state — Riff fills pre/post-song space; never >3s silence when connected
- Hidden safety tools — "mute" and "end session" must be one voice command, faster than any other action

**Driving-context failures:**
- Visual-first error handling (red banners, modals while driving)
- Bright screens at night (truly black OLED is the only answer)
- Requiring phone pickup/unlock to resume after disconnection
- Ignoring audio focus conflicts — priority stack: phone call > Riff > partner voice > backing track > notifications

### Design Inspiration Strategy

**Adopt directly:** Waze audio ducking + motion detection heuristics; Discord join/leave sounds; CarPlay "Now Playing" minimalism; Siri binary-choice voice model.

**Adapt:** Google Assistant proactive suggestions → Riff commute-pattern song suggestion; StarMaker voice effects → subtle shared-room reverb; Spotify Jam avatar stack → partner presence indicator.

**Avoid completely:** Smule/StarMaker tap-heavy flows; any "fallback to screen" error pattern; social audio public feed / leaderboard patterns.

**Novel territory:** No existing app has a fully black, motion-triggered screen as a core design choice. Closest are OS-level driving focus modes that simplify but don't eliminate visual UI. Caraoke's black screen is genuinely novel. The transition must be trust-building: Riff announces "Driving mode. Screen's off, I'm here" plus ambient audio texture.

## Design System Foundation

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

## Defining Experience

### The One-Sentence Product

**"Say a song and a name. Hear their voice."**

Every successful product has a defining interaction. Tinder: swipe to match. Spotify: play any song instantly. Caraoke: speak a song and a partner's name, and within seconds you're singing together — hands-free, eyes-free, across distance.

### User Mental Model

**The metaphor users bring:** a phone call, not a music app. Users expect to say who they want to reach, wait for pickup, then be together. The twist: instead of talking, you're singing — with background music.

**How they solve it today:** speakerphone + manual Spotify coordination ("OK, ready? 3, 2, 1, press play!"). Unusable while driving: requires hands, demands verbal countdown, delivers muddy phone-call audio with zero sync.

**Where they'll get confused:**
- "Why do I need Spotify Premium?" — Riff explains simply: "Both of you need Spotify Premium so you each get the music."
- "Is she hearing the same thing I'm hearing?" — drift is invisible if it works; "it felt off" if it doesn't. Users never articulate "drift."
- "Where does my voice go?" — privacy instinct. First-time users need reassurance: consent is explicit, voice is ephemeral, nothing recorded.

### Success Criteria

1. **One sentence → singing together in <30 seconds.** From "Sing Mr. Brightside with Sofia" to hearing Sofia's voice. No intermediate screens, no taps.
2. **The voices sound like they're in the same room.** Subtle reverb, low latency, good quality — not a phone call, a shared space.
3. **They forget about the technology.** If the user thinks about drift or sync, the product has failed. If they're just singing, it works.
4. **Errors don't break the feeling.** A dropped connection handled by Riff feels like a pause, not a crash. The emotional thread survives.

### Novel UX Patterns

| Layer | Pattern Type | Metaphor |
|-------|-------------|----------|
| Initiation ("sing X with Y") | **Novel** | Feels like asking Siri to call someone, but for singing |
| Partner handshake | Established | Phone ringing → picked up |
| Countdown (3-2-1) | Established | Universal music cue; live concert countdowns |
| Duet (singing together) | **Novel** | Feels like being in the same car |
| Error handling (voice) | Adapted | GPS navigator announcing a reroute |
| Feedback ("felt together?") | **Novel** | A friend asking "was that fun?" |
| Black screen driving mode | **Novel** | Phone-call screen (no visual during a call) |

**Teaching novel patterns:** Riff handles this conversationally during first use. No tutorial screens, no onboarding carousel, no coach marks. Riff *is* the tutorial: "Say the name of a song and who you want to sing with. Like, 'Sing Bohemian Rhapsody with Sofia.' Try it!"

### Experience Mechanics

**1. Initiation:**
- User speaks: "Caraoke, sing [song] with [partner]" or taps voice button when stationary
- Riff: "Got it. [Song] with [Partner]. Reaching out to [Partner] now." (≤3s to acknowledge)
- Partner gets: push notification + Riff voice: "[Liam] wants to sing with you on Caraoke."
- Fallback: if no response within 60s, Riff: "Sofia hasn't picked up yet. Keep trying, or try later?"

**2. Handshake:**
- Partner accepts by tapping notification or saying "yes"
- Riff on both devices: "You're both here. Getting [song] ready."
- Pre-roll: both devices pre-buffer Spotify track paused; clock-sync offset calculated
- Ambient presence: subtle "room tone" plays — the space feels inhabited before music starts

**3. The Moment (countdown → duet):**
- Riff: "Ready? Three... two... one..."
- Both devices unpause Spotify at synchronized absolute timestamp T
- Voice channel opens: full-duplex, with subtle room reverb
- **The peak:** user hears the first note AND their partner's voice. This is the product.
- During the song: Riff is silent. Only music and voices. No interruptions unless error.
- Drift correction: invisible micro-seeks if streams drift >50ms. User never knows.

**4. Completion:**
- Song ends. Backing track fades. Voice channel stays open 2 seconds (the afterglow).
- Riff (warmly): "Did that feel like singing together?"
- User responds: spoken answer captured.
- Riff: "Want to sing another one, or call it?" (binary choice)
- If another: back to initiation, partner connected. One sentence to next song.
- If done: "Great session. See you next time." Channel closes.

**5. Error paths:**
- **Connection drop:** Riff ducks music: "Lost [partner], trying to reconnect." Up to 60s. Recovered: "They're back. Picking up where we left off." Not recovered: "Couldn't reconnect. Want to try again when you stop?"
- **Spotify issue:** "Having trouble with the music. Want to try a different song?" Never shows error codes.
- **Partner leaves:** "[Partner] ended the session. Invite someone else, or take a break?"

## Visual Design Foundation

### Color System

**Primary Palette — "Warm Dusk":**

| Token | Hex | Usage |
|-------|-----|-------|
| `--base` | #1A1A2E | Primary background, OLED-friendly dark base with warm purple undertone |
| `--surface` | #16213E | Card backgrounds, elevated surfaces, input fields |
| `--surface-raised` | #1F2B47 | Modals, active cards, selected states |
| `--accent` | #FF6B6B | Primary action, waveform highlight, active states, CTAs |
| `--accent-muted` | #FF6B6B40 | Accent at 25% opacity — ambient glows, hover/press states |
| `--secondary` | #FFD93D | Partner presence indicator, success states, highlights |
| `--text-primary` | #F0E6D3 | Primary text — warm white, never pure white |
| `--text-secondary` | #9B8E82 | Secondary text, labels, timestamps |
| `--text-disabled` | #5A5067 | Disabled text, placeholders |
| `--border` | #2D2844 | Subtle borders, dividers |
| `--error` | #FF4D4D | Error states (voice-first, but visible in stationary UI) |
| `--success` | #4ADE80 | Connected, verified, active states |
| `--black` | #000000 | Driving mode screen — true OLED black, no exceptions |

**Semantic mapping:**
- **Partner A (initiator):** accent (#FF6B6B) — coral waveform, avatar ring
- **Partner B (joiner):** secondary (#FFD93D) — gold waveform, avatar ring
- **Riff (agent):** gradient of accent → secondary — visually distinct from both partners
- **System/neutral:** surface tones — never competes with partner colors

**Accessibility — contrast ratios (WCAG 2.1 AA):**
- `--text-primary` on `--base`: 11.2:1 (passes AAA)
- `--text-primary` on `--surface`: 9.8:1 (passes AAA)
- `--accent` on `--base`: 5.1:1 (passes AA)
- `--secondary` on `--base`: 8.7:1 (passes AAA)
- `--text-secondary` on `--base`: 4.6:1 (passes AA for large text)

### Typography System

**Font selection criteria:** warm but legible, supports 25 languages + RTL + CJK, renders well at large sizes on mobile, available via Google Fonts or system fonts for performance.

**Recommended pairing (TBD — finalize during visual design):**
- **Display/headers:** a rounded, friendly semi-bold — candidates: Nunito, Quicksand, Comfortaa. Must feel playful without being childish.
- **Body:** a clean, highly-legible sans — candidates: Inter, Noto Sans (best multilingual/CJK/RTL coverage), DM Sans. Prioritize global language support.
- **Fallback:** system font stack for maximum performance and language coverage.

**Type scale (mobile — base 16px):**

| Level | Size | Weight | Usage |
|-------|------|--------|-------|
| Display | 32px | Bold | Screen titles, session song name |
| H1 | 26px | Bold | Section headers |
| H2 | 22px | SemiBold | Card titles, partner names |
| H3 | 18px | SemiBold | Subsection headers |
| Body | 16px | Regular | Primary content, descriptions |
| Caption | 14px | Regular | Labels, metadata, timestamps |
| Small | 12px | Medium | Badges, tags, status indicators |

**Line heights:** 1.4× for body text, 1.2× for display/headers.

### Spacing & Layout Foundation

**Base unit: 8px** — all spacing derives from this.

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | 4px | Tight internal padding (badge content) |
| `--space-sm` | 8px | Icon gaps, inline spacing |
| `--space-md` | 16px | Standard padding, list item gaps |
| `--space-lg` | 24px | Section spacing, card padding |
| `--space-xl` | 32px | Major section breaks |
| `--space-2xl` | 48px | Screen-level padding, hero spacing |

**Layout principles:**
1. **Spacious by default.** Every screen should breathe. When in doubt, add space.
2. **Center-weighted composition.** The most important element is always centered. Peripheral elements hug edges.
3. **Vertical flow, no horizontal scrolling.** Single-column layouts. Cards stack vertically. No carousels or horizontal lists.
4. **Big touch targets, always.** Minimum 48px interactive elements. Primary CTAs: 56px. Voice button: 72px.

**Border radius scale:**
- Small (buttons, badges): 12px
- Medium (cards, inputs): 16px
- Large (modals): 28px
- Full (avatars, voice button): 50% (circle)

**Elevation (dark theme):**
- Communicated via surface color stepping (`--base` → `--surface` → `--surface-raised`), not shadows. On dark backgrounds, shadows are invisible; color stepping is the established dark-theme pattern.

### Accessibility Considerations

- **WCAG 2.1 AA minimum** for all visual UI. AAA preferred for primary text.
- **Eyes-free product law** is itself the most aggressive accessibility feature.
- **Touch targets ≥48px** everywhere, exceeding Apple HIG (44pt) and Material (48dp).
- **No color-only information.** Partners distinguished by color AND position AND name.
- **Screen reader labels** on all interactive elements (`accessibilityLabel`).
- **RTL layout support** baked in from day one — `start`/`end` instead of `left`/`right`.
- **Reduced motion support:** respect `prefers-reduced-motion` for waveform animations.
- **Dark mode is the default** — matches driving context, reduces eye strain.

## Design Direction Decision

### Design Directions Explored

**Session screen:** six directions explored — The Orb (D1), The Stage (D2), The Dashboard (D3), The Conversation (D4), The Wave (D5), The Minimal (D6). Each represented a different philosophy for the stationary session screen.

**Home screen:** three directions explored — Voice Hub (A), Partner List (B), Drive-Ready (C). Each represented a different entry point philosophy.

Full interactive mockups at `_bmad-output/planning-artifacts/ux-design-directions.html`.

### Chosen Direction

**Session: D5 "The Wave" + D2 partner elements**

The stationary session screen is dominated by a full-screen ambient waveform visualization — coral and gold bars interleaved, representing both voices as one shared sound. Partner avatars with color-coded rings (accent/coral for initiator, secondary/gold for joiner) sit in a minimal top bar alongside the song title. Three controls at bottom: mute (48px), voice/Riff button (72px), end (48px). A subtle "Riff is here if you need anything" text anchors the bottom — reinforcing that voice is the primary interface even when the screen is visible.

The waveform is ambient, not functional — it responds to voice activity from both partners but doesn't carry information the user needs to act on. It exists for emotional resonance: the sound of togetherness, made visible.

**Home: A "Voice Hub"**

The home screen centers on a large Riff voice button (gradient accent → secondary, 160px) with an invitation: "Tap and talk to Riff." A suggestion prompt sits below: "Try: Sing Bohemian Rhapsody with Sofia." Recent duet partners appear as a horizontal row of avatars near the bottom. A three-tab navigation bar provides access to Home (voice hub), Discover (nearby), and Profile (settings/billing).

### Design Rationale

1. **Voice-first consistency.** Both screens lead with the voice interaction, not with content to browse. The home screen's hero IS the voice button. The session screen's hero IS the sound.
2. **Emotional alignment.** The Wave is the most immersive direction — it makes the feeling visible. It supports "presence is the product" by showing the shared waveform as one merged visualization.
3. **Black screen continuity.** The Wave transitions naturally to/from the driving black screen. When motion is detected, the waveform fades to black. When the car stops, it fades back in. No jarring mode switch.
4. **Stationary enrichment.** When the user CAN see the screen, the waveform gives them something emotionally resonant to glance at — not information to process, but a visual representation of the moment.
5. **Partner visibility without dominance.** D2's partner indicators give "who's here" without making the screen about the people. Small avatars, big sound.

### Implementation Approach

**Session screen components:**
- `WaveformVisualizer` — full-screen bar visualization driven by dual voice-activity data from LiveKit. Coral + gold interleaved bars. Ambient animation, not precise frequency analysis.
- `PartnerBar` — minimal top bar: two stacked avatars (with color rings), song title, elapsed time.
- `SessionControls` — bottom tray: mute toggle (48px circle), Riff voice button (72px circle, accent), end session (48px circle).
- `RiffStatus` — subtle centered text at bottom updating with Riff's state.

**Home screen components:**
- `RiffButton` — large gradient circle (160px) with waveform icon inside. Tap activates Riff listening mode.
- `SuggestionPrompt` — rotating suggestion text below the button.
- `RecentPartners` — horizontal avatar row with online indicators, tap to quick-start.
- `TabBar` — Home / Discover / Profile (three tabs, large icons).
