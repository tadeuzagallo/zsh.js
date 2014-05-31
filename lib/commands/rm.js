var CommandManager = require('../command-manager');
var FS = require('../fs');
var File = require('../file');

CommandManager.register('rm', rm);

function rm(args, stdin, stdout, stderr, next) {
  args.arguments.forEach(function (arg) {
    var file = new File(arg);

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
}
