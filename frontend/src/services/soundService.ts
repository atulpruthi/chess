/**
 * Sound Service for Chess Game Audio
 * Provides sound effects for various chess events
 */

class SoundService {
  private enabled: boolean = true;
  private volume: number = 0.5;
  private audioContext: AudioContext | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'AudioContext' in window) {
      this.audioContext = new AudioContext();
    }
    // Check localStorage for saved preferences
    const savedEnabled = localStorage.getItem('soundEnabled');
    const savedVolume = localStorage.getItem('soundVolume');
    
    if (savedEnabled !== null) {
      this.enabled = savedEnabled === 'true';
    }
    if (savedVolume !== null) {
      this.volume = parseFloat(savedVolume);
    }
  }

  /**
   * Play a simple beep sound using Web Audio API
   */
  private playBeep(frequency: number, duration: number, volume: number = this.volume) {
    if (!this.enabled || !this.audioContext) return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + duration);
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  }

  /**
   * Play move sound - soft click
   */
  playMove() {
    this.playBeep(300, 0.1, this.volume * 0.3);
  }

  /**
   * Play capture sound - sharper tone
   */
  playCapture() {
    this.playBeep(400, 0.15, this.volume * 0.4);
    setTimeout(() => this.playBeep(200, 0.1, this.volume * 0.2), 50);
  }

  /**
   * Play castle sound - double beep
   */
  playCastle() {
    this.playBeep(350, 0.1, this.volume * 0.3);
    setTimeout(() => this.playBeep(350, 0.1, this.volume * 0.3), 100);
  }

  /**
   * Play check sound - warning tone
   */
  playCheck() {
    this.playBeep(600, 0.2, this.volume * 0.5);
  }

  /**
   * Play checkmate sound - victory fanfare
   */
  playCheckmate() {
    this.playBeep(400, 0.15, this.volume * 0.4);
    setTimeout(() => this.playBeep(500, 0.15, this.volume * 0.4), 150);
    setTimeout(() => this.playBeep(600, 0.3, this.volume * 0.5), 300);
  }

  /**
   * Play error sound - low tone
   */
  playError() {
    this.playBeep(150, 0.2, this.volume * 0.3);
  }

  /**
   * Play success sound - ascending tones
   */
  playSuccess() {
    this.playBeep(400, 0.1, this.volume * 0.3);
    setTimeout(() => this.playBeep(500, 0.1, this.volume * 0.3), 100);
    setTimeout(() => this.playBeep(600, 0.15, this.volume * 0.4), 200);
  }

  /**
   * Play game start sound
   */
  playGameStart() {
    this.playBeep(440, 0.15, this.volume * 0.4);
    setTimeout(() => this.playBeep(550, 0.2, this.volume * 0.4), 150);
  }

  /**
   * Play notification sound
   */
  playNotification() {
    this.playBeep(660, 0.15, this.volume * 0.35);
  }

  /**
   * Enable/disable sound
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    localStorage.setItem('soundEnabled', enabled.toString());
  }

  /**
   * Get current enabled state
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Set volume (0-1)
   */
  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    localStorage.setItem('soundVolume', this.volume.toString());
  }

  /**
   * Get current volume
   */
  getVolume(): number {
    return this.volume;
  }

  /**
   * Toggle sound on/off
   */
  toggle(): boolean {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }
}

// Export singleton instance
export const soundService = new SoundService();
