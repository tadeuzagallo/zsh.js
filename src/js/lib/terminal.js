var REPL = require('./REPL');
var FS = require('./fs');
var CommandManager = require('./command-manager');
var stream = require('stream');
var bindFullScreen = require('./full-screen');
var pwd = require('./commands/pwd');

(typeof window === 'undefined' ? GLOBAL : window).Terminal = {};

Terminal.$PS1 = function () {
  return '<span class="who">guest</span> ' +
    'on ' +
    '<span class="where">' + pwd(true) + '</span> '+
    '<span class="branch">±master</span>&gt;';
};

Terminal.prompt = function () {
  var row = document.createElement('div');

  var span = document.createElement('span');
  span.className = 'ps1';
  span.innerHTML = this.$PS1();


  var code = document.createElement('span');
  code.className = 'code';

  row.appendChild(span);
  row.appendChild(code);

  this.container.appendChild(row);

  REPL.use(code);

  this.status(pwd(true));

  this.scroll();
};

Terminal.status = function(text) {
  if (this.statusbar) {
    this.statusbar.innerText = text;
  }
};

Terminal.init = function (container, statusbar) {
  this.rootContainer = this.container = container;
  this.statusbar = statusbar;
  this.prompt();
  bindFullScreen();
};

Terminal.update = function () {
  codes = this.container.getElementsByClassName('code');

  if (!codes.length) {
    this.prompt();
  } else {
    REPL.use(codes[codes.length - 1]);
  }
};

Terminal.stdout = new stream.PassThrough();
Terminal.stdout.on('data', function (data) {
  output(data.toString(), 'stdout');
});

Terminal.stderr = new stream.PassThrough();
Terminal.stderr.on('data', function (data) {
  output(data.toString(), 'stderr');
});

function output (_output, _class) {
  var out = document.createElement('div');
  out.className = 'code ' + [_class];
  out.innerHTML = _output;

  Terminal.container.appendChild(out);
  Terminal.scroll();
}

Terminal.scroll = function () {
  setTimeout(function () {
    Terminal.rootContainer.scrollTop = Terminal.rootContainer.scrollHeight;
  }, 0);
};

Terminal.clear = function () {
  Terminal.container.innerHTML = '';
  Terminal.prompt();
};

CommandManager.register('clear', Terminal.clear);

module.exports = Terminal;
