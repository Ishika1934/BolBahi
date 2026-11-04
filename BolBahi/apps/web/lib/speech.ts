// Browser Web Speech API wrapper for hi-IN / en-IN

export interface SpeechCallbacks {
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (error: string) => void;
  onEnd?: () => void;
}

export class SpeechHandler {
  private recognition: any = null;
  private silenceTimer: any = null;
  private startInactivityTimer: any = null;
  private isListening: boolean = false;
  private interimTranscript: string = '';
  private finalTranscript: string = '';
  private callbacks: SpeechCallbacks | null = null;
  private submitted: boolean = false;

  public isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }

  private clearTimers() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.startInactivityTimer) {
      clearTimeout(this.startInactivityTimer);
      this.startInactivityTimer = null;
    }
  }

  private resetSilenceTimer() {
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    if (this.startInactivityTimer) {
      clearTimeout(this.startInactivityTimer);
      this.startInactivityTimer = null;
    }
    // 2.2 seconds of silence after speech has started submits the voice command
    this.silenceTimer = setTimeout(() => {
      this.stop();
    }, 2200);
  }

  public start(lang: 'hi-IN' | 'en-IN' = 'hi-IN', callbacks: SpeechCallbacks) {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      callbacks.onError(
        'Web Speech API is not supported in this browser. Please use Google Chrome or Microsoft Edge.'
      );
      return;
    }

    // Force stop any previous instance cleanly without dispatching stale text
    this.clearTimers();
    if (this.recognition && this.isListening) {
      this.isListening = false;
      try {
        this.recognition.abort();
      } catch {}
    }

    this.callbacks = callbacks;
    this.interimTranscript = '';
    this.finalTranscript = '';
    this.submitted = false;

    try {
      // Create fresh recognition instance per session for maximum stability in Chrome/Edge
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;
      this.recognition.lang = lang;

      this.recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = 0; i < event.results.length; ++i) {
          const res = event.results[i];
          if (res.isFinal) {
            final += res[0].transcript + ' ';
          } else {
            interim += res[0].transcript;
          }
        }

        this.finalTranscript = final;
        this.interimTranscript = interim;
        const current = (final + ' ' + interim).trim();

        if (current && this.callbacks) {
          this.callbacks.onInterim(current);
          this.resetSilenceTimer();
        }
      };

      this.recognition.onerror = (event: any) => {
        // 'no-speech' is a normal timeout event in speech recognition
        if (event.error === 'no-speech') {
          console.log('[SpeechHandler] No speech detected, stopping.');
        } else {
          console.warn('[SpeechHandler] error:', event.error);
          if (this.callbacks && !this.submitted) {
            this.callbacks.onError(event.error);
          }
        }
        this.stop();
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.clearTimers();
        this.dispatchFinal();
      };

      this.recognition.start();
      this.isListening = true;

      // Generous 9-second initial timeout if user hasn't said anything yet
      this.startInactivityTimer = setTimeout(() => {
        if (!this.finalTranscript && !this.interimTranscript) {
          this.stop();
        }
      }, 9000);
    } catch (err: any) {
      console.warn('[SpeechHandler] start error:', err);
      callbacks.onError(err.message || 'Microphone could not be started');
      this.isListening = false;
    }
  }

  private dispatchFinal() {
    if (this.submitted) return;
    const result = (this.finalTranscript + ' ' + this.interimTranscript).trim();

    if (result.length >= 2 && this.callbacks) {
      this.submitted = true;
      this.callbacks.onFinal(result);
    } else if (this.callbacks && this.callbacks.onEnd) {
      this.callbacks.onEnd();
    }
  }

  public stop() {
    this.clearTimers();
    if (this.recognition && this.isListening) {
      this.isListening = false;
      try {
        this.recognition.stop();
      } catch {}
    }
    this.dispatchFinal();
  }
}

export const speechHandler = new SpeechHandler();
