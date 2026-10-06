/* ==========================================================================
   POLARIS ENERGY AI - DASHBOARD & CHART MANAGER (js/dashboard.js)
   ========================================================================== */

const DashboardUI = {
  charts: {},

  init() {
    this.bindNavigation();
    this.initCharts();
    this.bindActionButtons();
    this.bindAlertActions();
  },

  bindNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const targetView = item.getAttribute('data-view');
        if (targetView) {
          this.switchView(targetView);
        }
      });
    });

    // Mobile menu toggle
    const menuBtn = document.getElementById('mobile-menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    if (menuBtn && sidebar) {
      menuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('mobile-open');
      });
    }
  },

  switchView(viewId) {
    // Highlight sidebar nav item
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
      if (item.getAttribute('data-view') === viewId) {
        item.classList.add('active');
      }
    });

    // Show selected view section
    document.querySelectorAll('.view-section').forEach(sec => {
      sec.classList.remove('active');
    });

    const activeSec = document.getElementById(`view-${viewId}`);
    if (activeSec) {
      activeSec.classList.add('active');
    }

    // Close mobile menu on click
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.classList.remove('mobile-open');

    // Trigger chart updates for newly visible view
    this.refreshCharts();
  },

  updateAll(data) {
    // 1. Top KPI Cards
    this.setText('kpi-demand-val', `${data.demand}`);
    this.setText('kpi-renewable-val', `${data.renewable}`);
    this.setText('kpi-battery-val', `${data.batterySOC}`);
    this.setText('kpi-fuel-val', `${data.fuelRemaining}`);
    this.setText('kpi-generator-val', data.generatorStatus);
    this.setText('kpi-reliability-val', `${data.reliability}`);

    // Update Generator KPI Badge style
    const genCard = document.getElementById('kpi-generator-card');
    if (genCard) {
      if (data.generatorStatus === 'ACTIVE') {
        genCard.className = 'card kpi-card kpi-warning';
      } else {
        genCard.className = 'card kpi-card kpi-renewable';
      }
    }

    // 2. Energy Flow Diagram
    this.setText('flow-solar-val', `${data.renewable} MW`);
    this.setText('flow-battery-val', `${data.batteryOut} MW`);
    this.setText('flow-generator-val', `${data.generatorOut} MW`);
    this.setText('flow-load-val', `${data.demand} MW`);

    // Flow line pulse speeds / visibility
    const solarPulse = document.getElementById('flow-solar-pulse');
    if (solarPulse) solarPulse.style.display = data.renewable > 0 ? 'block' : 'none';

    const battPulse = document.getElementById('flow-batt-pulse');
    if (battPulse) battPulse.style.display = data.batteryOut > 0 ? 'block' : 'none';

    const genPulse = document.getElementById('flow-gen-pulse');
    if (genPulse) genPulse.style.display = data.generatorOut > 0 ? 'block' : 'none';

    // 3. Weather Header & Weather Card
    this.setText('hdr-temp', `${data.weather.temp}°C`);
    this.setText('hdr-wind', `${data.weather.wind} km/h`);
    this.setText('hdr-solar', `${data.weather.solarRad} W/m²`);
    
    this.setText('card-temp', `${data.weather.temp}°C`);
    this.setText('card-wind', `${data.weather.wind} km/h`);
    this.setText('card-solar', `${data.weather.solarRad} W/m²`);
    this.setText('card-vis', `${data.weather.visibility} km`);
    this.setText('card-condition', data.state?.weatherCondition || window.SimulationEngine.state.weatherCondition);
    this.setText('card-risk', data.weather.risk);
    this.setText('card-impact-msg', data.weather.impactMsg);

    // Weather risk badge style
    const riskBadge = document.getElementById('card-risk-badge');
    if (riskBadge) {
      riskBadge.className = `priority-tag ${data.weather.risk === 'CRITICAL' || data.weather.risk === 'HIGH' ? 'priority-critical' : 'priority-low'}`;
    }

    // 4. AI Advisor Card
    this.setText('advisor-decision', data.aiDecision);
    this.setText('advisor-reason', data.aiReason);
    this.setText('advisor-recommendation', data.recommendedAction);
    this.setText('advisor-confidence', `${data.confidence}%`);
    this.setText('advisor-fuel-saving', `${data.fuelSavedHourly} L/hr`);

    // 5. Fuel Savings Section
    this.setText('fuel-rate-current', `${data.fuelRateBaseline} L/hr`);
    this.setText('fuel-rate-optimized', `${data.fuelRateOptimized} L/hr`);
    this.setText('fuel-saved-hourly', `${data.fuelSavedHourly} L/hr`);
    this.setText('fuel-saved-daily', `${data.fuelSavedDaily} L`);
    this.setText('fuel-saved-monthly', `${data.fuelSavedMonthly.toLocaleString()} L`);

    // Dynamic update for Fuel Optimization bar chart dataset
    if (this.charts.fuelOpt) {
      this.charts.fuelOpt.data.datasets[0].data = [data.fuelRateBaseline, data.fuelRateOptimized];
      this.charts.fuelOpt.update();
    }

    // Dynamic update for Main Energy Chart datasets based on active evaluation
    if (this.charts.mainEnergy) {
      // Scale renewable series curve to current weather solar output
      const solarRatio = data.renewable / 1.95;
      const baseSolar = [0.40, 0.35, 0.80, 1.45, 1.90, 1.60, 1.10, 0.65, 0.40];
      const scaledSolar = baseSolar.map(val => Math.round(val * solarRatio * 100) / 100);
      
      this.charts.mainEnergy.data.datasets[1].data = scaledSolar;
      this.charts.mainEnergy.update();
    }

    // 6. Smart Load Cards rendering
    this.renderLoads();

    // 7. Live Monitoring Telemetry Cards
    this.setText('mon-demand', `${data.demand} MW`);
    this.setText('mon-renewable', `${data.renewable} MW`);
    this.setText('mon-battery', `${data.batterySOC}%`);
    this.setText('mon-generator', `${data.generatorOut} MW`);
    this.setText('mon-fuel', `${data.fuelRateOptimized} L/h`);
  },

  setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  },

  renderLoads() {
    const criticalContainer = document.getElementById('critical-loads-grid');
    const lowContainer = document.getElementById('non-critical-loads-grid');
    if (!criticalContainer || !lowContainer) return;

    criticalContainer.innerHTML = '';
    lowContainer.innerHTML = '';

    window.SimulationEngine.loads.forEach(load => {
      const card = document.createElement('div');
      card.className = `load-card ${!load.status ? 'shedded' : ''}`;
      card.innerHTML = `
        <div class="load-card-top">
          <span class="load-name">${load.name}</span>
          <span class="priority-tag ${load.priority === 'CRITICAL' ? 'priority-critical' : 'priority-low'}">${load.priority}</span>
        </div>
        <div class="load-card-body">
          <span class="load-power">${load.power} MW</span>
          <label class="switch">
            <input type="checkbox" ${load.status ? 'checked' : ''} onchange="SimulationEngine.toggleLoad('${load.id}')">
            <span class="slider"></span>
          </label>
        </div>
        <div class="load-rec-note">
          <i class="fas fa-info-circle"></i> ${load.note}
        </div>
      `;

      if (load.priority === 'CRITICAL') {
        criticalContainer.appendChild(card);
      } else {
        lowContainer.appendChild(card);
      }
    });
  },

  bindActionButtons() {
    // Run AI Optimization Button
    const runOptBtns = document.querySelectorAll('.btn-run-optimization');
    runOptBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        window.SimulationEngine.runOptimization();
      });
    });

    // AI Load Shedding Button
    const loadShedBtn = document.getElementById('btn-load-shedding');
    if (loadShedBtn) {
      loadShedBtn.addEventListener('click', () => {
        window.SimulationEngine.runAILoadShedding();
      });
    }

    // Chart timeframe buttons
    const chartTimeBtns = document.querySelectorAll('.btn-chart-time');
    chartTimeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        chartTimeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const range = btn.getAttribute('data-range');
        this.updateMainChartRange(range);
      });
    });
  },

  bindAlertActions() {
    const alertsContainer = document.getElementById('alerts-list-container');
    const badge = document.getElementById('alert-count-badge');

    if (alertsContainer) {
      alertsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-resolve-alert')) {
          const alertItem = e.target.closest('.alert-item');
          if (alertItem && !e.target.disabled) {
            alertItem.style.opacity = '0.3';
            e.target.textContent = 'Resolved';
            e.target.disabled = true;

            // Decrement active alert badge count
            if (badge) {
              let currentCount = parseInt(badge.textContent || '0', 10);
              let newCount = Math.max(0, currentCount - 1);
              badge.textContent = newCount;
              if (newCount === 0) badge.style.display = 'none';
            }

            if (window.ToastManager) window.ToastManager.show('Alert marked as resolved', 'info');
          }
        }
      });
    }

    const clearAllBtn = document.getElementById('btn-clear-alerts');
    if (clearAllBtn && alertsContainer) {
      clearAllBtn.addEventListener('click', () => {
        alertsContainer.innerHTML = '<div style="text-align:center; padding: 2rem; color: var(--text-muted);">No active alerts. All systems operational.</div>';
        if (badge) badge.style.display = 'none';
        if (window.ToastManager) window.ToastManager.show('All alerts cleared', 'success');
      });
    }
  },

  /* ==========================================================================
     CHART.JS INITIALIZATION & UPDATES
     ========================================================================== */
  initCharts() {
    if (typeof Chart === 'undefined') return;

    // Set Chart.js global defaults for Dark Navy Theme
    Chart.defaults.color = '#94A3B8';
    Chart.defaults.font.family = 'Inter, sans-serif';
    Chart.defaults.plugins.legend.labels.usePointStyle = true;

    // 1. Dashboard 24-Hour Main Chart
    const ctxMain = document.getElementById('chart-main-energy');
    if (ctxMain) {
      this.charts.mainEnergy = new Chart(ctxMain, {
        type: 'line',
        data: {
          labels: ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00', '24:00'],
          datasets: [
            {
              label: 'Energy Demand (MW)',
              data: [1.65, 1.50, 1.70, 2.10, 2.35, 2.20, 1.95, 1.82, 1.68],
              borderColor: '#EF4444',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              borderWidth: 2,
              tension: 0.4,
              fill: true
            },
            {
              label: 'Renewable Generation (MW)',
              data: [0.40, 0.35, 0.80, 1.45, 1.90, 1.60, 1.10, 0.65, 0.40],
              borderColor: '#10B981',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              borderWidth: 2,
              tension: 0.4,
              fill: true
            },
            {
              label: 'Battery Contribution (MW)',
              data: [1.25, 1.15, 0.90, 0.65, 0.45, 0.60, 0.85, 1.17, 1.28],
              borderColor: '#00F2FE',
              borderDash: [5, 5],
              borderWidth: 2,
              tension: 0.4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            tooltip: { mode: 'index', intersect: false }
          },
          scales: {
            x: { grid: { color: 'rgba(255,255,255,0.05)' } },
            y: { grid: { color: 'rgba(255,255,255,0.05)' }, title: { display: true, text: 'Megawatts (MW)' } }
          }
        }
      });
    }

    // 2. AI Forecast 24-Hour Predictive Chart
    const ctxForecast = document.getElementById('chart-forecast');
    if (ctxForecast) {
      this.charts.forecast = new Chart(ctxForecast, {
        type: 'line',
        data: {
          labels: ['+2h', '+4h', '+6h', '+8h', '+10h', '+12h', '+16h', '+20h', '+24h'],
          datasets: [
            {
              label: 'Predicted Demand (MW)',
              data: [1.90, 1.95, 2.10, 2.25, 2.40, 2.20, 1.90, 1.80, 1.75],
              borderColor: '#38BDF8',
              backgroundColor: 'rgba(56, 189, 248, 0.1)',
              borderWidth: 3,
              fill: true
            },
            {
              label: 'Predicted Solar (MW)',
              data: [1.10, 0.90, 0.70, 0.60, 0.50, 0.40, 0.80, 1.20, 1.00],
              borderColor: '#F59E0B',
              borderWidth: 2,
              tension: 0.3
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { grid: { color: 'rgba(255,255,255,0.05)' } },
            y: { grid: { color: 'rgba(255,255,255,0.05)' } }
          }
        }
      });
    }

    // 3. Energy Optimization Fuel Bar Chart
    const ctxFuel = document.getElementById('chart-fuel-opt');
    if (ctxFuel) {
      this.charts.fuelOpt = new Chart(ctxFuel, {
        type: 'bar',
        data: {
          labels: ['Baseline (No AI)', 'AI Optimized'],
          datasets: [
            {
              label: 'Fuel Consumption Rate (Liters/Hour)',
              data: [42.0, 23.4],
              backgroundColor: ['rgba(239, 68, 68, 0.7)', 'rgba(16, 185, 129, 0.8)'],
              borderColor: ['#EF4444', '#10B981'],
              borderWidth: 1,
              borderRadius: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, title: { display: true, text: 'L/hour' } }
          }
        }
      });
    }

    // 4. Anomaly Detection Deviation Chart
    const ctxAnomaly = document.getElementById('chart-anomaly');
    if (ctxAnomaly) {
      this.charts.anomaly = new Chart(ctxAnomaly, {
        type: 'line',
        data: {
          labels: ['12:00', '13:00', '14:00', '15:00', '16:00', '17:00'],
          datasets: [
            {
              label: 'Expected Baseline (MW)',
              data: [0.18, 0.18, 0.18, 0.18, 0.18, 0.18],
              borderColor: '#94A3B8',
              borderDash: [4, 4],
              borderWidth: 2
            },
            {
              label: 'Actual Consumption - Heating Unit B (MW)',
              data: [0.18, 0.19, 0.28, 0.31, 0.30, 0.31],
              borderColor: '#EF4444',
              borderWidth: 3,
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              fill: true
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { grid: { color: 'rgba(255,255,255,0.05)' } },
            y: { grid: { color: 'rgba(255,255,255,0.05)' } }
          }
        }
      });
    }
  },

  updateMainChartRange(range) {
    if (!this.charts.mainEnergy) return;

    if (range === '7D') {
      this.charts.mainEnergy.data.labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      this.charts.mainEnergy.data.datasets[0].data = [1.8, 2.1, 1.9, 2.3, 2.0, 1.7, 1.85];
      this.charts.mainEnergy.data.datasets[1].data = [1.3, 1.1, 1.4, 0.9, 1.5, 1.6, 1.25];
      this.charts.mainEnergy.data.datasets[2].data = [0.5, 1.0, 0.5, 1.4, 0.5, 0.1, 0.60];
    } else if (range === '30D') {
      this.charts.mainEnergy.data.labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
      this.charts.mainEnergy.data.datasets[0].data = [2.0, 2.2, 1.9, 2.1];
      this.charts.mainEnergy.data.datasets[1].data = [1.2, 1.0, 1.4, 1.3];
      this.charts.mainEnergy.data.datasets[2].data = [0.8, 1.2, 0.5, 0.8];
    } else {
      // 24H Default
      this.charts.mainEnergy.data.labels = ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00', '24:00'];
      this.charts.mainEnergy.data.datasets[0].data = [1.65, 1.50, 1.70, 2.10, 2.35, 2.20, 1.95, 1.82, 1.68];
      this.charts.mainEnergy.data.datasets[1].data = [0.40, 0.35, 0.80, 1.45, 1.90, 1.60, 1.10, 0.65, 0.40];
      this.charts.mainEnergy.data.datasets[2].data = [1.25, 1.15, 0.90, 0.65, 0.45, 0.60, 0.85, 1.17, 1.28];
    }

    this.charts.mainEnergy.update();
  },

  refreshCharts() {
    Object.values(this.charts).forEach(c => {
      if (c && typeof c.resize === 'function') {
        c.resize();
      }
    });
  }
};

window.DashboardUI = DashboardUI;
