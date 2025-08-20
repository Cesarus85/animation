import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const ANIMATION_DURATION = 2000; // 2 Sekunden in Milliseconds
const CROSSFADE_DURATION = 0.5; // 0.5 Sekunden für weiche Übergänge

export class GrooveCharacterManager {
  constructor(scene) {
    this.scene = scene;
    this.loader = new GLTFLoader();
    
    // Verschiedene Charakter-Modelle für verschiedene Zustände
    this.models = {
      warten1: null,
      warten2: null,
      richtig1: null,
      richtig2: null,
      falsch1: null,
      falsch2: null
    };
    
    this.currentCharacter = null;
    this.currentMixer = null;
    this.currentState = 'warten1';
    this.animationTimer = 0;
    this.isAnimating = false;
    this.isLoaded = false;
    this.characterPosition = new THREE.Vector3();
    this.characterQuaternion = new THREE.Quaternion();
    
    // Crossfade-System
    this.isTransitioning = false;
    this.fadeTimer = 0;
    this.nextState = null;
  }

  async ensureLoaded() {
    if (this.isLoaded) return;
    
    try {
      // Alle Animation-Modelle laden
      const loadPromises = [
        this._loadModel('warten1', './assets/warten1.glb'),
        this._loadModel('warten2', './assets/warten2.glb'),
        this._loadModel('richtig1', './assets/richtig1.glb'),
        this._loadModel('richtig2', './assets/richtig2.glb'),
        this._loadModel('falsch1', './assets/falsch1.glb'),
        this._loadModel('falsch2', './assets/falsch2.glb')
      ];
      
      await Promise.all(loadPromises);
      this.isLoaded = true;
      
    } catch (error) {
      console.error('Fehler beim Laden der Animationsdateien:', error);
      throw error;
    }
  }

  async _loadModel(name, url) {
    try {
      const gltf = await this._load(url);
      const root = gltf.scene || gltf.scenes?.[0];
      if (!root) throw new Error(`${url} ohne Szene`);

      // Charakter um 40% verkleinern (ursprünglich 20%, jetzt weitere 25%)
      root.scale.setScalar(0.6);
      
      // Mixer für Animationen erstellen
      const mixer = new THREE.AnimationMixer(root);
      const animations = gltf.animations || [];
      
      this.models[name] = {
        scene: root,
        mixer: mixer,
        animations: animations,
        actions: []
      };
      
      // Actions vorbereiten
      if (animations.length > 0) {
        for (const clip of animations) {
          const action = mixer.clipAction(clip);
          action.setLoop(THREE.LoopRepeat);
          this.models[name].actions.push(action);
        }
      }
      
    } catch (error) {
      console.error(`Fehler beim Laden von ${url}:`, error);
      throw error;
    }
  }

  placeCharacter(viewerPos, viewerQuat) {
    // Berechne Position links vor dem Viewer am Boden
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(viewerQuat).normalize();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(viewerQuat).normalize();
    
    // Position: links hinter dem vorderen Block am Boden
    this.characterPosition = viewerPos.clone()
      .add(forward.clone().multiplyScalar(1.0))  // hinter dem vorderen Block (Block ist bei 0.8m)
      .add(right.clone().multiplyScalar(-0.6));  // links versetzt
    
    // Y-Position auf Boden setzen (0 für local-floor reference space)
    this.characterPosition.y = 0;

    // Rotation berechnen (zum Viewer schauen)
    const lookAtPos = new THREE.Vector3(viewerPos.x, this.characterPosition.y, viewerPos.z);
    const tempObj = new THREE.Object3D();
    tempObj.position.copy(this.characterPosition);
    tempObj.lookAt(lookAtPos);
    this.characterQuaternion.copy(tempObj.quaternion);

    // Ersten Charakter (warten1) platzieren
    this._switchToModel('warten1');
  }

  _switchToModel(stateName, useTransition = false) {
    if (!this.models[stateName] || !this.models[stateName].scene) return;

    if (useTransition && this.currentCharacter && !this.isTransitioning) {
      // Weichen Übergang starten
      this._startTransition(stateName);
      return;
    }

    // Sofortiger Wechsel (für ersten Start oder wenn bereits transitioning)
    if (this.currentCharacter) {
      this.currentCharacter.removeFromParent();
    }

    // Neuen Charakter setzen
    const model = this.models[stateName];
    this.currentCharacter = model.scene;
    this.currentMixer = model.mixer;
    this.currentState = stateName;

    // Position und Rotation anwenden
    this.currentCharacter.position.copy(this.characterPosition);
    this.currentCharacter.quaternion.copy(this.characterQuaternion);

    // Zur Szene hinzufügen
    this.scene.add(this.currentCharacter);

    // Animation starten
    if (model.actions.length > 0) {
      // Alle vorherigen Actions stoppen
      model.actions.forEach(action => action.stop());
      // Erste Animation starten
      model.actions[0].reset().play();
    }
  }

  _startTransition(nextStateName) {
    this.isTransitioning = true;
    this.fadeTimer = CROSSFADE_DURATION;
    this.nextState = nextStateName;

    // Neuen Charakter vorbereiten (unsichtbar)
    const nextModel = this.models[nextStateName];
    if (nextModel && nextModel.scene) {
      nextModel.scene.position.copy(this.characterPosition);
      nextModel.scene.quaternion.copy(this.characterQuaternion);
      
      // Unsichtbar machen für sanften Einblend-Effekt
      this._setModelOpacity(nextModel.scene, 0);
      this.scene.add(nextModel.scene);
      
      // Animation starten
      if (nextModel.actions.length > 0) {
        nextModel.actions.forEach(action => action.stop());
        nextModel.actions[0].reset().play();
      }
    }
  }

  _setModelOpacity(model, opacity) {
    model.traverse((child) => {
      if (child.isMesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(mat => {
            mat.transparent = true;
            mat.opacity = opacity;
          });
        } else {
          child.material.transparent = true;
          child.material.opacity = opacity;
        }
      }
    });
  }

  // Methode für richtige Antwort
  playCorrectAnimation() {
    const animations = ['richtig1', 'richtig2'];
    const randomAnimation = animations[Math.floor(Math.random() * animations.length)];
    this._playTimedAnimation(randomAnimation);
  }

  // Methode für falsche Antwort
  playIncorrectAnimation() {
    const animations = ['falsch1', 'falsch2'];
    const randomAnimation = animations[Math.floor(Math.random() * animations.length)];
    this._playTimedAnimation(randomAnimation);
  }

  _playTimedAnimation(animationType) {
    if (this.isAnimating) return; // Verhindert überlappende Animationen
    
    this.isAnimating = true;
    this.animationTimer = ANIMATION_DURATION;
    this._switchToModel(animationType);
  }

  update(dtMs) {
    const dt = dtMs ?? 16.666;
    
    // Aktuellen Mixer updaten
    if (this.currentMixer) {
      this.currentMixer.update(dt / 1000);
    }

    // Crossfade-Timer handhaben
    if (this.isTransitioning) {
      this.fadeTimer -= dt / 1000; // in Sekunden umrechnen
      
      // Alpha-Werte berechnen (0 bis 1)
      const progress = 1 - (this.fadeTimer / CROSSFADE_DURATION);
      const currentAlpha = Math.max(0, 1 - progress);
      const nextAlpha = Math.min(1, progress);
      
      // Aktuelle Animation ausblenden
      if (this.currentCharacter) {
        this._setModelOpacity(this.currentCharacter, currentAlpha);
      }
      
      // Neue Animation einblenden
      const nextModel = this.models[this.nextState];
      if (nextModel && nextModel.scene) {
        this._setModelOpacity(nextModel.scene, nextAlpha);
        // Mixer auch updaten
        if (nextModel.mixer) {
          nextModel.mixer.update(dt / 1000);
        }
      }
      
      if (this.fadeTimer <= 0) {
        // Übergang abschließen
        this.isTransitioning = false;
        
        // Alten Charakter entfernen
        if (this.currentCharacter) {
          this.currentCharacter.removeFromParent();
          this._setModelOpacity(this.currentCharacter, 1); // Opacity zurücksetzen
        }
        
        // Neuen Charakter als aktuellen setzen
        this.currentCharacter = nextModel.scene;
        this.currentMixer = nextModel.mixer;
        this.currentState = this.nextState;
        this.nextState = null;
        
        // Opacity auf vollständig sichtbar setzen
        this._setModelOpacity(this.currentCharacter, 1);
      }
    }

    // Timer für zeitlich begrenzte Animationen
    if (this.isAnimating && !this.isTransitioning) {
      this.animationTimer -= dt;
      
      if (this.animationTimer <= 0) {
        this.isAnimating = false;
        // Zurück zu einer Warte-Animation mit weichem Übergang
        const waitAnimations = ['warten1', 'warten2'];
        const randomWait = waitAnimations[Math.floor(Math.random() * waitAnimations.length)];
        this._switchToModel(randomWait, true); // useTransition = true
      }
    }
  }

  dispose() {
    // Aktuellen Charakter entfernen
    if (this.currentCharacter) {
      this.currentCharacter.removeFromParent();
    }

    // Alle Modelle entsorgen
    for (const [name, model] of Object.entries(this.models)) {
      if (model && model.scene) {
        model.scene.traverse(obj => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) {
              obj.material.forEach(mat => mat.dispose());
            } else {
              obj.material.dispose();
            }
          }
        });
        
        if (model.mixer) {
          model.mixer.stopAllAction();
        }
      }
    }
    
    // Reset aller Eigenschaften
    this.models = {
      warten1: null, warten2: null,
      richtig1: null, richtig2: null,
      falsch1: null, falsch2: null
    };
    this.currentCharacter = null;
    this.currentMixer = null;
    this.isLoaded = false;
    this.isAnimating = false;
    this.isTransitioning = false;
    this.nextState = null;
  }

  _load(url) {
    return new Promise((resolve, reject) => {
      this.loader.load(url, resolve, undefined, reject);
    });
  }
}