'use strict';

return function (args, stdin, stdout, stderr, next) {
  args.arguments.forEach(function (path) {
    var file = ZSH.file.open(path);

    if (!file.exists()) {
      stderr.write(ZSH.fs.notFound('cat', path));
    } else if (file.isDir()) {
      stderr.write(ZSH.fs.error('cat', path, 'Is a directory'));
    } else {
      stdout.write(file.read());
    }
  });

  next();
};
