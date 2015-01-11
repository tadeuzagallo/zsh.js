'use strict';

var FS = require('zsh.js/lib/fs');
var File = require('zsh.js/lib/file');

return function (args, stdin, stdout, stderr, next) {
  args.arguments.forEach(function (arg) {
    var file = File.open(arg);

    if (!file.exists()) {
      stderr.write(FS.notFound('rm', arg));
    } else if (!file.isValid()) {
      stderr.write(FS.error('rm', arg, 'Not a directory'));
    } else if (file.isDir()) {
      stderr.write(FS.error('rm', arg, 'is a directory'));
    } else {
      file.delete();
    }
  });

  FS.writeFS();
  next();
};
