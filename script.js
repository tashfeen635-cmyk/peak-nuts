/* ========================================
   BE BOLD BEAUTY STORE - JAVASCRIPT
   Lightweight vanilla JS for performance
   ======================================== */

(function () {
  'use strict';

  // ---- DOM Elements ----
  const header = document.getElementById('siteHeader');
  const mobileToggle = document.getElementById('mobileToggle');
  const mobileMenu = document.getElementById('mobileMenu');
  const searchToggle = document.getElementById('searchToggle');
  const searchOverlay = document.getElementById('searchOverlay');
  const searchClose = document.getElementById('searchClose');
  const cartToggle = document.getElementById('cartToggle');
  const cartDrawer = document.getElementById('cartDrawer');
  const cartOverlay = document.getElementById('cartOverlay');
  const cartClose = document.getElementById('cartClose');
  const cartBody = document.getElementById('cartBody');
  const cartFooter = document.getElementById('cartFooter');
  const cartTotal = document.getElementById('cartTotal');
  const cartCount = document.querySelector('.cart-count');
  const backToTop = document.getElementById('backToTop');
  const newsletterForm = document.getElementById('newsletterForm');

  // ---- Cart State ----
  let cart = [];

  // ---- Header Scroll Effect ----
  function handleScroll() {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }

    // Back to top button
    if (window.scrollY > 500) {
      backToTop.classList.add('visible');
    } else {
      backToTop.classList.remove('visible');
    }
  }

  window.addEventListener('scroll', handleScroll, { passive: true });

  // ---- Mobile Menu ----
  mobileToggle.addEventListener('click', function () {
    this.classList.toggle('active');
    mobileMenu.classList.toggle('active');
  });

  // Close mobile menu on link click
  document.querySelectorAll('.mobile-nav-menu a').forEach(function (link) {
    link.addEventListener('click', function () {
      mobileToggle.classList.remove('active');
      mobileMenu.classList.remove('active');
    });
  });

  // ---- Search Overlay ----
  var searchInput = document.getElementById('searchInput');
  var searchResults = document.getElementById('searchResults');
  var allProducts = []; // cached from API for search
  var searchDebounce = null;

  searchToggle.addEventListener('click', function () {
    searchOverlay.classList.add('active');
    searchInput.value = '';
    searchResults.innerHTML = '<p class="search-results-hint">Start typing to search products...</p>';
    setTimeout(function () { searchInput.focus(); }, 100);
  });

  function closeSearch() {
    searchOverlay.classList.remove('active');
    searchInput.value = '';
    searchResults.innerHTML = '';
  }

  searchClose.addEventListener('click', closeSearch);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closeSearch();
      closeCart();
    }
  });

  // Search input handler
  searchInput.addEventListener('input', function () {
    var query = this.value.trim().toLowerCase();
    clearTimeout(searchDebounce);

    if (!query) {
      searchResults.innerHTML = '<p class="search-results-hint">Start typing to search products...</p>';
      return;
    }

    searchDebounce = setTimeout(function () {
      performSearch(query);
    }, 200);
  });

  function performSearch(query) {
    // If we already cached products, search locally
    if (allProducts.length > 0) {
      renderSearchResults(filterProducts(allProducts, query), query);
      return;
    }
    // Fetch from API once
    fetch(API_BASE + '/products')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        allProducts = data;
        renderSearchResults(filterProducts(data, query), query);
      })
      .catch(function () {
        searchResults.innerHTML = '<p class="search-no-results">Could not load products. Please try again.</p>';
      });
  }

  function filterProducts(products, query) {
    var results = [];
    for (var i = 0; i < products.length; i++) {
      var p = products[i];
      var searchable = (p.name + ' ' + p.category + ' ' + (p.description || '') + ' ' + (p.urduName || '')).toLowerCase();
      if (searchable.indexOf(query) !== -1) {
        results.push(p);
      }
    }
    return results;
  }

  function renderSearchResults(results, query) {
    if (results.length === 0) {
      searchResults.innerHTML =
        '<div class="search-no-results">' +
          '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>' +
          '<p>No products found for "<strong>' + escapeHtml(query) + '</strong>"</p>' +
        '</div>';
      return;
    }

    var html = '';
    for (var i = 0; i < results.length; i++) {
      var p = results[i];
      var name = escapeHtml(p.name);
      var imgSrc = escapeHtml(p.image || '');
      var isOut = p.stock === 'Out of Stock';
      var btnText = isOut ? 'OUT OF STOCK' : 'ADD TO CART';
      var btnDisabled = isOut ? ' disabled' : '';

      html += '<div class="search-result-item" data-search-idx="' + i + '">' +
        '<img class="search-result-img" src="' + imgSrc + '" alt="' + name + '" loading="lazy">' +
        '<div class="search-result-info">' +
          '<div class="search-result-name">' + name + '</div>' +
          '<div class="search-result-meta">' + escapeHtml(p.category) +
            (p.stock !== 'In Stock' ? ' &middot; ' + escapeHtml(p.stock) : '') +
          '</div>' +
        '</div>' +
        '<span class="search-result-price">Rs.' + p.price.toFixed(2) + '</span>' +
        '<button class="search-result-btn" data-product="' + name + '" data-price="' + p.price + '" data-img="' + imgSrc + '"' + btnDisabled + '>' + btnText + '</button>' +
      '</div>';
    }

    searchResults.innerHTML = html;

    // Attach click handler to open product detail modal
    searchResults.querySelectorAll('.search-result-item').forEach(function (item, idx) {
      item.addEventListener('click', function (e) {
        // Don't open modal if clicking the Add to Cart button
        if (e.target.closest('.search-result-btn')) return;
        var product = results[idx];
        if (product) {
          closeSearch();
          openProductModal(product);
        }
      });
    });

    // Attach add-to-cart handlers on search result buttons
    searchResults.querySelectorAll('.search-result-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (this.disabled) return;
        var prodName = this.getAttribute('data-product');
        var prodPrice = parseFloat(this.getAttribute('data-price'));
        var prodImg = this.getAttribute('data-img');

        cart.push({ name: prodName, price: prodPrice, image: prodImg });
        updateCartUI();

        // Button feedback
        var original = this.textContent;
        this.textContent = 'ADDED!';
        this.style.background = '#c48fa2';
        var self = this;
        setTimeout(function () {
          self.textContent = original;
          self.style.background = '';
        }, 1200);
      });
    });
  }

  // ---- Cart Drawer ----
  function openCart() {
    cartDrawer.classList.add('active');
    cartOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeCart() {
    cartDrawer.classList.remove('active');
    cartOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  cartToggle.addEventListener('click', openCart);
  cartClose.addEventListener('click', closeCart);
  cartOverlay.addEventListener('click', closeCart);

  // ---- Add to Cart ----
  function updateCartUI() {
    cartCount.textContent = cart.length;

    if (cart.length === 0) {
      cartBody.innerHTML = '<p class="cart-empty">Your cart is empty.</p>';
      cartFooter.style.display = 'none';
      return;
    }

    var total = 0;
    var html = '';

    cart.forEach(function (item, index) {
      total += item.price;
      html += '<div class="cart-item">' +
        '<div class="cart-item-img">' +
        '<img src="' + item.image + '" alt="' + item.name + '" loading="lazy">' +
        '</div>' +
        '<div class="cart-item-info">' +
        '<div class="cart-item-name">' + item.name + '</div>' +
        '<div class="cart-item-price">Rs.' + item.price.toFixed(2) + '</div>' +
        '<button class="cart-item-remove" data-index="' + index + '">Remove</button>' +
        '</div>' +
        '</div>';
    });

    cartBody.innerHTML = html;
    cartTotal.textContent = 'Rs.' + total.toFixed(2);
    cartFooter.style.display = 'block';

    // Attach remove handlers
    document.querySelectorAll('.cart-item-remove').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(this.getAttribute('data-index'));
        cart.splice(idx, 1);
        updateCartUI();
      });
    });
  }

  // Add to cart buttons for special product sections (static HTML)
  document.querySelectorAll('.special-product .btn-add-cart').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var name = this.getAttribute('data-product');
      var price = parseFloat(this.getAttribute('data-price'));

      // Find the product image
      var section = this.closest('.special-product');
      var img = section ? section.querySelector('.special-img-wrapper img') : null;
      var imageSrc = img ? img.getAttribute('src') : '';

      cart.push({
        name: name,
        price: price,
        image: imageSrc
      });

      updateCartUI();
      openCart();

      // Button feedback
      var original = this.textContent;
      this.textContent = 'ADDED!';
      this.style.background = '#c48fa2';
      var self = this;
      setTimeout(function () {
        self.textContent = original;
        self.style.background = '';
      }, 1200);
    });
  });

  // ---- Back to Top ----
  backToTop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // ---- Newsletter Form ----
  newsletterForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var input = this.querySelector('input');
    var btn = this.querySelector('button');
    var originalText = btn.textContent;

    btn.textContent = 'SUBSCRIBED!';
    btn.style.background = '#c48fa2';
    btn.style.borderColor = '#c48fa2';
    input.value = '';

    setTimeout(function () {
      btn.textContent = originalText;
      btn.style.background = '';
      btn.style.borderColor = '';
    }, 2500);
  });

  // ---- Scroll Animations ----
  function initScrollAnimations() {
    var animatedElements = document.querySelectorAll(
      '.section-header, .product-card, .category-card, .testimonial-card, ' +
      '.feature-item, .about-content, .banner-cta-content, ' +
      '.newsletter-inner'
    );

    animatedElements.forEach(function (el) {
      el.classList.add('fade-in');
    });

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.15,
      rootMargin: '0px 0px -50px 0px'
    });

    animatedElements.forEach(function (el) {
      observer.observe(el);
    });
  }

  // ---- Smooth Scroll for Navigation ----
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var targetId = this.getAttribute('href');
      if (targetId === '#') return;

      var target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        var offset = header.offsetHeight + 20;
        var top = target.getBoundingClientRect().top + window.pageYOffset - offset;
        window.scrollTo({ top: top, behavior: 'smooth' });
      }
    });
  });

  // ---- API Base ----
  var API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : '/api';

  // ---- Helpers ----
  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function buildStars(rating) {
    var r = parseInt(rating) || 5;
    var html = '';
    for (var i = 0; i < 5; i++) {
      html += i < r ? '&#9733;' : '&#9734;';
    }
    return html;
  }

  function buildProductCardHTML(p) {
    var id = p._id || p.id;
    var imgSrc = escapeHtml(p.image || '');
    var name = escapeHtml(p.name);
    var isOutOfStock = p.stock === 'Out of Stock';

    // Badge
    var badgeHtml = '';
    if (p.badge) {
      var badgeClass = p.badge.toLowerCase();
      badgeHtml = '<span class="product-badge ' + badgeClass + '">' + escapeHtml(p.badge) + '</span>';
    }

    // Button
    var btnHtml = '';
    if (isOutOfStock) {
      btnHtml = '<button class="btn-add-cart" data-product="' + name + '" data-price="' + p.price + '" disabled style="opacity:0.5;cursor:not-allowed">OUT OF STOCK</button>';
    } else {
      btnHtml = '<button class="btn-add-cart" data-product="' + name + '" data-price="' + p.price + '">ADD TO CART</button>';
    }

    // Urdu name
    var urduHtml = '';
    if (p.urduName) {
      urduHtml = '<span class="product-name-urdu">' + escapeHtml(p.urduName) + '</span>';
    }

    // Description
    var descHtml = '';
    if (p.description) {
      descHtml = '<p class="product-desc">' + escapeHtml(p.description) + '</p>';
    }

    // Price
    var priceHtml = '';
    if (p.oldPrice && p.oldPrice > 0) {
      priceHtml = '<span class="price-old">Rs.' + p.oldPrice.toFixed(2) + '</span>';
    }
    priceHtml += '<span class="price-current">Rs.' + p.price.toFixed(2) + '</span>';

    return '<div class="product-card">' +
      '<div class="product-img">' +
        '<img src="' + imgSrc + '" alt="' + name + '" loading="lazy">' +
        '<div class="product-actions">' + btnHtml + '</div>' +
        badgeHtml +
      '</div>' +
      '<div class="product-info">' +
        '<h3 class="product-name">' + name + '</h3>' +
        urduHtml +
        descHtml +
        '<div class="product-rating"><span class="stars">' + buildStars(p.rating) + '</span></div>' +
        '<div class="product-price">' + priceHtml + '</div>' +
      '</div>' +
    '</div>';
  }

  // ---- Attach cart handlers to dynamically created buttons ----
  function attachCartHandlers(container) {
    container.querySelectorAll('.btn-add-cart').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (this.disabled) return;
        var name = this.getAttribute('data-product');
        var price = parseFloat(this.getAttribute('data-price'));

        var card = this.closest('.product-card');
        var img = card ? card.querySelector('.product-img img') : null;
        var imageSrc = img ? img.getAttribute('src') : '';

        cart.push({ name: name, price: price, image: imageSrc });
        updateCartUI();
        openCart();

        var original = this.textContent;
        this.textContent = 'ADDED!';
        this.style.background = '#c48fa2';
        var self = this;
        setTimeout(function () {
          self.textContent = original;
          self.style.background = '';
        }, 1200);
      });
    });
  }

  // ---- Sync special product sections (Shilajit, Tumoro hero sections) ----
  function syncSpecialProducts(productMap) {
    document.querySelectorAll('.special-product').forEach(function (section) {
      var btn = section.querySelector('.btn-add-cart');
      if (!btn) return;
      var productName = btn.getAttribute('data-product');
      var dbProduct = productMap[productName];

      if (!dbProduct) {
        section.style.display = 'none';
      } else {
        section.style.display = '';
        btn.setAttribute('data-price', dbProduct.price);
        var priceCurrentEl = section.querySelector('.special-price-current');
        if (priceCurrentEl) {
          priceCurrentEl.textContent = 'Rs.' + dbProduct.price.toFixed(2);
        }
        if (dbProduct.image) {
          var imgEl = section.querySelector('.special-img-wrapper img');
          if (imgEl) {
            imgEl.src = dbProduct.image;
          }
        }
      }
    });
  }

  // ---- Render section products from DB ----
  function renderSectionProducts() {
    fetch(API_BASE + '/products')
      .then(function (res) { return res.json(); })
      .then(function (dbProducts) {
        // Cache for search
        allProducts = dbProducts;

        // Group products by section
        var sections = { popular: [], trending: [], bestselling: [] };
        var productMap = {};
        dbProducts.forEach(function (p) {
          productMap[p.name] = p;
          if (p.section && sections[p.section]) {
            sections[p.section].push(p);
          }
        });

        // Render each section grid
        var gridMap = {
          popular: document.getElementById('popularGrid'),
          trending: document.getElementById('trendingGrid'),
          bestselling: document.getElementById('bestsellingGrid')
        };

        for (var key in gridMap) {
          var grid = gridMap[key];
          if (!grid) continue;
          var items = sections[key];
          var parentSection = grid.closest('.products-section');

          if (items.length === 0) {
            grid.innerHTML = '';
            if (parentSection) parentSection.style.display = 'none';
          } else {
            if (parentSection) parentSection.style.display = '';
            var html = '';
            for (var i = 0; i < items.length; i++) {
              html += buildProductCardHTML(items[i]);
            }
            grid.innerHTML = html;
            attachCartHandlers(grid);
            attachProductClickHandlers(grid);
          }
        }

        // Sync special product hero sections
        syncSpecialProducts(productMap);

        // Re-run scroll animations for new cards
        initScrollAnimations();
      })
      .catch(function (err) {
        console.warn('Could not load products from database:', err);
      });
  }

  // ---- Inline Search Bar ----
  var inlineSearchInput = document.getElementById('inlineSearchInput');
  var inlineSearchResults = document.getElementById('inlineSearchResults');
  var inlineDebounce = null;

  if (inlineSearchInput) {
    inlineSearchInput.addEventListener('input', function () {
      var query = this.value.trim().toLowerCase();
      clearTimeout(inlineDebounce);

      if (!query) {
        inlineSearchResults.innerHTML = '';
        inlineSearchResults.classList.remove('has-results');
        return;
      }

      inlineDebounce = setTimeout(function () {
        // Reuse cached products or fetch
        if (allProducts.length > 0) {
          renderInlineResults(filterProducts(allProducts, query), query);
        } else {
          fetch(API_BASE + '/products')
            .then(function (res) { return res.json(); })
            .then(function (data) {
              allProducts = data;
              renderInlineResults(filterProducts(data, query), query);
            });
        }
      }, 200);
    });

    // Close results when clicking outside
    document.addEventListener('click', function (e) {
      if (!e.target.closest('#inlineSearch')) {
        inlineSearchResults.innerHTML = '';
        inlineSearchResults.classList.remove('has-results');
      }
    });
  }

  function renderInlineResults(results, query) {
    if (results.length === 0) {
      inlineSearchResults.innerHTML =
        '<div class="search-no-results">' +
          '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>' +
          '<p>No products found for "<strong>' + escapeHtml(query) + '</strong>"</p>' +
        '</div>';
      inlineSearchResults.classList.add('has-results');
      return;
    }

    var html = '';
    for (var i = 0; i < results.length; i++) {
      var p = results[i];
      var name = escapeHtml(p.name);
      var imgSrc = escapeHtml(p.image || '');
      var isOut = p.stock === 'Out of Stock';
      var btnText = isOut ? 'OUT OF STOCK' : 'ADD TO CART';
      var btnDisabled = isOut ? ' disabled' : '';

      html += '<div class="search-result-item">' +
        '<img class="search-result-img" src="' + imgSrc + '" alt="' + name + '" loading="lazy">' +
        '<div class="search-result-info">' +
          '<div class="search-result-name">' + name + '</div>' +
          '<div class="search-result-meta">' + escapeHtml(p.category) +
            (p.stock !== 'In Stock' ? ' &middot; ' + escapeHtml(p.stock) : '') +
          '</div>' +
        '</div>' +
        '<span class="search-result-price">Rs.' + p.price.toFixed(2) + '</span>' +
        '<button class="search-result-btn" data-product="' + name + '" data-price="' + p.price + '" data-img="' + imgSrc + '"' + btnDisabled + '>' + btnText + '</button>' +
      '</div>';
    }

    inlineSearchResults.innerHTML = html;
    inlineSearchResults.classList.add('has-results');

    // Attach click handler to open product detail modal
    inlineSearchResults.querySelectorAll('.search-result-item').forEach(function (item, idx) {
      item.addEventListener('click', function (e) {
        if (e.target.closest('.search-result-btn')) return;
        var product = results[idx];
        if (product) {
          inlineSearchResults.innerHTML = '';
          inlineSearchResults.classList.remove('has-results');
          inlineSearchInput.value = '';
          openProductModal(product);
        }
      });
    });

    // Attach add-to-cart
    inlineSearchResults.querySelectorAll('.search-result-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (this.disabled) return;
        cart.push({
          name: this.getAttribute('data-product'),
          price: parseFloat(this.getAttribute('data-price')),
          image: this.getAttribute('data-img')
        });
        updateCartUI();

        var original = this.textContent;
        this.textContent = 'ADDED!';
        this.style.background = '#c48fa2';
        var self = this;
        setTimeout(function () {
          self.textContent = original;
          self.style.background = '';
        }, 1200);
      });
    });
  }

  // ---- Product Detail Modal ----
  var productModal = document.getElementById('productModal');
  var productModalOverlay = document.getElementById('productModalOverlay');
  var productModalClose = document.getElementById('productModalClose');
  var modalCloseBtn = document.getElementById('modalCloseBtn');

  function openProductModal(product) {
    // Populate modal with product data
    document.getElementById('modalProductImg').src = product.image || '';
    document.getElementById('modalProductImg').alt = product.name || '';
    document.getElementById('modalProductName').textContent = product.name || '';
    document.getElementById('modalProductCategory').textContent = (product.category || 'PRODUCT').toUpperCase();
    document.getElementById('modalProductDesc').textContent = product.description || 'Premium quality organic product, handpicked and packed fresh for your family.';

    // Urdu name
    var urduEl = document.getElementById('modalProductUrdu');
    urduEl.textContent = product.urduName || '';

    // Badge
    var badgeEl = document.getElementById('modalProductBadge');
    if (product.badge) {
      badgeEl.textContent = product.badge;
      badgeEl.style.display = '';
    } else {
      badgeEl.textContent = '';
      badgeEl.style.display = 'none';
    }

    // Price
    var oldPriceEl = document.getElementById('modalProductOldPrice');
    if (product.oldPrice && product.oldPrice > 0) {
      oldPriceEl.textContent = 'Rs.' + product.oldPrice.toFixed(2);
      oldPriceEl.style.display = '';
    } else {
      oldPriceEl.textContent = '';
      oldPriceEl.style.display = 'none';
    }
    document.getElementById('modalProductPrice').textContent = 'Rs.' + product.price.toFixed(2);

    // Stars
    document.getElementById('modalProductStars').innerHTML = buildStars(product.rating);

    // Stock
    var stockEl = document.getElementById('modalProductStock');
    stockEl.textContent = product.stock === 'In Stock' ? '(' + product.stock + ')' : '(' + (product.stock || 'In Stock') + ')';

    // Benefits - generate from description or use defaults
    var benefitsEl = document.getElementById('modalProductBenefits');
    var benefits = getBenefitsForProduct(product);
    var benefitsHtml = '';
    for (var i = 0; i < benefits.length; i++) {
      benefitsHtml += '<div class="benefit-item">' +
        '<div class="benefit-icon">' +
          '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>' +
        '</div>' +
        '<div class="benefit-text">' +
          '<strong>' + escapeHtml(benefits[i].title) + '</strong>' +
          '<span>' + escapeHtml(benefits[i].text) + '</span>' +
        '</div>' +
      '</div>';
    }
    benefitsEl.innerHTML = benefitsHtml;

    // Add to cart button
    var addBtn = document.getElementById('modalAddToCart');
    addBtn.setAttribute('data-product', product.name);
    addBtn.setAttribute('data-price', product.price);
    addBtn.disabled = product.stock === 'Out of Stock';
    addBtn.textContent = product.stock === 'Out of Stock' ? 'OUT OF STOCK' : 'ADD TO CART';
    if (product.stock === 'Out of Stock') {
      addBtn.style.opacity = '0.5';
      addBtn.style.cursor = 'not-allowed';
    } else {
      addBtn.style.opacity = '';
      addBtn.style.cursor = '';
    }

    // Store image for cart
    addBtn.setAttribute('data-img', product.image || '');

    // Show modal
    productModal.classList.add('active');
    productModalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeProductModal() {
    productModal.classList.remove('active');
    productModalOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  function getBenefitsForProduct(product) {
    var cat = (product.category || '').toLowerCase();
    var name = (product.name || '').toLowerCase();

    if (name.indexOf('shilajit') !== -1) {
      return [
        { title: 'Rich in Fulvic Acid', text: 'Natural minerals & humic substances' },
        { title: 'Boosts Energy', text: 'Natural adaptogen for vitality' },
        { title: 'Cognitive Health', text: 'Supports brain function & focus' },
        { title: 'Athletic Performance', text: 'Enhances stamina & recovery' }
      ];
    }
    if (name.indexOf('tumoro') !== -1 || name.indexOf('thyme') !== -1) {
      return [
        { title: 'Rich in Antioxidants', text: 'Natural protection & immunity boost' },
        { title: 'Respiratory Relief', text: 'Soothes cold, flu & cough symptoms' },
        { title: 'Aids Digestion', text: 'Improves gut health naturally' },
        { title: '100% Caffeine Free', text: 'Enjoy any time of day' }
      ];
    }
    if (cat.indexOf('tea') !== -1 || cat.indexOf('herb') !== -1) {
      return [
        { title: 'Natural Ingredients', text: 'Pure herbal goodness' },
        { title: 'Health Benefits', text: 'Supports overall wellness' },
        { title: 'Caffeine Free', text: 'Perfect for any time of day' },
        { title: 'Handpicked Quality', text: 'Sourced from organic farms' }
      ];
    }
    if (cat.indexOf('nut') !== -1 || cat.indexOf('seed') !== -1 || cat.indexOf('dried') !== -1) {
      return [
        { title: 'Rich in Nutrients', text: 'Packed with vitamins & minerals' },
        { title: 'Heart Healthy', text: 'Good fats for cardiovascular health' },
        { title: 'High in Protein', text: 'Natural energy & muscle support' },
        { title: '100% Organic', text: 'No preservatives or additives' }
      ];
    }
    // Default benefits
    return [
      { title: 'Premium Quality', text: 'Handpicked from the best sources' },
      { title: '100% Organic', text: 'No chemicals or preservatives' },
      { title: 'Farm Fresh', text: 'Directly sourced from organic farms' },
      { title: 'Packed With Care', text: 'Sealed fresh for your family' }
    ];
  }

  productModalClose.addEventListener('click', closeProductModal);
  productModalOverlay.addEventListener('click', closeProductModal);
  modalCloseBtn.addEventListener('click', closeProductModal);

  // Close on Escape (extend existing handler)
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && productModal.classList.contains('active')) {
      closeProductModal();
    }
  });

  // Modal add to cart handler
  document.getElementById('modalAddToCart').addEventListener('click', function () {
    if (this.disabled) return;
    var name = this.getAttribute('data-product');
    var price = parseFloat(this.getAttribute('data-price'));
    var img = this.getAttribute('data-img');

    cart.push({ name: name, price: price, image: img });
    updateCartUI();

    var original = this.textContent;
    this.textContent = 'ADDED!';
    this.style.background = '#c48fa2';
    var self = this;
    setTimeout(function () {
      self.textContent = original;
      self.style.background = '';
    }, 1200);
  });

  // Attach product card click handlers
  function attachProductClickHandlers(container) {
    container.querySelectorAll('.product-card').forEach(function (card) {
      card.addEventListener('click', function (e) {
        // Don't open modal if clicking the Add to Cart button
        if (e.target.closest('.btn-add-cart')) return;

        var productName = '';
        var nameEl = card.querySelector('.product-name');
        if (nameEl) productName = nameEl.textContent.trim();

        // Find product in cached data
        var product = null;
        for (var i = 0; i < allProducts.length; i++) {
          if (allProducts[i].name === productName) {
            product = allProducts[i];
            break;
          }
        }

        if (product) {
          openProductModal(product);
        }
      });
    });
  }

  // ---- Initialize ----
  document.addEventListener('DOMContentLoaded', function () {
    initScrollAnimations();
    handleScroll();
    renderSectionProducts();
  });

  // If DOM is already loaded
  if (document.readyState !== 'loading') {
    initScrollAnimations();
    handleScroll();
    renderSectionProducts();
  }

})();
