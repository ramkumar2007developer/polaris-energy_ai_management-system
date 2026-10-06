/* ==========================================================================
   POLARIS ENERGY AI - AUTHENTICATION MODULE (js/auth.js)
   ========================================================================== */

const AuthModule = {
  DEMO_EMAIL: 'admin@polaris.ai',
  DEMO_PASS: 'polar123',

  init() {
    this.bindEvents();
    this.checkSession();
  },

  bindEvents() {
    const loginForm = document.getElementById('login-form');
    const demoBtn = document.getElementById('demo-login-btn');
    const logoutBtn = document.getElementById('logout-btn');

    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const pass = document.getElementById('login-password').value;
        this.login(email, pass);
      });
    }

    if (demoBtn) {
      demoBtn.addEventListener('click', () => {
        document.getElementById('login-email').value = this.DEMO_EMAIL;
        document.getElementById('login-password').value = this.DEMO_PASS;
        this.login(this.DEMO_EMAIL, this.DEMO_PASS);
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        this.logout();
      });
    }
  },

  login(email, password) {
    const errorEl = document.getElementById('login-error');
    
    // Normalize input
    if (email.trim() === this.DEMO_EMAIL && password.trim() === this.DEMO_PASS) {
      localStorage.setItem('polaris_logged_in', 'true');
      localStorage.setItem('polaris_user_email', email.trim());
      if (errorEl) errorEl.style.display = 'none';
      
      this.showAppView();
      if (window.ToastManager) {
        window.ToastManager.show('Welcome to Polaris Energy AI Control Center', 'success');
      }
    } else {
      if (errorEl) {
        errorEl.textContent = 'Invalid credentials. Use admin@polaris.ai / polar123 or click Demo Login.';
        errorEl.style.display = 'block';
      }
    }
  },

  logout() {
    localStorage.removeItem('polaris_logged_in');
    localStorage.removeItem('polaris_user_email');
    this.showLoginView();
    if (window.ToastManager) {
      window.ToastManager.show('Successfully logged out.', 'info');
    }
  },

  checkSession() {
    const isLoggedIn = localStorage.getItem('polaris_logged_in') === 'true';
    if (isLoggedIn) {
      this.showAppView();
    } else {
      this.showLoginView();
    }
  },

  showAppView() {
    const loginView = document.getElementById('login-view');
    const appView = document.getElementById('app-view');
    
    if (loginView) loginView.style.display = 'none';
    if (appView) appView.style.display = 'flex';
    
    // Trigger simulation & dashboard initializations
    if (window.SimulationEngine) {
      window.SimulationEngine.evaluate();
    }
  },

  showLoginView() {
    const loginView = document.getElementById('login-view');
    const appView = document.getElementById('app-view');
    
    if (loginView) loginView.style.display = 'flex';
    if (appView) appView.style.display = 'none';
  }
};

document.addEventListener('DOMContentLoaded', () => {
  AuthModule.init();
});
