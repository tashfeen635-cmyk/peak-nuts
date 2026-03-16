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
        '<span class="search-result-price">$' + p.price.toFixed(2) + '</span>' +
        '<button class="search-result-btn" data-product="' + name + '" data-price="' + p.price + '" data-img="' + imgSrc + '"' + btnDisabled + '>' + btnText + '</button>' +
      '</div>';
    }

    searchResults.innerHTML = html;

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
        '<div class="cart-item-price">$' + item.price.toFixed(2) + '</div>' +
        '<button class="cart-item-remove" data-index="' + index + '">Remove</button>' +
        '</div>' +
        '</div>';
    });

    cartBody.innerHTML = html;
    cartTotal.textContent = '$' + total.toFixed(2);
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
      priceHtml = '<span class="price-old">$' + p.oldPrice.toFixed(2) + '</span>';
    }
    priceHtml += '<span class="price-current">$' + p.price.toFixed(2) + '</span>';

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
          priceCurrentEl.textContent = '$' + dbProduct.price.toFixed(2);
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
