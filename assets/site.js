(function () {
  // Year
  var yr = document.getElementById('yr');
  if (yr) yr.textContent = new Date().getFullYear();

  // Sidebar (off-canvas under 1000px)
  var toggle = document.querySelector('.nav-toggle');
  var sidebar = document.getElementById('sidebar');
  var scrim = document.querySelector('.scrim');
  function setOpen(open) {
    if (!sidebar) return;
    sidebar.classList.toggle('open', open);
    if (scrim) scrim.hidden = !open;
    if (toggle) toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  if (toggle) toggle.addEventListener('click', function () { setOpen(!sidebar.classList.contains('open')); });
  if (scrim) scrim.addEventListener('click', function () { setOpen(false); });
  if (sidebar) sidebar.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });

  // Active nav item + breadcrumb follow the section in view
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('#navlinks a[href^="#"]'));
  var crumb = document.getElementById('crumb');
  if ('IntersectionObserver' in window && navLinks.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var id = '#' + en.target.id;
        navLinks.forEach(function (a) {
          var on = a.getAttribute('href') === id;
          a.classList.toggle('active', on);
          if (on && crumb) crumb.textContent = a.textContent.trim();
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    navLinks.forEach(function (a) { var s = document.querySelector(a.getAttribute('href')); if (s) spy.observe(s); });
  }

  // Reveal on scroll
  var els = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.12 });
    els.forEach(function (el) { io.observe(el); });
  } else {
    els.forEach(function (el) { el.classList.add('in'); });
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

  // Hide résumé buttons until the PDF is actually published (avoids a broken link)
  var resumeBtns = document.querySelectorAll('.js-resume');
  if (resumeBtns.length) {
    resumeBtns.forEach(function (b) { b.style.display = 'none'; });
    fetch(resumeBtns[0].getAttribute('href'), { method: 'HEAD' }).then(function (r) {
      var ok = r.ok && (r.headers.get('content-type') || '').indexOf('pdf') !== -1;
      if (ok) resumeBtns.forEach(function (b) { b.style.display = ''; });
    }).catch(function () {});
  }

  // Footprint map — regional pins only (no unit or installation names)
  function initMap() {
    var el = document.getElementById('footprint');
    if (!el || !window.L) return;
    var map = L.map(el, { scrollWheelZoom: false, zoomControl: true, attributionControl: true, worldCopyJump: true })
      .setView([44, -30], 2.4);
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
    var group = [];
    sites.forEach(function (s) {
      var c = s.g === 'us' ? '#f5c518' : '#5cc8f5';
      L.circleMarker(s.ll, { radius: 10, color: c, weight: 1, opacity: .35, fillOpacity: .12 }).addTo(map);
      var m = L.circleMarker(s.ll, { radius: 5, color: c, weight: 2, fillColor: c, fillOpacity: .95 })
        .bindPopup('<strong>' + s.n + '</strong><br><span style="color:#8a93a0">' + s.d + '</span>');
      m.addTo(map); group.push(s.ll);
    });
    map.fitBounds(group, { padding: [30, 30] });
  }
  if (document.readyState === 'complete') initMap();
  else window.addEventListener('load', initMap);
})();
