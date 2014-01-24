var CommandManager = require('../command-manager');
var FS = require('../fs');
var File = require('../file');

CommandManager.register('mkdir', mkdir);

function mkdir(args, stdin, stdout, stderr, next) {
  args.arguments.forEach(function (arg) {
    var file = new File(arg);

    if (!file.parentExists()) {
      stderr.write(FS.notFound('mkdir', path));
    } else if (!file.isValid()) {
      stderr.write(FS.error('mkdir', path, 'Not a directory'));
    } else if (file.exists()) {
      stderr.write(FS.error('mkdir', path, 'File exists'));
    } else {
      dir[dirName] = {};
    }
  });

  FS.writeFS();
  next();
}
