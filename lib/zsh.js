'use strict';

var CommandManager = require('./command-manager');
var REPL = require('./REPL');
var Stream = require('./stream');
var bindFullScreen = require('./full-screen');
var FS = require('./fs');

var ZSH = {
  argsParser: require('./args-parser'),
  commandManager: require('./command-manager'),
  Console: require('./console'),
  file: require('./file'),
  fs: require('./fs'),
  localStorage: require('./local-storage'),
  repl: require('./repl'),
  stream: require('./stream')
};

var pwd = function () {
  return FS.currentPath.replace(FS.home, '~');
};

ZSH.$PS1 = function () {
  return '<span class="who">guest</span> ' +
    'on ' +
    '<span class="where">' + pwd() + '</span> '+
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

  ZSH.status(pwd());

  ZSH.scroll();

  row.appendChild(ZSH.input);

  ZSH.input.focus();
};

ZSH.status = function(text) {
  if (this.statusbar) {
    this.statusbar.innerText = text;
  }
};

ZSH.init = function (container, statusbar) {
  this.rootContainer = this.container = container;
  this.statusbar = statusbar;
  this.initializeInput();
  this.prompt();
  bindFullScreen(this.container.parentElement, this.scroll);
};

ZSH.initializeInput = function () {
  var input = document.createElement('input');
  input.className = 'fake-input';
  this.rootContainer.addEventListener('click', function (e) {
    e.preventDefault();
    if (input === document.activeElement) {
      input.blur();
    } else {
      input.focus();
    }
  });

  this.input = input;
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
  var codes = this.container.getElementsByClassName('code');

  if (!codes.length) {
    this.prompt();
  } else {
    REPL.use(codes[codes.length - 1], ZSH);
  }
};

function output (_output, _class) {
  var out = document.createElement('div');
  out.className = 'code ' + [_class];
  out.innerHTML = _output;

  ZSH.container.appendChild(out);
  ZSH.scroll();
}

ZSH.stdout = new Stream();
ZSH.stdout.on('data', function (data) {
  output(data.toString(), 'stdout');
});

ZSH.stderr = new Stream();
ZSH.stderr.on('data', function (data) {
  output(data.toString(), 'stderr');
});

ZSH.scroll = function () {
  setTimeout(function () {
    ZSH.rootContainer.scrollTop = ZSH.rootContainer.scrollHeight;
  }, 0);
};

ZSH.clear = function () {
  ZSH.container.innerHTML = '';
  ZSH.prompt();
};

CommandManager.register('clear', ZSH.clear);

(typeof require === 'undefined' ? window : global).ZSH = ZSH;
module.exports = ZSH;
