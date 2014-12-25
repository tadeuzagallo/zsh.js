var CommandManager = require('../command-manager');
var FS = require('../fs');
var File = require('../file');

CommandManager.register('rmdir', rmdir);

function rmdir(args, stdin, stdout, stderr, next) {
  args.arguments.forEach(function (arg) {
    var file = new File(arg);

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
}
