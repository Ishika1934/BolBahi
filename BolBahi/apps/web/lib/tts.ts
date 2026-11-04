// Browser SpeechSynthesis TTS wrapper

let isSpeaking = false;

export function stopTTS() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    isSpeaking = false;
  }
}

export function isTTSSpeaking(): boolean {
  return isSpeaking;
}

export function speak(
  text: string,
  lang: 'hi-IN' | 'en-IN' = 'hi-IN',
  onStart?: () => void,
  onEnd?: () => void
) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('SpeechSynthesis not supported');
    if (onEnd) onEnd();
    return;
  }

  stopTTS();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 1.0;
  utterance.pitch = 1.0;

  // Try to find a matching voice
  const voices = window.speechSynthesis.getVoices();
  const matchingVoice = voices.find((v) =>
    lang.startsWith('hi')
      ? v.lang.includes('hi') || v.lang.includes('Hindi')
      : v.lang.includes('en-IN') || v.lang.includes('en')
  );

  if (matchingVoice) {
    utterance.voice = matchingVoice;
  }

  utterance.onstart = () => {
    isSpeaking = true;
    if (onStart) onStart();
  };

  utterance.onend = () => {
    isSpeaking = false;
    if (onEnd) onEnd();
  };

  utterance.onerror = (e) => {
    console.warn('TTS error:', e);
    isSpeaking = false;
    if (onEnd) onEnd();
  };

  window.speechSynthesis.speak(utterance);
}

