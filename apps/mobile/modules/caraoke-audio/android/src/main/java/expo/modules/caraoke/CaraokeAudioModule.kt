package expo.modules.caraoke

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.MediaPlayer
import android.media.SoundPool
import android.media.TextToSpeech
import android.os.Build
import android.os.Handler
import android.os.Looper
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.Locale
import kotlin.math.pow

// CaraokeAudioModule — native Android implementation of the NativeSonicModule contract.
//
// Audio strategy:
//  - AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK: Android asks other apps (Spotify) to duck
//    themselves; we don't silence them, just request priority while Riff speaks (NFR17/NFR21).
//  - SoundPool for one-shot cue playback: low-latency, pre-decoded in RAM.
//  - MediaPlayer for the looped ambient bed: simplest API for a looping raw resource.
//  - TextToSpeech for Riff voice: on-device, BCP-47 locale, no network call.
//  - Handler-based 20 ms tick ramp for the 500 ms gain restore (MediaPlayer.setVolume).
//
// All gain/focus work runs on the main thread (Handler) to avoid AudioManager threading
// restrictions; SoundPool.play is thread-safe.

class CaraokeAudioModule : Module() {

  private val context: Context
    get() = requireNotNull(appContext.reactContext) { "React context unavailable" }

  private val mainHandler = Handler(Looper.getMainLooper())

  private var audioManager: AudioManager? = null
  private var focusRequest: AudioFocusRequest? = null   // API 26+

  private var soundPool: SoundPool? = null
  private val soundIds = mutableMapOf<String, Int>()   // cue name → SoundPool id

  private var ambientPlayer: MediaPlayer? = null
  private var ambientVolume: Float = 1.0f
  private var isDucked = false

  private var tts: TextToSpeech? = null
  private var ttsReady = false

  private var restoreRunnable: Runnable? = null

  // ── Module definition ────────────────────────────────────────────────────────

  override fun definition() = ModuleDefinition {
    Name("CaraokeAudio")

    // Declares the event name so Expo Modules Core registers it on the JS emitter (Story 9.5).
    Events("onSpeechEnded")

    OnCreate {
      setupAudio()
    }

    OnDestroy {
      teardown()
    }

    // Play a one-shot named cue from res/raw (e.g. "session_start.mp3 / .wav").
    // Cue names from the JS layer use hyphens; Android raw names use underscores.
    Function("playCue") { name: String ->
      playCue(name)
    }

    // Apply per-layer gains (dB). Negative backing/partner values request audio focus
    // with TRANSIENT_MAY_DUCK so Android asks Spotify to lower its volume.
    // Ambient gain is applied directly to our MediaPlayer.
    Function("setGains") { gains: Map<String, Double> ->
      mainHandler.post { applyGains(gains) }
    }

    // Ramp all layers back toward 0 dB over durationMs (the duck-restore, UX-DR4).
    Function("restore") { durationMs: Int ->
      mainHandler.post { startRestoreRamp(durationMs) }
    }

    // Speak text via TTS in the given BCP-47 language (e.g. "en-CA", "fr-FR").
    Function("speak") { text: String, language: String ->
      speak(text, language)
    }

    // Start the looping ambient-presence bed (UX-DR3/UX-DR5).
    Function("startAmbient") {
      mainHandler.post { startAmbient() }
    }

    // Stop the ambient bed.
    Function("stopAmbient") {
      mainHandler.post { stopAmbient() }
    }
  }

  // ── Setup / teardown ─────────────────────────────────────────────────────────

  private fun setupAudio() {
    audioManager = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager

    val attrs = AudioAttributes.Builder()
      .setUsage(AudioAttributes.USAGE_MEDIA)
      .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
      .build()

    soundPool = SoundPool.Builder()
      .setMaxStreams(4)
      .setAudioAttributes(attrs)
      .build()

    tts = TextToSpeech(context) { status ->
      ttsReady = status == TextToSpeech.SUCCESS
      if (ttsReady) {
        tts?.setOnUtteranceProgressListener(object : android.speech.tts.UtteranceProgressListener() {
          override fun onStart(utteranceId: String?) {}
          override fun onDone(utteranceId: String?) {
            // Emit to JS so RiffVoice can release the duck and sequence playback (Story 9.5).
            sendEvent("onSpeechEnded", mapOf<String, Any>())
          }
          @Deprecated("Required override for API < 21")
          override fun onError(utteranceId: String?) {}
        })
      }
    }
  }

  private fun teardown() {
    restoreRunnable?.let { mainHandler.removeCallbacks(it) }
    stopAmbient()
    soundPool?.release()
    soundPool = null
    tts?.shutdown()
    tts = null
    abandonAudioFocus()
  }

  // ── playCue ──────────────────────────────────────────────────────────────────

  private fun playCue(name: String) {
    val pool = soundPool ?: return
    val rawName = name.replace('-', '_')
    val id = soundIds.getOrPut(rawName) {
      val resId = context.resources.getIdentifier(rawName, "raw", context.packageName)
      if (resId == 0) return   // cue file not bundled — silent no-op
      pool.load(context, resId, 1).also { loadedId ->
        if (loadedId == 0) return
      }
    }
    // Play at full volume, no loop, default rate.
    pool.play(id, 1.0f, 1.0f, 1, 0, 1.0f)
  }

  // ── setGains (main thread) ───────────────────────────────────────────────────

  private fun applyGains(gains: Map<String, Double>) {
    val ambientDb = (gains["ambient"] ?: 0.0).toFloat()
    val newVolume = dbToLinear(ambientDb)
    ambientVolume = newVolume
    ambientPlayer?.setVolume(newVolume, newVolume)

    val needsDuck = (gains["backing"] ?: 0.0) < 0.0 || (gains["partner"] ?: 0.0) < 0.0
    if (needsDuck && !isDucked) {
      requestAudioFocus()
      isDucked = true
    }
  }

  // ── restore ramp (main thread, 20 ms ticks) ──────────────────────────────────

  private fun startRestoreRamp(durationMs: Int) {
    restoreRunnable?.let { mainHandler.removeCallbacks(it) }
    val fromVolume = ambientVolume
    val toVolume = 1.0f
    val totalMs = maxOf(durationMs, 1).toLong()
    val tickMs = 20L
    val startMs = System.currentTimeMillis()

    val runnable = object : Runnable {
      override fun run() {
        val elapsed = System.currentTimeMillis() - startMs
        val t = (elapsed.toFloat() / totalMs.toFloat()).coerceIn(0f, 1f)
        val volume = fromVolume + (toVolume - fromVolume) * t
        ambientVolume = volume
        ambientPlayer?.setVolume(volume, volume)

        if (elapsed >= totalMs) {
          ambientVolume = 1.0f
          abandonAudioFocus()
          isDucked = false
          restoreRunnable = null
        } else {
          mainHandler.postDelayed(this, tickMs)
        }
      }
    }
    restoreRunnable = runnable
    mainHandler.postDelayed(runnable, tickMs)
  }

  // ── speak ────────────────────────────────────────────────────────────────────

  private fun speak(text: String, language: String) {
    if (!ttsReady) return
    val locale = try {
      Locale.forLanguageTag(language).let { if (it.language.isEmpty()) Locale.US else it }
    } catch (_: Exception) {
      Locale.US
    }
    tts?.language = locale
    // "riff" utteranceId is required so UtteranceProgressListener.onDone fires (Story 9.5).
    tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "riff")
  }

  // ── ambient (main thread) ────────────────────────────────────────────────────

  private fun startAmbient() {
    if (ambientPlayer?.isPlaying == true) return
    val resId = context.resources.getIdentifier("ambient", "raw", context.packageName)
    if (resId == 0) return
    try {
      ambientPlayer?.release()
      ambientPlayer = MediaPlayer.create(context, resId)?.apply {
        isLooping = true
        setVolume(ambientVolume, ambientVolume)
        start()
      }
    } catch (_: Exception) {
      // Non-fatal: app works without the ambient bed.
    }
  }

  private fun stopAmbient() {
    ambientPlayer?.stop()
    ambientPlayer?.release()
    ambientPlayer = null
  }

  // ── Audio focus (TRANSIENT_MAY_DUCK so Spotify ducks, not pauses) ────────────

  private fun requestAudioFocus() {
    val manager = audioManager ?: return
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val attrs = AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_MEDIA)
        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
        .build()
      val req = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
        .setAudioAttributes(attrs)
        .setAcceptsDelayedFocusGain(false)
        .build()
      focusRequest = req
      manager.requestAudioFocus(req)
    } else {
      @Suppress("DEPRECATION")
      manager.requestAudioFocus(null, AudioManager.STREAM_MUSIC,
        AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
    }
  }

  private fun abandonAudioFocus() {
    val manager = audioManager ?: return
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      focusRequest?.let { manager.abandonAudioFocusRequest(it) }
      focusRequest = null
    } else {
      @Suppress("DEPRECATION")
      manager.abandonAudioFocus(null)
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private fun dbToLinear(db: Float): Float = 10.0.pow((db / 20.0).toDouble()).toFloat()
}
