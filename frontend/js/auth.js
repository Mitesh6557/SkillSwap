/**
 * SkillSwap - Client Authentication Helpers
 * Session management, login, logout, and protected route guards.
 */

const auth = {
  getUser() {
    const raw = localStorage.getItem(CONFIG.USER_KEY);
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  getToken() {
    return localStorage.getItem(CONFIG.TOKEN_KEY);
  },

  isAuthenticated() {
    return Boolean(this.getToken() && this.getUser());
  },

  isAdmin() {
    const user = this.getUser();
    return Boolean(user && user.role === 'admin');
  },

  setSession(token, user) {
    localStorage.setItem(CONFIG.TOKEN_KEY, token);
    localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(user));
  },

  async login(email, password) {
    const res = await api.post('/auth/login', { email, password });
    if (res.data?.token && res.data?.user) {
      this.setSession(res.data.token, res.data.user);
    }
    return res;
  },

  async register(userData) {
    const res = await api.post('/auth/register', userData);
    if (res.data?.token && res.data?.user) {
      this.setSession(res.data.token, res.data.user);
    }
    return res;
  },

  logout() {
    localStorage.removeItem(CONFIG.TOKEN_KEY);
    localStorage.removeItem(CONFIG.USER_KEY);
    window.location.href = 'login.html';
  },

  /**
   * Route Guard: redirects unauthenticated users to login
   */
  requireAuth(redirectUrl = 'login.html') {
    if (!this.isAuthenticated()) {
      window.location.href = redirectUrl;
    }
  },

  /**
   * Route Guard: redirects non-admin users
   */
  requireAdmin(redirectUrl = 'dashboard.html') {
    this.requireAuth();
    if (!this.isAdmin()) {
      window.location.href = redirectUrl;
    }
  }
};

window.auth = auth;
