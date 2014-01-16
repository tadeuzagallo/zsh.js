var CommandManager = require('../command-manager');

function echo(args, stdin, stdout, stderr, next) {
  stdout.write(args.raw);
  next();
}

CommandManager.register('echo', echo);
