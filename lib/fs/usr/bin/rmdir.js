'use strict';

var FS = require('zsh.js/lib/fs');
var File = require('zsh.js/lib/file');

return function (args, stdin, stdout, stderr, next) {
  args.arguments.forEach(function (arg) {
    var file = File.open(arg);

    if (!file.parentExists() || !file.exists()) {
      stderr.write(FS.notFound('rmdir', arg));
    } else if (!file.isDir()) {
      stderr.write(FS.error('rmdir', arg, 'Not a directory'));
    } else {
      file.delete();
    }
  });

  FS.writeFS();
  next();
};
