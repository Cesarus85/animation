// ./stats-board.js
import * as THREE from 'three';

export class StatsBoard {
  constructor() {
    this.correct = 0;
    this.wrong = 0;
    this.lives = 3;
    this.timerValue = 0;

    // Canvas setup
    this.canvas = document.createElement('canvas');
    this.canvas.width = 768;
    this.canvas.height = 192;
    this.ctx = this.canvas.getContext('2d');

    // Texture + material
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.geometry = new THREE.PlaneGeometry(0.9, 0.225);
    this.material = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      side: THREE.DoubleSide,
      toneMapped: false,
      depthTest: false,
      depthWrite: false
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.renderOrder = 2000;
    this.mesh.frustumCulled = false;

    this.updateDisplay();
  }

  incrementCorrect() {
    this.correct++;
    this.updateDisplay();
  }

  incrementWrong() {
    this.wrong++;
    this.updateDisplay();
  }

  setLives(value) {
    this.lives = value;
    this.updateDisplay();
  }

  setTimer(value) {
    this.timerValue = value;
    this.updateDisplay();
  }

  reset() {
    this.correct = 0;
    this.wrong = 0;
    this.lives = 3;
    this.timerValue = 0;
    this.updateDisplay();
  }

  updateDisplay() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Hintergrund und Border
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, w, h);

    // Text zeichnen
    ctx.font = 'bold 48px system-ui, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const line1 = `Richtig: ${this.correct} | Falsch: ${this.wrong}`;
    const line2 = `Leben: ${this.lives}`;
    const line3 = `Zeit: ${this.timerValue}`;

    const y1 = h / 4;
    const y2 = h / 2;
    const y3 = (3 * h) / 4;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillText(line1, w / 2 + 2, y1 + 2);
    ctx.fillText(line2, w / 2 + 2, y2 + 2);
    ctx.fillText(line3, w / 2 + 2, y3 + 2);

    ctx.fillStyle = '#ffffff';
    ctx.fillText(line1, w / 2, y1);
    ctx.fillText(line2, w / 2, y2);
    ctx.fillText(line3, w / 2, y3);

    this.texture.needsUpdate = true;
  }

  dispose() {
    this.mesh?.removeFromParent();
    this.geometry?.dispose?.();
    this.material?.dispose?.();
    this.texture?.dispose?.();
    this.mesh = null;
    this.geometry = null;
    this.material = null;
    this.texture = null;
    this.ctx = null;
    this.canvas = null;
  }
}
