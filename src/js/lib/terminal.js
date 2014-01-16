var REPL = require('./REPL');
var FS = require('./fs');
var CommandManager = require('./command-manager');

(window || GLOBAL).Terminal = {};

Terminal.$PS1 = function () {
  return '<span class="who">guest</span> ' +
      'on ' +
      '<span class="where">' + FS.pwd(true) + '</span> '+
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

  this.status(FS.currentPath);
};

Terminal.status = function(text) {
  if (this.statusbar) {
    this.statusbar.innerText = text;
  }
};

Terminal.init = function (container, statusbar) {
  this.rootContainer = this.container = container;
  this.statusbar = statusbar;

  REPL.on('output', function (output) {
    Terminal.stdout(output);
    Terminal.prompt();
  });

  this.prompt();
};

Terminal.update = function () {
  codes = this.container.getElementsByClassName('code');

  if (!codes.length) {
    this.prompt();
  } else {
    REPL.use(codes[codes.length - 1]);
  }
};

Terminal.stdout = function (output) {
  var out = document.createElement('div');
  out.className = 'code';
  out.innerHTML = output.trim();

  this.container.appendChild(out);

  var self = this;
  setTimeout(function () {
    self.rootContainer.scrollTop = self.rootContainer.scrollHeight + out.clientHeight;
  }, 0);
};

Terminal.stderr = function (err) {
  this.ouput(err);
};

Terminal.clear = function () {
  Terminal.container.innerHTML = '';
  Terminal.prompt();
};

CommandManager.register('clear', Terminal.clear);

module.exports = Terminal;
