'use strict';

var FS = require('zsh.js/lib/fs');
var File = require('zsh.js/lib/file');

return function (args, stdin, stdout, stderr, next) {
  args.arguments.forEach(function (path) {
    var file = File.open(path);

    if (!file.parentExists()) {
      stderr.write(FS.notFound('mkdir', path));
    } else if (!file.isValid()) {
      stderr.write(FS.error('mkdir', path, 'Not a directory'));
    } else if (file.exists()) {
      stderr.write(FS.error('mkdir', path, 'File exists'));
    } else {
      file.createFolder();
    }
  });

  FS.writeFS();
  next();
};
