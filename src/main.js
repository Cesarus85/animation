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
    
    console.log('Start AR Button geklickt');
    
    // Kleine Verzögerung für sicheres Laden der DOM-Elemente
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Spieleinstellungen aus Custom Dropdowns lesen
    console.log('Suche nach Dropdown-Elementen...');
    const operationDropdown = document.getElementById('operation-dropdown');
    const maxResultDropdown = document.getElementById('max-result-dropdown');
    
    console.log('Gefundene Elemente:', { operationDropdown, maxResultDropdown });
    
    if (!operationDropdown || !maxResultDropdown) {
      console.error('Dropdown-Elemente nicht gefunden');
      ui.toast('Fehler beim Lesen der Einstellungen - Dropdowns nicht gefunden');
      startBtn.disabled = false;
      return;
    }
    
    const operationSelected = operationDropdown.querySelector('.dropdown-selected');
    const maxResultSelected = maxResultDropdown.querySelector('.dropdown-selected');
    
    console.log('Selected Elemente:', { operationSelected, maxResultSelected });
    
    if (!operationSelected || !maxResultSelected) {
      console.error('Dropdown-Selected-Elemente nicht gefunden');
      ui.toast('Fehler beim Lesen der Einstellungen - Selected-Elemente nicht gefunden');
      startBtn.disabled = false;
      return;
    }
    
    const operation = operationSelected.dataset.value || 'addition';
    const maxResult = parseInt(maxResultSelected.dataset.value) || 20;
    
    console.log('Einstellungen gelesen:', { operation, maxResult });
    
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
