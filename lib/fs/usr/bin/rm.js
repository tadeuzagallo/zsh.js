'use strict';

return function (args, stdin, stdout, stderr, next) {
  args.arguments.forEach(function (arg) {
    var file = ZSH.file.open(arg);

    if (!file.exists()) {
      stderr.write(ZSH.fs.notFound('rm', arg));
    } else if (!file.isValid()) {
      stderr.write(ZSH.fs.error('rm', arg, 'Not a directory'));
    } else if (file.isDir()) {
      stderr.write(ZSH.fs.error('rm', arg, 'is a directory'));
    } else {
      file.delete();
    }
  });

  ZSH.fs.writeFS();
  next();
};
