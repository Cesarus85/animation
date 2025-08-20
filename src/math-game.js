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
    this.current = { a: 1, b: 1, sum: 2 };
    this.texCache = new Map();
    this.equationDisplay = new EquationDisplay(scene);
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

  dispose() {
    for (const b of this.blocks) {
      if (b?.numberDisplay) {
        b.numberDisplay.traverse(o => {
          if (o.isMesh && o.material?.map) o.material.map.dispose?.();
          if (o.isMesh && o.material) o.material.dispose?.();
          if (o.geometry) o.geometry.dispose?.();
        });
        // numberDisplay ist jetzt Kind des Würfels, also über parent entfernen
        if (b.numberDisplay.parent) {
          b.numberDisplay.removeFromParent();
        }
        b.numberDisplay = undefined;
      }
    }
    this.equationDisplay.dispose();
    this.texCache.forEach(tex => tex.dispose?.());
    this.texCache.clear();
  }

  // ---------- intern ----------

  _newProblem(isFirst = false) {
    // a + b, Summe <= 20
    const a = 1 + Math.floor(Math.random() * 10);
    const bMax = Math.min(20 - a, 10);
    const b = 1 + Math.floor(Math.random() * Math.max(1, bMax));
    const sum = a + b;
    this.current = { a, b, sum };
    const equationText = `${a} + ${b} = ?`;
    this.ui?.setEquation?.(equationText);
    this.equationDisplay.updateEquation(equationText);

    // Zufälliger Index für korrekte Antwort
    this.correctIndex = Math.floor(Math.random() * Math.min(4, this.blocks.length));

    // 3 plausible Falschantworten
    const answers = new Set([sum]);
    const candidates = new Set();
    for (const d of [-3,-2,-1,1,2,3,4,-4]) {
      const v = sum + d; if (v >= 0 && v <= 20) candidates.add(v);
    }
    while (candidates.size < 8) candidates.add(Math.floor(Math.random() * 21));
    const wrong = [];
    for (const v of candidates) { if (!answers.has(v)) { wrong.push(v); answers.add(v); } if (wrong.length >= 3) break; }

    // 4 Werte verteilen
    const values = Array(Math.min(4, this.blocks.length)).fill(null);
    if (values.length > 0) values[this.correctIndex] = sum;
    let wi = 0;
    for (let i=0;i<values.length;i++) { if (i !== this.correctIndex) values[i] = wrong[wi++]; }

    // Auf die Blöcke mappen
    for (let i=0;i<values.length;i++) this._setBlockNumber(this.blocks[i], values[i]);
  }

  _createNumberDisplay(blockMesh, viewerPos) {
    // Erstelle 4 Zahlenplanes für die Seiten des rotierenden Würfels
    const group = new THREE.Group();
    
    const displaySize = 0.15;
    const geometry = new THREE.PlaneGeometry(displaySize, displaySize);
    
    // 4 Seiten: vorne, hinten, links, rechts
    const faces = [
      { pos: new THREE.Vector3(0, 0, 0.16), rot: new THREE.Euler(0, 0, 0) },
      { pos: new THREE.Vector3(0, 0, -0.16), rot: new THREE.Euler(0, Math.PI, 0) },
      { pos: new THREE.Vector3(-0.16, 0, 0), rot: new THREE.Euler(0, -Math.PI/2, 0) },
      { pos: new THREE.Vector3(0.16, 0, 0), rot: new THREE.Euler(0, Math.PI/2, 0) }
    ];

    faces.forEach(face => {
      const material = new THREE.MeshBasicMaterial({
        color: 0xff0000, // Erstmal alle rot, um zu sehen ob sie überhaupt da sind
        transparent: false,
        side: THREE.DoubleSide,
        depthTest: false,
        depthWrite: false
      });

      const plane = new THREE.Mesh(geometry.clone(), material);
      plane.position.copy(face.pos);
      plane.rotation.copy(face.rot);
      plane.renderOrder = 2000;
      plane.frustumCulled = false;
      
      group.add(plane);
    });

    // Finde den rotierenden Würfel in der Mesh-Hierarchie und füge die Zahlen dort hinzu
    // Der rotierende Würfel ist wahrscheinlich ein Kind des Haupt-Meshs
    let targetMesh = blockMesh;
    blockMesh.traverse((child) => {
      // Suche nach einem Mesh, das nicht der Haupt-Container ist
      if (child.isMesh && child !== blockMesh) {
        targetMesh = child;
      }
    });

    targetMesh.add(group);
    return group;
  }

  _setBlockNumber(block, value) {
    if (!block?.numberDisplay) return;
    
    // Verschiedene Farben für verschiedene Zahlen - zum Testen
    const colors = [
      0xff0000, // 0 = Rot
      0x00ff00, // 1 = Grün  
      0x0000ff, // 2 = Blau
      0xffff00, // 3 = Gelb
      0xff00ff, // 4 = Magenta
      0x00ffff, // 5 = Cyan
      0xffffff, // 6 = Weiß
      0x888888, // 7 = Grau
      0xff8800, // 8 = Orange
      0x8800ff, // 9+ = Lila
      0x404040, // 10 = Dunkelgrau
      0x008000, // 11 = Dunkelgrün
      0x800080, // 12 = Dunkel-Magenta
      0xffa500, // 13 = Orange-2
      0x90EE90, // 14 = Hell-Grün
      0xFFB6C1, // 15 = Hell-Rosa
      0x20B2AA, // 16 = Hell-Blau-Grün
      0xF0E68C, // 17 = Khaki
      0xDDA0DD, // 18 = Pflaume
      0x98FB98  // 19 = Hellgrün-2
    ];
    
    const colorIndex = Math.min(value, colors.length - 1);
    const color = colors[colorIndex];
    
    // Alle 4 Planes in der Gruppe mit der Farbe aktualisieren
    block.numberDisplay.children.forEach(plane => {
      if (plane.isMesh && plane.material) {
        plane.material.color.setHex(color);
        plane.material.needsUpdate = true;
      }
    });
  }

  _getOrMakeNumberTexture(text) {
    if (this.texCache.has(text)) return this.texCache.get(text);
    
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Transparenter Hintergrund
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Text-Styling
    ctx.font = 'bold 160px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Schwarzer Schatten
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillText(text, canvas.width/2 + 3, canvas.height/2 + 3);

    // Weißer Text mit schwarzer Outline für beste Lesbarkeit
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.lineWidth = 6;
    ctx.strokeText(text, canvas.width/2, canvas.height/2);
    
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, canvas.width/2, canvas.height/2);

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 4;
    tex.needsUpdate = true;
    tex.flipY = false;
    this.texCache.set(text, tex);
    
    return tex;
  }
}
