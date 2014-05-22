var CommandManager = require('../command-manager');
var FS = require('../fs');

function mv(args, stdin, stdout, stderr, next) {
  'use strict';

  var targetPath = args.arguments.pop();
  var sourcePaths = args.arguments;

  if (target) {
  }

  args.arguments.forEach(function (arg) {
    var path = arg.split('/');
    var fileName = path.pop();
    path = path.join('/');
    var dir = FS.open(path);

    if (dir === undefined) {
      stderr.write(FS.notFound('rm', arg));
    } else if (typeof(dir) !== 'object'){
      stderr.write(FS.error('rm', arg, 'Not a directory'));
    } else if (dir[fileName] === undefined) {
      stderr.write(FS.notFound('rm', arg));
    } else if (typeof(dir[fileName]) === 'object') {
      stderr.write(FS.error('rm', arg, 'is a directory'));
    } else {
      delete dir[fileName];
    }
  });

  FS.writeFS();
  next();
}

CommandManager.register('mv', mv);
