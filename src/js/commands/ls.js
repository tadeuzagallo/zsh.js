var CommandManager = require('../command-manager');
var FS = require('../fs');

CommandManager.register('ls', ls);

function ls(args, stdin, stdout, stderr, next) {
  var outputs = [];

  if (!args.arguments.length) {
    args.arguments.push('.');
  }

  args.arguments.forEach(function (arg) {
    var dir = FS.open(arg);

    if (typeof(dir) !== 'object') {
      if (dir === undefined) {
        stderr.write(FS.notFound('ls', arg));
      } else {
        stderr.write(FS.error('ls', arg, 'Is a file'));
      }

      return;
    }

    var files = Object.keys(dir);

    if (!args.options.a) {
      files = files.filter(function (file) {
        return file[0] !== '.';
      });
    }

    if (args.arguments.length > 1) {
      stdout.write(arg + ':');
    }

    stdout.write(files.join(args.options.l ? '\n' : ' '));
  });

  next();
}
