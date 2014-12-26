var FS = require('zsh.js/lib/fs');

return function (args, stdin, stdout, stderr, next) {
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
};
