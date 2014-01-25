var CommandManager = require('../command-manager');
var File = require('../file');
var Console = require('../console');

CommandManager.register('source', source);

function source(args, stdin, stdout, stderr, next) {
  if (args.arguments.length) {
    var file = new File(args.arguments[0]);
    if (!file.exists()) {
      stderr.write('source: no such file or directory: ' + file.path);
    } else {
      try {
        file.read(function (contents) {
          var console = new Console(stdout, stderr);
          var result = JSON.stringify(eval(contents));
          stdout.write('<- ' + result);
        });
      } catch (err) {
        stderr.write(err.stack);
      }
    }
  } else {
    stderr.write('source: not enough arguments');
  }

  next();
}
