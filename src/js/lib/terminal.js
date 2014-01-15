var REPL = require('./REPL');

window.Terminal = {
  $PS1: '<span class="who">guest</span>\
        at\
        <span class="where">tadeuzagallo.com/~</span>\
        <span class="branch">±master</span>&gt;',
  prompt: function () {
    var row = document.createElement('div');

    var span = document.createElement('span');
    span.className = 'ps1';
    span.innerHTML = this.$PS1;


    var code = document.createElement('span');
    code.className = 'code';

    row.appendChild(span);
    row.appendChild(code);

    this.container.appendChild(row);

    REPL.use(code);
  },
  init: function (element) {
    this.container = element;
    this.prompt();

    REPL.on('output', function (output) {
      terminal.output(output);
      terminal.prompt();
    });
  },
  output: function (output) {
    var out = document.createElement('div');
    out.className = 'code';
    out.innerHTML = output;

    this.container.appendChild(out);
  },
  clear: function () {
    this.container.innerHTML = '';
    this.prompt();
  }
};

module.exports = Terminal;
