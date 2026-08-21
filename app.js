// ============================================
// VISUALISATEUR EXCEL - DFR CONSULTING
// Version optimisée avec :
// - Meilleure structure de code
// - Gestion d'erreurs améliorée
// - Notifications utilisateur
// - Optimisations de performance
// - Support du drag & drop
// - Sauvegarde des préférences
// ============================================

// ===== CONFIGURATION =====
const CONFIG = {
  // Couleurs par défaut
  defaultColors: {
    y1: '#1E88A8',
    y2: '#FF5733',
    y3: '#2ECC71',
    y4: '#E74C3C',
    y5: '#9B59B6',
    y6: '#F1C40F'
  },
  // Types de graphiques disponibles
  chartTypes: ['xy', 'timeseries', 'histogram', 'heatmap'],
  // Configuration Plotly
  plotlyConfig: {
    responsive: true,
    displayModeBar: true,
    modeBarButtonsToRemove: ['lasso2d', 'select2d'],
    displaylogo: false
  },
  // Configuration du layout Plotly
  plotlyLayout: {
    autosize: true,
    height: 650,
    margin: { l: 60, r: 60, b: 70, t: 50 },
    legend: { orientation: 'h', y: -0.15 },
    hovermode: 'closest',
    font: { family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto' }
  }
};

// ===== ÉTAT DE L'APPLICATION =====
const state = {
  // Données
  currentChartType: 'xy',
  currentTableIndex: 0,
  headers: [],
  dataCache: {},
  traces: [],
  xIsDate: false,

  // Configuration
  axisTitles: { x: '', y1: '', y2: '' },
  colorScale: 'Viridis',
  colors: { ...CONFIG.defaultColors },
  opacity: 1,

  // UI
  isSidebarCollapsed: false,
  isLoading: false,
  theme: 'light',
  notifications: []
};

// ===== ÉLÉMENTS DOM =====
const elements = {
  // Sidebar
  sidebar: document.getElementById('sidebar'),
  toggleSidebar: document.querySelector('.toggle-sidebar'),

  // Sélecteurs
  tableSelector: document.getElementById('tableSelector'),
  xAxisSelect: document.getElementById('xAxisSelect'),
  yAxisSelect: document.getElementById('yAxisSelect'),
  y2AxisSelect: document.getElementById('y2AxisSelect'),

  // Options de graphique
  chartTypeOptions: document.querySelectorAll('.chart-type-option'),
  group2Section: document.getElementById('group2Section'),
  y2ColorGroup: document.getElementById('y2ColorGroup'),
  y2TitleGroup: document.getElementById('y2TitleGroup'),

  // Boutons
  addSeriesBtns: document.querySelectorAll('.add-series-btn'),
  clearAllBtn: document.getElementById('clearAllBtn'),
  exportPNGBtn: document.getElementById('exportPNGBtn'),
  resetBtn: document.getElementById('resetBtn'),
  importBtn: document.getElementById('importBtn'),
  fileInput: document.getElementById('fileInput'),
  toggleTheme: document.getElementById('toggleTheme'),

  // Options de style
  seriesColor: document.getElementById('seriesColor'),
  seriesColorY2: document.getElementById('seriesColorY2'),
  transparency: document.getElementById('transparency'),
  transparencyValue: document.getElementById('transparencyValue'),

  // Titres des axes
  xAxisTitle: document.getElementById('xAxisTitle'),
  y1AxisTitle: document.getElementById('y1AxisTitle'),
  y2AxisTitle: document.getElementById('y2AxisTitle'),

  // Graphique
  graphDiv: document.getElementById('graphDiv'),
  loadingSpinner: document.getElementById('loadingSpinner'),

  // Tooltip
  tooltip: document.getElementById('tooltip')
};

// ===== NOTIFICATIONS =====
const notyf = new Notyf({
  duration: 3000,
  position: { x: 'right', y: 'top' },
  types: [
    {
      type: 'success',
      background: 'linear-gradient(to right, #28a745, #218838)',
      icon: {
        className: 'notyf__icon',
        tagName: 'i',
        text: '✓'
      }
    },
    {
      type: 'error',
      background: 'linear-gradient(to right, #dc3545, #c82333)',
      icon: {
        className: 'notyf__icon',
        tagName: 'i',
        text: '✕'
      }
    },
    {
      type: 'warning',
      background: 'linear-gradient(to right, #ffc107, #e0a800)',
      icon: {
        className: 'notyf__icon',
        tagName: 'i',
        text: '⚠'
      }
    }
  ]
});

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});

async function initializeApp() {
  try {
    // Initialiser Feather Icons
    feather.replace();

    // Charger les préférences sauvegardées
    loadPreferences();

    // Initialiser Plotly
    initPlotly();

    // Charger les tables Excel
    await loadTables();

    // Configurer les écouteurs d'événements
    setupEventListeners();

    // Appliquer le thème
    applyTheme();

    console.log('✅ Application initialisée avec succès');
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation:', error);
    showError('Erreur lors de l\'initialisation de l\'application');
  }
}

// ===== FONCTIONS D'INITIALISATION =====
function initPlotly() {
  if (!elements.graphDiv) return;

  Plotly.newPlot(
    elements.graphDiv,
    [],
    getLayout(),
    CONFIG.plotlyConfig
  );

  // Observer pour le redimensionnement
  const resizeObserver = new ResizeObserver(debounce(() => {
    if (elements.graphDiv) {
      Plotly.Plots.resize(elements.graphDiv);
    }
  }, 250));

  if (elements.graphDiv) {
    resizeObserver.observe(elements.graphDiv);
  }
}

function setupEventListeners() {
  // Toggle sidebar
  if (elements.toggleSidebar) {
    elements.toggleSidebar.addEventListener('click', toggleSidebar);
  }

  // Sélection du type de graphique
  elements.chartTypeOptions.forEach(option => {
    option.addEventListener('click', () => {
      selectChartType(option.dataset.chartType);
    });
  });

  // Boutons d'ajout de série
  elements.addSeriesBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      addSeries(btn.dataset.axis);
    });
  });

  // Bouton tout effacer
  if (elements.clearAllBtn) {
    elements.clearAllBtn.addEventListener('click', clearAllSeries);
  }

  // Bouton exporter PNG
  if (elements.exportPNGBtn) {
    elements.exportPNGBtn.addEventListener('click', exportPNG);
  }

  // Bouton réinitialiser
  if (elements.resetBtn) {
    elements.resetBtn.addEventListener('click', resetApplication);
  }

  // Bouton importer
  if (elements.importBtn) {
    elements.importBtn.addEventListener('click', () => {
      elements.fileInput.click();
    });
  }

  // Input fichier
  if (elements.fileInput) {
    elements.fileInput.addEventListener('change', handleFileImport);
  }

  // Toggle thème
  if (elements.toggleTheme) {
    elements.toggleTheme.addEventListener('click', toggleTheme);
  }

  // Sélecteur de table
  if (elements.tableSelector) {
    elements.tableSelector.addEventListener('change', () => {
      loadTableData(parseInt(elements.tableSelector.value));
    });
  }

  // Sélecteurs d'axes
  [elements.xAxisSelect, elements.yAxisSelect, elements.y2AxisSelect].forEach(select => {
    if (select) {
      select.addEventListener('change', () => {
        // Réactiver les boutons d'ajout si des valeurs sont sélectionnées
        enableAddButtonsIfReady();
      });
    }
  });

  // X est une date
  const xIsDateCheckbox = document.getElementById('xIsDate');
  if (xIsDateCheckbox) {
    xIsDateCheckbox.addEventListener('change', () => {
      state.xIsDate = xIsDateCheckbox.checked;
      savePreferences();
    });
  }

  // Opacité
  if (elements.transparency) {
    elements.transparency.addEventListener('input', () => {
      const opacity = parseInt(elements.transparency.value) / 100;
      state.opacity = opacity;
      if (elements.transparencyValue) {
        elements.transparencyValue.textContent = `${elements.transparency.value}%`;
      }
      updateOpacity();
      savePreferences();
    });
  }

  // Couleurs
  if (elements.seriesColor) {
    elements.seriesColor.addEventListener('input', () => {
      state.colors.y1 = elements.seriesColor.value;
      updateColor('y1');
      savePreferences();
    });
  }

  if (elements.seriesColorY2) {
    elements.seriesColorY2.addEventListener('input', () => {
      state.colors.y2 = elements.seriesColorY2.value;
      updateColor('y2');
      savePreferences();
    });
  }

  // Titres des axes
  [elements.xAxisTitle, elements.y1AxisTitle, elements.y2AxisTitle].forEach(input => {
    if (input) {
      input.addEventListener('input', debounce(() => {
        updateAxisTitles();
        savePreferences();
      }, 300));
    }
  });

  // Tooltips
  setupTooltips();

  // Drag & Drop
  setupDragAndDrop();
}

// ===== FONCTIONS PRINCIPALES =====
async function loadTables() {
  try {
    showLoading(true);

    await Excel.run(async (context) => {
      const sheet = context.workbook.worksheets.getActiveWorksheet();
      const tables = sheet.tables.load('items/name');

      await context.sync();

      if (!elements.tableSelector) return;

      elements.tableSelector.innerHTML = '';
      if (tables.items.length === 0) {
        elements.tableSelector.innerHTML = '<option value="" disabled selected>Aucune table trouvée</option>';
        showWarning('Aucune table trouvée dans la feuille active');
        return;
      }

      tables.items.forEach((table, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = table.name;
        elements.tableSelector.appendChild(option);
      });

      if (tables.items.length > 0) {
        await loadTableData(0);
      }
    });
  } catch (error) {
    console.error('❌ Erreur lors du chargement des tables:', error);
    showError('Impossible de charger les tables Excel. Vérifiez que vous êtes dans Excel et qu\'une feuille est ouverte.');
  } finally {
    showLoading(false);
  }
}

async function loadTableData(index) {
  try {
    showLoading(true);
    state.currentTableIndex = index;
    state.dataCache = {};
    state.traces = [];

    await Excel.run(async (context) => {
      const sheet = context.workbook.worksheets.getActiveWorksheet();
      const table = sheet.tables.getItemAt(index);
      const headerRange = table.getHeaderRowRange().load('values');

      await context.sync();

      state.headers = headerRange.values[0].map(h => String(h));
      buildAxisSelectors();
      redrawGraph();
    });

    showSuccess(`Table ${state.headers.length > 0 ? state.headers[0] : index + 1} chargée avec succès`);
  } catch (error) {
    console.error('❌ Erreur lors du chargement des données:', error);
    showError('Impossible de charger les données de la table');
  } finally {
    showLoading(false);
  }
}

function buildAxisSelectors() {
  const axisSelectors = ['xAxisSelect', 'yAxisSelect', 'y2AxisSelect'];

  axisSelectors.forEach(id => {
    const select = document.getElementById(id);
    if (!select) return;

    select.innerHTML = '<option value="" disabled selected>-- Choisir --</option>';
    state.headers.forEach(header => {
      const option = document.createElement('option');
      option.value = header;
      option.textContent = header;
      select.appendChild(option);
    });
  });

  // Réinitialiser les valeurs sélectionnées
  if (elements.xAxisSelect) elements.xAxisSelect.value = '';
  if (elements.yAxisSelect) elements.yAxisSelect.value = '';
  if (elements.y2AxisSelect) elements.y2AxisSelect.value = '';

  // Désactiver les boutons d'ajout
  disableAddButtons();
}

function selectChartType(chartType) {
  state.currentChartType = chartType;

  // Mettre à jour la classe selected
  elements.chartTypeOptions.forEach(opt => {
    opt.classList.remove('selected');
  });

  const selectedOpt = document.querySelector(`[data-chart-type='${chartType}']`);
  if (selectedOpt) {
    selectedOpt.classList.add('selected');
  }

  updateOptionsVisibility();
  resetGraph();
  savePreferences();
}

function updateOptionsVisibility() {
  if (!elements.group2Section) return;

  const isXYChart = state.currentChartType === 'xy';
  const hasY2Trace = state.traces.some(t => t.yaxis === 'y2');

  // Afficher la section Y2 uniquement pour les graphiques XY
  if (isXYChart) {
    elements.group2Section.classList.remove('hidden');
    elements.group2Section.classList.add('fade-in');

    // Afficher les options de couleur Y2 si une série Y2 existe
    if (hasY2Trace || elements.y2AxisSelect?.value) {
      elements.y2ColorGroup?.classList.remove('hidden');
      elements.y2TitleGroup?.classList.remove('hidden');
    }
  } else {
    elements.group2Section.classList.add('hidden');
    elements.y2ColorGroup?.classList.add('hidden');
    elements.y2TitleGroup?.classList.add('hidden');
  }
}

function enableAddButtonsIfReady() {
  const xSelected = elements.xAxisSelect?.value;
  const y1Selected = elements.yAxisSelect?.value;
  const y2Selected = elements.y2AxisSelect?.value;

  elements.addSeriesBtns.forEach(btn => {
    const axis = btn.dataset.axis;
    const isReady = xSelected && (
      (axis === 'y1' && y1Selected) ||
      (axis === 'y2' && y2Selected)
    );
    btn.disabled = !isReady;
  });
}

function disableAddButtons() {
  elements.addSeriesBtns.forEach(btn => {
    btn.disabled = true;
  });
}

async function addSeries(axis) {
  const x = elements.xAxisSelect?.value;
  const ySelect = axis === 'y2' ? elements.y2AxisSelect : elements.yAxisSelect;
  const y = ySelect?.value;

  if (!x || !y) {
    showWarning('Veuillez choisir les axes X et Y');
    return;
  }

  try {
    showLoading(true);

    // Vérifier si cette série existe déjà
    const seriesExists = state.traces.some(trace =>
      trace.name === y && trace.yaxis === (axis === 'y2' ? 'y2' : 'y1')
    );

    if (seriesExists) {
      showWarning(`La série "${y}" est déjà ajoutée pour l'axe ${axis.toUpperCase()}`);
      return;
    }

    const [xData, yData] = await Promise.all([
      loadColumnData(x),
      loadColumnData(y)
    ]);

    if (!xData.length || !yData.length) {
      showWarning('Aucune donnée valide trouvée pour les colonnes sélectionnées');
      return;
    }

    const trace = createTrace(xData, yData, y, axis);
    state.traces.push(trace);
    redrawGraph();

    // Afficher les options Y2 si c'est une série Y2
    if (axis === 'y2') {
      elements.y2ColorGroup?.classList.remove('hidden');
      elements.y2TitleGroup?.classList.remove('hidden');
    }

    showSuccess(`Série "${y}" ajoutée avec succès`);

    // Sauvegarder les préférences
    savePreferences();
  } catch (error) {
    console.error('❌ Erreur lors de l\'ajout de la série:', error);
    showError(`Impossible d'ajouter la série: ${error.message}`);
  } finally {
    showLoading(false);
  }
}

async function loadColumnData(columnName) {
  // Vérifier le cache
  if (state.dataCache[columnName]) {
    return state.dataCache[columnName];
  }

  try {
    await Excel.run(async (context) => {
      const sheet = context.workbook.worksheets.getActiveWorksheet();
      const table = sheet.tables.getItemAt(state.currentTableIndex);
      const range = table.columns.getItem(columnName).getDataBodyRange().load('values');

      await context.sync();

      let values = range.values.flat();
      const isXAxis = elements.xAxisSelect?.value === columnName;

      if (isXAxis && state.xIsDate) {
        // Convertir les nombres Excel en dates
        values = values
          .map(val => {
            if (typeof val === 'number') {
              // Date Excel: nombre de jours depuis le 1er janvier 1900
              return new Date((val - 25569) * 86400 * 1000);
            }
            if (typeof val === 'string') {
              const date = new Date(val);
              return !isNaN(date.getTime()) ? date : val;
            }
            return val;
          })
          .filter(v => v instanceof Date && !isNaN(v.getTime()));
      } else {
        // Garder uniquement les nombres
        values = values.filter(v => typeof v === 'number' && !isNaN(v));
      }

      state.dataCache[columnName] = values;
    });

    return state.dataCache[columnName] || [];
  } catch (error) {
    console.error(`❌ Erreur lors du chargement de la colonne ${columnName}:`, error);
    state.dataCache[columnName] = [];
    return [];
  }
}

function createTrace(xData, yData, name, axis) {
  const color = state.colors[axis] || CONFIG.defaultColors[axis] || CONFIG.defaultColors.y1;
  const yaxis = axis === 'y2' ? 'y2' : 'y1';

  const base = {
    x: xData,
    y: yData,
    name: name,
    yaxis: yaxis,
    opacity: state.opacity,
    line: { color: color, width: 2 },
    marker: { color: color, size: 8 }
  };

  // Appliquer le type de graphique
  switch (state.currentChartType) {
    case 'xy':
      return { type: 'scatter', mode: 'markers', ...base };
    case 'timeseries':
      return { type: 'scattergl', mode: 'lines+markers', ...base };
    case 'histogram':
      return { type: 'bar', ...base };
    case 'heatmap':
      return {
        type: 'heatmap',
        z: [yData],
        x: xData,
        y: [name],
        colorscale: state.colorScale,
        ...base
      };
    default:
      return { type: 'scatter', mode: 'markers', ...base };
  }
}

function redrawGraph() {
  if (!elements.graphDiv) return;

  try {
    Plotly.react(
      elements.graphDiv,
      state.traces,
      getLayout(),
      CONFIG.plotlyConfig
    );

    // Masquer l'état vide si des traces existent
    const emptyState = elements.graphDiv.querySelector('.empty-state');
    if (emptyState) {
      emptyState.style.display = state.traces.length > 0 ? 'none' : 'flex';
    }
  } catch (error) {
    console.error('❌ Erreur lors du redessin du graphique:', error);
    showError('Impossible de dessiner le graphique');
  }
}

function resetGraph() {
  state.traces = [];
  redrawGraph();
}

function clearAllSeries() {
  if (state.traces.length === 0) {
    showWarning('Aucune série à effacer');
    return;
  }

  if (confirm('Voulez-vous vraiment effacer toutes les séries ?')) {
    resetGraph();
    showSuccess('Toutes les séries ont été effacées');
  }
}

function getLayout() {
  const hasDates = state.xIsDate && state.traces.some(t =>
    t.x && t.x.length > 0 && t.x[0] instanceof Date
  );

  const hasY2 = state.traces.some(t => t.yaxis === 'y2');

  const layout = {
    ...CONFIG.plotlyLayout,
    xaxis: {
      automargin: true,
      type: hasDates ? 'date' : 'linear',
      title: state.axisTitles.x || '',
      gridcolor: state.theme === 'dark' ? '#404040' : '#dee2e6'
    },
    yaxis: {
      automargin: true,
      title: state.axisTitles.y1 || '',
      side: 'left',
      position: 0,
      gridcolor: state.theme === 'dark' ? '#404040' : '#dee2e6'
    },
    paper_bgcolor: state.theme === 'dark' ? '#2d2d2d' : '#ffffff',
    plot_bgcolor: state.theme === 'dark' ? '#2d2d2d' : '#ffffff',
    font: {
      ...CONFIG.plotlyLayout.font,
      color: state.theme === 'dark' ? '#e0e0e0' : '#212529'
    }
  };

  if (hasY2) {
    layout.yaxis2 = {
      overlaying: 'y',
      side: 'right',
      title: state.axisTitles.y2 || '',
      automargin: true,
      gridcolor: state.theme === 'dark' ? '#404040' : '#dee2e6'
    };
  }

  return layout;
}

// ===== FONCTIONS UTILITAIRES =====
function getOpacity() {
  return state.opacity;
}

function updateOpacity() {
  if (!state.traces || state.traces.length === 0) return;

  const opacity = getOpacity();

  state.traces.forEach(trace => {
    if (trace.marker) trace.marker.opacity = opacity;
    if (trace.line) trace.line.opacity = opacity;
  });

  if (elements.graphDiv) {
    Plotly.restyle(elements.graphDiv, { opacity: opacity });
  }
}

function updateColor(axis = 'y1') {
  if (!elements.graphDiv) return;

  const color = state.colors[axis] || CONFIG.defaultColors[axis];
  const tracesToUpdate = state.traces.filter(t => t.yaxis === axis);

  if (tracesToUpdate.length === 0) return;

  Plotly.restyle(
    elements.graphDiv,
    { 'line.color': color, 'marker.color': color },
    tracesToUpdate.map((_, i) => i)
  );
}

function updateAxisTitles() {
  state.axisTitles = {
    x: elements.xAxisTitle?.value || '',
    y1: elements.y1AxisTitle?.value || '',
    y2: elements.y2AxisTitle?.value || ''
  };
  redrawGraph();
}

function exportPNG() {
  if (!elements.graphDiv) {
    showError('Graphique non prêt');
    return;
  }

  try {
    showLoading(true);

    Plotly.toImage(elements.graphDiv, {
      format: 'png',
      width: 1200,
      height: 800,
      filename: 'graphique-visualisateur'
    }).then(url => {
      const link = document.createElement('a');
      link.href = url;
      link.download = `graphique-${new Date().toISOString().slice(0, 10)}.png`;
      link.click();
      showSuccess('Graphique exporté avec succès');
    }).catch(error => {
      console.error('❌ Erreur lors de l\'export:', error);
      showError('Impossible d\'exporter le graphique');
    }).finally(() => {
      showLoading(false);
    });
  } catch (error) {
    console.error('❌ Erreur lors de l\'export:', error);
    showError('Impossible d\'exporter le graphique');
    showLoading(false);
  }
}

// ===== GESTION DU THÈME =====
function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  applyTheme();
  savePreferences();

  const icon = elements.toggleTheme?.querySelector('svg');
  if (icon) {
    icon.outerHTML = state.theme === 'dark'
      ? '<i data-feather="sun"></i>'
      : '<i data-feather="moon"></i>';
    feather.replace();
  }

  const text = elements.toggleTheme?.querySelector('span');
  if (text) {
    text.textContent = state.theme === 'dark' ? 'Mode clair' : 'Mode sombre';
  }

  // Redessiner le graphique avec le nouveau thème
  redrawGraph();
}

function applyTheme() {
  document.body.setAttribute('data-theme', state.theme);

  // Mettre à jour l'icône du bouton
  const icon = elements.toggleTheme?.querySelector('svg');
  if (icon) {
    icon.outerHTML = state.theme === 'dark'
      ? '<i data-feather="sun"></i>'
      : '<i data-feather="moon"></i>';
    feather.replace();
  }

  // Mettre à jour le texte du bouton
  const text = elements.toggleTheme?.querySelector('span');
  if (text) {
    text.textContent = state.theme === 'dark' ? 'Mode clair' : 'Mode sombre';
  }
}

// ===== GESTION DE L'AFFICHAGE =====
function showLoading(show = true) {
  state.isLoading = show;

  if (elements.loadingSpinner) {
    elements.loadingSpinner.classList.toggle('hidden', !show);
  }

  // Désactiver les boutons pendant le chargement
  const buttons = document.querySelectorAll('button:not(.toggle-sidebar)');
  buttons.forEach(btn => {
    btn.disabled = show;
  });
}

function toggleSidebar() {
  state.isSidebarCollapsed = !state.isSidebarCollapsed;
  elements.sidebar?.classList.toggle('collapsed', state.isSidebarCollapsed);
  savePreferences();
}

// ===== NOTIFICATIONS =====
function showSuccess(message) {
  notyf.success(message);
  console.log('✅', message);
}

function showError(message) {
  notyf.error(message);
  console.error('❌', message);
}

function showWarning(message) {
  notyf.warning(message);
  console.warn('⚠️', message);
}

// ===== GESTION DES PRÉFÉRENCES =====
function savePreferences() {
  try {
    const preferences = {
      theme: state.theme,
      chartType: state.currentChartType,
      xIsDate: state.xIsDate,
      opacity: state.opacity,
      colors: state.colors,
      axisTitles: state.axisTitles,
      isSidebarCollapsed: state.isSidebarCollapsed
    };

    localStorage.setItem('visualisateur-excel-preferences', JSON.stringify(preferences));
  } catch (error) {
    console.warn('⚠️ Impossible de sauvegarder les préférences:', error);
  }
}

function loadPreferences() {
  try {
    const saved = localStorage.getItem('visualisateur-excel-preferences');
    if (!saved) return;

    const preferences = JSON.parse(saved);

    // Appliquer les préférences
    state.theme = preferences.theme || 'light';
    state.currentChartType = preferences.chartType || 'xy';
    state.xIsDate = preferences.xIsDate || false;
    state.opacity = preferences.opacity || 1;
    state.colors = preferences.colors || { ...CONFIG.defaultColors };
    state.axisTitles = preferences.axisTitles || { x: '', y1: '', y2: '' };
    state.isSidebarCollapsed = preferences.isSidebarCollapsed || false;

    // Appliquer l'opacité
    if (elements.transparency) {
      elements.transparency.value = Math.round(state.opacity * 100);
      if (elements.transparencyValue) {
        elements.transparencyValue.textContent = `${Math.round(state.opacity * 100)}%`;
      }
    }

    // Appliquer les couleurs
    if (elements.seriesColor) {
      elements.seriesColor.value = state.colors.y1;
    }
    if (elements.seriesColorY2) {
      elements.seriesColorY2.value = state.colors.y2;
    }

    // Appliquer les titres
    if (elements.xAxisTitle) elements.xAxisTitle.value = state.axisTitles.x;
    if (elements.y1AxisTitle) elements.y1AxisTitle.value = state.axisTitles.y1;
    if (elements.y2AxisTitle) elements.y2AxisTitle.value = state.axisTitles.y2;

    // Appliquer le type de graphique
    selectChartType(state.currentChartType);

    // Appliquer l'état de la sidebar
    if (state.isSidebarCollapsed) {
      elements.sidebar?.classList.add('collapsed');
    }

    // Appliquer le thème
    applyTheme();
  } catch (error) {
    console.warn('⚠️ Impossible de charger les préférences:', error);
  }
}

function resetApplication() {
  if (confirm('Voulez-vous vraiment réinitialiser l\'application ? Toutes les données seront perdues.')) {
    // Réinitialiser l'état
    state.currentTableIndex = 0;
    state.headers = [];
    state.dataCache = {};
    state.traces = [];
    state.axisTitles = { x: '', y1: '', y2: '' };

    // Réinitialiser les sélecteurs
    buildAxisSelectors();

    // Réinitialiser le graphique
    redrawGraph();

    showSuccess('Application réinitialisée');
  }
}

// ===== DRAG & DROP =====
function setupDragAndDrop() {
  const dropArea = document.body;

  // Empêcher le comportement par défaut
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
  });

  // Ajouter des classes pour le feedback visuel
  ['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, () => {
      dropArea.classList.add('drag-over');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, () => {
      dropArea.classList.remove('drag-over');
    }, false);
  });

  // Gérer le drop
  dropArea.addEventListener('drop', handleDrop, false);
}

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

function handleDrop(e) {
  const dt = e.dataTransfer;
  const files = dt.files;

  if (files.length === 0) return;

  // Vérifier que c'est un fichier Excel ou CSV
  const validFiles = Array.from(files).filter(file =>
    file.name.endsWith('.xlsx') ||
    file.name.endsWith('.xls') ||
    file.name.endsWith('.csv')
  );

  if (validFiles.length === 0) {
    showError('Veuillez déposer un fichier Excel (.xlsx, .xls) ou CSV');
    return;
  }

  // Pour l'instant, on affiche juste un message
  // Dans une version future, on pourrait implémenter le chargement local
  showSuccess(`Fichier "${validFiles[0].name}" détecté. Le chargement local sera implémenté dans une future version.`);
}

// ===== GESTION DES FICHIERS LOCAUX =====
function handleFileImport(e) {
  const files = e.target.files;

  if (files.length === 0) return;

  const file = files[0];

  // Vérifier l'extension
  if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls') && !file.name.endsWith('.csv')) {
    showError('Veuillez sélectionner un fichier Excel (.xlsx, .xls) ou CSV');
    e.target.value = '';
    return;
  }

  showSuccess(`Fichier "${file.name}" sélectionné. Le chargement local sera implémenté dans une future version.`);
  e.target.value = '';
}

// ===== TOOLTIPS =====
function setupTooltips() {
  const tooltipElements = document.querySelectorAll('[data-tooltip]');

  tooltipElements.forEach(el => {
    el.addEventListener('mouseenter', (e) => {
      const tooltip = elements.tooltip;
      if (!tooltip) return;

      const text = el.dataset.tooltip;
      if (!text) return;

      tooltip.textContent = text;
      tooltip.style.opacity = '1';

      // Positionner le tooltip
      const rect = el.getBoundingClientRect();
      tooltip.style.left = `${rect.left + rect.width / 2 - tooltip.offsetWidth / 2}px`;
      tooltip.style.top = `${rect.top - tooltip.offsetHeight - 8}px`;
    });

    el.addEventListener('mouseleave', () => {
      const tooltip = elements.tooltip;
      if (!tooltip) return;
      tooltip.style.opacity = '0';
    });
  });
}

// ===== UTILITAIRES =====
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// ===== INITIALISATION OFFICE.JS =====
// Cette partie est conservée pour la compatibilité avec Excel Online
Office.onReady(() => {
  // L'initialisation est déjà faite dans DOMContentLoaded
  // On s'assure juste que les tables sont chargées
  if (state.headers.length === 0) {
    loadTables();
  }
});