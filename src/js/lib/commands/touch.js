var CommandManager = require('../command-manager');
var FS = require('../fs');

CommandManager.register('touch', touch);

function touch(args, stdin, stdout, stderr, next) {
  args.arguments.forEach(function (arg) {
    var path = arg.split('/');
    var fileName = path.pop();
    path = path.join('/');
    var dir = FS.open(path);

    if (!dir) {
      stderr.write(FS.notFound('touch', arg));
    } else if (typeof(dir) !== 'object'){
      stderr.write(FS.error('touch', path, 'Not a directory'));
    } else if (!dir[fileName]) {
      dir[fileName] = '';
    }
  });

  FS.writeFS();
  next();
}
