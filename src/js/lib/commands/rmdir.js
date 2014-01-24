var CommandManager = require('../command-manager');
var FS = require('../fs');

CommandManager.register('rmdir', rmdir);

function rmdir(args, stdin, stdout, stderr, next) {
  args.arguments.forEach(function (arg) {
    var path = arg.split('/');
    var dirName = path.pop();
    path = path.join('/');
    var dir = FS.open(path);

    if (dir === undefined) {
      stderr.write(FS.notFound('rmdir', arg));
    } else if (typeof(dir) !== 'object' || typeof(dir[dirName]) !== 'object'){
      stderr.write(FS.error('rmdir', arg, 'Not a directory'));
    } else if (dir[dirName] === undefined) {
      stderr.write(FS.notFound('rmdir', arg));
    } else {
      delete dir[dirName];
    }
  });

  FS.writeFS();
  next();
}
