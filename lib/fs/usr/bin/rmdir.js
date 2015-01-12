'use strict';

return function (args, stdin, stdout, stderr, next) {
  args.arguments.forEach(function (arg) {
    var file = ZSH.file.open(arg);

    if (!file.parentExists() || !file.exists()) {
      stderr.write(ZSH.fs.notFound('rmdir', arg));
    } else if (!file.isDir()) {
      stderr.write(ZSH.fs.error('rmdir', arg, 'Not a directory'));
    } else {
      file.delete();
    }
  });

  ZSH.fs.writeFS();
  next();
};
