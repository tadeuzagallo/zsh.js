require('./lib/site-helpers');
require('./main');

document.addEventListener('DOMContentLoaded', function (e) {
  var _onkeydown = window.onkeydown;
  var p = function () {};

  var codesFromString = function(string) {
    return [].map.call(string.toUpperCase(), function (a) {
      return a.charCodeAt(0);
    });
  };

  var codes = codesFromString('about').concat([13]).concat(codesFromString('help'));
  var i = 0;

  var interval = setInterval(function () {
    _onkeydown({ preventDefault: p, keyCode: codes[i++] });

    if (i >= codes.length) {
      clearInterval(interval);
      window.onkeydown = _onkeydown;
    } else {
      window.onkeydown = null;
    }
  }, 200);
});
