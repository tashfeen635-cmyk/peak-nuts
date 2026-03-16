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
  searchToggle.addEventListener('click', function () {
    searchOverlay.classList.add('active');
    searchOverlay.querySelector('.search-input').focus();
  });

  searchClose.addEventListener('click', function () {
    searchOverlay.classList.remove('active');
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      searchOverlay.classList.remove('active');
      closeCart();
    }
  });

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

  // Add to cart buttons
  document.querySelectorAll('.btn-add-cart').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var name = this.getAttribute('data-product');
      var price = parseFloat(this.getAttribute('data-price'));

      // Find the product image
      var card = this.closest('.product-card');
      var img = card.querySelector('.product-img img');
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

  // ---- Sync Products with Database ----
  var API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : '/api';

  function syncProductsWithDB() {
    fetch(API_BASE + '/products')
      .then(function (res) { return res.json(); })
      .then(function (dbProducts) {
        // Build a map of product names to their data
        var productMap = {};
        dbProducts.forEach(function (p) {
          productMap[p.name] = p;
        });

        // Check each product card on the page
        document.querySelectorAll('.product-card').forEach(function (card) {
          var btn = card.querySelector('.btn-add-cart');
          if (!btn) return;
          var productName = btn.getAttribute('data-product');
          var dbProduct = productMap[productName];

          if (!dbProduct) {
            // Product was deleted from admin — hide the card
            card.style.display = 'none';
          } else {
            // Update price from database
            card.style.display = '';
            btn.setAttribute('data-price', dbProduct.price);
            var priceCurrentEl = card.querySelector('.price-current');
            if (priceCurrentEl) {
              priceCurrentEl.textContent = '$' + dbProduct.price.toFixed(2);
            }

            // Show out of stock state
            if (dbProduct.stock === 'Out of Stock') {
              btn.textContent = 'OUT OF STOCK';
              btn.disabled = true;
              btn.style.opacity = '0.5';
              btn.style.cursor = 'not-allowed';
            }
          }
        });

        // Also sync the special product sections (Shilajit & Tumoro)
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
          }
        });
      })
      .catch(function (err) {
        console.warn('Could not sync products with database:', err);
      });
  }

  // ---- Initialize ----
  document.addEventListener('DOMContentLoaded', function () {
    initScrollAnimations();
    handleScroll();
    syncProductsWithDB();
  });

  // If DOM is already loaded
  if (document.readyState !== 'loading') {
    initScrollAnimations();
    handleScroll();
    syncProductsWithDB();
  }

})();
