// @ts-nocheck
/**
 * La Receta de Don Cangrejo - Longaniza Pro MX
 * Motor de Precisión Charcutera, Costeo Financiero y Trazabilidad de Planta
 */

const STORAGE_KEY = 'doncangrejo-pro-v2';
const HISTORY_KEY = 'doncangrejo-history-v2';
const CHECKLIST_KEY = 'doncangrejo-checklist-v2';

// 1. CONFIGURACIÓN BASE POR DEFECTO
const DEFAULTS = Object.freeze({
  receta_activa: 'cagada',
  peso_carne: 20,
  dosis_premix: 17, // g/kg
  agua_ratio: 5.0,  // %

  // Recetas predeterminadas
  recetas: {
    cagada: {
      nombre: 'Receta Actual (Predeterminada)',
      guajillo: 1.5,
      pimenton: 0.4,
      especias: 0.6,
      ajo: 0.6, // Exactamente 0.6% = 120 g por 20 kg
      agua: 5.0,
      dosis_premix: 17
    },
    viejo: {
      nombre: 'Receta del Viejo (Alternativa)',
      guajillo: 1.5,
      pimenton: 0.2,
      especias: 0.4,
      ajo: 0.5,
      agua: 5.0,
      dosis_premix: 17
    },
    custom: {
      nombre: 'Receta Personalizada',
      guajillo: 1.5,
      pimenton: 0.3,
      especias: 0.5,
      ajo: 0.6,
      agua: 5.0,
      dosis_premix: 17
    }
  },

  // Premix base (suma obligatoria 100%)
  premix: {
    sal_pct: 85.0,
    cura_pct: 4.0,
    azucar_pct: 11.0,
    fabricar_kg: 5.0
  },

  // Precios en Pesos Mexicanos (MXN) para Escandallo
  precios: {
    carne: 53.00,
    sal: 8.50,
    sal_cura: 36.74,
    azucar: 30.00,
    ajo: 40.00,
    guajillo: 140.00,
    pimenton: 41.00,
    especias: 96.41,
    agua: 0.21,
    tripa_pza: 5.50,
    precio_venta_kg: 100.00
  }
});

const CHECKLIST_STEPS = [
  'Pesar lote de carne limpia y registrar temperatura (< 4°C)',
  'Preparar Premix Fase 1 (Sal, Sal de Cura y Azúcar)',
  'Incorporar Premix a la carne y reposo en frío (24 - 48 hrs)',
  'Moler carne con disco de 8 mm o según receta',
  'Mezclar Fase 2: Chiles, FABPSA, Ajo y Agua helada',
  'Embutir en tripa calibrada evitando burbujas de aire',
  'Atado, porcionado y empacado para refrigeración'
];

// Estado de la aplicación
let state = JSON.parse(JSON.stringify(DEFAULTS));
let historyLog = [];
let checklistState = new Array(CHECKLIST_STEPS.length).fill(false);

// Funciones matemáticas y formateadores
function round2(num) {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

function formatGrams(g) {
  return g.toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' g';
}

function formatKg(kg) {
  return kg.toLocaleString('es-MX', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + ' kg';
}

function formatCurrency(val) {
  return '$' + val.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function isPremixValid(sal, cura, azucar) {
  const sum = Number(sal) + Number(cura) + Number(azucar);
  return Math.abs(sum - 100) < 0.001;
}

// Motor de Cálculo Principal
function calculateActiveBatch(meatKg, recipeKey, premixConfig, pricesConfig) {
  const recipe = state.recetas[recipeKey] || state.recetas.cagada;
  const kg = Math.max(0, Number(meatKg) || 0);

  // Fase 1: Premix
  const premixDoseGPerKg = Number(recipe.dosis_premix) || 17;
  const premixTotalG = round2(kg * premixDoseGPerKg);
  const salG = round2(premixTotalG * (premixConfig.sal_pct / 100.0));
  const salCuraG = round2(premixTotalG * (premixConfig.cura_pct / 100.0));
  const azucarG = round2(premixTotalG * (premixConfig.azucar_pct / 100.0));

  // Fase 2: Especias y Agua
  const guajilloG = round2(kg * (recipe.guajillo / 100.0) * 1000.0);
  const pimentonG = round2(kg * (recipe.pimenton / 100.0) * 1000.0);
  const especiasG = round2(kg * (recipe.especias / 100.0) * 1000.0);
  const ajoG = round2(kg * (recipe.ajo / 100.0) * 1000.0);
  const aguaG = round2(kg * (recipe.agua / 100.0) * 1000.0); // 1 kg = 1 L
  const tripaPzas = kg * 0.9;

  // Masa final estimada
  const solidosKg = (premixTotalG + guajilloG + pimentonG + especiasG + ajoG) / 1000.0;
  const aguaKg = aguaG / 1000.0;
  const masaFinalKg = kg + solidosKg + aguaKg;

  // Costos e Insumos
  const costCarne = kg * pricesConfig.carne;
  const costSal = (salG / 1000.0) * pricesConfig.sal;
  const costCura = (salCuraG / 1000.0) * pricesConfig.sal_cura;
  const costAzucar = (azucarG / 1000.0) * pricesConfig.azucar;
  const costAjo = (ajoG / 1000.0) * pricesConfig.ajo;
  const costGuajillo = (guajilloG / 1000.0) * pricesConfig.guajillo;
  const costPimenton = (pimentonG / 1000.0) * pricesConfig.pimenton;
  const costEspecias = (especiasG / 1000.0) * pricesConfig.especias;
  const costAgua = (aguaKg) * pricesConfig.agua;
  const costTripa = tripaPzas * pricesConfig.tripa_pza;

  const totalCost = costCarne + costSal + costCura + costAzucar + costAjo + 
                    costGuajillo + costPimenton + costEspecias + costAgua + costTripa;

  const costPerKgFinal = masaFinalKg > 0 ? (totalCost / masaFinalKg) : 0;
  const costPerKgCarne = kg > 0 ? (totalCost / kg) : 0;

  const salePriceKg = Number(pricesConfig.precio_venta_kg) || 100;
  const utilityPerKg = salePriceKg - costPerKgFinal;
  const totalUtility = utilityPerKg * masaFinalKg;
  const marginPct = salePriceKg > 0 ? (utilityPerKg / salePriceKg) * 100 : 0;

  return {
    meatKg: kg,
    recipeName: recipe.nombre,
    phase1: {
      totalPremixG: premixTotalG,
      salG,
      salCuraG,
      azucarG,
      dosisGPerKg: premixDoseGPerKg
    },
    phase2: {
      guajilloG,
      pimentonG,
      especiasG,
      ajoG,
      aguaMl: aguaG,
      aguaPct: recipe.agua
    },
    masaFinalKg,
    solidosKg,
    tripaPzas,
    costs: {
      carne: costCarne,
      sal: costSal,
      sal_cura: costCura,
      azucar: costAzucar,
      ajo: costAjo,
      guajillo: costGuajillo,
      pimenton: costPimenton,
      especias: costEspecias,
      agua: costAgua,
      tripa: costTripa,
      total: totalCost
    },
    metrics: {
      costPerKgCarne,
      costPerKgFinal,
      salePriceKg,
      utilityPerKg,
      totalUtility,
      marginPct
    }
  };
}

// Cálculo de Fabricación a Granel de Premix
function calculatePremixBulk(kgFabricar, premixConfig) {
  const kg = Math.max(0, Number(kgFabricar) || 0);
  const totalG = kg * 1000.0;
  const salG = round2(totalG * (premixConfig.sal_pct / 100.0));
  const curaG = round2(totalG * (premixConfig.cura_pct / 100.0));
  const azucarG = round2(totalG * (premixConfig.azucar_pct / 100.0));

  return {
    kgFabricar: kg,
    totalG,
    salG,
    curaG,
    azucarG,
    isValid: isPremixValid(premixConfig.sal_pct, premixConfig.cura_pct, premixConfig.azucar_pct)
  };
}

// Carga y Persistencia Local
function loadPersistedData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      state = Object.assign({}, DEFAULTS, parsed);
    }
    const savedHistory = localStorage.getItem(HISTORY_KEY);
    if (savedHistory) {
      historyLog = JSON.parse(savedHistory);
    }
    const savedChecklist = localStorage.getItem(CHECKLIST_KEY);
    if (savedChecklist) {
      checklistState = JSON.parse(savedChecklist);
    }
  } catch (e) {
    console.warn('Error al leer localStorage:', e);
  }
}

function persistData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    localStorage.setItem(HISTORY_KEY, JSON.stringify(historyLog));
    localStorage.setItem(CHECKLIST_KEY, JSON.stringify(checklistState));
  } catch (e) {
    console.warn('Error al guardar localStorage:', e);
  }
}

// RENDERIZADO EN PANTALLA (Sólo si document existe)
function renderAll() {
  if (typeof document === 'undefined') return;

  const batch = calculateActiveBatch(state.peso_carne, state.receta_activa, state.premix, state.precios);
  const bulk = calculatePremixBulk(state.premix.fabricar_kg, state.premix);

  // 1. Header & Badges
  const activeName = state.receta_activa === 'cagada' ? 'Receta Actual' :
                     state.receta_activa === 'viejo' ? 'Receta del Viejo' : 'Personalizada';
  const badgeEl = document.getElementById('active_recipe_badge');
  if (badgeEl) badgeEl.textContent = activeName;

  const yieldBadge = document.getElementById('yield_quick_badge');
  if (yieldBadge) yieldBadge.textContent = `Rinde: ~${formatKg(batch.masaFinalKg)}`;

  // 2. Peso Input
  const pesoInput = document.getElementById('peso_carne');
  if (pesoInput && document.activeElement !== pesoInput) {
    pesoInput.value = state.peso_carne;
  }

  // 3. Fase 1: Premix
  const p1Container = document.getElementById('phase1_ingredients');
  if (p1Container) {
    p1Container.innerHTML = `
      <div class="ingredient-item">
        <div class="ingredient-info">
          <span class="ingredient-name">Premix Total de Curado</span>
          <span class="ingredient-meta">${batch.phase1.dosisGPerKg} g por kg de carne</span>
        </div>
        <div class="ingredient-values">
          <div class="ingredient-grams">${formatGrams(batch.phase1.totalPremixG)}</div>
          <div class="ingredient-kg">${formatKg(batch.phase1.totalPremixG / 1000)}</div>
        </div>
      </div>
      <div class="ingredient-item" style="padding-left: 24px; opacity: 0.9;">
        <div class="ingredient-info">
          <span class="ingredient-name">↳ Sal Común (${state.premix.sal_pct}%)</span>
        </div>
        <div class="ingredient-values">
          <div class="ingredient-grams">${formatGrams(batch.phase1.salG)}</div>
        </div>
      </div>
      <div class="ingredient-item" style="padding-left: 24px; opacity: 0.9;">
        <div class="ingredient-info">
          <span class="ingredient-name">↳ Sal de Cura (${state.premix.cura_pct}%)</span>
        </div>
        <div class="ingredient-values">
          <div class="ingredient-grams" style="color: #ff9d8b;">${formatGrams(batch.phase1.salCuraG)}</div>
        </div>
      </div>
      <div class="ingredient-item" style="padding-left: 24px; opacity: 0.9;">
        <div class="ingredient-info">
          <span class="ingredient-name">↳ Azúcar refinada (${state.premix.azucar_pct}%)</span>
        </div>
        <div class="ingredient-values">
          <div class="ingredient-grams">${formatGrams(batch.phase1.azucarG)}</div>
        </div>
      </div>
    `;
  }

  // 4. Fase 2: Especias
  const recipe = state.recetas[state.receta_activa];
  const p2Container = document.getElementById('phase2_ingredients');
  if (p2Container) {
    p2Container.innerHTML = `
      <div class="ingredient-item">
        <div class="ingredient-info">
          <span class="ingredient-name">Chile Guajillo molido</span>
          <span class="ingredient-meta">${recipe.guajillo}% del peso cárnico</span>
        </div>
        <div class="ingredient-values">
          <div class="ingredient-grams">${formatGrams(batch.phase2.guajilloG)}</div>
          <div class="ingredient-kg">${formatKg(batch.phase2.guajilloG / 1000)}</div>
        </div>
      </div>
      <div class="ingredient-item">
        <div class="ingredient-info">
          <span class="ingredient-name">Pimentón español</span>
          <span class="ingredient-meta">${recipe.pimenton}% del peso cárnico</span>
        </div>
        <div class="ingredient-values">
          <div class="ingredient-grams">${formatGrams(batch.phase2.pimentonG)}</div>
          <div class="ingredient-kg">${formatKg(batch.phase2.pimentonG / 1000)}</div>
        </div>
      </div>
      <div class="ingredient-item">
        <div class="ingredient-info">
          <span class="ingredient-name">Especias de charcutería (FABPSA)</span>
          <span class="ingredient-meta">${recipe.especias}% del peso cárnico</span>
        </div>
        <div class="ingredient-values">
          <div class="ingredient-grams">${formatGrams(batch.phase2.especiasG)}</div>
          <div class="ingredient-kg">${formatKg(batch.phase2.especiasG / 1000)}</div>
        </div>
      </div>
      <div class="ingredient-item">
        <div class="ingredient-info">
          <span class="ingredient-name">Ajo fresco triturado</span>
          <span class="ingredient-meta">${recipe.ajo}% (${recipe.ajo === 0.6 ? '120g/20kg' : 'estándar'})</span>
        </div>
        <div class="ingredient-values">
          <div class="ingredient-grams">${formatGrams(batch.phase2.ajoG)}</div>
          <div class="ingredient-kg">${formatKg(batch.phase2.ajoG / 1000)}</div>
        </div>
      </div>
      <div class="ingredient-item" style="border-left: 3px solid var(--accent-blue);">
        <div class="ingredient-info">
          <span class="ingredient-name">Agua purificada helada</span>
          <span class="ingredient-meta">${recipe.agua}% (~${formatKg(batch.phase2.aguaMl / 1000)} L)</span>
        </div>
        <div class="ingredient-values">
          <div class="ingredient-grams" style="color: #60a5fa;">${formatGrams(batch.phase2.aguaMl)}</div>
        </div>
      </div>
    `;
  }

  // 5. KPIs
  const kpiMasa = document.getElementById('kpi_masa_final');
  if (kpiMasa) kpiMasa.textContent = formatKg(batch.masaFinalKg);

  const kpiCosto = document.getElementById('kpi_costo_lote');
  if (kpiCosto) kpiCosto.textContent = formatCurrency(batch.costs.total);

  const kpiCostoKg = document.getElementById('kpi_costo_kg_final');
  if (kpiCostoKg) kpiCostoKg.textContent = `${formatCurrency(batch.metrics.costPerKgFinal)} / kg final`;

  // 6. Laboratorio Premix
  const sumEl = document.getElementById('premix_current_sum');
  const alertEl = document.getElementById('premix_error_alert');
  const sumVal = Number(state.premix.sal_pct) + Number(state.premix.cura_pct) + Number(state.premix.azucar_pct);
  if (sumEl) sumEl.textContent = `${sumVal.toFixed(1)}%`;
  if (alertEl) alertEl.style.display = bulk.isValid ? 'none' : 'block';

  const bulkResults = document.getElementById('premix_fabricar_results');
  if (bulkResults) {
    bulkResults.innerHTML = `
      <div class="ingredient-item">
        <div class="ingredient-info">
          <span class="ingredient-name">Sal común</span>
          <span class="ingredient-meta">${state.premix.sal_pct}%</span>
        </div>
        <div class="ingredient-values"><div class="ingredient-grams">${formatGrams(bulk.salG)}</div></div>
      </div>
      <div class="ingredient-item">
        <div class="ingredient-info">
          <span class="ingredient-name">Sal de cura</span>
          <span class="ingredient-meta">${state.premix.cura_pct}%</span>
        </div>
        <div class="ingredient-values"><div class="ingredient-grams" style="color: #ff8b7b;">${formatGrams(bulk.curaG)}</div></div>
      </div>
      <div class="ingredient-item">
        <div class="ingredient-info">
          <span class="ingredient-name">Azúcar estándar</span>
          <span class="ingredient-meta">${state.premix.azucar_pct}%</span>
        </div>
        <div class="ingredient-values"><div class="ingredient-grams">${formatGrams(bulk.azucarG)}</div></div>
      </div>
    `;
  }

  // 7. Costeo View
  const utilTotal = document.getElementById('cost_utilidad_total');
  if (utilTotal) utilTotal.textContent = formatCurrency(batch.metrics.totalUtility);

  const margenEl = document.getElementById('cost_margen_pct');
  if (margenEl) margenEl.textContent = `Margen: ${batch.metrics.marginPct.toFixed(1)}%`;

  const utilKg = document.getElementById('lbl_utilidad_kg');
  if (utilKg) utilKg.textContent = `${formatCurrency(batch.metrics.utilityPerKg)} ganancia/kg`;

  const costBreakdown = document.getElementById('cost_breakdown_list');
  if (costBreakdown) {
    costBreakdown.innerHTML = `
      <div class="ingredient-item">
        <span class="ingredient-name">Carne de cerdo limpia</span>
        <span class="ingredient-grams">${formatCurrency(batch.costs.carne)}</span>
      </div>
      <div class="ingredient-item">
        <span class="ingredient-name">Tripa natural (~${batch.tripaPzas.toFixed(1)} pzas)</span>
        <span class="ingredient-grams">${formatCurrency(batch.costs.tripa)}</span>
      </div>
      <div class="ingredient-item">
        <span class="ingredient-name">Premix (Sal, Cura, Azúcar)</span>
        <span class="ingredient-grams">${formatCurrency(batch.costs.sal + batch.costs.sal_cura + batch.costs.azucar)}</span>
      </div>
      <div class="ingredient-item">
        <span class="ingredient-name">Especias & Chiles (Guajillo, Pimentón, FABPSA, Ajo)</span>
        <span class="ingredient-grams">${formatCurrency(batch.costs.guajillo + batch.costs.pimenton + batch.costs.especias + batch.costs.ajo)}</span>
      </div>
      <div class="ingredient-item">
        <span class="ingredient-name">Agua purificada helada</span>
        <span class="ingredient-grams">${formatCurrency(batch.costs.agua)}</span>
      </div>
    `;
  }

  // 8. Checklist View
  const clContainer = document.getElementById('checklist_container');
  if (clContainer) {
    const doneCount = checklistState.filter(Boolean).length;
    const badge = document.getElementById('checklist_progress_badge');
    if (badge) badge.textContent = `${doneCount} / ${CHECKLIST_STEPS.length}`;

    clContainer.innerHTML = CHECKLIST_STEPS.map((step, idx) => `
      <div class="checklist-item ${checklistState[idx] ? 'done' : ''}" data-index="${idx}">
        <div class="checkbox-custom">${checklistState[idx] ? '✓' : ''}</div>
        <span class="checklist-text" style="font-size: 0.85rem; font-weight: 500;">${step}</span>
      </div>
    `).join('');
  }

  // 9. Historial View
  const historyContainer = document.getElementById('history_container');
  if (historyContainer) {
    if (historyLog.length === 0) {
      historyContainer.innerHTML = `<p style="font-size: 0.82rem; color: var(--text-muted); text-align: center; padding: 16px;">No hay lotes guardados todavía.</p>`;
    } else {
      historyContainer.innerHTML = historyLog.slice().reverse().map((item, index) => `
        <div class="history-card">
          <div class="history-header">
            <span style="font-size: 0.82rem; font-weight: 700; color: var(--accent-primary);">${item.date}</span>
            <span style="font-size: 0.75rem; color: var(--text-muted);">${item.recipe}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-top: 4px;">
            <span>Carne: <strong>${formatKg(item.meatKg)}</strong></span>
            <span>Rendimiento: <strong>${formatKg(item.finalKg)}</strong></span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.82rem; color: var(--text-secondary); margin-top: 2px;">
            <span>Costo Total: ${formatCurrency(item.totalCost)}</span>
            <span style="color: var(--accent-emerald);">Utilidad: ${formatCurrency(item.totalUtility)}</span>
          </div>
        </div>
      `).join('');
    }
  }

  // 10. Precios en Ajustes
  const priceGrid = document.getElementById('price_inputs_grid');
  if (priceGrid && priceGrid.children.length === 0) {
    const labels = {
      carne: 'Carne ($/kg)',
      sal: 'Sal ($/kg)',
      sal_cura: 'Sal de Cura ($/kg)',
      azucar: 'Azúcar ($/kg)',
      ajo: 'Ajo ($/kg)',
      guajillo: 'Guajillo ($/kg)',
      pimenton: 'Pimentón ($/kg)',
      especias: 'Especias ($/kg)',
      agua: 'Agua ($/L)',
      tripa_pza: 'Tripa ($/pza)',
      precio_venta_kg: 'Venta ($/kg)'
    };
    priceGrid.innerHTML = Object.entries(labels).map(([key, label]) => `
      <div class="form-group">
        <label class="form-label">${label}</label>
        <input type="number" step="0.5" id="price_${key}" class="form-input" value="${state.precios[key] || 0}">
      </div>
    `).join('');
  }
}

// Controladores de Eventos
function setupEventListeners() {
  if (typeof document === 'undefined') return;

  // Navegación por Vistas
  document.querySelectorAll('.nav-item').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active'));
      button.classList.add('active');
      const targetId = button.getAttribute('data-target');
      const targetView = document.getElementById(targetId);
      if (targetView) targetView.classList.add('active');
    });
  });

  // Selector de Recetas
  document.querySelectorAll('.recipe-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.recipe-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.receta_activa = btn.getAttribute('data-recipe');
      persistData();
      renderAll();
    });
  });

  // Stepper & Chips de Peso
  const pesoInput = document.getElementById('peso_carne');
  if (pesoInput) {
    pesoInput.addEventListener('input', (e) => {
      state.peso_carne = Math.max(0, Number(e.target.value) || 0);
      persistData();
      renderAll();
    });
  }

  const minusBtn = document.getElementById('btn_minus_weight');
  if (minusBtn) {
    minusBtn.addEventListener('click', () => {
      state.peso_carne = Math.max(0, (state.peso_carne || 0) - 1);
      persistData();
      renderAll();
    });
  }

  const plusBtn = document.getElementById('btn_plus_weight');
  if (plusBtn) {
    plusBtn.addEventListener('click', () => {
      state.peso_carne = (state.peso_carne || 0) + 1;
      persistData();
      renderAll();
    });
  }

  document.querySelectorAll('.chip-btn').forEach(chip => {
    chip.addEventListener('click', () => {
      const addVal = chip.getAttribute('data-add');
      const setVal = chip.getAttribute('data-set');
      if (addVal !== null) {
        state.peso_carne = (state.peso_carne || 0) + Number(addVal);
      } else if (setVal !== null) {
        state.peso_carne = Number(setVal);
      }
      persistData();
      renderAll();
    });
  });

  // Guardar Lote en Historial
  const saveBtn = document.getElementById('btn_guardar_lote');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const b = calculateActiveBatch(state.peso_carne, state.receta_activa, state.premix, state.precios);
      const record = {
        id: Date.now(),
        date: new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        meatKg: b.meatKg,
        finalKg: b.masaFinalKg,
        recipe: b.recipeName,
        totalCost: b.costs.total,
        totalUtility: b.metrics.totalUtility
      };
      historyLog.push(record);
      persistData();
      renderAll();
      alert('✅ Lote registrado con éxito en el historial.');
    });
  }

  // Compartir Ticket WhatsApp
  const shareBtn = document.getElementById('btn_compartir_ticket');
  if (shareBtn) {
    shareBtn.addEventListener('click', () => {
      const b = calculateActiveBatch(state.peso_carne, state.receta_activa, state.premix, state.precios);
      const text = `🥩 *LA RECETA DE DON CANGREJO* 🥩\n` +
                   `📅 Fecha: ${new Date().toLocaleDateString('es-MX')}\n` +
                   `📌 Receta: ${b.recipeName}\n` +
                   `⚖️ Carne limpia: ${formatKg(b.meatKg)}\n` +
                   `--------------------------------\n` +
                   `🧪 *FASE 1: PREMIX CURADO*\n` +
                   `• Premix Total (${b.phase1.dosisGPerKg} g/kg): ${formatGrams(b.phase1.totalPremixG)}\n` +
                   `  - Sal (${state.premix.sal_pct}%): ${formatGrams(b.phase1.salG)}\n` +
                   `  - Sal Cura (${state.premix.cura_pct}%): ${formatGrams(b.phase1.salCuraG)}\n` +
                   `  - Azúcar (${state.premix.azucar_pct}%): ${formatGrams(b.phase1.azucarG)}\n` +
                   `--------------------------------\n` +
                   `🌶️ *FASE 2: ESPECIAS & AGUA*\n` +
                   `• Guajillo: ${formatGrams(b.phase2.guajilloG)}\n` +
                   `• Pimentón: ${formatGrams(b.phase2.pimentonG)}\n` +
                   `• FABPSA: ${formatGrams(b.phase2.especiasG)}\n` +
                   `• Ajo fresco: ${formatGrams(b.phase2.ajoG)}\n` +
                   `• Agua helada: ${formatGrams(b.phase2.aguaMl)} (~${formatKg(b.phase2.aguaMl / 1000)} L)\n` +
                   `--------------------------------\n` +
                   `📊 *RENDIMIENTO & FINANZAS*\n` +
                   `• Masa total: ${formatKg(b.masaFinalKg)}\n` +
                   `• Costo lote: ${formatCurrency(b.costs.total)}\n` +
                   `• Costo/kg final: ${formatCurrency(b.metrics.costPerKgFinal)}\n` +
                   `• Utilidad estimada: ${formatCurrency(b.metrics.totalUtility)}`;

      const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
    });
  }

  // Premix inputs
  ['premix_sal_pct', 'premix_cura_pct', 'premix_azucar_pct'].forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener('input', () => {
        state.premix.sal_pct = Number(document.getElementById('premix_sal_pct').value) || 0;
        state.premix.cura_pct = Number(document.getElementById('premix_cura_pct').value) || 0;
        state.premix.azucar_pct = Number(document.getElementById('premix_azucar_pct').value) || 0;
        persistData();
        renderAll();
      });
    }
  });

  const fabKgInput = document.getElementById('premix_fabricar_kg');
  if (fabKgInput) {
    fabKgInput.addEventListener('input', (e) => {
      state.premix.fabricar_kg = Math.max(0.1, Number(e.target.value) || 0);
      persistData();
      renderAll();
    });
  }

  // Checklist interacción
  const clContainer = document.getElementById('checklist_container');
  if (clContainer) {
    clContainer.addEventListener('click', (e) => {
      const item = e.target.closest('.checklist-item');
      if (item) {
        const idx = Number(item.getAttribute('data-index'));
        checklistState[idx] = !checklistState[idx];
        persistData();
        renderAll();
      }
    });
  }

  const resetCl = document.getElementById('btn_reset_checklist');
  if (resetCl) {
    resetCl.addEventListener('click', () => {
      checklistState.fill(false);
      persistData();
      renderAll();
    });
  }

  // Limpiar historial
  const clearHistBtn = document.getElementById('btn_clear_history');
  if (clearHistBtn) {
    clearHistBtn.addEventListener('click', () => {
      if (confirm('¿Deseas vaciar el historial de lotes?')) {
        historyLog = [];
        persistData();
        renderAll();
      }
    });
  }

  // Guardar Precios
  const savePricesBtn = document.getElementById('btn_save_prices');
  if (savePricesBtn) {
    savePricesBtn.addEventListener('click', () => {
      Object.keys(state.precios).forEach(key => {
        const input = document.getElementById(`price_${key}`);
        if (input) state.precios[key] = Math.max(0, Number(input.value) || 0);
      });
      persistData();
      renderAll();
      alert('💾 Lista de precios actualizada correctamente.');
    });
  }

  // Restaurar Fábrica
  const restoreBtn = document.getElementById('btn_restore_factory');
  if (restoreBtn) {
    restoreBtn.addEventListener('click', () => {
      if (confirm('¿Restaurar todas las fórmulas y precios a los valores predeterminados?')) {
        state = JSON.parse(JSON.stringify(DEFAULTS));
        checklistState.fill(false);
        persistData();
        renderAll();
      }
    });
  }
}

let started = false;
export function initDonCangrejo() {
  if (started) { renderAll(); return; }
  started = true;
  loadPersistedData();
  setupEventListeners();
  renderAll();
}

export {
  DEFAULTS,
  calculateActiveBatch,
  calculatePremixBulk,
  isPremixValid,
  formatGrams,
  formatKg,
  formatCurrency,
};
