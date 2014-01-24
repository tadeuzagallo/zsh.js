var CommandManager = require('../command-manager');
var FS = require('../fs');

CommandManager.register('mkdir', mkdir);

function mkdir(args, stdin, stdout, stderr, next) {
  args.arguments.forEach(function (arg) {
    var path = arg.split('/');
    var dirName = path.pop();
    path = path.join('/');
    var dir = FS.open(path);

    if (dir === undefined) {
      stderr.write(FS.notFound('mkdir', path));
    } else if (typeof(dir) !== 'object'){
      stderr.write(FS.error('mkdir', path, 'Not a directory'));
    } else if (dir[dirName] !== undefined) {
      stderr.write(FS.error('mkdir', path, 'File exists'));
    } else {
      dir[dirName] = {};
    }
  });

  FS.writeFS();
  next();
}
