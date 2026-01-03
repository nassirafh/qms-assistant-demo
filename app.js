// QMS Assistant – ISO 14001:2015 & EN 9100
// Version démo publique – logique métier complète retirée

// --- Navigation simple entre les modules (sidebar) ---
const navButtons = document.querySelectorAll('#navMenu .nav-link');
const sections = document.querySelectorAll('.module-section');

navButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const targetId = btn.getAttribute('data-target');

    // Activer le bouton sélectionné
    navButtons.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');

    // Afficher uniquement la section cible
    sections.forEach((sec) => {
      if (sec.id === targetId) {
        sec.classList.remove('d-none');
      } else {
        sec.classList.add('d-none');
      }
    });
  });
});

// --- Placeholders pour les modules avancés ------------------
// Dans la version complète, ces fonctions contiennent :
// - la checklist de conformité ISO 14001 / EN 9100,
// - le registre des risques & opportunités,
// - le plan d’actions PDCA,
// - la simulation d’audit interne,
// - le dashboard qualité et le rapport PDF global.
//
// Ici, on laisse uniquement des hooks vides pour montrer l’architecture,
// sans exposer la logique détaillée ni les contenus normatifs.

function initChecklistModule() {
  console.log('[DEMO] Checklist module initialisé (logique complète non publiée).');
}

function initRiskModule() {
  console.log('[DEMO] Risk module initialisé (logique complète non publiée).');
}

function initActionModule() {
  console.log('[DEMO] Action plan module initialisé (logique complète non publiée).');
}

function initAuditModule() {
  console.log('[DEMO] Audit module initialisé (logique complète non publiée).');
}

function initDashboardModule() {
  console.log('[DEMO] Dashboard module initialisé (logique complète non publiée).');
}

// --- Initialisation globale ---------------------------------
function initQmsAssistant() {
  initChecklistModule();
  initRiskModule();
  initActionModule();
  initAuditModule();
  initDashboardModule();
}

document.addEventListener('DOMContentLoaded', initQmsAssistant);
