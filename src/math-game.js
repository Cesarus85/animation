// ./math-game.js
import * as THREE from 'three';
import { EquationDisplay } from './equation-display.js';

export class MathGame {
  constructor(ui, scene, failManager = null) {
    this.ui = ui;
    this.scene = scene;
    this.failManager = failManager;
    this.blocks = [];
    this.correctIndex = 0;
    this.current = { a: 1, b: 1, result: 2, operation: '+' };
    this.texCache = new Map();
    this.equationDisplay = new EquationDisplay(scene);
    
    // Spieleinstellungen (Standard-Werte)
    this.operation = 'addition';
    this.maxResult = 20;
  }

  attachBlocks(blocks, viewerPos = null, viewerQuat = null) {
    this.blocks = blocks || [];
    // Neue separate Anzeigetafeln neben den Blöcken erstellen
    this.blocks.forEach((b, index) => {
      if (!b?.mesh) return;
      if (!b.numberDisplay) {
        b.numberDisplay = this._createNumberDisplay(b.mesh, viewerPos);
        this.scene.add(b.numberDisplay);
      }
    });

    // 3D Gleichungsanzeige erstellen falls Viewer-Position verfügbar
    if (viewerPos && viewerQuat) {
      this.equationDisplay.createDisplay(viewerPos, viewerQuat);
    }

    this._newProblem(true);
  }

  handleHit(blockIndex, hitPosition = null) {
    if (blockIndex == null || !this.blocks[blockIndex]) return false;
    const isCorrect = (blockIndex === this.correctIndex);
    if (isCorrect) {
      this._newProblem(false);
    } else {
      // Falsche Antwort: Spawn Fail-Animation
      if (this.failManager && hitPosition) {
        this.failManager.spawn(hitPosition, new THREE.Vector3(0, 1, 0));
      }
    }
    return isCorrect;
  }

  updateEquationPosition(viewerPos, viewerQuat) {
    this.equationDisplay.updatePosition(viewerPos, viewerQuat);
  }

  setGameSettings(operation, maxResult) {
    this.operation = operation;
    this.maxResult = maxResult;
  }

  dispose() {
    for (const b of this.blocks) {
      if (b?.numberDisplay) {
        b.numberDisplay.traverse(o => {
          if (o.isMesh && o.material?.map) o.material.map.dispose?.();
          if (o.isMesh && o.material) o.material.dispose?.();
          if (o.geometry) o.geometry.dispose?.();
        });
        b.numberDisplay.removeFromParent();
        b.numberDisplay = undefined;
      }
    }
    this.equationDisplay.dispose();
    this.texCache.forEach(tex => tex.dispose?.());
    this.texCache.clear();
  }

  // ---------- intern ----------

  _newProblem(isFirst = false) {
    let a, b, result, operationSymbol, equationText;

    switch (this.operation) {
      case 'addition':
        // a + b = result, result <= maxResult
        a = 1 + Math.floor(Math.random() * Math.min(this.maxResult - 1, 20));
        const bMaxAdd = this.maxResult - a;
        b = 1 + Math.floor(Math.random() * Math.max(1, Math.min(bMaxAdd - 1, 20)));
        result = a + b;
        operationSymbol = '+';
        break;

      case 'subtraction':
        // a - b = result, result >= 0
        result = Math.floor(Math.random() * Math.min(this.maxResult, 20));
        b = Math.floor(Math.random() * Math.min(20, this.maxResult - result)) + 1;
        a = result + b;
        operationSymbol = '-';
        break;

      case 'multiplication':
        // a × b = result, result <= maxResult, nur ganze Zahlen
        a = 2 + Math.floor(Math.random() * Math.min(10, Math.floor(this.maxResult / 2)));
        const bMaxMult = Math.floor(this.maxResult / a);
        b = 2 + Math.floor(Math.random() * Math.max(1, Math.min(bMaxMult - 1, 10)));
        result = a * b;
        operationSymbol = '×';
        break;

      case 'division':
        // a ÷ b = result, nur ganze Zahlen als Ergebnis
        result = 2 + Math.floor(Math.random() * Math.min(this.maxResult - 1, 15));
        b = 2 + Math.floor(Math.random() * Math.min(10, Math.floor(this.maxResult / result)));
        a = result * b; // Sicherstellen, dass Teilung aufgeht
        operationSymbol = '÷';
        break;

      default:
        // Fallback auf Addition
        a = 1 + Math.floor(Math.random() * 10);
        b = 1 + Math.floor(Math.random() * Math.max(1, this.maxResult - a));
        result = a + b;
        operationSymbol = '+';
        break;
    }

    this.current = { a, b, result, operation: operationSymbol };
    equationText = `${a} ${operationSymbol} ${b} = ?`;
    this.ui?.setEquation?.(equationText);
    this.equationDisplay.updateEquation(equationText);

    // Zufälliger Index für korrekte Antwort
    this.correctIndex = Math.floor(Math.random() * Math.min(4, this.blocks.length));

    // 3 plausible Falschantworten generieren
    const answers = new Set([result]);
    const candidates = new Set();
    
    // Plausible Falschantworten je nach Operation
    if (this.operation === 'addition' || this.operation === 'subtraction') {
      for (const d of [-3,-2,-1,1,2,3,4,-4]) {
        const v = result + d; 
        if (v >= 0 && v <= this.maxResult) candidates.add(v);
      }
    } else if (this.operation === 'multiplication') {
      // Falsche Multiplikationsergebnisse
      for (const d of [-2,-1,1,2]) {
        const v1 = (a + d) * b;
        const v2 = a * (b + d);
        if (v1 >= 0 && v1 <= this.maxResult && v1 !== result) candidates.add(v1);
        if (v2 >= 0 && v2 <= this.maxResult && v2 !== result) candidates.add(v2);
      }
    } else if (this.operation === 'division') {
      // Falsche Divisionsergebnisse
      for (const d of [-2,-1,1,2]) {
        const v = result + d;
        if (v >= 1 && v <= this.maxResult) candidates.add(v);
      }
    }

    // Zusätzliche zufällige Kandidaten falls nötig
    while (candidates.size < 8) {
      const v = Math.floor(Math.random() * (this.maxResult + 1));
      if (v >= 0) candidates.add(v);
    }

    const wrong = [];
    for (const v of candidates) { 
      if (!answers.has(v)) { 
        wrong.push(v); 
        answers.add(v); 
      } 
      if (wrong.length >= 3) break; 
    }

    // 4 Werte verteilen
    const values = Array(Math.min(4, this.blocks.length)).fill(null);
    if (values.length > 0) values[this.correctIndex] = result;
    let wi = 0;
    for (let i=0;i<values.length;i++) { 
      if (i !== this.correctIndex) values[i] = wrong[wi++] || Math.floor(Math.random() * (this.maxResult + 1)); 
    }

    // Auf die Blöcke mappen
    for (let i=0;i<values.length;i++) this._setBlockNumber(this.blocks[i], values[i]);
  }

  _createNumberDisplay(blockMesh, viewerPos) {
    const group = new THREE.Group();
    
    // Größe der Anzeigeplatte
    const displaySize = 0.25;
    const geometry = new THREE.PlaneGeometry(displaySize, displaySize * 0.6);
    
    const material = new THREE.MeshBasicMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      toneMapped: false,
      depthTest: false,
      depthWrite: false
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = 2000;
    mesh.frustumCulled = false;
    group.add(mesh);

    // Position neben dem Block berechnen
    const blockPos = blockMesh.position.clone();
    
    // Richtung vom Viewer zum Block berechnen
    const toBlock = blockPos.clone().sub(viewerPos || new THREE.Vector3(0, 0, 0)).normalize();
    
    // Seitliche Verschiebung (rechts vom Block aus Sicht des Viewers)
    const right = new THREE.Vector3(0, 1, 0).cross(toBlock).normalize();
    
    // Position der Anzeige: neben dem Block, etwas oberhalb
    const displayPos = blockPos.clone()
      .add(right.multiplyScalar(0.4))  // seitlich versetzt
      .add(new THREE.Vector3(0, 0.2, 0)); // etwas höher
    
    group.position.copy(displayPos);
    
    // Anzeige zum Viewer ausrichten
    if (viewerPos) {
      group.lookAt(viewerPos.clone().add(new THREE.Vector3(0, 0.2, 0)));
    }
    
    return group;
  }

  _setBlockNumber(block, value) {
    if (!block?.numberDisplay) return;
    const text = String(value);
    const tex = this._getOrMakeNumberTexture(text);
    // Nur das erste Mesh in der numberDisplay aktualisieren (das ist unsere Anzeigeplatte)
    const mesh = block.numberDisplay.children[0];
    if (mesh && mesh.isMesh && mesh.material) {
      mesh.material.map = tex;
      mesh.material.needsUpdate = true;
    }
  }

  _getOrMakeNumberTexture(text) {
    if (this.texCache.has(text)) return this.texCache.get(text);
    
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 150;
    const ctx = canvas.getContext('2d');

    // Hintergrund - ähnlich wie bei der Gleichungsanzeige
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

    // Text
    ctx.font = 'bold 80px system-ui, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Schatten
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillText(text, canvas.width/2 + 2, canvas.height/2 + 2);

    // Weißer Text
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, canvas.width/2, canvas.height/2);

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 4;
    tex.needsUpdate = true;
    this.texCache.set(text, tex);
    return tex;
  }
}
