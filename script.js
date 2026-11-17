(function () {
  // duplicate ticker content for a seamless loop
  var track = document.getElementById('ticker-track');
  if (track) track.innerHTML += track.innerHTML;

  // mobile nav
  var toggle = document.getElementById('nav-toggle');
  var nav = document.getElementById('nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  // gallery lightbox
  document.querySelectorAll('.g-item img').forEach(function (img) {
    img.addEventListener('click', function () {
      var box = document.createElement('div');
      box.className = 'lightbox';
      var big = document.createElement('img');
      big.src = img.src;
      big.alt = img.alt;
      box.appendChild(big);
      box.addEventListener('click', function () { box.remove(); });
      document.body.appendChild(box);
    });
  });
})();

// Video testimonials: some browsers skip autoplay on load. Start muted clips explicitly
// when visible, and retry on the first tap or scroll.
(function () {
  var vids = [].slice.call(document.querySelectorAll('video[autoplay]'));
  if (!vids.length) return;
  function tryPlay(v) {
    v.muted = true;
    var p = v.play();
    if (p && p.catch) p.catch(function () {});
  }
  vids.forEach(tryPlay);
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting && e.target.paused) tryPlay(e.target); });
    }, { threshold: 0.3 });
    vids.forEach(function (v) { io.observe(v); });
  }
  ['pointerdown', 'scroll', 'keydown'].forEach(function (ev) {
    window.addEventListener(ev, function () { vids.forEach(function (v) { if (v.paused && !v.ended) tryPlay(v); }); }, { once: true, passive: true });
  });
})();
