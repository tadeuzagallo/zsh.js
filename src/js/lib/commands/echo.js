var CommandManager = require('../command-manager');

function echo(args, stdout) {
  stdout(args.raw);
}

CommandManager.register('echo', echo);
