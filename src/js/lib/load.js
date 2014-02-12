module.exports = function load(url, fn) {
  var req = new XMLHttpRequest();
  req.open('GET', url);

  req.onload = function () {
    if (req.status >= 200 && req.status < 400) {
      fn(req.responseText);
    }
  };

  req.send();
};
