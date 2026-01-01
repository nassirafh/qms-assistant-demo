// --- Navigation entre modules (sidebar) ---
const navButtons = document.querySelectorAll('#navMenu .nav-link');
const sections = document.querySelectorAll('.module-section');

navButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const targetId = btn.getAttribute('data-target');

    // activer le bouton
    navButtons.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');

    // afficher la bonne section
    sections.forEach((sec) => {
      if (sec.id === targetId) {
        sec.classList.remove('d-none');
      } else {
        sec.classList.add('d-none');
      }
    });
  });
});


// Mise à jour des KPI texte (valeur initiale avant calculs réels)
// Données simulées utilisées au démarrage si pas encore de calculs réels
const mockDashboardData = {
  conformityRate: 72,
  nonConformities: 8,
  criticalRisks: 3,
  lateActions: 4,
  historyConformity: [40, 55, 60, 72],
  historyNC: [12, 9, 7, 8],
};

// Historique simple pour les tendances
let previousDashboardSnapshot = null;

function classifyKpiCard(value, thresholds) {
  if (value === null || value === undefined) return "";
  const { good, warningHigh, reverse } = thresholds;
  if (!reverse) {
    // plus grand = mieux (ex: conformité)
    if (value >= good) return "good";
    if (value >= warningHigh) return "warning";
    return "bad";
  } else {
    // plus petit = mieux (ex: NC, risques, actions en retard)
    if (value === 0) return "good";
    if (value <= warningHigh) return "warning";
    return "bad";
  }
}

function computeTrend(current, previous) {
  if (previous === null || previous === undefined) return "stable";
  if (current > previous) return "up";
  if (current < previous) return "down";
  return "stable";
}

// Mise à jour des KPI texte / cartes
// Mise à jour des KPI texte / cartes
function updateKpis() {
  const kpiConformityEl = document.getElementById("kpiConformity");
  const kpiNCEl = document.getElementById("kpiNC");
  const kpiCriticalEl = document.getElementById("kpiCriticalRisks");
  const kpiLateEl = document.getElementById("kpiLateActions");
  if (!kpiConformityEl || !kpiNCEl || !kpiCriticalEl || !kpiLateEl) return;

  // 1) Relecture directe de la checklist pour compter les NON
  let conformityRateFromChecklist = null;
  let nonConformitiesFromChecklist = null;
  try {
    if (typeof loadChecklistState === "function" && Array.isArray(checklistRequirements)) {
      const savedState = loadChecklistState();
      let totalEvaluated = 0;
      let countConforme = 0;
      let countNon = 0;

      checklistRequirements.forEach((req) => {
        const row = savedState[req.id];
        if (!row || !row.status || row.status === "--") return;
        totalEvaluated++;
        if (row.status === "CONFORME") countConforme++;
        if (row.status === "NON") countNon++;
      });

      if (totalEvaluated > 0) {
        conformityRateFromChecklist = Math.round((countConforme / totalEvaluated) * 100);
        nonConformitiesFromChecklist = countNon;
      }
    }
  } catch (e) {
    console.warn("Impossible de relire la checklist pour le dashboard", e);
  }

  // 2) Valeurs actuelles : priorité aux données checklist, sinon texte déjà présent, sinon mock
  let conformityRate =
    conformityRateFromChecklist ??
    (Number(kpiConformityEl.textContent) || mockDashboardData.conformityRate);

  let nonConformities =
    nonConformitiesFromChecklist ??
    (Number(kpiNCEl.textContent) || mockDashboardData.nonConformities);

  let criticalRisks =
    Number(kpiCriticalEl.textContent) || mockDashboardData.criticalRisks;
  let lateActions =
    Number(kpiLateEl.textContent) || mockDashboardData.lateActions;

  // Écrire les valeurs recalculées dans les KPI
  kpiConformityEl.textContent = conformityRate;
  kpiNCEl.textContent = nonConformities;

  // 3) Tendances vs snapshot précédent
  const prev = previousDashboardSnapshot;
  const trendConf = computeTrend(conformityRate, prev ? prev.conformityRate : null);
  const trendNC = computeTrend(nonConformities, prev ? prev.nonConformities : null);
  const trendCrit = computeTrend(criticalRisks, prev ? prev.criticalRisks : null);
  const trendLate = computeTrend(lateActions, prev ? prev.lateActions : null);

  previousDashboardSnapshot = {
    conformityRate,
    nonConformities,
    criticalRisks,
    lateActions,
  };

  // 4) Cartes
  const cardConf = document.getElementById("kpiCardConformity");
  const cardNC = document.getElementById("kpiCardNC");
  const cardCrit = document.getElementById("kpiCardCriticalRisks");
  const cardLate = document.getElementById("kpiCardLateActions");

  const trendConfEl = document.getElementById("kpiConformityTrend");
  const trendNCEl = document.getElementById("kpiNCTrend");
  const trendCritEl = document.getElementById("kpiCriticalTrend");
  const trendLateEl = document.getElementById("kpiLateTrend");

  // Classer les cartes suivant seuils QMS
  const confClass = classifyKpiCard(conformityRate, {
    good: 95,
    warningHigh: 85,
    reverse: false,
  });
  const ncClass = classifyKpiCard(nonConformities, {
    good: 0,
    warningHigh: 3,
    reverse: true,
  });
  const critClass = classifyKpiCard(criticalRisks, {
    good: 0,
    warningHigh: 1,
    reverse: true,
  });
  const lateClass = classifyKpiCard(lateActions, {
    good: 0,
    warningHigh: 2,
    reverse: true,
  });

  [cardConf, cardNC, cardCrit, cardLate].forEach((card, idx) => {
    if (!card) return;
    card.classList.remove("good", "warning", "bad");
    const cls = [confClass, ncClass, critClass, lateClass][idx];
    if (cls) card.classList.add(cls);
  });

  // 5) Appliquer les tendances
  const trendMap = [
    [trendConfEl, trendConf],
    [trendNCEl, trendNC],
    [trendCritEl, trendCrit],
    [trendLateEl, trendLate],
  ];
  trendMap.forEach(([el, t]) => {
    if (!el) return;
    el.classList.remove("up", "down", "stable");
    el.classList.add(t);
    el.textContent = t === "up" ? "↑" : t === "down" ? "↓" : "=";
  });

  // 6) Notes automatiques simples
  const noteConf = document.getElementById("kpiConformityNote");
  if (noteConf) {
    if (conformityRate >= 95) {
      noteConf.textContent =
        "Niveau conforme aux attentes d'un audit de certification.";
    } else if (conformityRate >= 85) {
      noteConf.textContent =
        "Acceptable mais des actions ciblées sont à planifier.";
    } else {
      noteConf.textContent =
        "Risque élevé lors d'un audit externe : prioriser la mise en conformité.";
    }
  }

  // 7) Mise à jour du bandeau de synthèse (protégé)

}


let conformityChart = null;

function initConformityChart() {
  const ctx = document.getElementById('conformityChart');
  if (!ctx) return;

  // Lecture de l’historique depuis le localStorage
  let labels = ['Audit 1', 'Audit 2', 'Audit 3', 'Audit 4'];
  let dataHistory = mockDashboardData.historyConformity; // fallback
  let dataNC = mockDashboardData.historyNC;              // fallback

  try {
    const raw = localStorage.getItem('qmsAssistantAuditHistory');
    const history = raw ? JSON.parse(raw) : [];
    if (history.length > 0) {
      labels = history.map(h => h.label);
      dataHistory = history.map(h => h.conformityRate);
      dataNC = history.map(h => h.nc);
    }
  } catch (e) {
    console.warn('Erreur lecture historique audits', e);
  }

  conformityChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          type: 'line',
          label: 'Taux de conformité (%)',
          data: dataHistory,
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37,99,235,0.12)',
          tension: 0.25,
          fill: true,
          yAxisID: 'y',
        },
        {
          type: 'bar',
          label: 'Non-conformités',
          data: dataNC,
          backgroundColor: 'rgba(248,113,22,0.35)',
          borderColor: '#ea580c',
          borderWidth: 1,
          yAxisID: 'y1',
        },
      ],
    },
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          labels: { color: '#4b5563' },
        },
        tooltip: {
          callbacks: {
            label: function (ctx) {
              const label = ctx.dataset.label || '';
              return label + ' : ' + ctx.parsed.y;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: { color: '#6b7280' },
          grid: { color: 'rgba(148,163,184,0.2)' },
        },
        y: {
          position: 'left',
          min: 0,
          max: 100,
          ticks: { color: '#6b7280' },
          grid: { color: 'rgba(148,163,184,0.2)' },
          title: { display: true, text: 'Conformité (%)', color: '#4b5563' },
        },
        y1: {
          position: 'right',
          min: 0,
          ticks: { color: '#6b7280' },
          grid: { drawOnChartArea: false },
          title: { display: true, text: 'Nombre de NC', color: '#4b5563' },
        },
      },
    },
  });
}

function refreshConformityChart() {
  if (!conformityChart) {
    initConformityChart();
    return;
  }

  try {
    const raw = localStorage.getItem('qmsAssistantAuditHistory');
    const history = raw ? JSON.parse(raw) : [];
    if (history.length === 0) return;

    const labels = history.map(h => h.label);
    const dataHistory = history.map(h => h.conformityRate);
    const dataNC = history.map(h => h.nc);

    conformityChart.data.labels = labels;
    conformityChart.data.datasets[0].data = dataHistory;
    conformityChart.data.datasets[1].data = dataNC;
    conformityChart.update();
  } catch (e) {
    console.warn('Erreur refreshConformityChart', e);
  }
}


function initRiskProfileChart() {
  const ctx = document.getElementById("riskProfileChart");
  if (!ctx) return;

  const risks = loadRisks() || [];

  const classifyRiskLevel = (score) => {
    if (score >= 12) return "CRITICAL";
    if (score >= 6) return "MEDIUM";
    return "LOW";
  };

  const counters = {
    ISO14001: { LOW: 0, MEDIUM: 0, CRITICAL: 0 },
    EN9100: { LOW: 0, MEDIUM: 0, CRITICAL: 0 },
  };

  risks.forEach((r) => {
    const std = r.standard || "ISO14001";
    const score = (r.severity || 0) * (r.probability || 0);
    const lvl = classifyRiskLevel(score);
    if (!counters[std]) counters[std] = { LOW: 0, MEDIUM: 0, CRITICAL: 0 };
    counters[std][lvl] += 1;
  });

  new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["ISO 14001", "EN 9100"],
      datasets: [
        {
          label: "Faible",
          data: [counters.ISO14001.LOW, counters.EN9100.LOW],
          backgroundColor: "rgba(34,197,94,0.6)",
        },
        {
          label: "Moyen",
          data: [counters.ISO14001.MEDIUM, counters.EN9100.MEDIUM],
          backgroundColor: "rgba(251,146,60,0.7)",
        },
        {
          label: "Critique",
          data: [counters.ISO14001.CRITICAL, counters.EN9100.CRITICAL],
          backgroundColor: "rgba(239,68,68,0.9)",
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: "#4b5563" } },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label} : ${ctx.parsed.y} risque(s)`,
          },
        },
      },
      scales: {
        x: {
          stacked: true,
          ticks: { color: "#6b7280" },
          grid: { color: "rgba(148,163,184,0.2)" },
        },
        y: {
          stacked: true,
          beginAtZero: true,
          ticks: { color: "#6b7280" },
          grid: { color: "rgba(148,163,184,0.2)" },
        },
      },
    },
  });
}


/* =========================================================
   CHECKLIST CONFORMITE
   ========================================================= */

const checklistRequirements = [
  // ISO 14001
  { id: 'ISO-4.1', standard: 'ISO14001', chapter: '4.1', title: "Compréhension du contexte de l'organisme" },
  { id: 'ISO-5.2', standard: 'ISO14001', chapter: '5.2', title: 'Politique environnementale commune et communiquée' },
  { id: 'ISO-6.1', standard: 'ISO14001', chapter: '6.1', title: 'Identification des risques et opportunités environnementaux' },
  { id: 'ISO-7.2', standard: 'ISO14001', chapter: '7.2', title: 'Compétence et formation environnementale du personnel' },
  { id: 'ISO-8.1', standard: 'ISO14001', chapter: '8.1', title: "Maîtrise opérationnelle des activités à impact" },
  // EN 9100
  { id: 'EN-8.1', standard: 'EN9100', chapter: '8.1', title: 'Planification opérationnelle pour produits aéronautiques' },
  { id: 'EN-8.5', standard: 'EN9100', chapter: '8.5', title: 'Maîtrise de la production et validation des procédés spéciaux' },
  { id: 'EN-8.7', standard: 'EN9100', chapter: '8.7', title: 'Maîtrise des produits non conformes et libération contrôlée' },
  { id: 'EN-9.1', standard: 'EN9100', chapter: '9.1', title: 'Surveillance des performances et satisfaction clients' },
  { id: 'EN-10.2', standard: 'EN9100', chapter: '10.2', title: 'Actions correctives suite aux non-conformités' },
];

const CHECKLIST_STORAGE_KEY = 'qmsAssistantChecklist';

function loadChecklistState() {
  try {
    const raw = localStorage.getItem(CHECKLIST_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Impossible de charger la checklist depuis le stockage local');
    return {};
  }
}

function saveChecklistState(state) {
  try {
    localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Impossible de sauvegarder la checklist dans le stockage local');
  }
}

function renderChecklist() {
  const tbody = document.getElementById('chkTableBody');
  if (!tbody) return;

  const filterStandard = document.getElementById('chkFilterStandard').value;
  const filterStatus = document.getElementById('chkFilterStatus').value;

  const savedState = loadChecklistState();
  tbody.innerHTML = '';

  checklistRequirements.forEach((req) => {
    if (filterStandard !== 'ALL' && req.standard !== filterStandard) return;

    const rowState = savedState[req.id] || {};
    const status = rowState.status || '';
    const comment = rowState.comment || '';
    const evidence = rowState.evidence || '';

    if (filterStatus !== 'ALL' && status !== filterStatus) return;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${req.standard === 'ISO14001' ? 'ISO 14001' : 'EN 9100'}</td>
      <td>${req.chapter}</td>
      <td>${req.title}</td>
      <td>
        <select class="form-select form-select-sm chk-status" data-id="${req.id}">
          <option value="">--</option>
          <option value="CONFORME"${status === 'CONFORME' ? ' selected' : ''}>Conforme</option>
          <option value="PARTIEL"${status === 'PARTIEL' ? ' selected' : ''}>Partiellement conforme</option>
          <option value="NON"${status === 'NON' ? ' selected' : ''}>Non conforme</option>
        </select>
      </td>
      <td>
        <textarea class="form-control form-control-sm chk-comment"
                  rows="2"
                  data-id="${req.id}"
                  placeholder="Observations, écarts, contexte...">${comment}</textarea>
      </td>
      <td>
        <textarea class="form-control form-control-sm chk-evidence"
                  rows="2"
                  data-id="${req.id}"
                  placeholder="Documents, enregistrements, références...">${evidence}</textarea>
      </td>
    `;
    tbody.appendChild(tr);
  });

  attachChecklistEvents();
  updateChecklistStats();
}

function attachChecklistEvents() {
  document.querySelectorAll('.chk-status').forEach((select) => {
    select.addEventListener('change', () => {
      const id = select.getAttribute('data-id');
      const state = loadChecklistState();
      state[id] = state[id] || {};
      state[id].status = select.value;
      saveChecklistState(state);
      updateChecklistStats();
    });
  });

  document.querySelectorAll('.chk-comment').forEach((area) => {
    area.addEventListener('input', () => {
      const id = area.getAttribute('data-id');
      const state = loadChecklistState();
      state[id] = state[id] || {};
      state[id].comment = area.value;
      saveChecklistState(state);
    });
  });

  document.querySelectorAll('.chk-evidence').forEach((area) => {
    area.addEventListener('input', () => {
      const id = area.getAttribute('data-id');
      const state = loadChecklistState();
      state[id] = state[id] || {};
      state[id].evidence = area.value;
      saveChecklistState(state);
    });
  });
}

function updateChecklistStats() {
  const savedState = loadChecklistState();
  let totalEvaluated = 0;
  let countConforme = 0;
  let countPartiel = 0;
  let countNon = 0;

  checklistRequirements.forEach((req) => {
    const row = savedState[req.id];
    if (!row || !row.status) return;
    totalEvaluated += 1;
    if (row.status === 'CONFORME') countConforme += 1;
    if (row.status === 'PARTIEL') countPartiel += 1;
    if (row.status === 'NON') countNon += 1;
  });

  const conformityRate =
    totalEvaluated === 0 ? 0 : Math.round((countConforme / totalEvaluated) * 100);

  const rateEl = document.getElementById('chkConformityRate');
  const iconEl = document.getElementById('chkConformityIcon');
  const cardEl = rateEl ? rateEl.closest('.kpi-card') : null;
  const detailsEl = document.getElementById('chkConformityDetails');
  const partialEl = document.getElementById('chkPartialCount');
  const nonEl = document.getElementById('chkNonConformCount');

  if (!rateEl) return;

  // Reset classes
  rateEl.classList.remove('kpi-good', 'kpi-warning', 'kpi-bad');
  if (cardEl) {
    cardEl.classList.remove('kpi-good-card', 'kpi-warning-card', 'kpi-bad-card');
  }

  // Valeurs
  rateEl.textContent = `${conformityRate} %`;
  detailsEl.textContent = `${totalEvaluated} exigences évaluées`;
  partialEl.textContent = countPartiel;
  nonEl.textContent = countNon;

  // Code couleur + icône
  if (conformityRate >= 90) {
    rateEl.classList.add('kpi-good');
    if (cardEl) cardEl.classList.add('kpi-good-card');
    if (iconEl) iconEl.textContent = '✔';
  } else if (conformityRate >= 70) {
    rateEl.classList.add('kpi-warning');
    if (cardEl) cardEl.classList.add('kpi-warning-card');
    if (iconEl) iconEl.textContent = '⚠';
  } else {
    rateEl.classList.add('kpi-bad');
    if (cardEl) cardEl.classList.add('kpi-bad-card');
    if (iconEl) iconEl.textContent = '✖';
  }

  // Dashboard global
  const kpiConformity = document.getElementById('kpiConformity');
  const kpiNC = document.getElementById('kpiNC');
  if (kpiConformity && kpiNC) {
    kpiConformity.textContent = `${conformityRate} %`;
    kpiNC.textContent = countNon;
  }
}

function resetChecklist() {
  localStorage.removeItem(CHECKLIST_STORAGE_KEY);
  renderChecklist();
}

function initChecklistModule() {
  const filterStandard = document.getElementById('chkFilterStandard');
  const filterStatus = document.getElementById('chkFilterStatus');
  const resetBtn = document.getElementById('chkResetBtn');

  if (!filterStandard || !filterStatus || !resetBtn) return;

  filterStandard.addEventListener('change', renderChecklist);
  filterStatus.addEventListener('change', renderChecklist);
  resetBtn.addEventListener('click', () => {
    if (confirm('Réinitialiser toutes les réponses de la checklist ?')) {
      resetChecklist();
    }
  });

  renderChecklist();
}

/* =========================================================
   RISQUES & OPPORTUNITES
   ========================================================= */

const RISKS_STORAGE_KEY = 'qmsAssistantRisks';

function loadRisks() {
  try {
    const raw = localStorage.getItem(RISKS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function saveRisks(list) {
  try {
    localStorage.setItem(RISKS_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('Impossible de sauvegarder le registre des risques');
  }
}

// Pour le lien avec le plan d'actions
function getAllRisksForLinking() {
  return loadRisks();
}

function classifyRiskLevel(score) {
  if (score >= 12) return 'CRITICAL';
  if (score >= 6) return 'MEDIUM';
  return 'LOW';
}

function formatRiskLevel(score) {
  const level = classifyRiskLevel(score);
  let label = '';
  let cls = '';

  if (level === 'CRITICAL') {
    label = 'Critique';
    cls = 'badge bg-danger';
  } else if (level === 'MEDIUM') {
    label = 'Moyen';
    cls = 'badge bg-warning text-dark';
  } else {
    label = 'Faible';
    cls = 'badge bg-success';
  }
  return `<span class="${cls}">${label} (${score})</span>`;
}

function renderRiskTable() {
  const tbody = document.getElementById('riskTableBody');
  if (!tbody) return;

  const filterStandard = document.getElementById('riskFilterStandard').value;
  const filterLevel = document.getElementById('riskFilterLevel').value;

  const risks = loadRisks();
  tbody.innerHTML = '';

  risks.forEach((r) => {
    const score = r.severity * r.probability;
    const level = classifyRiskLevel(score);

    // filtres
    if (filterStandard !== 'ALL' && r.standard !== filterStandard) return;
    if (filterLevel !== 'ALL' && level !== filterLevel) return;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.standard === 'ISO14001' ? 'ISO 14001' : 'EN 9100'}</td>
      <td>${r.type}</td>
      <td>${r.category}</td>
      <td>${r.description}</td>
      <td>${r.severity}</td>
      <td>${r.probability}</td>
      <td>${formatRiskLevel(score)}</td>
      <td class="small text-secondary">(À lier via le plan d’actions)</td>
    `;
    tbody.appendChild(tr);
  });

  updateRiskStats();
}

function updateRiskStats() {
  const risks = loadRisks();
  const total = risks.length;
  const oppCount = risks.filter((r) => r.type === 'Opportunité').length;
  const criticalCount = risks.filter((r) => {
    const score = r.severity * r.probability;
    return classifyRiskLevel(score) === 'CRITICAL';
  }).length;

  const totalEl = document.getElementById('riskTotalCount');
  const oppEl = document.getElementById('riskOppCount');
  const critEl = document.getElementById('riskCriticalCount');
  const kpiCrit = document.getElementById('kpiCriticalRisks');

  if (!totalEl) return;

  totalEl.textContent = total;
  oppEl.textContent = oppCount;
  critEl.textContent = criticalCount;

  // couleur KPI "risques critiques"
  critEl.classList.remove('kpi-good', 'kpi-warning', 'kpi-bad');
  if (criticalCount === 0) {
    critEl.classList.add('kpi-good');
  } else if (criticalCount <= 2) {
    critEl.classList.add('kpi-warning');
  } else {
    critEl.classList.add('kpi-bad');
  }

  if (kpiCrit) {
    kpiCrit.textContent = criticalCount;
  }
}

function addRiskFromForm() {
  const standardEl = document.getElementById('riskStandard');
  const categoryEl = document.getElementById('riskCategory');
  const descEl = document.getElementById('riskDescription');
  const sevEl = document.getElementById('riskSeverity');
  const probEl = document.getElementById('riskProbability');
  const typeEl = document.getElementById('riskType');

  if (!standardEl || !descEl) return;

  const description = descEl.value.trim();
  if (!description) {
    alert('Merci de saisir une description de risque / opportunité.');
    return;
  }

  const severity = Math.min(5, Math.max(1, Number(sevEl.value) || 1));
  const probability = Math.min(5, Math.max(1, Number(probEl.value) || 1));

  const newRisk = {
    id: Date.now(),
    standard: standardEl.value,
    category: categoryEl.value,
    description,
    severity,
    probability,
    type: typeEl.value,
  };

  const risks = loadRisks();
  risks.push(newRisk);
  saveRisks(risks);

  descEl.value = '';

  renderRiskTable();

  if (typeof populateRelatedRiskOptions === 'function') {
    populateRelatedRiskOptions();
  }
}

function resetRiskRegister() {
  localStorage.removeItem(RISKS_STORAGE_KEY);
  renderRiskTable();
  if (typeof populateRelatedRiskOptions === 'function') {
    populateRelatedRiskOptions();
  }
}

function initRiskModule() {
  const addBtn = document.getElementById('riskAddBtn');
  const resetBtn = document.getElementById('riskResetBtn');
  const filterStd = document.getElementById('riskFilterStandard');
  const filterLvl = document.getElementById('riskFilterLevel');

  if (!addBtn || !resetBtn || !filterStd || !filterLvl) return;

  addBtn.addEventListener('click', addRiskFromForm);
  resetBtn.addEventListener('click', () => {
    if (confirm('Réinitialiser tout le registre des risques ?')) {
      resetRiskRegister();
    }
  });

  filterStd.addEventListener('change', renderRiskTable);
  filterLvl.addEventListener('change', renderRiskTable);

  renderRiskTable();
}

/* =========================================================
   PLAN D'ACTIONS PDCA
   ========================================================= */

const ACTIONS_STORAGE_KEY = 'qmsAssistantActions';
let currentEditingActionId = null;

function loadActions() {
  try {
    const raw = localStorage.getItem(ACTIONS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function saveActions(list) {
  try {
    localStorage.setItem(ACTIONS_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn("Impossible de sauvegarder le plan d’actions");
  }
}

function computeActionStatus(action) {
  const today = new Date().toISOString().slice(0, 10);
  if (action.status === 'CLOSED') return 'CLOSED';
  if (action.dueDate && action.dueDate < today) return 'LATE';
  return 'OPEN';
}

function formatActionStatusBadge(action) {
  const status = computeActionStatus(action);
  if (status === 'CLOSED') {
    return '<span class="badge bg-success">Clôturée</span>';
  }
  if (status === 'LATE') {
    return '<span class="badge bg-danger">En retard</span>';
  }
  return '<span class="badge bg-warning text-dark">En cours</span>';
}

function populateActionOwnerFilter() {
  const select = document.getElementById('actFilterOwner');
  if (!select) return;

  const actions = loadActions();
  const owners = Array.from(
    new Set(
      actions
        .map((a) => (a.owner || '').trim())
        .filter((o) => o !== '')
    )
  ).sort((a, b) => a.localeCompare(b, 'fr'));

  const current = select.value || 'ALL';
  select.innerHTML = '<option value="ALL">Tous les responsables</option>';

  owners.forEach((o) => {
    const opt = document.createElement('option');
    opt.value = o;
    opt.textContent = o;
    select.appendChild(opt);
  });

  select.value = current;
}

function renderActions() {
  const tbody = document.getElementById('actTableBody');
  if (!tbody) return;

  const filterStatus = document.getElementById('actFilterStatus').value;
  const filterOwner = document.getElementById('actFilterOwner')
    ? document.getElementById('actFilterOwner').value
    : 'ALL';
  const actions = loadActions();
  const risks = getAllRisksForLinking ? getAllRisksForLinking() : [];

  tbody.innerHTML = '';

  actions.forEach((a) => {
    const status = computeActionStatus(a);

    if (filterStatus === 'OPEN' && status !== 'OPEN') return;
    if (filterStatus === 'CLOSED' && status !== 'CLOSED') return;
    if (filterStatus === 'LATE' && status !== 'LATE') return;

    if (filterOwner !== 'ALL') {
      if (!a.owner || a.owner.toLowerCase() !== filterOwner.toLowerCase()) return;
    }

    const tr = document.createElement('tr');
    tr.setAttribute('data-id', a.id);

    const riskLabel = a.relatedRiskId
      ? (() => {
          const r = risks.find((rr) => String(rr.id) === String(a.relatedRiskId));
          if (!r) return '';
          const score = r.severity * r.probability;
          const std = r.standard === 'ISO14001' ? 'ISO 14001' : 'EN 9100';
          return `[${std}] ${r.type} - ${r.description} (G${r.severity}xP${r.probability}=${score})`;
        })()
      : '';

    tr.innerHTML = `
      <td>
        <div class="d-flex flex-column gap-1">
          ${formatActionStatusBadge(a)}
          ${
            status !== 'CLOSED'
              ? '<button class="btn btn-xs btn-success btn-close-action" data-id="' +
                a.id +
                '">Clôturer</button>'
              : ''
          }
        </div>
      </td>
      <td>${a.title}</td>
      <td class="small">${a.rootCause || ''}</td>
      <td class="small">${riskLabel}</td>
      <td>${a.owner || ''}</td>
      <td>${a.startDate || ''}</td>
      <td>${a.dueDate || ''}</td>
      <td>${a.impact || ''}</td>
    `;
    tbody.appendChild(tr);
  });

  populateActionOwnerFilter();
  attachActionEvents();
  updateActionStats();
}

function attachActionEvents() {
  // Bouton "Clôturer"
  document.querySelectorAll('.btn-close-action').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = Number(btn.getAttribute('data-id'));
      const actions = loadActions();
      const idx = actions.findIndex((a) => a.id === id);
      if (idx !== -1) {
        actions[idx].status = 'CLOSED';
        saveActions(actions);
        renderActions();
      }
    });
  });

  // Edition par double‑clic sur la ligne
  document.querySelectorAll('#actTableBody tr').forEach((row) => {
    row.addEventListener('dblclick', () => {
      const id = Number(row.getAttribute('data-id'));
      const actions = loadActions();
      const action = actions.find((a) => a.id === id);
      if (!action) return;

      document.getElementById('actTitle').value = action.title || '';
      document.getElementById('actRootCause').value = action.rootCause || '';
      document.getElementById('actOwner').value = action.owner || '';
      document.getElementById('actStartDate').value = action.startDate || '';
      document.getElementById('actDueDate').value = action.dueDate || '';
      document.getElementById('actImpact').value = action.impact || 'Moyen';
      document.getElementById('actDetails').value = action.details || '';

      const riskSelect = document.getElementById('actRelatedRisk');
      if (riskSelect) {
        riskSelect.value = action.relatedRiskId || '';
      }

      currentEditingActionId = action.id;

      document
        .getElementById('actTitle')
        .scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  });
}

function updateActionStats() {
  const actions = loadActions();
  let total = actions.length;
  let open = 0;
  let closed = 0;
  let late = 0;

  actions.forEach((a) => {
    const st = computeActionStatus(a);
    if (st === 'OPEN') open += 1;
    if (st === 'CLOSED') closed += 1;
    if (st === 'LATE') late += 1;
  });

  const totalEl = document.getElementById('actTotalCount');
  const openEl = document.getElementById('actOpenCount');
  const closedEl = document.getElementById('actClosedCount');
  const lateEl = document.getElementById('actLateCount');
  const kpiLate = document.getElementById('kpiLateActions');

  if (!totalEl) return;

  totalEl.textContent = total;
  openEl.textContent = open;
  closedEl.textContent = closed;
  lateEl.textContent = late;

  // couleur KPI "actions en retard"
  lateEl.classList.remove('kpi-good', 'kpi-warning', 'kpi-bad');
  if (late === 0) {
    lateEl.classList.add('kpi-good');
  } else if (late <= 2) {
    lateEl.classList.add('kpi-warning');
  } else {
    lateEl.classList.add('kpi-bad');
  }

  if (kpiLate) {
    kpiLate.textContent = late;
  }
}

function populateRelatedRiskOptions() {
  const select = document.getElementById('actRelatedRisk');
  if (!select) return;

  const risks = getAllRisksForLinking ? getAllRisksForLinking() : [];
  const currentValue = select.value;

  select.innerHTML = '<option value="">(aucun)</option>';

  risks.forEach((r) => {
    const score = r.severity * r.probability;
    const labelStandard = r.standard === 'ISO14001' ? 'ISO 14001' : 'EN 9100';
    const option = document.createElement('option');
    option.value = String(r.id);
    option.textContent = `[${labelStandard}] ${r.type} - ${r.description} (G${r.severity}xP${r.probability}=${score})`;
    select.appendChild(option);
  });

  if (currentValue) {
    select.value = currentValue;
  }
}

function addActionFromForm() {
  const titleEl = document.getElementById('actTitle');
  const rcEl = document.getElementById('actRootCause');
  const riskEl = document.getElementById('actRelatedRisk');
  const ownerEl = document.getElementById('actOwner');
  const startEl = document.getElementById('actStartDate');
  const dueEl = document.getElementById('actDueDate');
  const impactEl = document.getElementById('actImpact');
  const detailsEl = document.getElementById('actDetails');

  if (!titleEl) return;

  const title = titleEl.value.trim();
  if (!title) {
    alert("Merci de saisir l'intitulé de l'action.");
    return;
  }

  const actions = loadActions();

  if (currentEditingActionId) {
    const idx = actions.findIndex((a) => a.id === currentEditingActionId);
    if (idx !== -1) {
      actions[idx] = {
        ...actions[idx],
        title,
        rootCause: rcEl.value.trim(),
        relatedRiskId: riskEl.value || '',
        owner: ownerEl.value.trim(),
        startDate: startEl.value || '',
        dueDate: dueEl.value || '',
        impact: impactEl.value,
        details: detailsEl.value.trim(),
      };
    }
  } else {
    actions.push({
      id: Date.now(),
      title,
      rootCause: rcEl.value.trim(),
      relatedRiskId: riskEl.value || '',
      owner: ownerEl.value.trim(),
      startDate: startEl.value || '',
      dueDate: dueEl.value || '',
      impact: impactEl.value,
      details: detailsEl.value.trim(),
      status: 'OPEN',
    });
  }

  saveActions(actions);
  currentEditingActionId = null;

  titleEl.value = '';
  rcEl.value = '';
  ownerEl.value = '';
  detailsEl.value = '';
  riskEl.value = '';

  renderActions();
}

function resetActions() {
  localStorage.removeItem(ACTIONS_STORAGE_KEY);
  currentEditingActionId = null;
  renderActions();
}

function initActionModule() {
  const addBtn = document.getElementById('actAddBtn');
  const resetBtn = document.getElementById('actResetBtn');
  const filterStatusEl = document.getElementById('actFilterStatus');
  const filterOwnerEl = document.getElementById('actFilterOwner');

  if (!addBtn || !resetBtn || !filterStatusEl || !filterOwnerEl) return;

  addBtn.addEventListener('click', addActionFromForm);
  resetBtn.addEventListener('click', () => {
    if (confirm('Réinitialiser toutes les actions ?')) {
      resetActions();
    }
  });

  filterStatusEl.addEventListener('change', renderActions);
  filterOwnerEl.addEventListener('change', renderActions);

  renderActions();
  populateRelatedRiskOptions();
}

/* =========================================================
   AUDIT INTERNE SIMULE – Persistance + Pagination + PDF
   ========================================================= */

// Banque de questions (complète)
const auditQuestionBank = {
  ISO14001: [
    { chapter: "4.1", theme: "Contexte", text: "Les enjeux internes et externes pertinents pour l'EMS sont-ils identifiés et tenus à jour ?" },
    { chapter: "4.2", theme: "Parties intéressées", text: "Les besoins et attentes des parties intéressées pertinentes sont-ils pris en compte ?" },
    { chapter: "5.1", theme: "Leadership", text: "La direction démontre-t-elle son engagement envers la protection de l'environnement ?" },
    { chapter: "5.2", theme: "Politique", text: "La politique environnementale est-elle adaptée à l'organisation et communiquée ?" },
    { chapter: "5.2", theme: "Politique", text: "La politique inclut-elle les engagements de conformité réglementaire ?" },
    { chapter: "6.1.2", theme: "Aspects environnementaux", text: "Les aspects environnementaux significatifs sont-ils identifiés et évalués ?" },
    { chapter: "6.1.2", theme: "Aspects environnementaux", text: "Un registre des aspects/impacts est-il maintenu à jour ?" },
    { chapter: "6.1.3", theme: "Conformité", text: "Les exigences de conformité légales et réglementaires sont-elles identifiées ?" },
    { chapter: "6.1", theme: "Risques & opportunités", text: "Les risques et opportunités liés à l'EMS sont-ils évalués ?" },
    { chapter: "6.2", theme: "Objectifs", text: "Des objectifs environnementaux mesurables sont-ils définis ?" },
    { chapter: "6.2", theme: "Objectifs", text: "Des plans d'actions existent-ils pour atteindre les objectifs ?" },
    { chapter: "7.2", theme: "Compétences", text: "Le personnel ayant un impact significatif sur l'environnement est-il formé et compétent ?" },
    { chapter: "7.3", theme: "Sensibilisation", text: "Les collaborateurs sont-ils sensibilisés à la politique et aux aspects significatifs ?" },
    { chapter: "7.4", theme: "Communication", text: "La communication interne/externe sur les sujets environnementaux est-elle maîtrisée ?" },
    { chapter: "7.5", theme: "Informations documentées", text: "Les informations documentées nécessaires sont-elles maîtrisées et disponibles ?" },
    { chapter: "8.1", theme: "Maîtrise opérationnelle", text: "Les activités associées aux aspects significatifs sont-elles maîtrisées par des procédures ?" },
    { chapter: "8.1", theme: "Maîtrise opérationnelle", text: "Les contrôles opérationnels tiennent-ils compte du cycle de vie complet ?" },
    { chapter: "8.2", theme: "Urgence", text: "Les situations d'urgence environnementale potentielles sont-elles identifiées ?" },
    { chapter: "9.1", theme: "Surveillance & mesure", text: "Des indicateurs de performance environnementale sont-ils mesurés régulièrement ?" },
    { chapter: "9.1.2", theme: "Conformité", text: "La conformité réglementaire environnementale est-elle évaluée périodiquement ?" },
    { chapter: "9.2", theme: "Audit interne", text: "Un programme d'audits internes ISO 14001 est-il établi ?" },
    { chapter: "9.3", theme: "Revue de direction", text: "La revue de direction prend-elle en compte la performance environnementale ?" },
    { chapter: "10.1", theme: "Amélioration", text: "Des actions d'amélioration continue de la performance sont-elles planifiées ?" },
    { chapter: "10.2", theme: "Non-conformités", text: "Les non-conformités donnent-elles lieu à des actions correctives ?" },
  ],
  EN9100: [
    { chapter: "4.1", theme: "Contexte & risques", text: "Les enjeux de sécurité et fiabilité aéronautique sont-ils pris en compte dans le contexte ?" },
    { chapter: "4.3", theme: "Périmètre", text: "Le périmètre du SMQ EN 9100 couvre-t-il toutes les activités pertinentes ?" },
    { chapter: "5.1", theme: "Leadership", text: "La direction démontre-t-elle son engagement envers la sécurité et la qualité aéronautique ?" },
    { chapter: "5.3", theme: "Rôles & responsabilités", text: "Les responsabilités pour la conformité produit sont-elles clairement définies ?" },
    { chapter: "6.1", theme: "Risques & opportunités", text: "Les risques qualité et sécurité des processus sont-ils identifiés ?" },
    { chapter: "6.1", theme: "Actions", text: "Des actions sont-elles définies pour réduire les risques significatifs ?" },
    { chapter: "7.1.3", theme: "Infrastructure", text: "Les infrastructures critiques sont-elles maintenues et qualifiées ?" },
    { chapter: "7.1.5", theme: "Mesure & surveillance", text: "Les équipements de mesure sont-ils étalonnés et tracés ?" },
    { chapter: "7.2", theme: "Compétences", text: "Le personnel exécutant des tâches critiques est-il qualifié et autorisé ?" },
    { chapter: "7.5", theme: "Traçabilité documentaire", text: "Les enregistrements permettent-ils de reconstituer l'historique complet des produits ?" },
    { chapter: "8.1", theme: "Planification opérationnelle", text: "La planification opérationnelle tient-elle compte des exigences client aéronautiques ?" },
    { chapter: "8.1.3", theme: "Maîtrise des changements", text: "Les changements de conception ou procédé sont-ils validés avant mise en œuvre ?" },
    { chapter: "8.2", theme: "Examen des exigences", text: "Les exigences clients sont-elles revues et clarifiées avant acceptation ?" },
    { chapter: "8.3", theme: "Conception & développement", text: "Les activités de conception aéronautique sont-elles planifiées et documentées ?" },
    { chapter: "8.4", theme: "Fournisseurs", text: "Les fournisseurs et sous-traitants sont-ils évalués et surveillés régulièrement ?" },
    { chapter: "8.5.1", theme: "Production & service", text: "Les instructions de travail et gammes sont-elles disponibles sur les postes ?" },
    { chapter: "8.5.1", theme: "Prévention des pièces suspectes", text: "Des mesures empêchent-elles l'utilisation de pièces contrefaites ou suspectes ?" },
    { chapter: "8.5.2", theme: "Identification & traçabilité", text: "Les produits sont-ils identifiés et tracés par numéro de série/lot ?" },
    { chapter: "8.5.6", theme: "Validation des procédés spéciaux", text: "Les procédés spéciaux sont-ils validés avant utilisation en série ?" },
    { chapter: "8.6", theme: "Libération produit", text: "La libération des produits est-elle réalisée par une fonction autorisée ?" },
    { chapter: "8.7", theme: "Produits non conformes", text: "Les produits non conformes sont-ils traités selon un processus formalisé ?" },
    { chapter: "9.1", theme: "Indicateurs", text: "Les indicateurs qualité sont-ils suivis et analysés régulièrement ?" },
    { chapter: "9.2", theme: "Audit interne", text: "Un programme d'audits internes EN 9100 couvre-t-il les processus critiques ?" },
    { chapter: "9.3", theme: "Revue de direction", text: "La revue de direction inclut-elle la performance et les risques identifiés ?" },
    { chapter: "10.2", theme: "Actions correctives", text: "Les non-conformités donnent-elles lieu à une analyse de cause racine ?" },
    { chapter: "10.3", theme: "Amélioration", text: "Des actions d'amélioration de la performance sont-elles planifiées ?" },
  ],
};

const AUDIT_SESSION_KEY = "qmsAssistantAuditSession";

// État persistant d'un audit en cours
function getAuditSession() {
  try {
    const raw = localStorage.getItem(AUDIT_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function saveAuditSession(session) {
  try {
    localStorage.setItem(AUDIT_SESSION_KEY, JSON.stringify(session));
  } catch (e) {
    console.warn("Impossible de sauvegarder la session d'audit");
  }
}

function clearAuditSession() {
  localStorage.removeItem(AUDIT_SESSION_KEY);
}

// Initialiser une session avec toutes les questions
function initializeAuditSession(standard, totalQuestions, auditorName) {
  const bank = auditQuestionBank[standard] || [];
  const shuffled = [...bank].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, totalQuestions);

  const session = {
    standard,
    auditorName: auditorName || "Non spécifié",
    date: new Date().toISOString().slice(0, 10),
    allQuestions: selected,
    answers: selected.map(() => ({ answer: "--", comment: "" })),
    currentPageIndex: 0,
    questionsPerPage: 10,
  };

  saveAuditSession(session);   // <= très important pour le rapport global
  return session;
}


function getCurrentPage(session) {
  const start = session.currentPageIndex * session.questionsPerPage;
  const end = start + session.questionsPerPage;
  return {
    questions: session.allQuestions.slice(start, end),
    answers: session.answers.slice(start, end),
    startIndex: start,
    endIndex: end,
    pageNumber: session.currentPageIndex + 1,
    totalPages: Math.ceil(session.allQuestions.length / session.questionsPerPage),
  };
}

function renderCurrentPage(session) {
  const page = getCurrentPage(session);
  const tbody = document.getElementById("auditTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  page.questions.forEach((q, i) => {
    const globalIndex = page.startIndex + i;
    const answer = session.answers[globalIndex];

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${globalIndex + 1}</td>
      <td>
        <div class="fw-semibold">${q.chapter}</div>
        <div class="small text-secondary">${q.theme || ""}</div>
      </td>
      <td>${q.text}</td>
      <td>
        <select class="form-select form-select-sm audit-answer" data-global-index="${globalIndex}">
          <option value="">--</option>
          <option value="YES"${answer.answer === "YES" ? " selected" : ""}>Oui</option>
          <option value="PARTIAL"${answer.answer === "PARTIAL" ? " selected" : ""}>Partiel</option>
          <option value="NO"${answer.answer === "NO" ? " selected" : ""}>Non</option>
        </select>
      </td>
      <td>
        <input type="text"
               class="form-control form-control-sm audit-comment"
               data-global-index="${globalIndex}"
               placeholder="Observation, écart, piste…"
               value="${answer.comment || ""}" />
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Mise à jour pagination
  document.getElementById("auditPageInfo").textContent = `Page ${page.pageNumber} / ${page.totalPages}`;

  const prevBtn = document.getElementById("auditPrevBtn");
  const nextBtn = document.getElementById("auditNextBtn");
  prevBtn.style.display = page.pageNumber > 1 ? "inline-block" : "none";
  nextBtn.style.display = page.pageNumber < page.totalPages ? "inline-block" : "none";

  attachAuditPageEvents(session);
  updateAuditStats(session);
}

function attachAuditPageEvents(session) {
  // Réponses OUI / PARTIEL / NON
  document.querySelectorAll(".audit-answer").forEach((sel) => {
    sel.addEventListener("change", () => {
      const idx = Number(sel.getAttribute("data-global-index"));
      session.answers[idx].answer = sel.value;
      saveAuditSession(session);
      // On met à jour les KPI de l’audit, mais PAS l’historique
      updateAuditStats(session);
    });
  });

  // Commentaires
  document.querySelectorAll(".audit-comment").forEach((input) => {
    input.addEventListener("input", () => {
      const idx = Number(input.getAttribute("data-global-index"));
      session.answers[idx].comment = input.value;
      saveAuditSession(session);
      // Pas nécessaire de recalculer les stats pour un simple commentaire
    });
  });
}


function updateAuditStats(session) {
  if (!session) return;

  const total = session.allQuestions.length;
  let yes = 0;
  let gaps = 0;
  let answered = 0;

  session.answers.forEach((a) => {
    if (a.answer && a.answer !== "--") {
      answered++;
      if (a.answer === "YES") yes++;
      if (a.answer === "PARTIAL" || a.answer === "NO") gaps++;
    }
  });

  const totalEl = document.getElementById("auditTotalQuestions");
  const yesEl = document.getElementById("auditYesCount");
  const gapEl = document.getElementById("auditGapCount");
  const progressEl = document.getElementById("auditProgress");

  if (totalEl && yesEl && gapEl && progressEl) {
    totalEl.textContent = total;
    yesEl.textContent = yes;
    gapEl.textContent = gaps;
    const progress = total === 0 ? 0 : Math.round((answered / total) * 100);
    progressEl.textContent = progress;
  }

  const summaryText = document.getElementById("auditSummaryText");
  if (summaryText) {
    if (total === 0) {
      summaryText.textContent = "Génère un audit pour commencer.";
    } else {
      const progress = total === 0 ? 0 : Math.round((answered / total) * 100);
      summaryText.textContent =
        `Questions totales : ${total} • Réponses conformes : ${yes} ` +
        `• Cartes / points à traiter : ${gaps} • Progression : ${progress}%`;
    }
  }
}

function finalizeAuditAndStoreHistory(session) {
  if (!session) return;

  const total = session.allQuestions.length;
  let yes = 0;
  let gaps = 0;

  session.answers.forEach((a) => {
    if (a.answer === "YES") yes++;
    if (a.answer === "PARTIAL" || a.answer === "NO") gaps++;
  });

  const rate = total === 0 ? 0 : Math.round((yes / total) * 100);
  const labelStandard = session.standard === "ISO14001" ? "ISO 14001" : "EN 9100";

  try {
    const raw = localStorage.getItem("qmsAssistantAuditHistory");
    let history = raw ? JSON.parse(raw) : [];

    // On récupère le dernier numéro utilisé dans les labels "Audit ... #X"
    let lastNumber = 0;
    history.forEach((h) => {
      const m = h.label && h.label.match(/#(\d+)/);
      if (m) {
        const n = Number(m[1]);
        if (!Number.isNaN(n) && n > lastNumber) {
          lastNumber = n;
        }
      }
    });

    const nextNumber = lastNumber + 1;
    const label = `Audit ${labelStandard} #${nextNumber}`;

    history.push({
      label,
      conformityRate: rate,
      nc: gaps,
    });

    // Garder uniquement les 4 derniers audits
    if (history.length > 4) {
      history = history.slice(history.length - 4);
    }

    localStorage.setItem("qmsAssistantAuditHistory", JSON.stringify(history));

    // Rafraîchir le dashboard / graphe
    if (typeof updateKpis === "function") updateKpis();
    if (typeof refreshConformityChart === "function") refreshConformityChart();
  } catch (e) {
    console.warn("Impossible de mettre à jour l'historique des audits", e);
  }
}



// Rapport global unique (Dashboard qualité)
function generateGlobalPDF() {
  const jsPDF = window.jsPDF || (window.jspdf && window.jspdf.jsPDF);
  if (!jsPDF) {
    alert("jsPDF n'est pas chargé. Ajoute la librairie dans le HTML.");
    return;
  }

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  let yPos = margin;

  const addNewPage = () => {
    doc.addPage();
    yPos = margin;
  };

  // 1. Page de garde
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42);
  doc.text("RAPPORT GLOBAL QMS", margin, yPos);
  yPos += 10;

  doc.setFontSize(11);
  doc.setTextColor(55, 65, 81);
  const today = new Date().toISOString().slice(0, 10);
  doc.text("Date : " + today, margin, yPos);
  yPos += 7;

  doc.setFontSize(10);
  doc.text("Synthèse checklist, risques, plan d'actions et audit interne simulé.", margin, yPos);
  yPos += 12;

  // 2. Récupération des données locales existantes
  const checklistState = (function () {
    try {
      const raw = localStorage.getItem("qmsAssistantChecklist");
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  })();

  const risks = (function () {
    try {
      const raw = localStorage.getItem("qmsAssistantRisks");
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  })();

  const actions = (function () {
    try {
      const raw = localStorage.getItem("qmsAssistantActions");
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  })();

  const auditSession = (function () {
    try {
      const raw = localStorage.getItem("qmsAssistantAuditSession");
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  })();

  // 3. Synthèse checklist
  doc.setFontSize(14);
  doc.setTextColor(37, 99, 235);
  doc.text("1. Checklist de conformité", margin, yPos);
  yPos += 8;

  let totalChecklist = 0;
  let conf = 0;
  let partiel = 0;
  let nonConf = 0;

  // on réutilise le tableau checklistRequirements déjà défini dans app.js
  if (Array.isArray(checklistRequirements)) {
    checklistRequirements.forEach((req) => {
      const row = checklistState[req.id];
      if (!row || !row.status || row.status === "--") return;
      totalChecklist += 1;
      if (row.status === "CONFORME") conf += 1;
      else if (row.status === "PARTIEL") partiel += 1;
      else if (row.status === "NON") nonConf += 1;
    });
  }

  const checklistRate = totalChecklist === 0 ? 0 : Math.round((conf / totalChecklist) * 100);

  doc.setFontSize(10);
  doc.setTextColor(17, 24, 39);
  doc.text("Exigences évaluées : " + totalChecklist, margin, yPos); yPos += 5;
  doc.text("Conformes : " + conf + " | Partiellement conformes : " + partiel + " | Non conformes : " + nonConf, margin, yPos); yPos += 5;
  doc.text("Taux global de conformité : " + checklistRate + " %", margin, yPos); yPos += 10;

  // 4. Synthèse risques
  if (yPos > pageHeight - 40) addNewPage();
  doc.setFontSize(14);
  doc.setTextColor(37, 99, 235);
  doc.text("2. Registre des risques et opportunités", margin, yPos);
  yPos += 8;

  const totalRisks = risks.length;
  const oppCount = risks.filter((r) => r.type === "Opportunité").length;

  const classifyRiskLevel = (score) => {
    if (score >= 16) return "Critique";
    if (score >= 8) return "Moyen";
    return "Faible";
  };

  const criticalCount = risks.filter((r) => {
    const score = (r.severity || 0) * (r.probability || 0);
    return classifyRiskLevel(score) === "Critique";
  }).length;

  doc.setFontSize(10);
  doc.setTextColor(17, 24, 39);
  doc.text("Risques/opportunités totaux : " + totalRisks, margin, yPos); yPos += 5;
  doc.text("Opportunités : " + oppCount + " | Risques critiques : " + criticalCount, margin, yPos); yPos += 10;

  // 5. Synthèse plan d'actions
  if (yPos > pageHeight - 40) addNewPage();
  doc.setFontSize(14);
  doc.setTextColor(37, 99, 235);
  doc.text("3. Plan d'actions", margin, yPos);
  yPos += 8;

  const computeActionStatus = (action) => {
    const todayStr = today;
    if (action.status === "CLOSED") return "Clôturée";
    if (action.dueDate && action.dueDate < todayStr) return "En retard";
    return "En cours";
  };

  let totalActions = actions.length;
  let open = 0;
  let closed = 0;
  let late = 0;

  actions.forEach((a) => {
    const st = computeActionStatus(a);
    if (st === "En cours") open += 1;
    else if (st === "Clôturée") closed += 1;
    else if (st === "En retard") late += 1;
  });

  doc.setFontSize(10);
  doc.setTextColor(17, 24, 39);
  doc.text("Actions totales : " + totalActions, margin, yPos); yPos += 5;
  doc.text("En cours : " + open + " | Clôturées : " + closed + " | En retard : " + late, margin, yPos); yPos += 10;

  // 6. Synthèse audit interne (si existant)
  if (auditSession) {
    if (yPos > pageHeight - 60) addNewPage();
    doc.setFontSize(14);
    doc.setTextColor(37, 99, 235);
    doc.text("4. Audit interne simulé", margin, yPos);
    yPos += 8;

    const yes = auditSession.answers.filter((a) => a.answer === "YES").length;
    const partial = auditSession.answers.filter((a) => a.answer === "PARTIAL").length;
    const no = auditSession.answers.filter((a) => a.answer === "NO").length;
    const totalQ = auditSession.allQuestions.length;
    const rate = totalQ === 0 ? 0 : Math.round((yes / totalQ) * 100);

    doc.setFontSize(10);
    doc.setTextColor(17, 24, 39);
    doc.text("Norme auditée : " + (auditSession.standard || ""), margin, yPos); yPos += 5;
    doc.text("Date : " + (auditSession.date || ""), margin, yPos); yPos += 5;
    doc.text("Auditeur : " + (auditSession.auditorName || "Non spécifié"), margin, yPos); yPos += 5;
    doc.text("Questions totales : " + totalQ, margin, yPos); yPos += 5;
    doc.text("Conformes : " + yes + " | Partiellement conformes : " + partial + " | Non conformes : " + no, margin, yPos); yPos += 5;
    doc.text("Taux de conformité audit : " + rate + " %", margin, yPos); yPos += 10;
  }

  // 7. Sauvegarde
  doc.save("QMS_Rapport_global.pdf");
}

// Génération PDF professionnel multi-pages
function generateAuditPDF(session) {
  const jsPDF = window.jsPDF || (window.jspdf && window.jspdf.jsPDF);
  if (!jsPDF) {
    alert("jsPDF n'est pas chargé. Ajoute la librairie dans le HTML.");
    return;
  }
  
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  let yPos = margin;

  // Fonction pour ajouter une nouvelle page
  const addNewPage = () => {
    doc.addPage();
    yPos = margin;
  };

  // En-tête du rapport
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text("RAPPORT D'AUDIT INTERNE", margin, yPos);
  yPos += 10;

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  const standardLabel = session.standard === "ISO14001" ? "ISO 14001:2015" : "EN 9100";
  doc.text(`Norme auditée : ${standardLabel}`, margin, yPos);
  yPos += 5;
  doc.text(`Date : ${session.date}`, margin, yPos);
  yPos += 5;
  doc.text(`Auditeur : ${session.auditorName || "Non spécifié"}`, margin, yPos);
  yPos += 10;

  // Résumé
  const yes = session.answers.filter((a) => a.answer === "YES").length;
  const partial = session.answers.filter((a) => a.answer === "PARTIAL").length;
  const no = session.answers.filter((a) => a.answer === "NO").length;
  const total = session.allQuestions.length;

  doc.setFontSize(11);
  doc.setTextColor(37, 99, 235);
  doc.text("RÉSUMÉ DE L'AUDIT", margin, yPos);
  yPos += 7;

  doc.setFontSize(9);
  doc.setTextColor(17, 24, 39);
  doc.text(`Questions totales : ${total}`, margin, yPos);
  yPos += 4;
  doc.text(`Conformes (Oui) : ${yes}`, margin, yPos);
  yPos += 4;
  doc.text(`Partiellement conformes : ${partial}`, margin, yPos);
  yPos += 4;
  doc.text(`Non conformes : ${no}`, margin, yPos);
  yPos += 4;

  const conformityRate = total > 0 ? Math.round((yes / total) * 100) : 0;
  doc.setTextColor(37, 99, 235);
  doc.setFont(undefined, "bold");
  doc.text(`Taux de conformité : ${conformityRate} %`, margin, yPos);
  yPos += 10;

  // Tableau des questions/réponses
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("DÉTAIL DES QUESTIONS ET RÉPONSES", margin, yPos);
  yPos += 8;

  // En-tête du tableau
  const colWidths = [15, 30, 60, 20, 40];
  const headers = ["#", "Chapitre", "Question", "Réponse", "Commentaire"];

  doc.setFontSize(8);
  doc.setFont(undefined, "bold");
  doc.setFillColor(37, 99, 235);
  doc.setTextColor(255, 255, 255);

  const headerY = yPos;
  doc.rect(margin, headerY - 4, contentWidth, 6, "F");
  let xPos = margin + 2;
  headers.forEach((h, i) => {
    doc.text(h, xPos, headerY);
    xPos += colWidths[i];
  });
  yPos += 8;

  // Lignes du tableau
  doc.setTextColor(17, 24, 39);
  doc.setFont(undefined, "normal");

  session.allQuestions.forEach((q, idx) => {
    const answer = session.answers[idx];
    const answerText =
      answer.answer === "YES"
        ? "Oui"
        : answer.answer === "PARTIAL"
          ? "Partiel"
          : answer.answer === "NO"
            ? "Non"
            : "--";

    // Vérifier si la ligne tient sur la page actuelle
    const lineHeight = 12;
    if (yPos + lineHeight > pageHeight - margin) {
      addNewPage();

      // Répéter l'en-tête du tableau sur la nouvelle page
      doc.setFontSize(8);
      doc.setFont(undefined, "bold");
      doc.setFillColor(37, 99, 235);
      doc.setTextColor(255, 255, 255);
      const headerY2 = yPos;
      doc.rect(margin, headerY2 - 4, contentWidth, 6, "F");
      let x2 = margin + 2;
      headers.forEach((h, i) => {
        doc.text(h, x2, headerY2);
        x2 += colWidths[i];
      });
      yPos += 8;
      doc.setTextColor(17, 24, 39);
      doc.setFont(undefined, "normal");
    }

    // Ligne du tableau
    xPos = margin + 2;
    doc.setFontSize(8);

    // Numéro
    doc.text(String(idx + 1), xPos, yPos);
    xPos += colWidths[0];

    // Chapitre
    doc.text(q.chapter, xPos, yPos);
    xPos += colWidths[1];

    // Question (wrapping)
    const splitQuestion = doc.splitTextToSize(q.text, colWidths[2] - 2);
    doc.text(splitQuestion, xPos, yPos);
    const questionHeight = splitQuestion.length * 3.5;
    xPos += colWidths[2];

    // Réponse
    doc.text(answerText, xPos, yPos);
    xPos += colWidths[3];

    // Commentaire (wrapping)
    const splitComment = doc.splitTextToSize(answer.comment || "", colWidths[4] - 2);
    doc.text(splitComment, xPos, yPos);

    const rowHeight = Math.max(5, questionHeight);
    yPos += rowHeight + 1;
  });

  // Pied de page (signature)
  yPos += 10;
  if (yPos > pageHeight - 30) {
    addNewPage();
  }

  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.setFont(undefined, "bold");
  doc.text("CONCLUSION ET SIGNATURE", margin, yPos);
  yPos += 8;

  doc.setFont(undefined, "normal");
  doc.setFontSize(9);
  doc.text(`Auditeur : ${session.auditorName || "Non spécifié"}`, margin, yPos);
  yPos += 5;
  doc.text(`Date : ${session.date}`, margin, yPos);
  yPos += 5;
  doc.text(`Norme : ${standardLabel}`, margin, yPos);

  // Télécharger le PDF
  const filename = `Audit_${session.standard}_${session.date}_${session.auditorName || "rapport"}.pdf`;
  doc.save(filename);
}

function initAuditModule() {
  const standardEl = document.getElementById("auditStandard");
  const countEl = document.getElementById("auditQuestionCount");
  const auditorEl = document.getElementById("auditAuditorName");
  const generateBtn = document.getElementById("auditGenerateBtn");
  const savePageBtn = document.getElementById("auditSavePageBtn");
  const nextBtn = document.getElementById("auditNextBtn");
  const prevBtn = document.getElementById("auditPrevBtn");
  const downloadPdfBtn = document.getElementById("auditDownloadPdfBtn");
  const finalizeBtn = document.getElementById("auditFinalizeBtn");

  if (!generateBtn) return;

  let currentSession = getAuditSession();

  // Si une session existe déjà au chargement, on la restaure
  if (currentSession) {
    renderCurrentPage(currentSession);
    if (downloadPdfBtn) downloadPdfBtn.style.display = "inline-block";
  }

  // Génération / réinitialisation d’un audit
  generateBtn.addEventListener("click", () => {
    // Si une session existe déjà, demander confirmation avant de la perdre
    if (
      currentSession &&
      !confirm("Cela va réinitialiser l'audit en cours. Continuer ?")
    ) {
      return;
    }

    // On efface simplement la session d'audit en cours (pas l'historique du dashboard)
    clearAuditSession();
    currentSession = null;

    // Lecture des paramètres du nouveau run
    const standard = standardEl.value || "ISO14001";
    const count = Number(countEl.value) || 10;
    const auditorName = auditorEl.value.trim() || "Non spécifié";

    // Nouvelle session
    currentSession = initializeAuditSession(standard, count, auditorName);

    // Rendu de la première page, sans mise à jour de l'historique dashboard
    renderCurrentPage(currentSession);

    if (downloadPdfBtn) {
      downloadPdfBtn.style.display = "inline-block";
    }
  });

  // Sauvegarde de la page courante dans la session d’audit
  if (savePageBtn) {
    savePageBtn.addEventListener("click", () => {
      currentSession = getAuditSession();
      if (!currentSession) return;
      saveAuditSession(currentSession);
      alert("Page sauvegardée dans le navigateur.");
    });
  }

  // Page suivante
  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      currentSession = getAuditSession();
      if (!currentSession) return;
      const page = getCurrentPage(currentSession);
      if (page.pageNumber < page.totalPages) {
        currentSession.currentPageIndex += 1;
        saveAuditSession(currentSession);
        renderCurrentPage(currentSession);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

  // Page précédente
  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      currentSession = getAuditSession();
      if (!currentSession) return;
      if (currentSession.currentPageIndex > 0) {
        currentSession.currentPageIndex -= 1;
        saveAuditSession(currentSession);
        renderCurrentPage(currentSession);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

  // Téléchargement du PDF d’audit (audit courant uniquement)
  if (downloadPdfBtn) {
    downloadPdfBtn.addEventListener("click", () => {
      currentSession = getAuditSession();
      if (!currentSession) return;
      generateAuditPDF(currentSession);
    });
  }

  // Clôture de l’audit et enregistrement dans l’historique / dashboard
  if (finalizeBtn) {
    finalizeBtn.addEventListener("click", () => {
      const session = getAuditSession();
      if (!session) {
        alert("Aucun audit en cours à clôturer.");
        return;
      }

      if (
        !confirm(
          "Clôturer cet audit et l’enregistrer dans le dashboard ?\n" +
            "Vous pourrez ensuite en lancer un nouveau."
        )
      ) {
        return;
      }

      finalizeAuditAndStoreHistory(session);
      alert("Audit clôturé et ajouté au dashboard.");

      // Optionnel : revenir automatiquement au dashboard
      const dashLink = document.querySelector('[data-target="module-dashboard"]');
      if (dashLink) dashLink.click();
    });
  }
}


/* =========================================================
   INITIALISATION GLOBALE
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  updateKpis();
  initConformityChart();
  initRiskProfileChart();
  initChecklistModule();
  initRiskModule();
  initActionModule();
  initAuditModule();

  const dashPdfBtn = document.getElementById("dashboardExportPdfBtn");
  if (dashPdfBtn) {
    dashPdfBtn.addEventListener("click", generateGlobalPDF);
  }
});
