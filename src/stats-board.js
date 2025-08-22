// ./stats-board.js
import * as THREE from 'three';

export class StatsBoard {
  constructor(initialLives = 3) {
    this.correct = 0;
    this.wrong = 0;
    this.lives = initialLives;

    // Canvas setup
    this.canvas = document.createElement('canvas');
    this.canvas.width = 512;
    this.canvas.height = 128;
    this.ctx = this.canvas.getContext('2d');

    // Texture + material
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.geometry = new THREE.PlaneGeometry(0.6, 0.15);
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

  decrementLives() {
    this.lives = Math.max(0, this.lives - 1);
    this.updateDisplay();
  }

  reset(lives = 3) {
    this.correct = 0;
    this.wrong = 0;
    this.lives = lives;
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
    const text = `Richtig: ${this.correct} | Falsch: ${this.wrong} | Leben: ${this.lives}`;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillText(text, w / 2 + 2, h / 2 + 2);

    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, w / 2, h / 2);

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
