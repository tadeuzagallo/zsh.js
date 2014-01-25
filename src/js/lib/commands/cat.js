var CommandManager = require('../command-manager');
var FS = require('../fs');

CommandManager.register('cat', cat);

function cat(args, stdin, stdout, stderr, next) {
  args.arguments.forEach(function (arg) {
    var content = FS.open(arg);

    if (content !== undefined) {
      if (typeof(content) === 'string') {
        stdout.write(content);
      } else {
        stderr.write(FS.error('cat', arg, 'Is a directory'));
      }
    } else {
      stderr.write(FS.notFound('cat', arg));
    }
  });

  next();
}
