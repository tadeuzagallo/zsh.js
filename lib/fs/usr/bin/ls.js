var FS = require('zsh.js/lib/fs');
var File = require('zsh.js/lib/file');

return function (args, stdin, stdout, stderr, next) {
  var outputs = [];

  if (!args.arguments.length) {
    args.arguments.push('.');
  }

  args.arguments.forEach(function (arg) {
    var dir = File.open(arg);

    if (!dir.exists()) {
      stderr.write(FS.notFound('ls', arg));
    } else if (dir.isFile()) {
      stderr.write(FS.error('ls', arg, 'Is a file'));
    } else {
      var files = Object.keys(dir.read());

      if (!args.options.a) {
        files = files.filter(function (file) {
          return file[0] !== '.';
        });
      }

      if (args.arguments.length > 1) {
        stdout.write(arg + ':');
      }

      stdout.write(files.join(args.options.l ? '\n' : ' '));
    }
  });

  next();
};
