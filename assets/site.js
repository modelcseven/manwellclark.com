(function () {
  var yr = document.getElementById('yr');
  if (yr) yr.textContent = new Date().getFullYear();
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Mobile menu
  var toggle = document.querySelector('.nav-toggle');
  var menu = document.querySelector('.nav nav');
  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      var open = menu.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) { menu.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); } });
  }

  // Active nav link follows the section in view
  var links = Array.prototype.slice.call(document.querySelectorAll('.nav-links a'));
  if ('IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (a) { a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    links.forEach(function (a) { var s = document.querySelector(a.getAttribute('href')); if (s) spy.observe(s); });
  }

  // Reveal on scroll (staggered within a grid)
  var els = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var sibs = Array.prototype.indexOf.call(en.target.parentNode.children, en.target);
        en.target.style.transitionDelay = Math.min(sibs, 6) * 60 + 'ms';
        en.target.classList.add('in'); io.unobserve(en.target);
      });
    }, { threshold: 0.12 });
    els.forEach(function (el) { io.observe(el); });
  } else {
    els.forEach(function (el) { el.classList.add('in'); });
  }

  // Cursor spotlight on tiles
  document.addEventListener('pointermove', function (e) {
    var t = e.target.closest && e.target.closest('.tile');
    if (!t) return;
    var r = t.getBoundingClientRect();
    t.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    t.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }, { passive: true });

  // Count-up stats
  function countUp(el) {
    var end = parseFloat(el.dataset.count), dec = +(el.dataset.decimals || 0);
    var pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
    if (reduce) return;
    var start = null, dur = 1400;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min(1, (ts - start) / dur), v = end * (1 - Math.pow(1 - p, 3));
      el.textContent = pre + v.toFixed(dec) + suf;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var nums = document.querySelectorAll('[data-count]');
  if ('IntersectionObserver' in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { countUp(en.target); cio.unobserve(en.target); } });
    }, { threshold: 0.6 });
    nums.forEach(function (n) { cio.observe(n); });
  }

  // Toast + copy email
  var toast = document.querySelector('.toast');
  function say(msg) {
    if (!toast) return;
    toast.textContent = msg; toast.classList.add('show');
    setTimeout(function () { toast.classList.remove('show'); }, 2200);
  }
  document.querySelectorAll('.js-copy').forEach(function (b) {
    b.addEventListener('click', function () {
      var v = b.getAttribute('data-copy');
      if (navigator.clipboard) navigator.clipboard.writeText(v).then(function () { say('Email copied: ' + v); }, function () { say(v); });
      else say(v);
    });
  });

  // Hide résumé buttons until the PDF is published
  var resumeBtns = document.querySelectorAll('.js-resume');
  if (resumeBtns.length) {
    resumeBtns.forEach(function (b) { b.style.display = 'none'; });
    fetch(resumeBtns[0].getAttribute('href'), { method: 'HEAD' }).then(function (r) {
      var ok = r.ok && (r.headers.get('content-type') || '').indexOf('pdf') !== -1;
      if (ok) resumeBtns.forEach(function (b) { b.style.display = ''; });
    }).catch(function () {});
  }

  // Footprint map — regional pins only
  function initMap() {
    var el = document.getElementById('footprint');
    if (!el || !window.L) return;
    var map = L.map(el, { scrollWheelZoom: false, zoomControl: false, attributionControl: true, worldCopyJump: true, dragging: !L.Browser.mobile });
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 10, attribution: 'Tiles &copy; Esri'
    }).addTo(map);
    var sites = [
      { n: 'Washington, DC region', d: 'Program leadership', ll: [38.9, -77.04], g: 'us' },
      { n: 'Hampton Roads, VA', d: 'Platform engineering', ll: [37.08, -76.36], g: 'us' },
      { n: 'Oklahoma', d: 'Network infrastructure', ll: [35.47, -97.52], g: 'us' },
      { n: 'Colorado Springs, CO', d: 'Distributed operations', ll: [38.83, -104.82], g: 'us' },
      { n: 'Austin, TX', d: 'Home base · Remote', ll: [30.58, -97.85], g: 'us' },
      { n: 'Rhineland-Palatinate, Germany', d: 'Distributed PMO & SRE', ll: [49.9, 7.0], g: 'eu' },
      { n: 'East Anglia, UK', d: 'Distributed PMO & SRE', ll: [52.4, 0.56], g: 'eu' },
      { n: 'Brussels, Belgium', d: 'NATO partner coordination', ll: [50.85, 4.35], g: 'eu' },
      { n: 'Netherlands', d: 'Distributed operations', ll: [51.65, 5.66], g: 'eu' },
      { n: 'Northern Italy', d: 'Distributed operations', ll: [45.43, 10.28], g: 'eu' },
      { n: 'Southern Turkey', d: 'Distributed operations', ll: [37.0, 35.42], g: 'eu' }
    ];
    var pts = [];
    sites.forEach(function (s) {
      var c = s.g === 'us' ? '#f5c518' : '#5cc8f5';
      L.circleMarker(s.ll, { radius: 11, color: c, weight: 1, opacity: .3, fillOpacity: .1 }).addTo(map);
      L.circleMarker(s.ll, { radius: 5, color: c, weight: 2, fillColor: c, fillOpacity: .95 })
        .bindPopup('<strong>' + s.n + '</strong><br><span style="color:#7d8796">' + s.d + '</span>').addTo(map);
      pts.push(s.ll);
    });
    map.fitBounds(pts, { padding: [24, 24] });
  }
  if (document.readyState === 'complete') initMap();
  else window.addEventListener('load', initMap);
})();
