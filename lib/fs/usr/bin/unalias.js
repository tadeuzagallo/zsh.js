'use strict';

return function (args, stdin, stdout, stderr, next) {
  var cmd = args.arguments[0];

  if (cmd) {
    ZSH.commandManager.unalias(cmd);
  }

  next();
};
