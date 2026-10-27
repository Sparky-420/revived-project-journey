export const markup = String.raw`

  <!-- App Header -->
  <header class="app-header">
    <div class="brand-wrapper">
      <div class="brand-icon">🥩</div>
      <div class="brand-info">
        <h1>Don Cangrejo Pro</h1>
        <p>Charcutería de Precisión MX</p>
      </div>
    </div>
    <div class="header-badges">
      <div class="status-pill">
        <span class="pulse-dot"></span>
        <span id="active_recipe_badge">Receta Actual</span>
      </div>
    </div>
  </header>

  <!-- Main Container -->
  <main class="container">

    <!-- 1. VISTA: PRODUCCIÓN (LOTE ACTIVO) -->
    <section id="view-produccion" class="app-view active">
      
      <!-- Selector de Receta -->
      <div class="recipe-selector">
        <button class="recipe-tab-btn active" data-recipe="cagada">Receta Actual</button>
        <button class="recipe-tab-btn" data-recipe="viejo">Receta del Viejo</button>
        <button class="recipe-tab-btn" data-recipe="custom">Personalizada</button>
      </div>

      <!-- Hero Weight Card -->
      <div class="card hero-weight-card">
        <div class="card-header">
          <span class="card-title"><span class="icon">⚖️</span> Lote de Carne Limpia</span>
          <span class="phase-badge phase-1" id="yield_quick_badge">Rinde: ~0.00 kg</span>
        </div>

        <div class="weight-display-wrapper">
          <div class="weight-number-box">
            <input type="number" id="peso_carne" class="weight-input-giant" value="20" min="0" step="0.5" inputmode="decimal">
            <span class="weight-unit">kg</span>
          </div>
          <div class="stepper-buttons">
            <button class="stepper-btn" id="btn_minus_weight" type="button" aria-label="Restar 1 kg">−</button>
            <button class="stepper-btn primary" id="btn_plus_weight" type="button" aria-label="Sumar 1 kg">+</button>
          </div>
        </div>

        <!-- Chips de acceso rápido -->
        <div class="chips-row">
          <button class="chip-btn" data-add="1">+1 kg</button>
          <button class="chip-btn" data-add="5">+5 kg</button>
          <button class="chip-btn" data-add="10">+10 kg</button>
          <button class="chip-btn" data-add="20">+20 kg</button>
          <button class="chip-btn" data-set="20">20 kg</button>
          <button class="chip-btn" data-set="50">50 kg</button>
          <button class="chip-btn" data-set="0">Limpiar</button>
        </div>
      </div>

      <!-- Fase 1: Curado & Premix -->
      <div class="phase-banner phase-1">
        <div class="phase-header">
          <span class="phase-title">🧪 FASE 1: Curado & Fijación</span>
          <span class="phase-badge">Dosis: <span id="lbl_dosis_premix">17</span> g/kg</span>
        </div>
        <div class="ingredient-list" id="phase1_ingredients">
          <!-- Inyectado por JS -->
        </div>
      </div>

      <!-- Fase 2: Sazón & Emulsión -->
      <div class="phase-banner phase-2">
        <div class="phase-header">
          <span class="phase-title">🌶️ FASE 2: Especias & Emulsión</span>
          <span class="phase-badge">Agua Helada: <span id="lbl_agua_pct">5.0</span>%</span>
        </div>
        <div class="ingredient-list" id="phase2_ingredients">
          <!-- Inyectado por JS -->
        </div>
      </div>

      <!-- KPIs Rápidos -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <span class="kpi-label">Masa Final Estimada</span>
          <span class="kpi-value" id="kpi_masa_final">0.00 kg</span>
          <span class="kpi-sub success">Carne + Sólidos + Agua</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Costo Estimado Lote</span>
          <span class="kpi-value" id="kpi_costo_lote">$0.00</span>
          <span class="kpi-sub" id="kpi_costo_kg_final">$0.00 / kg final</span>
        </div>
      </div>

      <!-- Acciones Rápidas -->
      <div style="display: flex; gap: 10px; margin-top: 8px;">
        <button class="btn-primary" id="btn_guardar_lote" type="button">💾 Registrar en Historial</button>
        <button class="btn-secondary" id="btn_compartir_ticket" type="button" style="width: auto; padding: 14px 18px;" title="Compartir WhatsApp">📲</button>
      </div>
    </section>

    <!-- 2. VISTA: PREMIX LAB -->
    <section id="view-premix" class="app-view">
      <div class="card">
        <div class="card-header">
          <span class="card-title"><span class="icon">🔬</span> Laboratorio de Premix de Curado</span>
          <span class="status-pill" id="premix_status_pill">100% Calibrado</span>
        </div>
        <p style="font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 16px;">
          Fórmula maestra para preparar en seco. La suma estricta debe ser exactamente 100%.
        </p>

        <!-- Fórmula Base Inputs -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 12px;">
          <div class="form-group">
            <label class="form-label">Sal (%)</label>
            <input type="number" id="premix_sal_pct" class="form-input" value="85" step="0.1" min="0" max="100">
          </div>
          <div class="form-group">
            <label class="form-label">Sal Cura (%)</label>
            <input type="number" id="premix_cura_pct" class="form-input" value="4" step="0.1" min="0" max="100">
          </div>
          <div class="form-group">
            <label class="form-label">Azúcar (%)</label>
            <input type="number" id="premix_azucar_pct" class="form-input" value="11" step="0.1" min="0" max="100">
          </div>
        </div>

        <div id="premix_error_alert" style="display: none; background: rgba(229, 77, 46, 0.15); border: 1px solid var(--accent-primary); border-radius: var(--radius-md); padding: 10px; font-size: 0.82rem; color: #ff8b7b; margin-bottom: 14px;">
          ⚠️ La suma actual es <span id="premix_current_sum">100%</span>. Ajusta los porcentajes para que sumen exactamente 100%.
        </div>

        <!-- Modo Bote / Fabricación a granel -->
        <div style="background: var(--bg-input); border-radius: var(--radius-lg); padding: 16px; margin-top: 10px;">
          <h3 style="font-size: 0.92rem; font-weight: 700; color: var(--accent-amber); margin-bottom: 10px;">
            🪣 Fabricar Bote de Premix a Granel
          </h3>
          <div class="form-group">
            <label class="form-label">Kilos de Premix a Preparar (kg)</label>
            <input type="number" id="premix_fabricar_kg" class="form-input" value="5" step="0.5" min="0.1">
          </div>
          <div class="ingredient-list" id="premix_fabricar_results">
            <!-- Desglose por JS -->
          </div>
        </div>
      </div>
    </section>

    <!-- 3. VISTA: ESCANDALLO & COSTOS -->
    <section id="view-costeo" class="app-view">
      <div class="card">
        <div class="card-header">
          <span class="card-title"><span class="icon">💰</span> Análisis Financiero y Escandallo</span>
          <span class="phase-badge phase-2">Margen en Tiempo Real</span>
        </div>

        <div class="kpi-grid" style="margin-bottom: 16px;">
          <div class="kpi-card">
            <span class="kpi-label">Utilidad por Lote</span>
            <span class="kpi-value" id="cost_utilidad_total" style="color: var(--accent-emerald);">$0.00</span>
            <span class="kpi-sub success" id="cost_margen_pct">Margen: 0%</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-label">Precio Sugerido / kg</span>
            <span class="kpi-value" id="lbl_precio_venta">$100.00</span>
            <span class="kpi-sub" id="lbl_utilidad_kg">$0.00 ganancia/kg</span>
          </div>
        </div>

        <h4 style="font-size: 0.85rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 8px;">
          Desglose de Costos del Lote Actual
        </h4>
        <div class="ingredient-list" id="cost_breakdown_list">
          <!-- Desglose de costos por insumo -->
        </div>
      </div>
    </section>

    <!-- 4. VISTA: CHECKLIST & HISTORIAL -->
    <section id="view-proceso" class="app-view">
      <!-- Checklist de Planta -->
      <div class="card">
        <div class="card-header">
          <span class="card-title"><span class="icon">📋</span> Checklist de Producción</span>
          <span class="phase-badge phase-1" id="checklist_progress_badge">0 / 7</span>
        </div>
        <div class="ingredient-list" id="checklist_container">
          <!-- Inyectado por JS -->
        </div>
        <button class="btn-secondary" id="btn_reset_checklist" style="margin-top: 12px;" type="button">Reiniciar Checklist</button>
      </div>

      <!-- Historial de Lotes -->
      <div class="card">
        <div class="card-header">
          <span class="card-title"><span class="icon">📚</span> Historial de Lotes Elaborados</span>
          <button id="btn_clear_history" style="background: none; border: none; color: var(--accent-primary); font-size: 0.8rem; cursor: pointer;">Limpiar</button>
        </div>
        <div class="ingredient-list" id="history_container">
          <!-- Lotes anteriores -->
        </div>
      </div>
    </section>

    <!-- 5. VISTA: AJUSTES & PRECIOS -->
    <section id="view-ajustes" class="app-view">
      <div class="card">
        <div class="card-header">
          <span class="card-title"><span class="icon">⚙️</span> Catálogo de Precios (MXN)</span>
          <span class="status-pill">Pesos Mexicanos</span>
        </div>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;" id="price_inputs_grid">
          <!-- Inyectado por JS -->
        </div>
        <div style="margin-top: 16px; display: flex; flex-direction: column; gap: 10px;">
          <button class="btn-primary" id="btn_save_prices" type="button">Guardar Lista de Precios</button>
          <button class="btn-secondary" id="btn_restore_factory" type="button">Restaurar Valores de Fábrica</button>
        </div>
      </div>
    </section>

  </main>

  <!-- Bottom Navigation Bar (Android 16 Pill) -->
  <nav class="bottom-nav">
    <button class="nav-item active" data-target="view-produccion">
      <span class="nav-icon">🥩</span>
      <span>Lote</span>
    </button>
    <button class="nav-item" data-target="view-premix">
      <span class="nav-icon">🧂</span>
      <span>Premix</span>
    </button>
    <button class="nav-item" data-target="view-costeo">
      <span class="nav-icon">💰</span>
      <span>Costeo</span>
    </button>
    <button class="nav-item" data-target="view-proceso">
      <span class="nav-icon">📋</span>
      <span>Planta</span>
    </button>
    <button class="nav-item" data-target="view-ajustes">
      <span class="nav-icon">⚙️</span>
      <span>Ajustes</span>
    </button>
  </nav>

  `;
