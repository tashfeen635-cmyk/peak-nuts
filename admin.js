/* ========================================
   PEAK NUTS - ADMIN DASHBOARD JAVASCRIPT
   IIFE pattern, SQLite via REST API
   ======================================== */

(function () {
  'use strict';

  var API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : '/api';

  // ---- IN-MEMORY CACHE (loaded from API) ----
  var products = [];
  var orders = [];
  var subscribers = [];
  var revenueData = { labels: [], values: [] };

  // ---- API HELPERS ----
  function apiGet(path) {
    return fetch(API_BASE + path).then(function (res) { return res.json(); });
  }

  function apiPost(path, body) {
    return fetch(API_BASE + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (res) { return res.json(); });
  }

  function apiPut(path, body) {
    return fetch(API_BASE + path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (res) { return res.json(); });
  }

  function apiDelete(path) {
    return fetch(API_BASE + path, {
      method: 'DELETE'
    }).then(function (res) { return res.json(); });
  }

  // ---- DATA LOADERS ----
  function loadProducts() {
    return apiGet('/products').then(function (data) { products = data; });
  }

  function loadOrders() {
    return apiGet('/orders').then(function (data) { orders = data; });
  }

  function loadSubscribers() {
    return apiGet('/subscribers').then(function (data) { subscribers = data; });
  }

  function loadRevenue() {
    return apiGet('/revenue').then(function (data) { revenueData = data; });
  }

  // ---- ID HELPER (works with both SQLite `id` and MongoDB `_id`) ----
  function getId(obj) {
    return obj._id || obj.id;
  }

  // ---- HELPERS ----
  function calcOrderTotal(order) {
    var total = 0;
    for (var i = 0; i < order.items.length; i++) {
      total += order.items[i].qty * order.items[i].price;
    }
    return total;
  }

  function calcTotalRevenue() {
    var total = 0;
    for (var i = 0; i < orders.length; i++) {
      total += calcOrderTotal(orders[i]);
    }
    return total;
  }

  function formatCurrency(val) {
    return '$' + val.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function formatDate(dateStr) {
    var d = new Date(dateStr + 'T00:00:00');
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  }

  function stockBadgeClass(stock) {
    if (stock === 'In Stock') return 'badge-in-stock';
    if (stock === 'Low Stock') return 'badge-low-stock';
    return 'badge-out-of-stock';
  }

  function statusBadgeClass(status) {
    if (status === 'Pending') return 'badge-pending';
    if (status === 'Shipped') return 'badge-shipped';
    return 'badge-delivered';
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // ---- TOAST NOTIFICATIONS ----
  function showToast(message, type) {
    type = type || 'success';
    var container = document.getElementById('toastContainer');
    var toast = document.createElement('div');
    toast.className = 'toast ' + type;

    var icon = '';
    if (type === 'success') {
      icon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
    } else if (type === 'error') {
      icon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
    } else {
      icon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
    }

    toast.innerHTML = icon + '<span>' + escapeHtml(message) + '</span>';
    container.appendChild(toast);

    setTimeout(function () {
      toast.style.animation = 'toastSlideOut 0.3s ease forwards';
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, 3000);
  }

  // ---- NAVIGATION ----
  var navLinks = document.querySelectorAll('.sidebar-nav .nav-link');
  var sections = document.querySelectorAll('.content-section');

  function navigateTo(sectionName) {
    navLinks.forEach(function (link) {
      link.classList.remove('active');
      if (link.getAttribute('data-section') === sectionName) {
        link.classList.add('active');
      }
    });

    sections.forEach(function (section) {
      section.classList.remove('active');
    });
    var target = document.getElementById('section-' + sectionName);
    if (target) target.classList.add('active');

    closeSidebar();

    if (sectionName === 'dashboard') renderDashboard();
    if (sectionName === 'products') renderProducts();
    if (sectionName === 'orders') renderOrders();
    if (sectionName === 'subscribers') renderSubscribers();
  }

  navLinks.forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      var section = this.getAttribute('data-section');
      if (section) navigateTo(section);
    });
  });

  document.querySelectorAll('.card-link[data-section]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      navigateTo(this.getAttribute('data-section'));
    });
  });

  // ---- MOBILE SIDEBAR ----
  var sidebar = document.getElementById('sidebar');
  var sidebarToggle = document.getElementById('sidebarToggle');
  var sidebarOverlay = document.getElementById('sidebarOverlay');

  function openSidebar() {
    sidebar.classList.add('active');
    sidebarOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeSidebar() {
    sidebar.classList.remove('active');
    sidebarOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  sidebarToggle.addEventListener('click', openSidebar);
  sidebarOverlay.addEventListener('click', closeSidebar);

  // ---- DASHBOARD RENDERING ----
  function renderDashboard() {
    document.getElementById('statRevenue').textContent = formatCurrency(calcTotalRevenue());
    document.getElementById('statOrders').textContent = orders.length;
    document.getElementById('statProducts').textContent = products.length;
    document.getElementById('statSubscribers').textContent = subscribers.length;

    renderRevenueChart();

    var sorted = orders.slice().sort(function (a, b) {
      return new Date(b.date) - new Date(a.date);
    });
    var recent = sorted.slice(0, 5);
    var tbody = document.getElementById('recentOrdersBody');
    var html = '';
    for (var i = 0; i < recent.length; i++) {
      var order = recent[i];
      html += '<tr>' +
        '<td><strong>' + escapeHtml(order.orderId) + '</strong></td>' +
        '<td>' + escapeHtml(order.customer) + '</td>' +
        '<td>' + formatCurrency(calcOrderTotal(order)) + '</td>' +
        '<td><span class="badge ' + statusBadgeClass(order.status) + '">' + order.status + '</span></td>' +
        '<td>' + formatDate(order.date) + '</td>' +
        '</tr>';
    }
    tbody.innerHTML = html;
  }

  function renderRevenueChart() {
    var container = document.getElementById('revenueChart');
    var maxVal = 0;
    for (var i = 0; i < revenueData.values.length; i++) {
      if (revenueData.values[i] > maxVal) maxVal = revenueData.values[i];
    }
    if (maxVal === 0) maxVal = 1;

    var html = '';
    for (var i = 0; i < revenueData.labels.length; i++) {
      var val = revenueData.values[i];
      var heightPct = (val / maxVal) * 100;
      html += '<div class="chart-bar-wrap">' +
        '<div class="chart-bar" style="height:' + heightPct + '%">' +
        '<span class="chart-bar-value">' + formatCurrency(val) + '</span>' +
        '</div>' +
        '<span class="chart-label">' + revenueData.labels[i] + '</span>' +
        '</div>';
    }
    container.innerHTML = html;
  }

  // ---- PRODUCTS RENDERING ----
  function renderProducts() {
    var tbody = document.getElementById('productsTableBody');
    var html = '';
    for (var i = 0; i < products.length; i++) {
      var p = products[i];
      var imgCell = p.image
        ? '<td><img class="product-thumb" src="' + escapeHtml(p.image) + '" alt="' + escapeHtml(p.name) + '"></td>'
        : '<td><div class="product-thumb-placeholder"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg></div></td>';
      html += '<tr>' +
        imgCell +
        '<td><strong>' + escapeHtml(p.name) + '</strong></td>' +
        '<td>' + escapeHtml(p.category) + '</td>' +
        '<td>' + formatCurrency(p.price) + '</td>' +
        '<td><span class="badge ' + stockBadgeClass(p.stock) + '">' + p.stock + '</span></td>' +
        '<td><div class="td-actions">' +
        '<button class="btn-icon" data-edit-id="' + getId(p) + '" title="Edit">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>' +
        '</button>' +
        '<button class="btn-icon danger" data-delete-id="' + getId(p) + '" title="Delete">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>' +
        '</button>' +
        '</div></td>' +
        '</tr>';
    }
    tbody.innerHTML = html;

    // Attach edit handlers
    tbody.querySelectorAll('[data-edit-id]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = this.getAttribute('data-edit-id');
        openEditProduct(id);
      });
    });

    // Attach delete handlers
    tbody.querySelectorAll('[data-delete-id]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = this.getAttribute('data-delete-id');
        openDeleteConfirm(id);
      });
    });
  }

  // ---- PRODUCT MODAL ----
  var productModalOverlay = document.getElementById('productModalOverlay');
  var productForm = document.getElementById('productForm');
  var productModalTitle = document.getElementById('productModalTitle');
  var productEditId = document.getElementById('productEditId');
  var productModalClose = document.getElementById('productModalClose');
  var productModalCancel = document.getElementById('productModalCancel');
  var btnAddProduct = document.getElementById('btnAddProduct');

  function openProductModal(title) {
    productModalTitle.textContent = title || 'Add Product';
    productModalOverlay.classList.add('active');
  }

  function closeProductModal() {
    productModalOverlay.classList.remove('active');
    productForm.reset();
    productEditId.value = '';
  }

  btnAddProduct.addEventListener('click', function () {
    productEditId.value = '';
    productForm.reset();
    openProductModal('Add Product');
  });

  productModalClose.addEventListener('click', closeProductModal);
  productModalCancel.addEventListener('click', closeProductModal);

  productModalOverlay.addEventListener('click', function (e) {
    if (e.target === productModalOverlay) closeProductModal();
  });

  function openEditProduct(id) {
    var product = null;
    for (var i = 0; i < products.length; i++) {
      if (String(getId(products[i])) === String(id)) { product = products[i]; break; }
    }
    if (!product) return;

    productEditId.value = id;
    document.getElementById('productName').value = product.name;
    document.getElementById('productCategory').value = product.category;
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productStock').value = product.stock;
    document.getElementById('productImage').value = product.image || '';
    openProductModal('Edit Product');
  }

  productForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = document.getElementById('productName').value.trim();
    var category = document.getElementById('productCategory').value;
    var price = parseFloat(document.getElementById('productPrice').value);
    var stock = document.getElementById('productStock').value;
    var image = document.getElementById('productImage').value.trim();
    var editId = productEditId.value;
    var productData = { name: name, category: category, price: price, stock: stock, image: image };

    if (editId) {
      // Update via API
      apiPut('/products/' + editId, productData)
        .then(function () {
          return loadProducts();
        })
        .then(function () {
          closeProductModal();
          renderProducts();
          document.getElementById('statProducts').textContent = products.length;
          showToast('Product updated successfully');
        });
    } else {
      // Create via API
      apiPost('/products', productData)
        .then(function () {
          return loadProducts();
        })
        .then(function () {
          closeProductModal();
          renderProducts();
          document.getElementById('statProducts').textContent = products.length;
          showToast('Product added successfully');
        });
    }
  });

  // ---- DELETE CONFIRM MODAL ----
  var deleteModalOverlay = document.getElementById('deleteModalOverlay');
  var deleteModalClose = document.getElementById('deleteModalClose');
  var deleteCancelBtn = document.getElementById('deleteCancelBtn');
  var deleteConfirmBtn = document.getElementById('deleteConfirmBtn');
  var deleteProductName = document.getElementById('deleteProductName');
  var pendingDeleteId = null;

  function openDeleteConfirm(id) {
    pendingDeleteId = id;
    var product = null;
    for (var i = 0; i < products.length; i++) {
      if (String(getId(products[i])) === String(id)) { product = products[i]; break; }
    }
    if (!product) return;
    deleteProductName.textContent = product.name;
    deleteModalOverlay.classList.add('active');
  }

  function closeDeleteModal() {
    deleteModalOverlay.classList.remove('active');
    pendingDeleteId = null;
  }

  deleteModalClose.addEventListener('click', closeDeleteModal);
  deleteCancelBtn.addEventListener('click', closeDeleteModal);
  deleteModalOverlay.addEventListener('click', function (e) {
    if (e.target === deleteModalOverlay) closeDeleteModal();
  });

  deleteConfirmBtn.addEventListener('click', function () {
    if (pendingDeleteId === null) return;
    apiDelete('/products/' + pendingDeleteId)
      .then(function () {
        return loadProducts();
      })
      .then(function () {
        closeDeleteModal();
        renderProducts();
        document.getElementById('statProducts').textContent = products.length;
        showToast('Product deleted', 'error');
      });
  });

  // ---- ORDERS RENDERING ----
  function renderOrders() {
    var tbody = document.getElementById('ordersTableBody');
    var html = '';
    var sorted = orders.slice().sort(function (a, b) {
      return new Date(b.date) - new Date(a.date);
    });
    for (var i = 0; i < sorted.length; i++) {
      var o = sorted[i];
      var itemCount = 0;
      for (var j = 0; j < o.items.length; j++) {
        itemCount += o.items[j].qty;
      }

      html += '<tr>' +
        '<td><strong>' + escapeHtml(o.orderId) + '</strong></td>' +
        '<td>' + escapeHtml(o.customer) + '</td>' +
        '<td>' + itemCount + ' item' + (itemCount !== 1 ? 's' : '') + '</td>' +
        '<td>' + formatCurrency(calcOrderTotal(o)) + '</td>' +
        '<td>' +
        '<select class="status-select" data-order-id="' + getId(o) + '">' +
        '<option value="Pending"' + (o.status === 'Pending' ? ' selected' : '') + '>Pending</option>' +
        '<option value="Shipped"' + (o.status === 'Shipped' ? ' selected' : '') + '>Shipped</option>' +
        '<option value="Delivered"' + (o.status === 'Delivered' ? ' selected' : '') + '>Delivered</option>' +
        '</select>' +
        '</td>' +
        '<td>' + formatDate(o.date) + '</td>' +
        '<td>' +
        '<button class="btn-icon" data-view-order="' + getId(o) + '" title="View Details">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>' +
        '</button>' +
        '</td>' +
        '</tr>';
    }
    tbody.innerHTML = html;

    // Status change handlers
    tbody.querySelectorAll('.status-select').forEach(function (sel) {
      sel.addEventListener('change', function () {
        var dbId = this.getAttribute('data-order-id');
        var newStatus = this.value;
        var displayId = '';
        for (var i = 0; i < orders.length; i++) {
          if (String(getId(orders[i])) === dbId) { displayId = orders[i].orderId; break; }
        }
        apiPut('/orders/' + dbId, { status: newStatus })
          .then(function () {
            return loadOrders();
          })
          .then(function () {
            showToast('Order ' + displayId + ' status updated to ' + newStatus, 'info');
            renderDashboard();
          });
      });
    });

    // View detail handlers
    tbody.querySelectorAll('[data-view-order]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var dbId = this.getAttribute('data-view-order');
        openOrderDetail(dbId);
      });
    });
  }

  // ---- ORDER DETAIL MODAL ----
  var orderModalOverlay = document.getElementById('orderModalOverlay');
  var orderModalClose = document.getElementById('orderModalClose');
  var orderModalCloseBtn = document.getElementById('orderModalCloseBtn');
  var orderModalTitle = document.getElementById('orderModalTitle');
  var orderDetailContent = document.getElementById('orderDetailContent');

  function openOrderDetail(dbId) {
    var order = null;
    for (var i = 0; i < orders.length; i++) {
      if (String(getId(orders[i])) === dbId) { order = orders[i]; break; }
    }
    if (!order) return;

    orderModalTitle.textContent = 'Order ' + order.orderId;
    var total = calcOrderTotal(order);

    var html = '<div class="order-detail">' +
      '<div class="order-detail-row"><span>Customer</span><span>' + escapeHtml(order.customer) + '</span></div>' +
      '<div class="order-detail-row"><span>Date</span><span>' + formatDate(order.date) + '</span></div>' +
      '<div class="order-detail-row"><span>Status</span><span><span class="badge ' + statusBadgeClass(order.status) + '">' + order.status + '</span></span></div>' +
      '<div class="order-items-list">' +
      '<h4>Items</h4>';

    for (var i = 0; i < order.items.length; i++) {
      var item = order.items[i];
      html += '<div class="order-item-row">' +
        '<span>' + escapeHtml(item.name) + ' x ' + item.qty + '</span>' +
        '<span>' + formatCurrency(item.qty * item.price) + '</span>' +
        '</div>';
    }

    html += '</div>' +
      '<div class="order-detail-total"><span>Total</span><span>' + formatCurrency(total) + '</span></div>' +
      '</div>';

    orderDetailContent.innerHTML = html;
    orderModalOverlay.classList.add('active');
  }

  function closeOrderModal() {
    orderModalOverlay.classList.remove('active');
  }

  orderModalClose.addEventListener('click', closeOrderModal);
  orderModalCloseBtn.addEventListener('click', closeOrderModal);
  orderModalOverlay.addEventListener('click', function (e) {
    if (e.target === orderModalOverlay) closeOrderModal();
  });

  // ---- SUBSCRIBERS RENDERING ----
  function renderSubscribers() {
    var tbody = document.getElementById('subscribersTableBody');
    var html = '';
    for (var i = 0; i < subscribers.length; i++) {
      var sub = subscribers[i];
      html += '<tr>' +
        '<td>' + (i + 1) + '</td>' +
        '<td>' + escapeHtml(sub.email) + '</td>' +
        '<td>' + formatDate(sub.date) + '</td>' +
        '</tr>';
    }
    tbody.innerHTML = html;
  }

  // ---- KEYBOARD SHORTCUTS ----
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closeProductModal();
      closeDeleteModal();
      closeOrderModal();
    }
  });

  // ---- INITIAL RENDER ----
  function init() {
    // Seed the database (only inserts if empty), then load all data
    apiPost('/seed', {})
      .then(function () {
        return Promise.all([loadProducts(), loadOrders(), loadSubscribers(), loadRevenue()]);
      })
      .then(function () {
        renderDashboard();
        renderProducts();
        renderOrders();
        renderSubscribers();
      })
      .catch(function (err) {
        console.error('Failed to initialize from API:', err);
        showToast('Failed to connect to server. Make sure the backend is running.', 'error');
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
