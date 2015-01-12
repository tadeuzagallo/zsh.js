'use strict';

return function (args, stdin, stdout, stderr, next) {
  var path = args.arguments[0] || '~';
  var dir = ZSH.file.open(path);

  if (!dir.exists()) {
    stderr.write(ZSH.fs.notFound('cd', path));
  } else if (dir.isFile()) {
    stderr.write(ZSH.fs.error('cd', path, 'Is a file'));
  } else {
    ZSH.fs.currentPath = dir.path;
    ZSH.fs.currentDir = dir.self();
  }

  ZSH.fs.writeFS();
  next();
};
