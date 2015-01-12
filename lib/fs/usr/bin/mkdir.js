'use strict';

return function (args, stdin, stdout, stderr, next) {
  args.arguments.forEach(function (path) {
    var file = ZSH.file.open(path);

    if (!file.parentExists()) {
      stderr.write(ZSH.fs.notFound('mkdir', path));
    } else if (!file.isValid()) {
      stderr.write(ZSH.fs.error('mkdir', path, 'Not a directory'));
    } else if (file.exists()) {
      stderr.write(ZSH.fs.error('mkdir', path, 'File exists'));
    } else {
      file.createFolder();
    }
  });

  ZSH.fs.writeFS();
  next();
};
