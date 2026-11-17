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
