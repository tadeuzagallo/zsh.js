var CommandManager = require('../command-manager');
var FS = require('../fs');

CommandManager.register('cat', cat);

function cat(args, stdin, stdout, stderr, next) {
  var out = [];

  args.arguments.forEach(function (arg) {
    var content = FS.open(arg);

    if (content !== undefined) {
      if (typeof(content) === 'string') {
        out.push(content);
      } else {
        out.push(FS.error('cat', arg, 'Is a directory'));
      }
    } else {
      out.push(FS.notFound('cat', arg));
    }
  });

  stdout.write(out.join('\n'));
  next();
}
