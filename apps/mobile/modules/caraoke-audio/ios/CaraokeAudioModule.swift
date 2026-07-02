import ExpoModulesCore
import AVFoundation

// CaraokeAudioModule — native iOS implementation of the NativeSonicModule contract.
//
// Audio topology:
//   ambientPlayer → ambientMixer ─┐
//                                 ├─ mainMixerNode → outputNode
//   cuePlayer    → cueMixer     ─┘
//
// Spotify (and partner voice via LiveKit) play through their own AVAudioSessions.
// .mixWithOthers lets them keep playing alongside our engine (NFR17/NFR21).
// .duckOthers is toggled per setGains call to ask iOS to attenuate other apps when Riff speaks.
//
// All AVAudioEngine mutations run on `audioQueue` (serial, userInteractive QoS) so the engine
// never receives concurrent mutations from the JS bridge. The restore ramp uses a
// DispatchSourceTimer on that same queue for frame-accurate gain interpolation.
//
// Story 9.5: CaraokeAudioModule conforms to AVSpeechSynthesizerDelegate so that the
// `speechSynthesizer(_:didFinish:)` callback fires when TTS completes, emitting
// `onSpeechEnded` to JS so RiffVoice can release the duck and sequence playback.

public class CaraokeAudioModule: Module, AVSpeechSynthesizerDelegate {

  // MARK: - Audio infrastructure

  private let audioQueue = DispatchQueue(label: "ai.caraoke.audio", qos: .userInteractive)
  private let engine = AVAudioEngine()
  private let ambientPlayer = AVAudioPlayerNode()
  private let cuePlayer = AVAudioPlayerNode()
  private let ambientMixer = AVAudioMixerNode()
  private let cueMixer = AVAudioMixerNode()
  private let synthesizer = AVSpeechSynthesizer()

  private var isAmbientPlaying = false
  private var isDucked = false
  private var restoreSource: DispatchSourceTimer?

  // MARK: - Module definition

  public func definition() -> ModuleDefinition {
    Name("CaraokeAudio")

    // Declares the event name so Expo Modules Core registers it on the JS emitter.
    Events("onSpeechEnded")

    OnCreate {
      self.setupAudioSession()
      self.setupEngine()
      self.synthesizer.delegate = self
    }

    // Play a one-shot named cue from the app bundle (e.g. "session-start.mp3").
    Function("playCue") { (name: String) in
      self.audioQueue.async { self.playCue(name: name) }
    }

    // Apply per-layer gains (dB). Negative backing/partner values trigger .duckOthers so Spotify
    // and the LiveKit partner voice are attenuated by iOS. Ambient gain is applied directly to
    // ambientMixer so we control the fade-in/fade-out of the ambient bed ourselves.
    Function("setGains") { (gains: [String: Double]) in
      self.audioQueue.async { self.applyGains(gains: gains) }
    }

    // Ramp every layer back toward 0 dB over durationMs. Called by AudioDucking.restore()
    // after Riff speech ends (UX-DR4: follow-up window closes, levels return to unity).
    Function("restore") { (durationMs: Int) in
      self.audioQueue.async { self.startRestoreRamp(durationMs: durationMs) }
    }

    // Speak text via AVSpeechSynthesizer with the given BCP-47 language (e.g. "en-CA", "fr-FR").
    Function("speak") { (text: String, language: String) in
      self.speak(text: text, language: language)
    }

    // Start the looping ambient-presence bed (lowest-priority layer, UX-DR3/UX-DR5).
    Function("startAmbient") {
      self.audioQueue.async { self.startAmbient() }
    }

    // Stop the ambient bed.
    Function("stopAmbient") {
      self.audioQueue.async { self.stopAmbient() }
    }
  }

  // MARK: - Setup

  private func setupAudioSession() {
    do {
      try AVAudioSession.sharedInstance().setCategory(.playback, options: [.mixWithOthers])
      try AVAudioSession.sharedInstance().setActive(true)
    } catch {
      // Non-fatal: the app will still function with reduced audio fidelity.
    }
  }

  private func setupEngine() {
    engine.attach(ambientPlayer)
    engine.attach(cuePlayer)
    engine.attach(ambientMixer)
    engine.attach(cueMixer)

    // Use the main mixer's output format for all internal connections.
    let fmt = engine.mainMixerNode.outputFormat(forBus: 0)
    engine.connect(ambientPlayer, to: ambientMixer, format: fmt)
    engine.connect(cuePlayer,    to: cueMixer,    format: fmt)
    engine.connect(ambientMixer, to: engine.mainMixerNode, format: fmt)
    engine.connect(cueMixer,     to: engine.mainMixerNode, format: fmt)

    do {
      try engine.start()
    } catch {
      // Non-fatal: all subsequent audio calls will silently no-op.
    }
  }

  // MARK: - playCue (called on audioQueue)

  private func playCue(name: String) {
    guard engine.isRunning else { return }
    let url = Bundle.main.url(forResource: name, withExtension: "mp3")
           ?? Bundle.main.url(forResource: name, withExtension: "wav")
           ?? Bundle.main.url(forResource: name, withExtension: "caf")
    guard let fileURL = url, let file = try? AVAudioFile(forReading: fileURL) else { return }
    cuePlayer.scheduleFile(file, at: nil, completionHandler: nil)
    if !cuePlayer.isPlaying { cuePlayer.play() }
  }

  // MARK: - setGains (called on audioQueue)

  private func applyGains(gains: [String: Double]) {
    let needsDuck = (gains["backing"] ?? 0) < 0 || (gains["partner"] ?? 0) < 0

    // Story 9.6(c): cancel any in-flight restore ramp the moment a new duck arrives.
    // Without this, the ramp timer keeps ramping ambientMixer.outputVolume back up while
    // the new duck is trying to hold it down — causing a volume fight.
    if needsDuck && !isDucked {
      restoreSource?.cancel()
      restoreSource = nil
    }

    // Ambient layer: our AVAudioEngine controls this directly.
    if let ambientDb = gains["ambient"] {
      ambientMixer.outputVolume = dbToLinear(Float(ambientDb))
    }
    // Cue/Riff layer: always at unity (0 dB = 1.0 linear).
    cueMixer.outputVolume = 1.0

    // Backing and partner layers belong to other audio sessions (Spotify, LiveKit).
    // Toggle .duckOthers to request iOS-level attenuation of those sessions.
    if needsDuck != isDucked {
      isDucked = needsDuck
      updateSessionDucking(duck: needsDuck)
    }
  }

  // MARK: - restore ramp (called on audioQueue)

  private func startRestoreRamp(durationMs: Int) {
    restoreSource?.cancel()
    restoreSource = nil

    let fromLinear = ambientMixer.outputVolume
    let toLinear: Float = 1.0
    let totalMs = max(durationMs, 1)
    let tickMs = 20
    var elapsed = 0

    let source = DispatchSource.makeTimerSource(queue: audioQueue)
    source.schedule(deadline: .now() + .milliseconds(tickMs),
                    repeating: .milliseconds(tickMs),
                    leeway: .milliseconds(2))
    source.setEventHandler { [weak self] in
      guard let self else { return }
      elapsed += tickMs
      let t = Float(min(Double(elapsed) / Double(totalMs), 1.0))
      self.ambientMixer.outputVolume = fromLinear + (toLinear - fromLinear) * t
      if elapsed >= totalMs {
        self.restoreSource?.cancel()
        self.restoreSource = nil
        self.updateSessionDucking(duck: false)
        self.isDucked = false
      }
    }
    restoreSource = source
    source.resume()
  }

  // MARK: - speak

  private func speak(text: String, language: String) {
    let utterance = AVSpeechUtterance(string: text)
    // Prefer the requested BCP-47 voice; fall back to en-US if the locale isn't installed.
    utterance.voice = AVSpeechSynthesisVoice(language: language)
                   ?? AVSpeechSynthesisVoice(language: "en-US")
    utterance.rate = AVSpeechUtteranceDefaultSpeechRate
    // Stop any in-progress utterance so a new Riff cue always plays immediately.
    if synthesizer.isSpeaking { synthesizer.stopSpeaking(at: .immediate) }
    synthesizer.speak(utterance)
  }

  // MARK: - AVSpeechSynthesizerDelegate (Story 9.5)

  public func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
    sendEvent("onSpeechEnded", [:])
  }

  // MARK: - ambient (called on audioQueue)

  private func startAmbient() {
    guard !isAmbientPlaying, engine.isRunning else { return }
    let url = Bundle.main.url(forResource: "ambient", withExtension: "mp3")
           ?? Bundle.main.url(forResource: "ambient", withExtension: "wav")
           ?? Bundle.main.url(forResource: "ambient", withExtension: "caf")
    guard let fileURL = url,
          let file = try? AVAudioFile(forReading: fileURL),
          let buffer = AVAudioPCMBuffer(pcmFormat: file.processingFormat,
                                        frameCapacity: AVAudioFrameCount(file.length)),
          (try? file.read(into: buffer)) != nil else { return }
    ambientPlayer.scheduleBuffer(buffer, at: nil, options: .loops, completionHandler: nil)
    if !ambientPlayer.isPlaying { ambientPlayer.play() }
    isAmbientPlaying = true
  }

  private func stopAmbient() {
    guard isAmbientPlaying else { return }
    ambientPlayer.stop()
    isAmbientPlaying = false
  }

  // MARK: - Helpers

  private func dbToLinear(_ db: Float) -> Float {
    return pow(10.0, db / 20.0)
  }

  private func updateSessionDucking(duck: Bool) {
    let options: AVAudioSession.CategoryOptions = duck
      ? [.mixWithOthers, .duckOthers]
      : [.mixWithOthers]
    try? AVAudioSession.sharedInstance().setCategory(.playback, options: options)
  }
}
