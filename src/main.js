import { XRApp } from './xr-session.js';
import { UI } from './ui.js';

const ui = new UI();
const app = new XRApp(ui);

const startBtn = document.getElementById('start-ar');
const endBtn = document.getElementById('end');

startBtn.addEventListener('click', async () => {
  if (!navigator.xr) { ui.toast('WebXR wird nicht unterstützt.'); return; }
  try {
    startBtn.disabled = true;
    
    // Spieleinstellungen lesen
    const operation = document.getElementById('operation').value;
    const maxResult = parseInt(document.getElementById('max-result').value);
    
    // Einstellungen an die App weitergeben
    app.setGameSettings(operation, maxResult);
    
    await app.startAR();
    ui.setHudVisible(true);
    startBtn.classList.add('hidden');
  } catch (err) {
    console.error(err);
    ui.toast('Konnte AR-Session nicht starten: ' + (err?.message ?? err));
    startBtn.disabled = false;
  }
});

endBtn.addEventListener('click', () => app.end());
