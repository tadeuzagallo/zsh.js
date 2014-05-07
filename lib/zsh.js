require('./commands');

var REPL = require('./REPL');
var stream = require('stream');
var bindFullScreen = require('./full-screen');
var pwd = require('./commands/pwd');

var ZSH = {};

ZSH.$PS1 = function () {
  return '<span class="who">guest</span> ' +
    'on ' +
    '<span class="where">' + pwd(true) + '</span> '+
    '<span class="branch">±master</span>&gt;';
};

ZSH.prompt = function () {
  var row = document.createElement('div');

  var span = document.createElement('span');
  span.className = 'ps1';
  span.innerHTML = ZSH.$PS1();


  var code = document.createElement('span');
  code.className = 'code';

  row.appendChild(span);
  row.appendChild(code);

  ZSH.container.appendChild(row);

  REPL.use(code, ZSH);

  ZSH.status(pwd(true));

  ZSH.scroll();
};

ZSH.status = function(text) {
  if (this.statusbar) {
    this.statusbar.innerText = text;
  }
};

ZSH.init = function (container, statusbar) {
  this.rootContainer = this.container = container;
  this.statusbar = statusbar;
  this.prompt();
  bindFullScreen(this.container.parentElement, this.scroll);
};

ZSH.create = function (container) {
  if (typeof container === 'string') {
    container = document.getElementById(container);
  }

  container.innerHTML = 
    '<div class="terminal">' +
      '<div class="bar">' +
        '<div class="buttons">' +
          '<a class="close" href="#"></a>' +
          '<a class="minimize" href="#"></a>' +
          '<a class="maximize" href="#"></a>' +
        '</div>' +
        '<div class="title">' +
        '</div>' +
        '<a class="full-screen" href="#"></a>' +
      '</div>' +
      '<div class="content">' +
      '</div>' +
      '<div class="status-bar">' +
      '</div>' +
    '</div>';

  this.init(container.querySelector('.content'), 
            container.querySelector('.status-bar'));
};

ZSH.update = function () {
  codes = this.container.getElementsByClassName('code');

  if (!codes.length) {
    this.prompt();
  } else {
    REPL.use(codes[codes.length - 1]);
  }
};

ZSH.stdout = new stream.PassThrough();
ZSH.stdout.on('data', function (data) {
  output(data.toString(), 'stdout');
});

ZSH.stderr = new stream.PassThrough();
ZSH.stderr.on('data', function (data) {
  output(data.toString(), 'stderr');
});

function output (_output, _class) {
  var out = document.createElement('div');
  out.className = 'code ' + [_class];
  out.innerHTML = _output;

  ZSH.container.appendChild(out);
  ZSH.scroll();
}

ZSH.scroll = function () {
  setTimeout(function () {
    ZSH.rootContainer.scrollTop = ZSH.rootContainer.scrollHeight;
  }, 0);
};

(typeof require === 'undefined' ? window : global).ZSH = ZSH;
console.log(ZSH);
module.exports = ZSH;
