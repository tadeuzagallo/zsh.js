'use strict';

return function (args, stdin, stdout, stderr, next) {
  args.arguments.forEach(function (path) {
    var file = ZSH.file.open(path);

    if (!file.parentExists()) {
      stderr.write(ZSH.fs.notFound('touch', path));
    } else if (!file.isValid()){
      stderr.write(ZSH.fs.error('touch', path, 'Not a directory'));
    } else {
      file.write('', true, true);
    }
  });

  ZSH.fs.writeFS();
  next();
};
