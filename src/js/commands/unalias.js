var CommandManager = require('../command-manager');

CommandManager.register('unalias', unalias);

function unalias(args, stdin, stdout, stderr, next) {
  var cmd = args.arguments[0];

  if (cmd) {
    CommandManager.unalias(cmd);
  }

  next();
}
