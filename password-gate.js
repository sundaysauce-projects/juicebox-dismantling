(function () {
  var STORE_KEY = 'ss-preview-password-hash';
  function hex(buffer) {
    return Array.prototype.map.call(new Uint8Array(buffer), function (x) {
      return x.toString(16).padStart(2, '0');
    }).join('');
  }
  function digest(password) {
    var salt = new Uint8Array(window.SS_PREVIEW_GATE.salt.match(/../g).map(function (x) { return parseInt(x, 16); }));
    return crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']).then(function (key) {
      return crypto.subtle.deriveBits({ name: 'PBKDF2', salt: salt, iterations: window.SS_PREVIEW_GATE.iterations, hash: 'SHA-256' }, key, 256);
    }).then(hex);
  }
  function unlock(gate) {
    document.body.classList.remove('ss-pw-locked');
    if (gate) gate.remove();
  }
  function init() {
    var gate = document.getElementById('ss-password-gate');
    if (!gate || !window.SS_PREVIEW_GATE) return;
    if (sessionStorage.getItem(STORE_KEY) === window.SS_PREVIEW_GATE.hash) {
      unlock(gate);
      return;
    }
    document.body.classList.add('ss-pw-locked');
    var input = document.getElementById('ss-pw-input');
    var message = document.getElementById('ss-pw-message');
    if (input) input.focus();
    document.getElementById('ss-pw-form').addEventListener('submit', function (event) {
      event.preventDefault();
      message.textContent = '';
      digest(input.value).then(function (hash) {
        if (hash === window.SS_PREVIEW_GATE.hash) {
          sessionStorage.setItem(STORE_KEY, hash);
          unlock(gate);
        } else {
          message.textContent = 'Wrong password.';
          input.select();
        }
      }).catch(function () {
        message.textContent = 'Password check failed in this browser.';
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
