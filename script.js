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
  const cartSubtotal = document.getElementById('cartSubtotal');
  const cartShipping = document.getElementById('cartShipping');
  const cartTotal = document.getElementById('cartTotal');
  const cartCount = document.querySelector('.cart-count');
  const backToTop = document.getElementById('backToTop');
  const newsletterForm = document.getElementById('newsletterForm');

  // ---- Cart State (persisted in localStorage) ----
  let cart = [];
  try {
    var saved = localStorage.getItem('peaknuts_cart');
    if (saved) {
      cart = JSON.parse(saved);
      // Migration: ensure every item has a qty field
      for (var i = 0; i < cart.length; i++) {
        if (!cart[i].qty) cart[i].qty = 1;
      }
    }
  } catch (e) {}

  function saveCart() {
    try { localStorage.setItem('peaknuts_cart', JSON.stringify(cart)); } catch (e) {}
  }

  // Shared add-to-cart: deduplicates by name, increments qty
  function addToCart(name, price, image) {
    for (var i = 0; i < cart.length; i++) {
      if (cart[i].name === name) {
        cart[i].qty++;
        updateCartUI();
        return;
      }
    }
    cart.push({ name: name, price: price, image: image, qty: 1 });
    updateCartUI();
  }

  // ---- Header Scroll Effect ----
  function handleScroll() {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }

    // Back to top button
    if (backToTop) {
      if (window.scrollY > 500) {
        backToTop.classList.add('visible');
      } else {
        backToTop.classList.remove('visible');
      }
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
        addToCart(this.getAttribute('data-product'), parseFloat(this.getAttribute('data-price')), this.getAttribute('data-img'));

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
    saveCart();

    // Cart count = sum of all quantities
    var totalQty = 0;
    for (var q = 0; q < cart.length; q++) totalQty += cart[q].qty;
    cartCount.textContent = totalQty;

    if (cart.length === 0) {
      cartBody.innerHTML = '<p class="cart-empty">Your cart is empty.</p>';
      cartFooter.style.display = 'none';
      return;
    }

    var total = 0;
    var html = '';

    cart.forEach(function (item, index) {
      var lineTotal = item.price * item.qty;
      total += lineTotal;
      html += '<div class="cart-item">' +
        '<div class="cart-item-img">' +
        '<img src="' + escapeHtml(item.image) + '" alt="' + escapeHtml(item.name) + '" loading="lazy">' +
        '</div>' +
        '<div class="cart-item-info">' +
        '<div class="cart-item-name">' + escapeHtml(item.name) + '</div>' +
        '<div class="cart-item-qty">' +
          '<button data-action="dec" data-index="' + index + '">&#8722;</button>' +
          '<span>' + item.qty + '</span>' +
          '<button data-action="inc" data-index="' + index + '">&#43;</button>' +
        '</div>' +
        '<div class="cart-item-price">Rs.' + lineTotal.toFixed(2) + '</div>' +
        '<button class="cart-item-remove" data-index="' + index + '">Remove</button>' +
        '</div>' +
        '</div>';
    });

    cartBody.innerHTML = html;
    var shipping = total >= 5933 ? 0 : 5;
    cartSubtotal.textContent = 'Rs.' + total.toFixed(2);
    cartShipping.textContent = shipping === 0 ? 'FREE' : 'Rs.' + shipping.toFixed(2);
    cartTotal.textContent = 'Rs.' + (total + shipping).toFixed(2);
    cartFooter.style.display = 'block';

    // Attach qty +/- handlers
    cartBody.querySelectorAll('.cart-item-qty button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(this.getAttribute('data-index'));
        var action = this.getAttribute('data-action');
        if (action === 'inc') {
          cart[idx].qty++;
        } else {
          cart[idx].qty--;
          if (cart[idx].qty <= 0) cart.splice(idx, 1);
        }
        updateCartUI();
      });
    });

    // Attach remove handlers
    cartBody.querySelectorAll('.cart-item-remove').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(this.getAttribute('data-index'));
        cart.splice(idx, 1);
        updateCartUI();
      });
    });
  }

  // ---- Wishlist heart handlers ----
  function attachWishlistHandlers(container) {
    container.querySelectorAll('.wishlist-heart').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var productId = this.getAttribute('data-product-id');
        var token = localStorage.getItem('peaknuts_user_token');
        if (!token) {
          window.location.href = 'account.html';
          return;
        }
        var self = this;
        var svg = self.querySelector('svg');
        var isFilled = svg.getAttribute('fill') !== 'none';
        if (isFilled) {
          // Remove from wishlist
          fetch(API_BASE + '/user/wishlist/' + productId, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
          }).then(function () {
            svg.setAttribute('fill', 'none');
            svg.setAttribute('stroke', 'currentColor');
          });
        } else {
          // Add to wishlist
          fetch(API_BASE + '/user/wishlist', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId: productId })
          }).then(function (res) {
            if (res.ok || res.status === 409) {
              svg.setAttribute('fill', '#e04f3a');
              svg.setAttribute('stroke', '#e04f3a');
            }
          });
        }
      });
    });
  }

  // Load user's wishlist to mark hearts
  function loadUserWishlist() {
    var token = localStorage.getItem('peaknuts_user_token');
    if (!token) return;
    fetch(API_BASE + '/user/wishlist', {
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
    })
      .then(function (res) { return res.ok ? res.json() : []; })
      .then(function (items) {
        var wishlistIds = {};
        for (var i = 0; i < items.length; i++) {
          wishlistIds[items[i].productId] = true;
        }
        document.querySelectorAll('.wishlist-heart').forEach(function (btn) {
          var pid = btn.getAttribute('data-product-id');
          if (wishlistIds[pid]) {
            var svg = btn.querySelector('svg');
            svg.setAttribute('fill', '#e04f3a');
            svg.setAttribute('stroke', '#e04f3a');
          }
        });
      })
      .catch(function () {});
  }

  // Add to cart buttons for special product sections (static HTML)
  document.querySelectorAll('.special-product .btn-add-cart').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var name = this.getAttribute('data-product');
      var price = parseFloat(this.getAttribute('data-price'));
      var section = this.closest('.special-product');
      var img = section ? section.querySelector('.special-img-wrapper img') : null;
      var imageSrc = img ? img.getAttribute('src') : '';

      addToCart(name, price, imageSrc);
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
  if (backToTop) {
    backToTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ---- Newsletter Form ----
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = this.querySelector('input');
      var btn = this.querySelector('button');
      var originalText = btn.textContent;
      var email = input.value.trim();

      if (!email) return;

      btn.textContent = 'SENDING...';
      btn.disabled = true;

      fetch(API_BASE + '/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email })
      })
        .then(function (res) { return res.json().then(function (data) { return { status: res.status, data: data }; }); })
        .then(function (result) {
          if (result.status === 201) {
            console.log('Subscribe response:', result.data);
            btn.textContent = 'SUBSCRIBED!';
            btn.style.background = '#c48fa2';
            btn.style.borderColor = '#c48fa2';
            input.value = '';
          } else if (result.status === 409) {
            btn.textContent = 'ALREADY SUBSCRIBED';
            btn.style.background = '#e04f3a';
            btn.style.borderColor = '#e04f3a';
          } else {
            btn.textContent = 'FAILED, TRY AGAIN';
            btn.style.background = '#e04f3a';
            btn.style.borderColor = '#e04f3a';
          }
          btn.disabled = false;
          setTimeout(function () {
            btn.textContent = originalText;
            btn.style.background = '';
            btn.style.borderColor = '';
          }, 2500);
        })
        .catch(function () {
          btn.textContent = 'FAILED, TRY AGAIN';
          btn.style.background = '#e04f3a';
          btn.style.borderColor = '#e04f3a';
          btn.disabled = false;
          setTimeout(function () {
            btn.textContent = originalText;
            btn.style.background = '';
            btn.style.borderColor = '';
          }, 2500);
        });
    });
  }

  // ---- Contact Form ----
  var contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = this.querySelector('button[type="submit"]');
      var originalText = btn.textContent;
      btn.textContent = 'SENT!';
      btn.style.background = '#c48fa2';
      btn.style.borderColor = '#c48fa2';
      btn.disabled = true;
      contactForm.reset();
      setTimeout(function () {
        btn.textContent = originalText;
        btn.style.background = '';
        btn.style.borderColor = '';
        btn.disabled = false;
      }, 2500);
    });
  }

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
    var r = Math.round(parseFloat(rating)) || 5;
    if (r < 1) r = 1;
    if (r > 5) r = 5;
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

    // Wishlist heart
    var heartHtml = '<button class="wishlist-heart" data-product-id="' + id + '" title="Add to Wishlist" style="position:absolute;top:10px;right:10px;background:rgba(255,255,255,0.9);border:none;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:2;transition:all 0.2s;">' +
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>' +
      '</button>';

    return '<div class="product-card">' +
      '<div class="product-img" style="position:relative;">' +
        '<img src="' + imgSrc + '" alt="' + name + '" loading="lazy">' +
        '<div class="product-actions">' + btnHtml + '</div>' +
        badgeHtml +
        heartHtml +
      '</div>' +
      '<div class="product-info">' +
        '<h3 class="product-name">' + name + '</h3>' +
        urduHtml +
        descHtml +
        '<div class="product-rating"><span class="stars">' + buildStars(p.reviewAvg != null ? p.reviewAvg : p.rating) + '</span>' + (p.reviewCount > 0 ? '<span class="review-count">(' + p.reviewCount + ')</span>' : '') + '</div>' +
        '<div class="product-price">' + priceHtml + '</div>' +
      '</div>' +
    '</div>';
  }

  // ---- Attach cart handlers to dynamically created buttons ----
  function attachCartHandlers(container) {
    container.querySelectorAll('.btn-add-cart').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (this.disabled) return;
        var card = this.closest('.product-card');
        var img = card ? card.querySelector('.product-img img') : null;
        var imageSrc = img ? img.getAttribute('src') : '';

        addToCart(this.getAttribute('data-product'), parseFloat(this.getAttribute('data-price')), imageSrc);
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

        // Update special product review counts from real data
        var shilajit = productMap['Pure Himalayan Shilajit'];
        var tumoro = productMap['Tumoro Wild Thyme Tea'];
        var shilajitCountEl = document.getElementById('shilajit-review-count');
        var tumoroCountEl = document.getElementById('tumoro-review-count');
        if (shilajitCountEl) {
          shilajitCountEl.textContent = shilajit && shilajit.reviewCount > 0 ? '(' + shilajit.reviewCount + ' Reviews)' : '(0 Reviews)';
        }
        if (tumoroCountEl) {
          tumoroCountEl.textContent = tumoro && tumoro.reviewCount > 0 ? '(' + tumoro.reviewCount + ' Reviews)' : '(0 Reviews)';
        }

        // Attach wishlist handlers and load state
        document.querySelectorAll('.products-grid').forEach(function (grid) {
          attachWishlistHandlers(grid);
        });
        loadUserWishlist();

        // Apply filters if on shop page
        if (filterCount) {
          filterCount.textContent = dbProducts.length + ' product' + (dbProducts.length !== 1 ? 's' : '');
        }

        // On shop page, switch to paginated flat grid immediately
        if (isShopPage) {
          shopFilteredProducts = dbProducts.slice();
          shopCurrentPage = 1;
          renderShopPaginated();
          return;
        }

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
        addToCart(this.getAttribute('data-product'), parseFloat(this.getAttribute('data-price')), this.getAttribute('data-img'));

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
    document.getElementById('modalProductStars').innerHTML = buildStars(product.reviewAvg != null ? product.reviewAvg : product.rating);

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

    // Load and show reviews
    var productId = product._id || product.id;
    loadProductReviews(productId);

    // Show modal
    productModal.classList.add('active');
    productModalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  // ---- PRODUCT REVIEWS ----
  function loadProductReviews(productId) {
    // Ensure reviews container exists in modal
    var modalContent = document.querySelector('.product-modal-content');
    var existingReviews = document.getElementById('modalReviewsSection');
    if (existingReviews) existingReviews.remove();

    var reviewsDiv = document.createElement('div');
    reviewsDiv.id = 'modalReviewsSection';
    reviewsDiv.style.cssText = 'margin-top:24px;border-top:1px solid #eee;padding-top:20px;';
    reviewsDiv.innerHTML = '<p style="color:#999;font-size:13px;">Loading reviews...</p>';
    modalContent.appendChild(reviewsDiv);

    var token = localStorage.getItem('peaknuts_user_token');
    var headers = {};
    if (token) headers['Authorization'] = 'Bearer ' + token;
    fetch(API_BASE + '/reviews/' + productId, { headers: headers })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        renderReviews(reviewsDiv, data, productId);
      })
      .catch(function () {
        reviewsDiv.innerHTML = '';
      });
  }

  function renderReviews(container, data, productId) {
    var reviews = data.reviews || [];
    var avgRating = data.avgRating;
    var count = data.count || 0;
    var token = localStorage.getItem('peaknuts_user_token');

    var userReview = data.userReview || null;

    var html = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">' +
      '<h3 style="font-family:Georgia,serif;font-size:18px;margin:0;">Reviews' + (count > 0 ? ' (' + count + ')' : '') + '</h3>' +
      (avgRating ? '<span style="font-size:14px;color:#8B9A46;font-weight:600;">' + avgRating + ' / 5 avg</span>' : '') +
      '</div>';

    // Review form (only for logged-in users)
    if (token) {
      html += '<div style="background:#f9f8f5;padding:16px;border-radius:8px;margin-bottom:16px;">' +
        '<div style="margin-bottom:8px;font-size:13px;font-weight:600;">' + (userReview ? 'Update Your Review' : 'Write a Review') + '</div>' +
        '<div id="reviewStars" style="margin-bottom:8px;">';
      for (var s = 1; s <= 5; s++) {
        var starColor = userReview && s <= userReview.rating ? '#8B9A46' : '#ddd';
        html += '<span class="review-star" data-star="' + s + '" style="cursor:pointer;font-size:22px;color:' + starColor + ';transition:color 0.2s;">&#9733;</span>';
      }
      html += '</div>' +
        '<textarea id="reviewComment" placeholder="Share your experience..." style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;font-size:13px;resize:vertical;min-height:60px;box-sizing:border-box;font-family:inherit;">' + (userReview ? escapeHtml(userReview.comment) : '') + '</textarea>' +
        '<div style="display:flex;align-items:center;gap:12px;margin-top:8px;">' +
        '<button id="submitReviewBtn" style="background:#1a1a1a;color:#fff;border:none;padding:10px 24px;border-radius:4px;font-size:12px;font-weight:600;letter-spacing:1px;cursor:pointer;">' + (userReview ? 'UPDATE REVIEW' : 'SUBMIT REVIEW') + '</button>' +
        '<span id="reviewFeedback" style="font-size:12px;display:none;"></span>' +
        '</div>' +
        '</div>';
    }

    // Existing reviews
    if (reviews.length === 0) {
      html += '<p style="color:#999;font-size:13px;text-align:center;padding:16px 0;">No reviews yet. Be the first to review!</p>';
    } else {
      for (var i = 0; i < reviews.length; i++) {
        var r = reviews[i];
        var stars = '';
        for (var j = 0; j < 5; j++) {
          stars += j < r.rating ? '<span style="color:#8B9A46;">&#9733;</span>' : '<span style="color:#ddd;">&#9734;</span>';
        }
        var date = r.createdAt ? r.createdAt.slice(0, 10) : '';
        html += '<div style="padding:12px 0;border-bottom:1px solid #f0f0f0;">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">' +
            '<span style="font-weight:600;font-size:13px;">' + escapeHtml(r.userName) + '</span>' +
            '<span style="font-size:12px;color:#999;">' + date + '</span>' +
          '</div>' +
          '<div style="margin-bottom:4px;">' + stars + '</div>' +
          (r.comment ? '<p style="font-size:13px;color:#555;margin:0;line-height:1.6;">' + escapeHtml(r.comment) + '</p>' : '') +
          '</div>';
      }
    }

    container.innerHTML = html;

    // Star rating interaction
    var selectedRating = userReview ? userReview.rating : 0;
    var starEls = container.querySelectorAll('.review-star');
    starEls.forEach(function (star) {
      star.addEventListener('mouseenter', function () {
        var val = parseInt(this.getAttribute('data-star'));
        starEls.forEach(function (s) {
          s.style.color = parseInt(s.getAttribute('data-star')) <= val ? '#8B9A46' : '#ddd';
        });
      });
      star.addEventListener('mouseleave', function () {
        starEls.forEach(function (s) {
          s.style.color = parseInt(s.getAttribute('data-star')) <= selectedRating ? '#8B9A46' : '#ddd';
        });
      });
      star.addEventListener('click', function () {
        selectedRating = parseInt(this.getAttribute('data-star'));
        starEls.forEach(function (s) {
          s.style.color = parseInt(s.getAttribute('data-star')) <= selectedRating ? '#8B9A46' : '#ddd';
        });
      });
    });

    // Submit review
    var submitBtn = container.querySelector('#submitReviewBtn');
    if (submitBtn) {
      submitBtn.addEventListener('click', function () {
        if (selectedRating === 0) { alert('Please select a rating.'); return; }
        var comment = (container.querySelector('#reviewComment').value || '').trim();
        this.disabled = true;
        this.textContent = 'SUBMITTING...';
        var self = this;

        var feedbackEl = container.querySelector('#reviewFeedback');
        fetch(API_BASE + '/reviews/' + productId, {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ rating: selectedRating, comment: comment })
        })
          .then(function (res) {
            if (!res.ok) return res.json().then(function (d) { throw new Error(d.error || 'Failed to submit review'); });
            return res.json();
          })
          .then(function (data) {
            if (feedbackEl) {
              feedbackEl.style.display = '';
              feedbackEl.style.color = '#8B9A46';
              feedbackEl.textContent = data.message || 'Review saved!';
            }
            self.disabled = false;
            self.textContent = 'UPDATE REVIEW';
            loadProductReviews(productId);
          })
          .catch(function (err) {
            self.disabled = false;
            self.textContent = userReview ? 'UPDATE REVIEW' : 'SUBMIT REVIEW';
            if (feedbackEl) {
              feedbackEl.style.display = '';
              feedbackEl.style.color = '#d32f2f';
              feedbackEl.textContent = err.message || 'Failed to submit. Please try again.';
            }
          });
      });
    }
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
    addToCart(this.getAttribute('data-product'), parseFloat(this.getAttribute('data-price')), this.getAttribute('data-img'));

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

  // ---- Checkout ----
  var checkoutSection = document.getElementById('checkoutSection');
  var checkoutBtn = document.getElementById('checkoutBtn');
  var checkoutBack = document.getElementById('checkoutBack');
  var checkoutForm = document.getElementById('checkoutForm');
  var checkoutItems = document.getElementById('checkoutItems');
  var checkoutSubtotalEl = document.getElementById('checkoutSubtotal');
  var checkoutShippingEl = document.getElementById('checkoutShipping');
  var checkoutTotalEl = document.getElementById('checkoutTotal');
  var checkoutSuccess = document.getElementById('checkoutSuccess');
  var successOrderId = document.getElementById('successOrderId');
  var backToShopBtn = document.getElementById('backToShopBtn');
  var placeOrderBtn = document.getElementById('placeOrderBtn');

  function openCheckout() {
    if (cart.length === 0) return;
    closeCart();
    populateCheckoutSummary();

    // Auto-fill checkout from user profile if logged in
    try {
      var profileData = localStorage.getItem('peaknuts_user_profile');
      if (profileData) {
        var profile = JSON.parse(profileData);
        var nameField = document.getElementById('checkoutName');
        var emailField = document.getElementById('checkoutEmail');
        var phoneField = document.getElementById('checkoutPhone');
        var cityField = document.getElementById('checkoutCity');
        var addressField = document.getElementById('checkoutAddress');
        if (profile.name && nameField && !nameField.value) nameField.value = profile.name;
        if (profile.email && emailField && !emailField.value) emailField.value = profile.email;
        if (profile.phone && phoneField && !phoneField.value) phoneField.value = profile.phone;
        if (profile.city && cityField && !cityField.value) cityField.value = profile.city;
        if (profile.address && addressField && !addressField.value) addressField.value = profile.address;
      }
    } catch (e) {}

    checkoutSection.style.display = 'block';
    checkoutSuccess.style.display = 'none';
    document.body.style.overflow = 'hidden';
    window.scrollTo(0, 0);
  }

  function closeCheckout() {
    checkoutSection.style.display = 'none';
    document.body.style.overflow = '';
    checkoutForm.reset();
  }

  function populateCheckoutSummary() {
    var html = '';
    var total = 0;
    for (var i = 0; i < cart.length; i++) {
      var item = cart[i];
      var lineTotal = item.price * item.qty;
      total += lineTotal;
      html += '<div class="checkout-item">' +
        '<img class="checkout-item-img" src="' + escapeHtml(item.image) + '" alt="' + escapeHtml(item.name) + '" loading="lazy">' +
        '<div class="checkout-item-info">' +
          '<div class="checkout-item-name">' + escapeHtml(item.name) + '</div>' +
          '<div class="checkout-item-qty">Qty: ' + item.qty + ' x Rs.' + item.price.toFixed(2) + '</div>' +
        '</div>' +
        '<div class="checkout-item-price">Rs.' + lineTotal.toFixed(2) + '</div>' +
      '</div>';
    }
    checkoutItems.innerHTML = html;
    var shipping = total >= 5933 ? 0 : 5;
    checkoutSubtotalEl.textContent = 'Rs.' + total.toFixed(2);
    checkoutShippingEl.textContent = shipping === 0 ? 'FREE' : 'Rs.' + shipping.toFixed(2);
    checkoutTotalEl.textContent = 'Rs.' + (total + shipping).toFixed(2);
  }

  function buildOrderItems() {
    var items = [];
    for (var i = 0; i < cart.length; i++) {
      items.push({ name: cart[i].name, qty: cart[i].qty, price: cart[i].price });
    }
    return items;
  }

  checkoutBtn.addEventListener('click', function (e) {
    e.preventDefault();
    openCheckout();
  });

  checkoutBack.addEventListener('click', function () {
    closeCheckout();
  });

  checkoutForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = document.getElementById('checkoutName').value.trim();
    var email = document.getElementById('checkoutEmail').value.trim();
    var phone = document.getElementById('checkoutPhone').value.trim();
    var city = document.getElementById('checkoutCity').value.trim();
    var address = document.getElementById('checkoutAddress').value.trim();

    if (!name || !email || !phone || !city || !address) return;

    placeOrderBtn.disabled = true;
    placeOrderBtn.textContent = 'PLACING ORDER...';

    var orderData = {
      customer: name,
      email: email,
      phone: phone,
      city: city,
      address: address,
      items: buildOrderItems()
    };

    fetch(API_BASE + '/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        // Clear cart
        cart = [];
        updateCartUI();

        // Show success
        successOrderId.textContent = 'Order ID: ' + (data.orderId || 'Confirmed');
        checkoutSuccess.style.display = 'flex';

        placeOrderBtn.disabled = false;
        placeOrderBtn.textContent = 'PLACE ORDER (Cash on Delivery)';
      })
      .catch(function () {
        placeOrderBtn.disabled = false;
        placeOrderBtn.textContent = 'PLACE ORDER (Cash on Delivery)';
        alert('Failed to place order. Please try again.');
      });
  });

  backToShopBtn.addEventListener('click', function () {
    closeCheckout();
    var path = window.location.pathname;
    if (path.indexOf('shop') !== -1 || path === '/' || path.indexOf('index') !== -1) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.location.href = 'shop.html';
    }
  });

  // Close checkout on Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && checkoutSection.style.display === 'block') {
      if (checkoutSuccess.style.display === 'flex') {
        closeCheckout();
      } else {
        closeCheckout();
      }
    }
  });

  // ---- Learn More Buttons ----
  function attachLearnMoreHandlers() {
    document.querySelectorAll('[data-learn-more]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var keyword = this.getAttribute('data-learn-more').toLowerCase();
        if (allProducts.length === 0) return;
        var product = null;
        for (var i = 0; i < allProducts.length; i++) {
          if (allProducts[i].name.toLowerCase().indexOf(keyword) !== -1) {
            product = allProducts[i];
            break;
          }
        }
        if (product) openProductModal(product);
      });
    });
  }

  // ---- Policy Modal ----
  var policyModal = document.getElementById('policyModal');
  var policyModalOverlay = document.getElementById('policyModalOverlay');
  var policyModalClose = document.getElementById('policyModalClose');
  var policyModalTitle = document.getElementById('policyModalTitle');
  var policyModalBody = document.getElementById('policyModalBody');

  var policyContent = {
    shipping: {
      title: 'Shipping Policy',
      body: '<h3>Delivery Times</h3>' +
        '<p>Standard delivery takes 3\u20135 business days within Pakistan. Remote areas may take up to 7 business days.</p>' +
        '<h3>Free Shipping</h3>' +
        '<p>We offer free shipping on all orders above Rs.40. Orders below this threshold incur a flat Rs.5 delivery fee.</p>' +
        '<h3>Order Tracking</h3>' +
        '<p>Once your order is dispatched, you will receive an email with tracking details. You can track your parcel via the courier\u2019s website.</p>'
    },
    returns: {
      title: 'Return & Refund Policy',
      body: '<h3>Returns</h3>' +
        '<p>If you are not satisfied with your purchase, you may return unopened items within 7 days of delivery for a full refund.</p>' +
        '<h3>Damaged Goods</h3>' +
        '<p>If your order arrives damaged, please contact us within 48 hours with photographs. We will arrange a replacement or refund at no extra cost.</p>' +
        '<h3>Refund Process</h3>' +
        '<p>Refunds are processed within 5\u20137 business days after we receive and inspect the returned items.</p>'
    },
    privacy: {
      title: 'Privacy Policy',
      body: '<h3>Information We Collect</h3>' +
        '<p>We collect your name, email, phone number, and delivery address when you place an order or subscribe to our newsletter.</p>' +
        '<h3>How We Use Your Data</h3>' +
        '<p>Your information is used solely for order processing, delivery, and sending occasional promotional offers (if subscribed). We never sell your data to third parties.</p>' +
        '<h3>Data Security</h3>' +
        '<p>We use industry-standard measures to protect your personal information and ensure secure transactions.</p>'
    },
    terms: {
      title: 'Terms & Conditions',
      body: '<h3>General</h3>' +
        '<p>By using the Peak Nuts website and placing orders, you agree to these terms and conditions.</p>' +
        '<h3>Pricing</h3>' +
        '<p>All prices are listed in Pakistani Rupees (Rs.) and are subject to change without prior notice. Prices at the time of order placement are final.</p>' +
        '<h3>Payment</h3>' +
        '<p>We currently accept Cash on Delivery (COD) only. Full payment is expected upon delivery of your order.</p>' +
        '<h3>Limitation of Liability</h3>' +
        '<p>Peak Nuts shall not be liable for any indirect, incidental, or consequential damages arising from the use of our products or website.</p>'
    }
  };

  function openPolicyModal(policyKey) {
    var data = policyContent[policyKey];
    if (!data) return;
    policyModalTitle.textContent = data.title;
    policyModalBody.innerHTML = data.body;
    policyModal.classList.add('active');
    policyModalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closePolicyModal() {
    policyModal.classList.remove('active');
    policyModalOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  policyModalClose.addEventListener('click', closePolicyModal);
  policyModalOverlay.addEventListener('click', closePolicyModal);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && policyModal.classList.contains('active')) {
      closePolicyModal();
    }
  });

  document.querySelectorAll('[data-policy]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      openPolicyModal(this.getAttribute('data-policy'));
    });
  });

  // ---- PRODUCT FILTERING & SORTING (Shop Page) ----
  var filterCategory = document.getElementById('filterCategory');
  var filterPrice = document.getElementById('filterPrice');
  var filterRating = document.getElementById('filterRating');
  var sortBy = document.getElementById('sortBy');
  var filterCount = document.getElementById('filterCount');

  // Pagination state for shop page
  var shopPaginatedGrid = document.getElementById('shopPaginatedGrid');
  var shopPagination = document.getElementById('shopPagination');
  var shopPaginatedSection = document.getElementById('shopPaginatedSection');
  var isShopPage = !!shopPaginatedGrid;
  var shopCurrentPage = 1;
  var shopPerPage = 12;
  var shopFilteredProducts = [];

  function renderPaginationControls(container, currentPage, totalPages, onPageChange) {
    if (totalPages <= 1) { container.innerHTML = ''; return; }
    var html = '<div style="display:flex;justify-content:center;align-items:center;gap:6px;padding:30px 0;flex-wrap:wrap;">';
    var btnBase = 'padding:8px 14px;border:1px solid #ddd;border-radius:6px;background:#fff;cursor:pointer;font-size:13px;font-family:inherit;transition:all 0.2s;';
    var btnActive = 'padding:8px 14px;border:1px solid #1a1a1a;border-radius:6px;background:#1a1a1a;color:#fff;cursor:default;font-size:13px;font-family:inherit;font-weight:600;';
    var btnDisabled = 'padding:8px 14px;border:1px solid #eee;border-radius:6px;background:#f5f5f5;color:#ccc;cursor:not-allowed;font-size:13px;font-family:inherit;';

    // Previous
    if (currentPage > 1) {
      html += '<button class="pg-btn" data-page="' + (currentPage - 1) + '" style="' + btnBase + '">&laquo; Prev</button>';
    } else {
      html += '<button disabled style="' + btnDisabled + '">&laquo; Prev</button>';
    }

    // Page numbers with ellipsis
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

    // Next
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

  function renderShopPaginated() {
    var products = shopFilteredProducts;
    var totalPages = Math.ceil(products.length / shopPerPage);
    if (shopCurrentPage > totalPages) shopCurrentPage = totalPages;
    if (shopCurrentPage < 1) shopCurrentPage = 1;

    var start = (shopCurrentPage - 1) * shopPerPage;
    var end = start + shopPerPage;
    var pageProducts = products.slice(start, end);

    var html = '';
    for (var i = 0; i < pageProducts.length; i++) {
      html += buildProductCardHTML(pageProducts[i]);
    }
    shopPaginatedGrid.innerHTML = html;
    attachCartHandlers(shopPaginatedGrid);
    attachProductClickHandlers(shopPaginatedGrid);
    attachWishlistHandlers(shopPaginatedGrid);
    loadUserWishlist();

    renderPaginationControls(shopPagination, shopCurrentPage, totalPages, function (page) {
      shopCurrentPage = page;
      renderShopPaginated();
      shopPaginatedSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    // Show paginated section, hide section-based grids
    shopPaginatedSection.style.display = '';
    document.querySelectorAll('.products-section[data-section-name]').forEach(function (s) { s.style.display = 'none'; });
    // Hide special products, banner and parallax on shop page for cleaner paginated view
    document.querySelectorAll('.special-product').forEach(function (s) { s.style.display = 'none'; });
    document.querySelectorAll('.banner-cta').forEach(function (s) { s.style.display = 'none'; });
    document.querySelectorAll('.parallax-banner').forEach(function (s) { s.style.display = 'none'; });

    initScrollAnimations();
  }

  function applyFiltersAndSort() {
    if (!filterCategory) return; // Not on shop page
    if (allProducts.length === 0) return;

    var filtered = allProducts.slice();

    // Category filter
    var cat = filterCategory.value;
    if (cat) {
      filtered = filtered.filter(function (p) { return p.category === cat; });
    }

    // Price filter
    var priceRange = filterPrice.value;
    if (priceRange) {
      var parts = priceRange.split('-');
      var minP = parseFloat(parts[0]);
      var maxP = parts[1] ? parseFloat(parts[1]) : Infinity;
      filtered = filtered.filter(function (p) { return p.price >= minP && p.price <= maxP; });
    }

    // Rating filter
    var minRating = filterRating.value;
    if (minRating) {
      var r = parseInt(minRating);
      filtered = filtered.filter(function (p) { var avg = p.reviewAvg != null ? p.reviewAvg : (p.rating || 5); return avg >= r; });
    }

    // Sort
    var sort = sortBy.value;
    if (sort === 'price-low') {
      filtered.sort(function (a, b) { return a.price - b.price; });
    } else if (sort === 'price-high') {
      filtered.sort(function (a, b) { return b.price - a.price; });
    } else if (sort === 'rating') {
      filtered.sort(function (a, b) { var ra = a.reviewAvg != null ? a.reviewAvg : (a.rating || 5); var rb = b.reviewAvg != null ? b.reviewAvg : (b.rating || 5); return rb - ra; });
    } else if (sort === 'name') {
      filtered.sort(function (a, b) { return a.name.localeCompare(b.name); });
    }

    // Update count
    if (filterCount) {
      filterCount.textContent = filtered.length + ' product' + (filtered.length !== 1 ? 's' : '');
    }

    if (isShopPage) {
      // Use paginated flat grid on shop page
      shopFilteredProducts = filtered;
      shopCurrentPage = 1;
      renderShopPaginated();
    } else {
      // Re-render section-based grids (home page)
      var sections = { popular: [], trending: [], bestselling: [] };
      filtered.forEach(function (p) {
        if (p.section && sections[p.section]) {
          sections[p.section].push(p);
        }
      });

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
    }
  }

  if (filterCategory) filterCategory.addEventListener('change', applyFiltersAndSort);
  if (filterPrice) filterPrice.addEventListener('change', applyFiltersAndSort);
  if (filterRating) filterRating.addEventListener('change', applyFiltersAndSort);
  if (sortBy) sortBy.addEventListener('change', applyFiltersAndSort);

  // ---- WISHLIST EVENT LISTENER (for account page add-to-cart) ----
  window.addEventListener('peaknuts-add-to-cart', function (e) {
    if (e.detail) {
      addToCart(e.detail.name, e.detail.price, e.detail.image);
      openCart();
    }
  });

  // ---- Initialize ----
  document.addEventListener('DOMContentLoaded', function () {
    initScrollAnimations();
    handleScroll();
    renderSectionProducts();
    updateCartUI();
    attachLearnMoreHandlers();
  });

  // If DOM is already loaded
  if (document.readyState !== 'loading') {
    initScrollAnimations();
    handleScroll();
    renderSectionProducts();
    updateCartUI();
    attachLearnMoreHandlers();
  }

})();
