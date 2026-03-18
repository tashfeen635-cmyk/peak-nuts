/* ========================================
   PEAK NUTS - ACCOUNT PAGE JAVASCRIPT
   IIFE pattern, same as admin.js
   ======================================== */

(function () {
  'use strict';

  var API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : '/api';

  // ---- TOKEN MANAGEMENT ----
  var TOKEN_KEY = 'peaknuts_user_token';
  var PROFILE_KEY = 'peaknuts_user_profile';

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  }

  function removeToken() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(PROFILE_KEY);
  }

  function getProfile() {
    try {
      var data = localStorage.getItem(PROFILE_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) { return null; }
  }

  function setProfile(profile) {
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch (e) {}
  }

  function authHeaders() {
    var token = getToken();
    var headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = 'Bearer ' + token;
    }
    return headers;
  }

  // ---- DOM ELEMENTS ----
  var accountLogin = document.getElementById('accountLogin');
  var accountDashboard = document.getElementById('accountDashboard');
  var accountGreeting = document.getElementById('accountGreeting');

  // Auth tabs
  var authTabs = document.querySelectorAll('.auth-tab');
  var loginForm = document.getElementById('loginForm');
  var registerForm = document.getElementById('registerForm');
  var loginError = document.getElementById('loginError');
  var registerError = document.getElementById('registerError');
  var loginFormEl = document.getElementById('loginFormEl');
  var registerFormEl = document.getElementById('registerFormEl');
  var loginBtn = document.getElementById('loginBtn');
  var registerBtn = document.getElementById('registerBtn');

  // Dashboard nav
  var accountNavBtns = document.querySelectorAll('.account-nav-btn');
  var profilePanel = document.getElementById('profilePanel');
  var ordersPanel = document.getElementById('ordersPanel');
  var ordersList = document.getElementById('ordersList');

  // Profile form
  var profileFormEl = document.getElementById('profileFormEl');
  var profileName = document.getElementById('profileName');
  var profileEmail = document.getElementById('profileEmail');
  var profilePhone = document.getElementById('profilePhone');
  var profileCity = document.getElementById('profileCity');
  var profileAddress = document.getElementById('profileAddress');
  var profileSaveBtn = document.getElementById('profileSaveBtn');

  // ---- SHOW/HIDE SCREENS ----
  function showLogin() {
    accountLogin.style.display = '';
    accountDashboard.style.display = 'none';
  }

  function showDashboard(profile) {
    accountLogin.style.display = 'none';
    accountDashboard.style.display = '';
    if (profile && profile.name) {
      accountGreeting.textContent = 'Hello, ' + profile.name + '!';
    }
  }

  // ---- AUTH TABS ----
  authTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var target = this.getAttribute('data-tab');
      authTabs.forEach(function (t) { t.classList.remove('active'); });
      this.classList.add('active');

      loginForm.classList.remove('active');
      registerForm.classList.remove('active');
      loginError.classList.remove('visible');
      registerError.classList.remove('visible');

      if (target === 'login') {
        loginForm.classList.add('active');
      } else {
        registerForm.classList.add('active');
      }
    });
  });

  // ---- DASHBOARD NAV ----
  accountNavBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var panel = this.getAttribute('data-panel');

      if (panel === 'logout') {
        doLogout();
        return;
      }

      accountNavBtns.forEach(function (b) { b.classList.remove('active'); });
      this.classList.add('active');

      profilePanel.classList.remove('active');
      ordersPanel.classList.remove('active');

      if (panel === 'profile') {
        profilePanel.classList.add('active');
        loadProfile();
      } else if (panel === 'orders') {
        ordersPanel.classList.add('active');
        loadOrders();
      }
    });
  });

  // ---- SHOW ERROR ----
  function showError(el, msg) {
    el.textContent = msg;
    el.classList.add('visible');
  }

  function hideError(el) {
    el.textContent = '';
    el.classList.remove('visible');
  }

  // ---- LOGIN ----
  loginFormEl.addEventListener('submit', function (e) {
    e.preventDefault();
    hideError(loginError);

    var email = document.getElementById('loginEmail').value.trim();
    var password = document.getElementById('loginPassword').value;

    if (!email || !password) {
      showError(loginError, 'Please fill in all fields.');
      return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = 'LOGGING IN...';

    fetch(API_BASE + '/user/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: password })
    })
      .then(function (res) { return res.json().then(function (data) { return { status: res.status, data: data }; }); })
      .then(function (result) {
        loginBtn.disabled = false;
        loginBtn.textContent = 'LOGIN';

        if (result.status === 200 && result.data.token) {
          setToken(result.data.token);
          setProfile(result.data.profile);
          loginFormEl.reset();
          showDashboard(result.data.profile);
          loadProfile();
        } else {
          showError(loginError, result.data.error || 'Login failed.');
        }
      })
      .catch(function () {
        loginBtn.disabled = false;
        loginBtn.textContent = 'LOGIN';
        showError(loginError, 'Network error. Please try again.');
      });
  });

  // ---- REGISTER ----
  registerFormEl.addEventListener('submit', function (e) {
    e.preventDefault();
    hideError(registerError);

    var name = document.getElementById('registerName').value.trim();
    var email = document.getElementById('registerEmail').value.trim();
    var password = document.getElementById('registerPassword').value;
    var confirm = document.getElementById('registerConfirm').value;

    if (!name || !email || !password || !confirm) {
      showError(registerError, 'Please fill in all fields.');
      return;
    }

    if (password.length < 6) {
      showError(registerError, 'Password must be at least 6 characters.');
      return;
    }

    if (password !== confirm) {
      showError(registerError, 'Passwords do not match.');
      return;
    }

    registerBtn.disabled = true;
    registerBtn.textContent = 'CREATING ACCOUNT...';

    fetch(API_BASE + '/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name, email: email, password: password })
    })
      .then(function (res) { return res.json().then(function (data) { return { status: res.status, data: data }; }); })
      .then(function (result) {
        registerBtn.disabled = false;
        registerBtn.textContent = 'CREATE ACCOUNT';

        if ((result.status === 201 || result.status === 200) && result.data.token) {
          setToken(result.data.token);
          setProfile(result.data.profile);
          registerFormEl.reset();
          showDashboard(result.data.profile);
          loadProfile();
        } else {
          showError(registerError, result.data.error || 'Registration failed.');
        }
      })
      .catch(function () {
        registerBtn.disabled = false;
        registerBtn.textContent = 'CREATE ACCOUNT';
        showError(registerError, 'Network error. Please try again.');
      });
  });

  // ---- LOAD PROFILE ----
  function loadProfile() {
    fetch(API_BASE + '/user/profile', {
      headers: authHeaders()
    })
      .then(function (res) {
        if (res.status === 401) {
          removeToken();
          showLogin();
          return null;
        }
        return res.json();
      })
      .then(function (data) {
        if (!data) return;
        profileName.value = data.name || '';
        profileEmail.value = data.email || '';
        profilePhone.value = data.phone || '';
        profileCity.value = data.city || '';
        profileAddress.value = data.address || '';
        setProfile(data);
        accountGreeting.textContent = 'Hello, ' + (data.name || 'there') + '!';
      })
      .catch(function () {});
  }

  // ---- SAVE PROFILE ----
  profileFormEl.addEventListener('submit', function (e) {
    e.preventDefault();

    profileSaveBtn.disabled = true;
    profileSaveBtn.textContent = 'SAVING...';

    fetch(API_BASE + '/user/profile', {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({
        name: profileName.value.trim(),
        phone: profilePhone.value.trim(),
        city: profileCity.value.trim(),
        address: profileAddress.value.trim()
      })
    })
      .then(function (res) {
        if (res.status === 401) {
          removeToken();
          showLogin();
          return null;
        }
        return res.json();
      })
      .then(function (data) {
        profileSaveBtn.disabled = false;
        if (!data) return;
        profileSaveBtn.textContent = 'SAVED!';
        profileSaveBtn.style.background = '#8B9A46';
        profileSaveBtn.style.borderColor = '#8B9A46';
        setProfile(data);
        accountGreeting.textContent = 'Hello, ' + (data.name || 'there') + '!';
        setTimeout(function () {
          profileSaveBtn.textContent = 'SAVE CHANGES';
          profileSaveBtn.style.background = '';
          profileSaveBtn.style.borderColor = '';
        }, 2000);
      })
      .catch(function () {
        profileSaveBtn.disabled = false;
        profileSaveBtn.textContent = 'SAVE CHANGES';
      });
  });

  // ---- LOAD ORDERS ----
  function loadOrders() {
    ordersList.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">Loading orders...</p>';

    fetch(API_BASE + '/user/orders', {
      headers: authHeaders()
    })
      .then(function (res) {
        if (res.status === 401) {
          removeToken();
          showLogin();
          return null;
        }
        return res.json();
      })
      .then(function (data) {
        if (!data) return;
        renderOrders(data);
      })
      .catch(function () {
        ordersList.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">Failed to load orders.</p>';
      });
  }

  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function renderOrders(orders) {
    if (!orders || orders.length === 0) {
      ordersList.innerHTML =
        '<div class="orders-empty">' +
          '<p>You haven\'t placed any orders yet.</p>' +
          '<a href="shop.html" class="btn btn-primary">START SHOPPING</a>' +
        '</div>';
      return;
    }

    var html = '';
    for (var i = 0; i < orders.length; i++) {
      var order = orders[i];
      var statusClass = (order.status || '').toLowerCase();
      var total = 0;

      var itemsHtml = '';
      if (order.items && order.items.length) {
        for (var j = 0; j < order.items.length; j++) {
          var item = order.items[j];
          var lineTotal = item.qty * item.price;
          total += lineTotal;
          itemsHtml += '<div class="order-card-item">' +
            '<span>' + escapeHtml(item.name) + ' x ' + item.qty + '</span>' +
            '<span>Rs.' + lineTotal.toFixed(2) + '</span>' +
          '</div>';
        }
      }

      html += '<div class="order-card">' +
        '<div class="order-card-header">' +
          '<div>' +
            '<span class="order-card-id">' + escapeHtml(order.orderId) + '</span>' +
            '<span class="order-card-date" style="margin-left:12px;">' + escapeHtml(order.date) + '</span>' +
          '</div>' +
          '<span class="order-status ' + statusClass + '">' + escapeHtml(order.status) + '</span>' +
        '</div>' +
        '<div class="order-card-items">' + itemsHtml + '</div>' +
        '<div class="order-card-total">' +
          '<span>Total</span>' +
          '<span>Rs.' + total.toFixed(2) + '</span>' +
        '</div>' +
      '</div>';
    }

    ordersList.innerHTML = html;
  }

  // ---- LOGOUT ----
  function doLogout() {
    var token = getToken();
    if (token) {
      fetch(API_BASE + '/user/logout', {
        method: 'POST',
        headers: authHeaders()
      }).catch(function () {});
    }
    removeToken();
    showLogin();

    // Reset nav state
    accountNavBtns.forEach(function (b) { b.classList.remove('active'); });
    accountNavBtns[0].classList.add('active');
    profilePanel.classList.add('active');
    ordersPanel.classList.remove('active');
  }

  // ---- PASSWORD TOGGLE ----
  document.querySelectorAll('.password-toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var wrap = this.closest('.password-wrap');
      var input = wrap.querySelector('input');
      var eyeOpen = this.querySelector('.eye-open');
      var eyeClosed = this.querySelector('.eye-closed');

      if (input.type === 'password') {
        input.type = 'text';
        eyeOpen.style.display = 'none';
        eyeClosed.style.display = '';
      } else {
        input.type = 'password';
        eyeOpen.style.display = '';
        eyeClosed.style.display = 'none';
      }
    });
  });

  // ---- INITIALIZE ----
  function init() {
    var token = getToken();
    if (token) {
      var profile = getProfile();
      showDashboard(profile);
      loadProfile();
    } else {
      showLogin();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
