var CommandManager = require('../command-manager');
var FS = require('../fs');

CommandManager.register('cd', cd);

function cd(args, stdin, stdout, stderr) {
  var directory = args.arguments[0] || '~';

  var path = FS.translatePath(directory);
  var dir = FS.open(path);

  if (dir) {
    if (typeof(dir) === 'object') {
      FS.currentPath = path;
      FS.currentDir = dir;
      stdout('');
    } else {
      stdout(FS.error('cd', directory, 'Is a file'));
    }
  } else {
    stdout(FS.notFound('cd', directory));
  }
}
