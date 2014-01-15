var CommandManager = require('../command-manager');
var Terminal = require('../terminal');

var clear = function (args, stdout) {
  Terminal.clear();
};

CommandManager.register('clear', clear);
