var CommandManager = require('../command-manager');

function echo(args, stdin, stdout, stderr) {
  stdout(args.raw);
}

CommandManager.register('echo', echo);
