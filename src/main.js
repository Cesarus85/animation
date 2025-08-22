import { XRApp } from './xr-session.js';
import { UI } from './ui.js';

const ui = new UI();
const app = new XRApp(ui);

const startBtn = document.getElementById('start-ar');
const endBtn = document.getElementById('end');

// Dropdowns initialisieren und Werte aus localStorage laden
function initDropdown(dropdownId, storageKey, fallback) {
  const dropdown = document.getElementById(dropdownId);
  if (!dropdown) return;

  const selected = dropdown.querySelector('.dropdown-selected');
  const options = dropdown.querySelectorAll('.dropdown-option');

  // gespeicherten Wert lesen oder Fallback nutzen
  const storedValue = localStorage.getItem(storageKey) || fallback;
  const option = dropdown.querySelector(`.dropdown-option[data-value="${storedValue}"]`);
  const finalValue = option ? storedValue : fallback;

  // Anzeige aktualisieren
  const finalOption = option || dropdown.querySelector(`.dropdown-option[data-value="${fallback}"]`);
  if (finalOption && selected) {
    selected.dataset.value = finalValue;
    selected.textContent = finalOption.textContent;
  }

  // Option markieren und Listener zum Speichern setzen
  options.forEach(opt => {
    opt.classList.toggle('selected', opt === finalOption);
    ['click', 'touchstart'].forEach(evt => {
      opt.addEventListener(evt, () => {
        localStorage.setItem(storageKey, opt.dataset.value);
      });
    });
  });

  // Sicherstellen, dass der aktuelle Wert gespeichert ist
  localStorage.setItem(storageKey, finalValue);
}

initDropdown('operation-dropdown', 'operation', 'addition');
initDropdown('max-result-dropdown', 'maxResult', '20');
initDropdown('mode-dropdown', 'gameMode', 'endless');

// Callback für Session-Ende setzen
app.onSessionEnd = () => {
  console.log('AR-Session beendet - UI zurücksetzen');
  startBtn.classList.remove('hidden');
  startBtn.disabled = false;
  ui.setHudVisible(false);
};

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
    const modeDropdown = document.getElementById('mode-dropdown');

    console.log('Gefundene Elemente:', { operationDropdown, maxResultDropdown, modeDropdown });

    if (!operationDropdown || !maxResultDropdown || !modeDropdown) {
      console.error('Dropdown-Elemente nicht gefunden');
      ui.toast('Fehler beim Lesen der Einstellungen - Dropdowns nicht gefunden');
      startBtn.disabled = false;
      return;
    }

    const operationSelected = operationDropdown.querySelector('.dropdown-selected');
    const maxResultSelected = maxResultDropdown.querySelector('.dropdown-selected');
    const modeSelected = modeDropdown.querySelector('.dropdown-selected');

    console.log('Selected Elemente:', { operationSelected, maxResultSelected, modeSelected });

    if (!operationSelected || !maxResultSelected || !modeSelected) {
      console.error('Dropdown-Selected-Elemente nicht gefunden');
      ui.toast('Fehler beim Lesen der Einstellungen - Selected-Elemente nicht gefunden');
      startBtn.disabled = false;
      return;
    }

    const operation = operationSelected.dataset.value || 'addition';
    const maxResult = parseInt(maxResultSelected.dataset.value) || 20;
    const gameMode = modeSelected.dataset.value || 'endless';

    console.log('Einstellungen gelesen:', { operation, maxResult, gameMode });

    // Aktuelle Auswahl speichern
    localStorage.setItem('operation', operation);
    localStorage.setItem('maxResult', String(maxResult));
    localStorage.setItem('gameMode', gameMode);

    // Einstellungen an die App weitergeben
    app.setGameSettings(operation, maxResult);
    app.setGameMode(gameMode);
    
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
