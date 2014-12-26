var FS = require('zsh.js/lib/fs');
var File = require('zsh.js/lib/file');

return function (args, stdin, stdout, stderr, next) {
  args.arguments.forEach(function (arg) {
    var file = new File(arg);

    if (!file.parentExists()) {
      stderr.write(FS.notFound('mkdir', path));
    } else if (!file.isValid()) {
      stderr.write(FS.error('mkdir', path, 'Not a directory'));
    } else if (file.exists()) {
      stderr.write(FS.error('mkdir', path, 'File exists'));
    } else {
      var time = new Date().toISOString();
      file.dir[file.filename] = {
        ctime: time,
        mtime: time,
        content: {}
      };
    }
  });

  FS.writeFS();
  next();
};
