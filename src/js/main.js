require('./lib/commands');
var Terminal = require('./lib/terminal');
var Tmux = require('./lib/tmux');

document.addEventListener('DOMContentLoaded', function (e) {
  Terminal.init(document.getElementById('content'), document.getElementById('status-bar'));
  Tmux.init(Terminal);
});
