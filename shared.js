/* ═══════════════════════════════════════════════════
   AMONATOJI — SHARED JS
   Cursor · Parallax · Magnetic · Scroll Reveals
   Cart System (LocalStorage persistent)
═══════════════════════════════════════════════════ */

(function () {
  'use strict';

  function lerp(a, b, t) { return a + (b - a) * t; }

  /* ─── SMOOTH CURSOR — fine-pointer (mouse) devices only ─── */
  /*
   * `pointer: fine` is true for real mice and trackpads.
   * It is false on phones and tablets (coarse touch) and on
   * any device that has never had a fine pointer attached.
   * We also skip the engine when the viewport is < 1024 px,
   * covering the edge case of a hybrid laptop in tablet mode.
   *
   * When the guard fails we do NOTHING — no event listeners,
   * no rAF loop — so there is zero performance cost on mobile.
   */
  const _hasFinePointer =
    window.matchMedia('(pointer: fine)').matches &&
    window.matchMedia('(min-width: 1024px)').matches;

  if (_hasFinePointer) {
    const dot  = document.getElementById('cursor-dot');
    const ring = document.getElementById('cursor-ring');

    let mouse   = { x: window.innerWidth / 2,  y: window.innerHeight / 2 };
    let ringPos = { x: window.innerWidth / 2,  y: window.innerHeight / 2 };
    let dotPos  = { x: window.innerWidth / 2,  y: window.innerHeight / 2 };

    document.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    });

    function animateCursor() {
      dotPos.x  = lerp(dotPos.x,  mouse.x, 0.22);
      dotPos.y  = lerp(dotPos.y,  mouse.y, 0.22);
      ringPos.x = lerp(ringPos.x, mouse.x, 0.09);
      ringPos.y = lerp(ringPos.y, mouse.y, 0.09);

      if (dot)  { dot.style.left  = dotPos.x  + 'px'; dot.style.top  = dotPos.y  + 'px'; }
      if (ring) { ring.style.left = ringPos.x + 'px'; ring.style.top = ringPos.y + 'px'; }

      requestAnimationFrame(animateCursor);
    }
    animateCursor();

    /* cursor hover state */
    document.querySelectorAll('a, button, .mag-btn, .product-card, .nav-cta, .nav-bag-btn').forEach(el => {
      el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
      el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
    });
  }

  /* ─── MOUSE PARALLAX ─── */
  const parallaxEls = document.querySelectorAll('[data-parallax]');
  let parallaxMouse  = { x: 0, y: 0 };
  let parallaxTarget = { x: 0, y: 0 };

  document.addEventListener('mousemove', (e) => {
    parallaxTarget.x = (e.clientX / window.innerWidth  - 0.5) * 2;
    parallaxTarget.y = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  function animateParallax() {
    parallaxMouse.x = lerp(parallaxMouse.x, parallaxTarget.x, 0.05);
    parallaxMouse.y = lerp(parallaxMouse.y, parallaxTarget.y, 0.05);

    parallaxEls.forEach(el => {
      const depth   = parseFloat(el.getAttribute('data-parallax')) || 20;
      const invertX = el.hasAttribute('data-parallax-invert') ? 1 : -1;
      const tx = parallaxMouse.x * depth * invertX;
      const ty = parallaxMouse.y * depth * invertX;
      el.style.transform = `translate(${tx}px, ${ty}px)`;
    });

    requestAnimationFrame(animateParallax);
  }
  animateParallax();

  /* ─── MAGNETIC BUTTONS ─── */
  document.querySelectorAll('.mag-btn').forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const cx   = rect.left + rect.width  / 2;
      const cy   = rect.top  + rect.height / 2;
      const dx   = (e.clientX - cx) * 0.38;
      const dy   = (e.clientY - cy) * 0.38;
      btn.style.transform = `translate(${dx}px, ${dy}px)`;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'translate(0, 0)';
    });
  });

  /* ─── SCROLL REVEAL ─── */
  const revealEls = document.querySelectorAll('[data-reveal]');
  function onReveal(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('revealed');
    });
  }
  const revealObs = new IntersectionObserver(onReveal, { threshold: 0.12 });
  revealEls.forEach(el => { el.classList.add('will-reveal'); revealObs.observe(el); });

  /* ─── TOAST ─── */
  window.showToast = function (msg) {
    let t = document.getElementById('toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'toast';
      t.className = 'toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 3200);
  };

  /* ═══════════════════════════════════════════════════
     CART SYSTEM — LocalStorage Persistent
  ═══════════════════════════════════════════════════ */

  const CART_KEY = 'amonatoji_cart';

  /* Internal state */
  let _cart = [];

  function _loadCart() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      _cart = raw ? JSON.parse(raw) : [];
    } catch (e) {
      _cart = [];
    }
  }

  function _saveCart() {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(_cart));
    } catch (e) { /* storage full – silent */ }
  }

  function _cartTotal() {
    return _cart.reduce((sum, item) => sum + item.price, 0);
  }

  /* Public API */
  window.cartAddItem = function (name, price, size, img) {
    _loadCart();
    const id = Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    _cart.push({ id, name, price, size, img });
    _saveCart();
    _updateAllBadges();
    _renderDrawerItems();
    showToast(name + ' · ' + size + ' added to bag');
  };

  window.cartRemoveItem = function (id) {
    _loadCart();
    _cart = _cart.filter(item => item.id !== id);
    _saveCart();
    _updateAllBadges();
    _renderDrawerItems();
  };

  window.cartClear = function () {
    _cart = [];
    _saveCart();
    _updateAllBadges();
    _renderDrawerItems();
  };

  /* ─── Badge update ─── */
  function _updateAllBadges() {
    const count = _cart.length;
    document.querySelectorAll('.nav-bag-count').forEach(el => {
      el.textContent = count;
    });
  }

  /* ─── Drawer item list renderer ─── */
  function _renderDrawerItems() {
    const list  = document.getElementById('drawer-item-list');
    const empty = document.getElementById('drawer-empty');
    const footer = document.getElementById('drawer-checkout-footer');
    const totalEl = document.getElementById('drawer-total-price');

    if (!list) return;

    if (_cart.length === 0) {
      list.innerHTML = '';
      if (empty)  empty.style.display  = 'flex';
      if (footer) footer.style.display = 'none';
      return;
    }

    if (empty)  empty.style.display  = 'none';
    if (footer) footer.style.display = 'flex';

    list.innerHTML = _cart.map(item => `
      <div class="di-row" data-id="${item.id}">
        <div class="di-img-wrap">
          ${item.img ? `<img src="img/${item.img}" alt="${item.name}" class="di-img" />` : '<div class="di-img-placeholder"></div>'}
        </div>
        <div class="di-details">
          <div class="di-name">${item.name}</div>
          <div class="di-meta">
            <span class="di-size">SIZE ${item.size}</span>
            <span class="di-price">${item.price} MAD</span>
          </div>
        </div>
        <button class="di-remove mag-btn" onclick="cartRemoveItem('${item.id}')" aria-label="Remove item">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    `).join('');

    const total = _cartTotal();
    if (totalEl) totalEl.textContent = total + ' MAD';
  }

  /* ─── Drawer open / close ─── */
  window.openModal = function (productVal) {
    _loadCart();
    _renderDrawerItems();

    const drawer   = document.getElementById('cart-drawer');
    const backdrop = document.getElementById('cart-drawer-backdrop');
    if (!drawer) return;

    drawer.classList.add('drawer-open');
    if (backdrop) backdrop.classList.add('open');
    document.body.style.overflow = 'hidden';

    setTimeout(() => {
      const first = drawer.querySelector('input');
      if (first) first.focus();
    }, 420);
  };

  window.closeModal = function () {
    const drawer   = document.getElementById('cart-drawer');
    const backdrop = document.getElementById('cart-drawer-backdrop');
    if (drawer)   drawer.classList.remove('drawer-open');
    if (backdrop) backdrop.classList.remove('open');
    document.body.style.overflow = '';
  };

  document.addEventListener('keydown', e => { if (e.key === 'Escape') window.closeModal(); });

  /* ─── Drawer checkout (WhatsApp) ─── */
  window.submitDrawerOrder = function () {
    _loadCart();

    if (_cart.length === 0) {
      showToast('Your bag is empty — add items first');
      return;
    }

    const name    = (document.getElementById('d-name')    || {}).value?.trim();
    const phone   = (document.getElementById('d-phone')   || {}).value?.trim();
    const address = (document.getElementById('d-address') || {}).value?.trim();

    if (!name)    { showToast('Please enter your full name');    return; }
    if (!phone)   { showToast('Please enter your phone number'); return; }
    if (!address) { showToast('Please enter your address');      return; }

    const itemLines = _cart.map((item, i) =>
      `  ${i + 1}. ${item.name} · Size ${item.size} · ${item.price} MAD`
    ).join('\n');

    const total = _cartTotal();

    const msg =
      '🖤 *ORDER — AMONATOJI*\n\n' +
      '━━━━━━━━━━━━━━━━━━\n' +
      '*ITEMS*\n' +
      itemLines + '\n\n' +
      `*TOTAL: ${total} MAD*\n` +
      '━━━━━━━━━━━━━━━━━━\n\n' +
      '👤 Name: '    + name    + '\n' +
      '📞 Phone: '   + phone   + '\n' +
      '📍 Address: ' + address + '\n\n' +
      '💳 Payment: Cash on Delivery\n' +
      '_Sent from AmonaToji.com_';

    window.location.href = 'https://wa.me/212657715301?text=' + encodeURIComponent(msg);
  };

  /* ─── Legacy submitOrder (shop order form section) ─── */
  window.submitOrder = function () {
    const name    = (document.getElementById('o-name')    || {}).value?.trim();
    const phone   = (document.getElementById('o-phone')   || {}).value?.trim();
    const address = (document.getElementById('o-address') || {}).value?.trim();
    const product = (document.getElementById('o-product') || {}).value;
    const size    = (document.getElementById('o-size')    || {}).value;

    if (!name)    { showToast('Please enter your full name');    return; }
    if (!phone)   { showToast('Please enter your phone number'); return; }
    if (!address) { showToast('Please enter your address');      return; }
    if (!product) { showToast('Please select a product');        return; }
    if (!size)    { showToast('Please select a size');           return; }

    const msg =
      '🖤 *ORDER — AMONATOJI*\n\n' +
      '👤 Name: '    + name    + '\n' +
      '📞 Phone: '   + phone   + '\n' +
      '📦 Product: ' + product + '\n' +
      '📐 Size: '    + size    + '\n' +
      '📍 Address: ' + address + '\n\n' +
      '💳 Payment: Cash on Delivery\n' +
      '_Sent from AmonaToji.com_';

    window.location.href = 'https://wa.me/212657715301?text=' + encodeURIComponent(msg);
  };

  /* ═══════════════════════════════════════════════════
     FEATURE 1 — LIVE MARRAKESH CLOCK
     Finds every element with id="live-clock" or
     class="live-clock" and ticks them once per second.
     Uses Intl.DateTimeFormat for zero-dependency
     timezone-accurate time (Africa/Casablanca =
     Marrakesh/Morocco time, UTC+1 / UTC+0 in winter).
  ═══════════════════════════════════════════════════ */

  (function _initClock() {
    const targets = document.querySelectorAll('#live-clock, .live-clock');
    if (!targets.length) return;

    const fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Casablanca',
      hour:   '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    function _tick() {
      const now  = new Date();
      const time = fmt.format(now);           // "19:04:12"
      const str  = 'MARRAKESH, MA — ' + time;
      targets.forEach(el => {
        if (el.textContent !== str) el.textContent = str;
      });
    }

    _tick();   // immediate render — no blank flash on load

    // Align to the next whole second so the display
    // always changes on the exact second boundary
    const msUntilNextSecond = 1000 - (Date.now() % 1000);
    setTimeout(() => {
      _tick();
      setInterval(_tick, 1000);
    }, msUntilNextSecond);
  })();

  /* ═══════════════════════════════════════════════════
     FEATURE 3 — KINETIC MAGNETIC TITLE
     Elements with class="magnetic-title" subtly warp
     toward the cursor when the pointer is within a
     configurable radius.  Outside that radius the
     element springs back via CSS transition.
     Desktop / fine-pointer only — no touch overhead.
  ═══════════════════════════════════════════════════ */

  if (_hasFinePointer) {
    const MAGNETIC_RADIUS  = 320;   // px — proximity activation zone
    const SKEW_STRENGTH    = 5;     // max skewX degrees
    const TRANSLATE_FACTOR = 0.08;  // fraction of delta to translate

    const magTitles = document.querySelectorAll('.magnetic-title');

    if (magTitles.length) {
      document.addEventListener('mousemove', (e) => {
        magTitles.forEach(el => {
          const rect  = el.getBoundingClientRect();
          const cx    = rect.left + rect.width  / 2;
          const cy    = rect.top  + rect.height / 2;
          const dx    = e.clientX - cx;
          const dy    = e.clientY - cy;
          const dist  = Math.sqrt(dx * dx + dy * dy);

          if (dist < MAGNETIC_RADIUS) {
            const pull   = 1 - dist / MAGNETIC_RADIUS;   // 0 → 1 as cursor nears
            const tx     = dx * TRANSLATE_FACTOR * pull;
            const ty     = dy * TRANSLATE_FACTOR * pull;
            const skewX  = -(dx / MAGNETIC_RADIUS) * SKEW_STRENGTH * pull;

            el.classList.add('is-tracking');
            el.style.transform = `translate(${tx}px, ${ty}px) skewX(${skewX}deg)`;
          } else {
            // Outside radius — let CSS transition spring it back
            if (el.classList.contains('is-tracking')) {
              el.classList.remove('is-tracking');
              el.style.transform = '';
            }
          }
        });
      });

      // Hard reset on mouse leave (window exit)
      document.addEventListener('mouseleave', () => {
        magTitles.forEach(el => {
          el.classList.remove('is-tracking');
          el.style.transform = '';
        });
      });
    }
  }

  /* ═══════════════════════════════════════════════════
     FEATURE 4 — MASKED IMAGE REVEAL ON SCROLL
     Elements with class="img-reveal-wrap" get observed
     by the same IntersectionObserver pattern already
     used for [data-reveal].  When 15 % of the wrapper
     enters the viewport, .img-revealed is added —
     which collapses the CSS curtain and scales the img.
     Uses a staggered threshold so tall grids feel
     sequential rather than all-at-once.
  ═══════════════════════════════════════════════════ */

  (function _initImageReveal() {
    const revealWraps = document.querySelectorAll('.img-reveal-wrap');
    if (!revealWraps.length) return;

    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('img-revealed');
          obs.unobserve(entry.target);  // fire once — no re-hide on scroll back
        }
      });
    }, {
      threshold: 0.15,
      rootMargin: '0px 0px -40px 0px',   // trigger slightly before full in-view
    });

    revealWraps.forEach(el => obs.observe(el));
  })();

  /* ─── Init on load ─── */
  _loadCart();
  _updateAllBadges();
  _renderDrawerItems();

})();
