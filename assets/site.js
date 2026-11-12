(function () {
  var root = document.documentElement;
  var yr = document.getElementById('yr'); if (yr) yr.textContent = new Date().getFullYear();
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Theme toggle (light = Alpino default)
  var tbtn = document.querySelector('.theme-toggle');
  function paintIcon() { if (tbtn) tbtn.innerHTML = root.getAttribute('data-theme') === 'dark' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>'; }
  paintIcon();
  if (tbtn) tbtn.addEventListener('click', function () {
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next); paintIcon();
    try { localStorage.setItem('mc-theme', next); } catch (e) {}
  });

  // Sidebar toggle (tablet / phone)
  var sidebar = document.getElementById('sidebar'), overlay = document.querySelector('.overlay'), mt = document.querySelector('.menu-toggle');
  function setOpen(o) { sidebar.classList.toggle('open', o); overlay.hidden = !o; if (mt) mt.setAttribute('aria-expanded', o ? 'true' : 'false'); }
  if (mt) mt.addEventListener('click', function () { setOpen(!sidebar.classList.contains('open')); });
  overlay.addEventListener('click', function () { setOpen(false); });
  sidebar.addEventListener('click', function (e) { if (e.target.closest('a') && window.innerWidth <= 992) setOpen(false); });

  // Active menu follows the section in view
  var links = Array.prototype.slice.call(document.querySelectorAll('#navlinks a[href^="#"], .mini-icons a'));
  if ('IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (a) { a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id); });
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    ['top', 'why', 'impact', 'experience', 'builds', 'framework', 'credentials', 'contact'].forEach(function (id) { var s = document.getElementById(id); if (s) spy.observe(s); });
  }

  // Count-up + progress bars when visible
  function countUp(el) {
    var end = parseFloat(el.dataset.count), dec = +(el.dataset.decimals || 0), pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
    if (reduce) return;
    var t0 = null;
    (function step(ts) { if (!t0) t0 = ts; var p = Math.min(1, (ts - t0) / 1300); el.textContent = pre + (end * (1 - Math.pow(1 - p, 3))).toFixed(dec) + suf; if (p < 1) requestAnimationFrame(step); })(performance.now());
  }
  var bars = document.querySelectorAll('.progress span');
  bars.forEach(function (b) { b.dataset.w = b.style.width; if (!reduce) b.style.width = '0'; });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return;
        if (en.target.dataset.count) countUp(en.target); else en.target.style.width = en.target.dataset.w;
        io.unobserve(en.target);
      });
    }, { threshold: 0.4 });
    document.querySelectorAll('[data-count]').forEach(function (n) { io.observe(n); });
    bars.forEach(function (b) { io.observe(b); });
  } else bars.forEach(function (b) { b.style.width = b.dataset.w; });

  // Experience rows expand
  document.querySelectorAll('.exp-row').forEach(function (r) {
    r.setAttribute('tabindex', '0');
    function toggle() { var d = document.getElementById(r.dataset.target); d.hidden = !d.hidden; r.classList.toggle('open', !d.hidden); }
    r.addEventListener('click', toggle);
    r.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
  });

  // Toast + copy email
  var toast = document.querySelector('.toast');
  function say(m) { toast.textContent = m; toast.classList.add('show'); setTimeout(function () { toast.classList.remove('show'); }, 2200); }
  document.querySelectorAll('.js-copy').forEach(function (b) {
    b.addEventListener('click', function () { var v = b.dataset.copy; if (navigator.clipboard) navigator.clipboard.writeText(v).then(function () { say('Email copied: ' + v); }, function () { say(v); }); else say(v); });
  });

  // Résumé buttons hidden until the PDF exists
  var rb = document.querySelectorAll('.js-resume');
  if (rb.length) {
    rb.forEach(function (b) { b.style.display = 'none'; });
    fetch(rb[0].getAttribute('href'), { method: 'HEAD' }).then(function (r) { if (r.ok && (r.headers.get('content-type') || '').indexOf('pdf') !== -1) rb.forEach(function (b) { b.style.display = ''; }); }).catch(function () {});
  }

  // Footprint map
  var tiles = null, map = null;
  function tileUrl() { return root.getAttribute('data-theme') === 'dark'
    ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
    : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}'; }
  function initMap() {
    var el = document.getElementById('footprint'); if (!el || !window.L) return;
    map = L.map(el, { scrollWheelZoom: false, worldCopyJump: true, dragging: !L.Browser.mobile });
    tiles = L.tileLayer(tileUrl(), { maxZoom: 10, attribution: 'Tiles &copy; Esri' }).addTo(map);
    var sites = [
      ['Washington, DC region', 'Program leadership', [38.9, -77.04], 'us'], ['Hampton Roads, VA', 'Platform engineering', [37.08, -76.36], 'us'],
      ['Oklahoma', 'Network infrastructure', [35.47, -97.52], 'us'], ['Colorado Springs, CO', 'Distributed operations', [38.83, -104.82], 'us'],
      ['Austin, TX', 'Home base · Remote', [30.58, -97.85], 'us'], ['Rhineland-Palatinate, Germany', 'Distributed PMO & SRE', [49.9, 7.0], 'eu'],
      ['East Anglia, UK', 'Distributed PMO & SRE', [52.4, 0.56], 'eu'], ['Brussels, Belgium', 'NATO partner coordination', [50.85, 4.35], 'eu'],
      ['Netherlands', 'Distributed operations', [51.65, 5.66], 'eu'], ['Northern Italy', 'Distributed operations', [45.43, 10.28], 'eu'],
      ['Southern Turkey', 'Distributed operations', [37.0, 35.42], 'eu']
    ], pts = [];
    sites.forEach(function (s) {
      var c = s[3] === 'us' ? '#f5c518' : '#1e9ae8';
      L.circleMarker(s[2], { radius: 11, color: c, weight: 1, opacity: .35, fillOpacity: .12 }).addTo(map);
      L.circleMarker(s[2], { radius: 5, color: '#fff', weight: 2, fillColor: c, fillOpacity: 1 }).bindPopup('<strong>' + s[0] + '</strong><br>' + s[1]).addTo(map);
      pts.push(s[2]);
    });
    map.fitBounds(pts, { padding: [24, 24] });
    if (tbtn) tbtn.addEventListener('click', function () { tiles.setUrl(tileUrl()); });
  }
  if (document.readyState === 'complete') initMap(); else window.addEventListener('load', initMap);
})();
