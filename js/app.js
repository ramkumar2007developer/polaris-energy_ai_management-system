/* ==========================================================================
   POLARIS ENERGY AI - MAIN APPLICATION INITIALIZER (js/app.js)
   ========================================================================== */

// 1. Toast Notification Manager
const ToastManager = {
  container: null,

  init() {
    this.container = document.getElementById('toast-container');
  },

  show(message, type = 'info') {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      document.body.appendChild(this.container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconClass = 'fa-info-circle';
    if (type === 'success') iconClass = 'fa-check-circle';
    if (type === 'warning') iconClass = 'fa-exclamation-triangle';
    if (type === 'danger') iconClass = 'fa-exclamation-circle';

    toast.innerHTML = `<i class="fas ${iconClass}"></i> <span>${message}</span>`;
    this.container.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 4000);
  }
};
window.ToastManager = ToastManager;

// 2. Simulation Drawer Controller
const SimulationControls = {
  init() {
    const toggleBtn = document.getElementById('sim-drawer-toggle');
    const closeBtn = document.getElementById('sim-drawer-close');
    const panel = document.getElementById('sim-drawer-panel');

    if (toggleBtn && panel) {
      toggleBtn.addEventListener('click', () => {
        panel.classList.toggle('active');
      });
    }

    if (closeBtn && panel) {
      closeBtn.addEventListener('click', () => {
        panel.classList.remove('active');
      });
    }

    // Weather buttons
    this.bindButtonGroup('sim-weather-btns', (val) => {
      window.SimulationEngine.setWeather(val);
    });

    // Demand buttons
    this.bindButtonGroup('sim-demand-btns', (val) => {
      window.SimulationEngine.setDemandLevel(val);
    });

    // Battery buttons
    this.bindButtonGroup('sim-battery-btns', (val) => {
      window.SimulationEngine.setBattery(parseInt(val, 10));
    });

    // Fuel buttons
    this.bindButtonGroup('sim-fuel-btns', (val) => {
      window.SimulationEngine.setFuel(parseInt(val, 10));
    });
  },

  bindButtonGroup(containerId, callback) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const btns = container.querySelectorAll('.sim-select-btn');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        btns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const val = btn.getAttribute('data-value');
        callback(val);
      });
    });
  }
};

// 3. Time Ticker
function initClock() {
  const clockEl = document.getElementById('sim-time');
  if (!clockEl) return;

  function update() {
    const now = new Date();
    const hrs = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    const secs = String(now.getSeconds()).padStart(2, '0');
    clockEl.textContent = `${hrs}:${mins}:${secs} UTC-3`;
  }

  update();
  setInterval(update, 1000);
}

// 4. Live Monitoring Auto-Ticker (simulates micro fluctuations)
function initLiveTicker() {
  setInterval(() => {
    const isLoggedIn = localStorage.getItem('polaris_logged_in') === 'true';
    if (isLoggedIn && window.SimulationEngine) {
      // Add tiny natural noise (+/- 0.02 MW)
      const noise = (Math.random() - 0.5) * 0.03;
      const baseVal = parseFloat(document.getElementById('kpi-demand-val')?.textContent || '1.82');
      const updatedVal = Math.max(0.9, Math.round((baseVal + noise) * 100) / 100);
      
      const monDemand = document.getElementById('mon-demand');
      if (monDemand) monDemand.textContent = `${updatedVal} MW`;
    }
  }, 2500);
}

// DOM Initialization Entry Point
document.addEventListener('DOMContentLoaded', () => {
  ToastManager.init();
  DashboardUI.init();
  SimulationControls.init();
  initClock();
  initLiveTicker();

  // Initial simulation evaluation
  if (window.SimulationEngine) {
    window.SimulationEngine.evaluate();
  }
});
