var FS = require('zsh.js/lib/fs');

return function (args, stdin, stdout, stderr, next) {
  var directory = args.arguments[0] || '~';

  var path = FS.translatePath(directory);
  var dir = FS.open(path);

  if (dir !== undefined) {
    if (typeof(dir) === 'object') {
      FS.currentPath = path;
      FS.currentDir = dir;
    } else {
      stderr.write(FS.error('cd', directory, 'Is a file'));
    }
  } else {
    stderr.write(FS.notFound('cd', directory));
  }

  FS.writeFS();
  next();
};
