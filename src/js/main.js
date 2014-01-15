require('./lib/commands');
var Terminal = require('./lib/terminal');
var Tmux = require('./lib/tmux');

Terminal.init(document.getElementById('content'), document.getElementById('status-bar'));
Tmux.init(Terminal);
