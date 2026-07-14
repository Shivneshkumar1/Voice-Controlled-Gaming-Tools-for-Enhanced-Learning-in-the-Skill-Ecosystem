export class SpeechManager {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.supported = false;

    // Check compatibility
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.supported = true;
      
      // Default configurations
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
    } else {
      console.warn('Web Speech API is not supported in this browser.');
    }
  }

  isSupported() {
    return this.supported;
  }

  start(onResult, onError, onEnd) {
    if (!this.supported) {
      if (onError) onError('Speech API not supported in this browser.');
      return;
    }

    if (this.isListening) {
      this.recognition.stop();
    }

    this.isListening = true;

    this.recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (onResult) {
        onResult({
          text: finalTranscript || interimTranscript,
          isFinal: finalTranscript.length > 0
        });
      }
    };

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      this.isListening = false;
      if (onError) onError(event.error);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (onEnd) onEnd();
    };

    try {
      this.recognition.start();
    } catch (e) {
      console.error('Failed to start speech recognition:', e);
      this.isListening = false;
      if (onError) onError(e.message);
    }
  }

  stop() {
    if (this.supported && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }
}
