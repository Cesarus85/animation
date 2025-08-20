// ./audio-manager.js
export class AudioManager {
  constructor() {
    this.sounds = new Map();
    this.audioContext = null;
    this.isLoaded = false;
    this.volume = 0.7; // Standardlautstärke
  }

  async ensureLoaded() {
    if (this.isLoaded) return;
    
    try {
      // AudioContext erstellen (muss nach User-Interaktion sein)
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Audio-Dateien laden
      await Promise.all([
        this._loadSound('coin', './assets/coin.wav'),
        this._loadSound('bump', './assets/bump.wav')
      ]);
      
      this.isLoaded = true;
      console.log('Audio-Manager: Sounds geladen');
      
    } catch (error) {
      console.warn('Audio-Manager: Fehler beim Laden der Sounds:', error);
      // Fallback: stille Funktion
      this.playSound = () => {};
    }
  }

  async _loadSound(name, url) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      this.sounds.set(name, audioBuffer);
      console.log(`Audio geladen: ${name}`);
      
    } catch (error) {
      console.warn(`Fehler beim Laden von ${url}:`, error);
      // Platzhalter für fehlende Datei
      this.sounds.set(name, null);
    }
  }

  playSound(soundName, volume = null) {
    if (!this.audioContext || !this.isLoaded) {
      console.warn('Audio-Manager: Nicht initialisiert');
      return;
    }

    const audioBuffer = this.sounds.get(soundName);
    if (!audioBuffer) {
      console.warn(`Audio-Manager: Sound '${soundName}' nicht gefunden`);
      return;
    }

    try {
      // AudioContext wieder aufnehmen falls suspended
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      // Source und Gain Node erstellen
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();
      
      source.buffer = audioBuffer;
      
      // Lautstärke setzen
      const effectiveVolume = volume !== null ? volume : this.volume;
      gainNode.gain.setValueAtTime(effectiveVolume, this.audioContext.currentTime);
      
      // Audio-Graph verbinden
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      // Abspielen
      source.start(0);
      
    } catch (error) {
      console.warn(`Fehler beim Abspielen von '${soundName}':`, error);
    }
  }

  playCoinSound() {
    this.playSound('coin', 0.5); // Etwas leiser für angenehme Erfahrung
  }

  playBumpSound() {
    this.playSound('bump', 0.6);
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume)); // 0-1 begrenzen
  }

  dispose() {
    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch (error) {
        console.warn('Fehler beim Schließen des AudioContext:', error);
      }
    }
    this.sounds.clear();
    this.audioContext = null;
    this.isLoaded = false;
  }
}