var FS = require('zsh.js/lib/fs');

return function (args, stdin, stdout, stderr, next) {
  args.arguments.forEach(function (arg) {
    var path = FS.translatePath(arg).split('/');
    var fileName = path.pop();
    path = path.join('/');
    var dir = FS.open(path);

    if (typeof(dir) === 'undefined') {
      stderr.write(FS.notFound('touch', arg));
    } else if (typeof(dir) !== 'object'){
      stderr.write(FS.error('touch', path, 'Not a directory'));
    } else {
      var time = new Date().toISOString();
      if (dir[fileName] === undefined) {
        dir[fileName] = {
          ctime: time,
          mtime: time,
          content: ''
        };
      } else {
        dir[fileName].mtime = time;
      }
    }
  });

  FS.writeFS();
  next();
};
