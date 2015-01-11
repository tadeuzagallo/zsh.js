'use strict';

var CommandManager = require('zsh.js/lib/command-manager');

return function (args, stdin, stdout, stderr, next) {
  var cmd = args.arguments[0];

  if (cmd) {
    CommandManager.unalias(cmd);
  }

  next();
};
