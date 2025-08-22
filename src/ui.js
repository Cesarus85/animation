// ./ui.js
export class UI {
  constructor() {
    this.hud = document.getElementById('hud');
    this.scoreEl = document.getElementById('score');
    this.livesEl = document.getElementById('lives');
    this.timerEl = document.getElementById('timer');
    this.fpsEl = document.getElementById('fps');
    this._toastTimer = null;

    // Equation-Banner (immer sichtbar im DOM Overlay)
    this.eqEl = document.getElementById('equation');

    // Lautstärke-Regler hinzufügen
    this.audioManager = null;
    this.volumeSlider = document.createElement('input');
    Object.assign(this.volumeSlider, {
      type: 'range',
      min: '0',
      max: '1',
      step: '0.01',
      value: '0.7'
    });

    const volRow = document.createElement('div');
    volRow.className = 'row';
    const volLabel = document.createElement('span');
    volLabel.textContent = 'Volume';
    volRow.appendChild(volLabel);
    volRow.appendChild(this.volumeSlider);
    if (this.hud) this.hud.appendChild(volRow);

    this.volumeSlider.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      this.audioManager?.setVolume(v);
    });
  }

  setHudVisible(v) {
    if (this.hud) this.hud.hidden = !v;
    if (this.eqEl) this.eqEl.hidden = !v;
  }

  setScore(v) { if (this.scoreEl) this.scoreEl.textContent = `Score: ${v}`; }
  setLives(v) { if (this.livesEl) this.livesEl.textContent = `Lives: ${v}`; }
  setTimer(v) { if (this.timerEl) this.timerEl.textContent = `Zeit: ${v}`; }
  setFps(fps) { if (this.fpsEl) this.fpsEl.textContent = `FPS: ${fps}`; }

  setEquation(text, color = '#ffffff') {
    if (this.eqEl) {
      this.eqEl.textContent = text;
      this.eqEl.style.color = color;
      this.eqEl.hidden = false;
    }
  }

  toast(msg, ms = 2500) {
    let el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      Object.assign(el.style, {
        position: 'fixed', top: '18px', left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(10,10,10,0.75)', color: '#fff', padding: '10px 14px',
        borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)', zIndex: 9999, fontWeight: 600
      });
      document.body.appendChild(el);
    }
    el.textContent = msg; el.style.opacity = '1';
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => el && (el.style.opacity = '0'), ms);
  }

  setAudioManager(am) {
    this.audioManager = am;
    if (this.volumeSlider) {
      this.volumeSlider.value = am.volume.toString();
    }
  }
}
