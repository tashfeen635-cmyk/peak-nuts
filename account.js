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

  // Forgot password elements
  var forgotPasswordLink = document.getElementById('forgotPasswordLink');
  var forgotPasswordForm = document.getElementById('forgotPasswordForm');
  var forgotFormEl = document.getElementById('forgotFormEl');
  var forgotBtn = document.getElementById('forgotBtn');
  var forgotError = document.getElementById('forgotError');
  var forgotSuccess = document.getElementById('forgotSuccess');
  var backToLoginLink = document.getElementById('backToLoginLink');

  // Reset password elements
  var resetPasswordForm = document.getElementById('resetPasswordForm');
  var resetFormEl = document.getElementById('resetFormEl');
  var resetBtn = document.getElementById('resetBtn');
  var resetError = document.getElementById('resetError');
  var resetSuccess = document.getElementById('resetSuccess');

  // Verification elements
  var verificationBanner = document.getElementById('verificationBanner');
  var resendVerification = document.getElementById('resendVerification');

  // Dashboard nav
  var accountNavBtns = document.querySelectorAll('.account-nav-btn');
  var profilePanel = document.getElementById('profilePanel');
  var ordersPanel = document.getElementById('ordersPanel');
  var wishlistPanel = document.getElementById('wishlistPanel');
  var ordersList = document.getElementById('ordersList');
  var wishlistList = document.getElementById('wishlistList');

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

      // Hide forgot/reset forms
      if (forgotPasswordForm) forgotPasswordForm.style.display = 'none';
      if (resetPasswordForm) resetPasswordForm.style.display = 'none';
      if (loginFormEl) loginFormEl.style.display = '';

      if (target === 'login') {
        loginForm.classList.add('active');
      } else {
        registerForm.classList.add('active');
      }
    });
  });

  // ---- FORGOT PASSWORD ----
  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', function (e) {
      e.preventDefault();
      loginFormEl.style.display = 'none';
      forgotPasswordForm.style.display = '';
      forgotSuccess.style.display = 'none';
      hideError(forgotError);
    });
  }

  if (backToLoginLink) {
    backToLoginLink.addEventListener('click', function (e) {
      e.preventDefault();
      forgotPasswordForm.style.display = 'none';
      loginFormEl.style.display = '';
    });
  }

  if (forgotFormEl) {
    forgotFormEl.addEventListener('submit', function (e) {
      e.preventDefault();
      hideError(forgotError);
      forgotSuccess.style.display = 'none';

      var email = document.getElementById('forgotEmail').value.trim();
      if (!email) {
        showError(forgotError, 'Please enter your email.');
        return;
      }

      forgotBtn.disabled = true;
      forgotBtn.textContent = 'SENDING...';

      fetch(API_BASE + '/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email })
      })
        .then(function (res) { return res.json().then(function (data) { return { status: res.status, data: data }; }); })
        .then(function (result) {
          forgotBtn.disabled = false;
          forgotBtn.textContent = 'SEND RESET LINK';
          if (result.status === 200) {
            forgotSuccess.textContent = 'If an account exists with that email, a reset link has been sent. Check your inbox.';
            forgotSuccess.style.display = '';
            forgotFormEl.reset();
          } else {
            showError(forgotError, result.data.error || 'Failed to send reset link.');
          }
        })
        .catch(function () {
          forgotBtn.disabled = false;
          forgotBtn.textContent = 'SEND RESET LINK';
          showError(forgotError, 'Network error. Please try again.');
        });
    });
  }

  // ---- RESET PASSWORD ----
  if (resetFormEl) {
    resetFormEl.addEventListener('submit', function (e) {
      e.preventDefault();
      hideError(resetError);
      resetSuccess.style.display = 'none';

      var password = document.getElementById('resetPassword').value;
      var confirm = document.getElementById('resetConfirm').value;

      if (!password || !confirm) {
        showError(resetError, 'Please fill in all fields.');
        return;
      }
      if (password.length < 6) {
        showError(resetError, 'Password must be at least 6 characters.');
        return;
      }
      if (password !== confirm) {
        showError(resetError, 'Passwords do not match.');
        return;
      }

      var urlParams = new URLSearchParams(window.location.search);
      var token = urlParams.get('reset');

      resetBtn.disabled = true;
      resetBtn.textContent = 'RESETTING...';

      fetch(API_BASE + '/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token, password: password })
      })
        .then(function (res) { return res.json().then(function (data) { return { status: res.status, data: data }; }); })
        .then(function (result) {
          resetBtn.disabled = false;
          resetBtn.textContent = 'RESET PASSWORD';
          if (result.status === 200) {
            resetSuccess.textContent = 'Password reset successfully! You can now login with your new password.';
            resetSuccess.style.display = '';
            resetFormEl.reset();
            // Remove reset param from URL
            window.history.replaceState({}, document.title, window.location.pathname);
            setTimeout(function () {
              resetPasswordForm.style.display = 'none';
              loginFormEl.style.display = '';
            }, 3000);
          } else {
            showError(resetError, result.data.error || 'Failed to reset password.');
          }
        })
        .catch(function () {
          resetBtn.disabled = false;
          resetBtn.textContent = 'RESET PASSWORD';
          showError(resetError, 'Network error. Please try again.');
        });
    });
  }

  // ---- EMAIL VERIFICATION ----
  if (resendVerification) {
    resendVerification.addEventListener('click', function () {
      this.textContent = 'Sending...';
      this.disabled = true;
      var self = this;

      fetch(API_BASE + '/resend-verification', {
        method: 'POST',
        headers: authHeaders()
      })
        .then(function (res) { return res.json(); })
        .then(function () {
          self.textContent = 'Sent!';
          setTimeout(function () {
            self.textContent = 'Resend Email';
            self.disabled = false;
          }, 3000);
        })
        .catch(function () {
          self.textContent = 'Resend Email';
          self.disabled = false;
        });
    });
  }

  function checkVerification() {
    // Check URL for verify token
    var urlParams = new URLSearchParams(window.location.search);
    var verifyToken = urlParams.get('verify');
    if (verifyToken) {
      fetch(API_BASE + '/verify-email?token=' + verifyToken)
        .then(function (res) { return res.json().then(function (data) { return { status: res.status, data: data }; }); })
        .then(function (result) {
          if (result.status === 200) {
            if (verificationBanner) {
              verificationBanner.style.display = '';
              verificationBanner.style.background = '#e8f5e9';
              verificationBanner.style.borderColor = '#4caf50';
              verificationBanner.style.color = '#2e7d32';
              verificationBanner.innerHTML = '<strong>Email verified successfully!</strong> You now have full access to all features.';
            }
            window.history.replaceState({}, document.title, window.location.pathname);
            setTimeout(function () {
              if (verificationBanner) verificationBanner.style.display = 'none';
            }, 5000);
          }
        })
        .catch(function () {});
    }
  }

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
      if (wishlistPanel) wishlistPanel.classList.remove('active');

      if (panel === 'profile') {
        profilePanel.classList.add('active');
        loadProfile();
      } else if (panel === 'orders') {
        ordersPanel.classList.add('active');
        loadOrders();
      } else if (panel === 'wishlist') {
        if (wishlistPanel) wishlistPanel.classList.add('active');
        loadWishlist();
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
          // Show verification banner if needed
          if (result.data.needsVerification && verificationBanner) {
            verificationBanner.style.display = '';
          }
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
        // Show verification banner if not verified
        if (data.verified === 0 || data.verified === false) {
          if (verificationBanner) verificationBanner.style.display = '';
        } else {
          if (verificationBanner) verificationBanner.style.display = 'none';
        }
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

  // ---- ORDERS PAGINATION ----
  var userOrdersPage = 1;
  var userOrdersPerPage = 5;
  var userAllOrders = [];

  function renderOrdersPagination(container, currentPage, totalPages, onPageChange) {
    if (totalPages <= 1) { container.innerHTML = ''; return; }
    var html = '<div style="display:flex;justify-content:center;align-items:center;gap:6px;padding:20px 0;flex-wrap:wrap;">';
    var btnBase = 'padding:8px 14px;border:1px solid #ddd;border-radius:6px;background:#fff;cursor:pointer;font-size:13px;font-family:inherit;transition:all 0.2s;';
    var btnActive = 'padding:8px 14px;border:1px solid #1a1a1a;border-radius:6px;background:#1a1a1a;color:#fff;cursor:default;font-size:13px;font-family:inherit;font-weight:600;';
    var btnDisabled = 'padding:8px 14px;border:1px solid #eee;border-radius:6px;background:#f5f5f5;color:#ccc;cursor:not-allowed;font-size:13px;font-family:inherit;';
    if (currentPage > 1) {
      html += '<button class="pg-btn" data-page="' + (currentPage - 1) + '" style="' + btnBase + '">&laquo; Prev</button>';
    } else {
      html += '<button disabled style="' + btnDisabled + '">&laquo; Prev</button>';
    }
    var startP = Math.max(1, currentPage - 2);
    var endP = Math.min(totalPages, currentPage + 2);
    if (startP > 1) {
      html += '<button class="pg-btn" data-page="1" style="' + btnBase + '">1</button>';
      if (startP > 2) html += '<span style="padding:0 4px;color:#999;">...</span>';
    }
    for (var i = startP; i <= endP; i++) {
      if (i === currentPage) {
        html += '<button style="' + btnActive + '">' + i + '</button>';
      } else {
        html += '<button class="pg-btn" data-page="' + i + '" style="' + btnBase + '">' + i + '</button>';
      }
    }
    if (endP < totalPages) {
      if (endP < totalPages - 1) html += '<span style="padding:0 4px;color:#999;">...</span>';
      html += '<button class="pg-btn" data-page="' + totalPages + '" style="' + btnBase + '">' + totalPages + '</button>';
    }
    if (currentPage < totalPages) {
      html += '<button class="pg-btn" data-page="' + (currentPage + 1) + '" style="' + btnBase + '">Next &raquo;</button>';
    } else {
      html += '<button disabled style="' + btnDisabled + '">Next &raquo;</button>';
    }
    html += '</div>';
    container.innerHTML = html;
    container.querySelectorAll('.pg-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        onPageChange(parseInt(this.getAttribute('data-page')));
      });
    });
  }

  function renderOrders(orders) {
    if (orders) {
      userAllOrders = orders;
      userOrdersPage = 1;
    }

    if (!userAllOrders || userAllOrders.length === 0) {
      ordersList.innerHTML =
        '<div class="orders-empty">' +
          '<p>You haven\'t placed any orders yet.</p>' +
          '<a href="shop.html" class="btn btn-primary">START SHOPPING</a>' +
        '</div>';
      return;
    }

    var totalPages = Math.ceil(userAllOrders.length / userOrdersPerPage);
    if (userOrdersPage > totalPages) userOrdersPage = totalPages;
    if (userOrdersPage < 1) userOrdersPage = 1;

    var start = (userOrdersPage - 1) * userOrdersPerPage;
    var end = start + userOrdersPerPage;
    var pageOrders = userAllOrders.slice(start, end);

    var html = '';
    for (var i = 0; i < pageOrders.length; i++) {
      var order = pageOrders[i];
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

    // Add pagination container
    html += '<div id="userOrdersPagination"></div>';
    ordersList.innerHTML = html;

    // Render pagination controls
    var paginationEl = document.getElementById('userOrdersPagination');
    if (paginationEl) {
      renderOrdersPagination(paginationEl, userOrdersPage, totalPages, function (page) {
        userOrdersPage = page;
        renderOrders(null);
        ordersPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }

  // ---- LOAD WISHLIST ----
  function loadWishlist() {
    if (!wishlistList) return;
    wishlistList.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">Loading wishlist...</p>';

    fetch(API_BASE + '/user/wishlist', {
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
        renderWishlist(data);
      })
      .catch(function () {
        wishlistList.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">Failed to load wishlist.</p>';
      });
  }

  function renderWishlist(items) {
    if (!items || items.length === 0) {
      wishlistList.innerHTML =
        '<div class="orders-empty">' +
          '<p>Your wishlist is empty.</p>' +
          '<a href="shop.html" class="btn btn-primary">BROWSE PRODUCTS</a>' +
        '</div>';
      return;
    }

    var html = '<div class="wishlist-grid">';
    for (var i = 0; i < items.length; i++) {
      var p = items[i];
      var priceHtml = '';
      if (p.oldPrice && p.oldPrice > 0) {
        priceHtml = '<span style="text-decoration:line-through;color:#999;margin-right:8px;font-size:13px;">Rs.' + p.oldPrice.toFixed(2) + '</span>';
      }
      priceHtml += '<span style="font-weight:600;color:#1a1a1a;">Rs.' + p.price.toFixed(2) + '</span>';

      html += '<div class="wishlist-item" style="display:flex;align-items:center;gap:16px;padding:16px;background:#fff;border:1px solid #eee;border-radius:8px;margin-bottom:12px;">' +
        '<img src="' + escapeHtml(p.image) + '" alt="' + escapeHtml(p.name) + '" style="width:70px;height:70px;object-fit:cover;border-radius:6px;" loading="lazy">' +
        '<div style="flex:1;">' +
          '<div style="font-weight:600;margin-bottom:4px;">' + escapeHtml(p.name) + '</div>' +
          '<div style="font-size:13px;color:#666;margin-bottom:4px;">' + escapeHtml(p.category) + '</div>' +
          '<div>' + priceHtml + '</div>' +
        '</div>' +
        '<div style="display:flex;flex-direction:column;gap:8px;">' +
          '<button class="btn btn-primary" style="font-size:11px;padding:8px 14px;" data-wishlist-add-cart="' + escapeHtml(p.name) + '" data-price="' + p.price + '" data-img="' + escapeHtml(p.image) + '">ADD TO CART</button>' +
          '<button style="background:none;border:1px solid #e04f3a;color:#e04f3a;padding:6px 14px;border-radius:4px;font-size:11px;cursor:pointer;" data-wishlist-remove="' + p.productId + '">REMOVE</button>' +
        '</div>' +
      '</div>';
    }
    html += '</div>';

    wishlistList.innerHTML = html;

    // Attach handlers
    wishlistList.querySelectorAll('[data-wishlist-remove]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var productId = this.getAttribute('data-wishlist-remove');
        fetch(API_BASE + '/user/wishlist/' + productId, {
          method: 'DELETE',
          headers: authHeaders()
        }).then(function () { loadWishlist(); });
      });
    });

    wishlistList.querySelectorAll('[data-wishlist-add-cart]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var name = this.getAttribute('data-wishlist-add-cart');
        var price = parseFloat(this.getAttribute('data-price'));
        var img = this.getAttribute('data-img');
        // Use global addToCart from script.js via custom event
        window.dispatchEvent(new CustomEvent('peaknuts-add-to-cart', {
          detail: { name: name, price: price, image: img }
        }));
        this.textContent = 'ADDED!';
        this.style.background = '#8B9A46';
        var self = this;
        setTimeout(function () {
          self.textContent = 'ADD TO CART';
          self.style.background = '';
        }, 1200);
      });
    });
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
    if (wishlistPanel) wishlistPanel.classList.remove('active');
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
    // Check for URL params (reset token, verify token)
    var urlParams = new URLSearchParams(window.location.search);

    // Handle password reset link
    if (urlParams.get('reset')) {
      loginFormEl.style.display = 'none';
      if (forgotPasswordForm) forgotPasswordForm.style.display = 'none';
      if (resetPasswordForm) resetPasswordForm.style.display = '';
      showLogin();
      return;
    }

    // Handle email verification link
    if (urlParams.get('verify')) {
      checkVerification();
    }

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
