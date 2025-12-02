export class AudioService {
    private synthesis: SpeechSynthesis;
    private audioCtx: AudioContext | null = null;
    private enabled: boolean = true;
  
    constructor() {
      this.synthesis = window.speechSynthesis;
    }
  
    public setEnabled(enabled: boolean) {
        this.enabled = enabled;
        if (!enabled) {
            this.synthesis.cancel();
        }
    }
  
    public isEnabled() {
        return this.enabled;
    }
  
    public speak(text: string, priority: 'high' | 'low' = 'low') {
      if (!this.enabled) return;
  
      // If high priority, cancel current speech
      if (priority === 'high') {
          this.synthesis.cancel();
      }
  
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.1; // Slightly faster for military feel
      utterance.pitch = 1.0;
      
      // Try to find a good system voice (Google US English or similar)
      const voices = this.synthesis.getVoices();
      const preferredVoice = voices.find(v => v.name.includes('Google US English')) || 
                             voices.find(v => v.lang === 'en-US');
      if (preferredVoice) utterance.voice = preferredVoice;
  
      this.synthesis.speak(utterance);
    }
  
    public playWarningTone() {
      if (!this.enabled) return;
      
      if (!this.audioCtx) {
          this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
  
      const oscillator = this.audioCtx.createOscillator();
      const gainNode = this.audioCtx.createGain();
  
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(440, this.audioCtx.currentTime); // A4
      oscillator.frequency.exponentialRampToValueAtTime(880, this.audioCtx.currentTime + 0.1); // Slide up
  
      gainNode.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.3);
  
      oscillator.connect(gainNode);
      gainNode.connect(this.audioCtx.destination);
  
      oscillator.start();
      oscillator.stop(this.audioCtx.currentTime + 0.3);
    }
  }
  
  export const audioService = new AudioService();