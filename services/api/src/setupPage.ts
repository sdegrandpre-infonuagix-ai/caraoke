// Static road-test setup guide served at GET /setup. Kept as a module string (not a static
// file) so it compiles into dist automatically — no Dockerfile copy step to keep in sync.
// Self-contained HTML: inline CSS, no external assets.

export const SETUP_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Caraoke — Road-Test Setup</title>
<style>
  :root{
    --ground:#F7F5FA; --card:#FFFFFF; --ink:#221733; --ink-soft:#5A4E6B; --ink-faint:#8A7E9B;
    --accent:#E23C7B; --accent-2:#F2A03D; --line:#E7E1EE;
    --ok:#1E9E6A; --warn:#C77B14; --block:#D6455D;
    --droid:#2FA56A; --ios:#3B7BD1;
    --code-bg:#1E1730; --code-ink:#EDE7F5; --code-faint:#9C8FB4; --code-accent:#FF7FB0;
    --mono:ui-monospace,"SF Mono","Menlo","Consolas","Liberation Mono",monospace;
    --sans:system-ui,-apple-system,"Segoe UI","Helvetica Neue",Arial,sans-serif;
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--ground);color:var(--ink);font-family:var(--sans);
    line-height:1.6;-webkit-font-smoothing:antialiased;}
  .wrap{max-width:820px;margin:0 auto;padding:0 22px 96px;}

  header.mast{padding:52px 0 30px;border-bottom:1px solid var(--line);margin-bottom:8px;}
  .brand{display:flex;align-items:center;gap:11px;font-weight:800;letter-spacing:-0.02em;font-size:20px;}
  .dot{width:11px;height:11px;border-radius:50%;background:var(--accent);box-shadow:0 0 0 4px rgba(226,60,123,.16);}
  h1{font-size:clamp(30px,5.5vw,46px);line-height:1.04;letter-spacing:-0.03em;font-weight:830;margin:22px 0 12px;text-wrap:balance;}
  h1 .hl{color:var(--accent);}
  .lede{font-size:18px;color:var(--ink-soft);max-width:60ch;margin:0;}
  .statusline{display:flex;flex-wrap:wrap;gap:8px;margin-top:22px;}

  .chip{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:650;padding:4px 10px;
    border-radius:999px;border:1px solid var(--line);background:var(--card);letter-spacing:.01em;white-space:nowrap;}
  .chip .led{width:7px;height:7px;border-radius:50%;background:var(--ink-faint);}
  .chip.ok{color:var(--ok);border-color:#BEE7D4;background:#EDF9F3;} .chip.ok .led{background:var(--ok);}

  .who{font-family:var(--mono);font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--ink-faint);}

  section{margin-top:46px;}
  .eyebrow{font-family:var(--mono);font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);font-weight:700;margin:0 0 6px;}
  h2{font-size:26px;letter-spacing:-0.02em;font-weight:800;margin:0 0 16px;text-wrap:balance;}
  h3{font-size:17px;font-weight:750;margin:0;letter-spacing:-0.01em;}
  p{margin:12px 0;} a{color:var(--accent);text-underline-offset:2px;}

  .note{border:1px solid var(--line);border-left:3px solid var(--ink-faint);border-radius:10px;background:var(--card);padding:14px 16px;margin:14px 0;font-size:15px;}
  .note.warn{border-left-color:var(--warn);background:#FDF8EE;}
  .note.ok{border-left-color:var(--ok);background:#F0FAF5;}
  .note.block{border-left-color:var(--block);background:#FCF0F2;}
  .note .t{font-weight:750;display:block;margin-bottom:3px;} .note b{font-weight:750;}

  ol.steps{list-style:none;counter-reset:s;margin:0;padding:0;display:flex;flex-direction:column;gap:14px;}
  ol.steps>li{counter-increment:s;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px 20px;}
  .shead{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;}
  .num{font-family:var(--mono);font-weight:700;color:var(--accent);font-size:14px;min-width:26px;}
  .num::before{content:counter(s,decimal-leading-zero);}
  .shead h3{flex:1;min-width:200px;}
  ol.steps p{margin:8px 0 0;font-size:15px;color:var(--ink-soft);}

  .code{background:var(--code-bg);border-radius:11px;margin:12px 0 2px;overflow:hidden;border:1px solid #2E2444;}
  .code .bar{display:flex;align-items:center;gap:8px;padding:7px 12px;border-bottom:1px solid #2E2444;font-family:var(--mono);font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:var(--code-faint);}
  .code .bar .d{width:8px;height:8px;border-radius:50%;background:#4A3D63;}
  .code pre{margin:0;padding:13px 15px;overflow-x:auto;font-family:var(--mono);font-size:13px;line-height:1.7;color:var(--code-ink);}
  .code pre .c{color:var(--code-faint);} .code pre .k{color:var(--code-accent);}
  code.inline{font-family:var(--mono);font-size:.88em;background:#EFEAF4;color:#4A2E52;padding:1px 6px;border-radius:5px;}

  .track{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:6px 22px 20px;margin-top:16px;border-top:4px solid var(--tc,var(--accent));}
  .track.droid{--tc:var(--droid);} .track.ios{--tc:var(--ios);}
  .track .thead{display:flex;align-items:center;gap:10px;padding:16px 0 4px;}
  .track .badge{font-family:var(--mono);font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#fff;background:var(--tc);padding:3px 9px;border-radius:6px;}
  .track h2{margin:0;font-size:22px;}
  .track .sub{color:var(--ink-faint);font-size:13.5px;margin:2px 0 0;}
  ol.mini{margin:14px 0 0;padding-left:0;list-style:none;counter-reset:m;display:flex;flex-direction:column;gap:12px;}
  ol.mini>li{counter-increment:m;padding-left:34px;position:relative;font-size:15px;color:var(--ink-soft);}
  ol.mini>li::before{content:counter(m);position:absolute;left:0;top:0;width:23px;height:23px;border-radius:50%;
    background:color-mix(in srgb,var(--tc) 14%,#fff);color:var(--tc);font-family:var(--mono);font-weight:700;font-size:12px;
    display:flex;align-items:center;justify-content:center;}
  ol.mini b{color:var(--ink);font-weight:700;}

  footer{margin-top:56px;padding-top:20px;border-top:1px solid var(--line);color:var(--ink-faint);font-size:13px;}
</style>
</head>
<body>
<div class="wrap">
  <header class="mast">
    <div class="brand"><span class="dot"></span>caraoke</div>
    <h1>Get Caraoke on <span class="hl">both phones</span></h1>
    <p class="lede">Build once on your PC, install on each phone — your Android and your friend's
      iPhone — then pair up for your first duet against the live backend.</p>
    <div class="statusline">
      <span class="chip ok"><span class="led"></span>Backend live · api.caraoke.ai</span>
      <span class="chip ok"><span class="led"></span>Google sign-in verified on device</span>
      <span class="chip ok"><span class="led"></span>Spotify Premium linking verified</span>
      <span class="chip ok"><span class="led"></span>Voice + sync live</span>
    </div>
  </header>

  <section>
    <p class="eyebrow">Line these up first</p>
    <h2>Prerequisites</h2>
    <div class="note ok">
      <span class="t">✓ Sign in with Google works</span>
      Confirmed end-to-end on a real device. Use a Google account added as a <b>test user</b> on
      the OAuth consent screen — that's you and your friend. (Apple sign-in isn't in this build; Google covers both platforms.)
    </div>
    <div class="note ok">
      <span class="t">✓ Apple Developer Program — enrolled</span>
      Done. That's what lets an iOS build land on your friend's iPhone via device registration (below).
    </div>
    <div class="note warn">
      <span class="t">Spotify Premium on both phones</span>
      The duet plays each person's own Spotify, so <b>both accounts must be Premium</b>. Linking
      + the Premium check are confirmed working; a non-Premium account is told plainly rather than half-connected.
    </div>
  </section>

  <section>
    <p class="eyebrow">You · once on your PC · builds BOTH phones in the cloud</p>
    <h2>Build step</h2>
    <p style="margin-top:-4px;color:var(--ink-soft)">EAS builds the iPhone app on Apple hardware
      in the cloud — <b>no Mac required</b>. The backend config is already baked into the build
      profile, so there's no <code class="inline">.env</code> to create. Run these from
      <code class="inline">apps/mobile</code>.</p>
    <ol class="steps">
      <li>
        <div class="shead"><span class="num"></span><h3>Install the build CLI &amp; sign in</h3><span class="who">You · PC</span></div>
        <div class="code"><div class="bar"><span class="d"></span>PowerShell</div><pre>npm i -g eas-cli
eas login</pre></div>
      </li>
      <li>
        <div class="shead"><span class="num"></span><h3>Register your friend's iPhone</h3><span class="who">You · PC → friend</span></div>
        <p>Ad-hoc iOS builds only run on <b>registered devices</b>, so do this <b>before</b> the iOS build. It prompts your Apple login (2FA) the first time, then prints a link.</p>
        <div class="code"><div class="bar"><span class="d"></span>PowerShell · apps/mobile</div><pre>eas device:create   <span class="c"># choose the URL / QR option</span></pre></div>
        <p>Send the link to your friend. They open it <b>in Safari on the iPhone</b>, then install the profile it downloads: <b>Settings → General → VPN &amp; Device Management → Profile Downloaded → Install</b>. That enrolls their device.</p>
      </li>
      <li>
        <div class="shead"><span class="num"></span><h3>Build both apps</h3><span class="who">You · PC → cloud</span></div>
        <p>Each finishes with its own install link. On the iOS build, when it asks <b>which devices</b> to include, pick your friend's iPhone — EAS creates the signing cert + ad-hoc profile automatically.</p>
        <div class="code"><div class="bar"><span class="d"></span>PowerShell · apps/mobile</div><pre>eas build --profile preview --platform android
eas build --profile preview --platform ios</pre></div>
      </li>
    </ol>
  </section>

  <section>
    <p class="eyebrow">Now, on each phone</p>
    <h2>Two tracks</h2>

    <div class="track droid">
      <div class="thead"><span class="badge">You</span><h2>Android</h2></div>
      <p class="sub">Your phone · standalone APK, no laptop tether</p>
      <ol class="mini">
        <li>Open the <b>Android build link</b> from EAS on your phone and download the APK.</li>
        <li>Tap the file → allow <b>"install from unknown apps"</b> when prompted → install. (Reinstalling over an old copy? Uninstall the old one first.)</li>
        <li>Open Caraoke → <b>Continue with Google</b> (your test-user account) → you land on the home screen.</li>
        <li><b>Connect Spotify</b> → approve → it shows your Premium status. Then pick your language.</li>
      </ol>
    </div>

    <div class="track ios">
      <div class="thead"><span class="badge">Your friend</span><h2>iPhone</h2></div>
      <p class="sub">Their phone · installs the build you sent — no Mac, no building</p>
      <ol class="mini">
        <li>Confirm their iPhone is the one you <b>registered</b> in the build step — an ad-hoc build won't install on any other device.</li>
        <li>Open the <b>iOS build link</b> from EAS and install.</li>
        <li>First launch: <b>Settings → General → VPN &amp; Device Management</b> → trust the developer profile.</li>
        <li>Open Caraoke → <b>Continue with Google</b> (a test-user account) → <b>Connect Spotify</b> (Premium) → pick language.</li>
      </ol>
    </div>
  </section>

  <section>
    <p class="eyebrow">Both · the payoff</p>
    <h2>Your first duet</h2>
    <ol class="steps">
      <li>
        <div class="shead"><span class="num"></span><h3>Pair up &amp; open voice</h3><span class="who">Both</span></div>
        <p>The <b>host</b> taps <b>Start a duet</b> and shares the invite; the <b>guest</b> types the
          <b>6-character code</b> or taps the invite link
          (<code class="inline">https://api.caraoke.ai/join?token=…</code>). Both tap <b>I'm ready</b> →
          <b>Open voice</b> → you hear each other → <b>Start singing</b>.</p>
      </li>
      <li>
        <div class="shead"><span class="num"></span><h3>Make each phone the Spotify device</h3><span class="who">Both · important</span></div>
        <p>On <b>each</b> phone: open <b>Spotify</b> → tap the <b>Connect / devices</b> icon → choose
          <b>this phone</b> (its own name) — <b>not</b> a TV, speaker, or Chromecast → play any track and
          confirm the sound comes <b>from the phone</b> → leave it playing and switch back to Caraoke.
          Caraoke can only drive Spotify on a phone that's the active device.</p>
      </li>
      <li>
        <div class="shead"><span class="num"></span><h3>Host picks the song</h3><span class="who">Host</span></div>
        <p>On the singing screen the <b>host</b> types a <b>song + artist</b> and taps <b>Sing this</b>.
          Both phones start that track together — each on its own Spotify — while you hear each other
          over voice. The guest just sings along. For the real feel, do it on the road, not parked.</p>
      </li>
    </ol>
    <div class="note warn">
      <span class="t">If a song won't start</span>
      It's almost always the Spotify device. Re-open Spotify on the phone, pick <b>this phone</b> under
      Connect, and start a track so it's the <b>active</b> device — then try <b>Sing this</b> again.
    </div>
  </section>

  <section>
    <p class="eyebrow">Scope of this build</p>
    <h2>What's in, what's not</h2>
    <div class="note ok">
      <span class="t">Working</span>
      Google sign-in, Spotify Premium linking, invite-link + pairing-code joining, live voice, and
      host-driven <b>typed</b> song requests with a synchronized start on both phones.
    </div>
    <div class="note warn">
      <span class="t">Not in this test</span>
      Voice song requests ("say the song") — for now the host <b>types</b> the song. Also: Apple
      sign-in (use Google), billing, and stranger discovery. Playback runs through Spotify's API,
      so each phone must be its own active Spotify device (above). The dev backend scales to zero
      when idle, so the <b>first request after a quiet spell takes a few seconds to warm up</b>.
    </div>
  </section>

  <footer>
    caraoke road-test setup · backend api.caraoke.ai (dev, ca-central-1) · everything the build needs is baked into the EAS <code style="font-family:var(--mono)">preview</code> profile; server secrets live in AWS Secrets Manager.
  </footer>
</div>
</body>
</html>`;
