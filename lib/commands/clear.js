var CommandManager = require('../command-manager');
var zsh = require('../zsh');

var clear = function () {
  zsh.container.innerHTML = '';
  zsh.prompt();
};

CommandManager.register('clear', clear);
