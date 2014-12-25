var CommandManager = require('../command-manager');
var ArgsParser = require('../args-parser');

function echo(args, stdin, stdout, stderr, next) {
  try {
    stdout.write(ArgsParser.parseStrings(args.raw).join(' '));
  } catch (err) {
    stderr.write('zsh: ' + err.message);
  }
  
  next();
}

CommandManager.register('echo', echo);
