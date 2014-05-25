var CommandManager = require('../command-manager');
var FS = require('../fs');
var File = require('../file');

function mv(args, stdin, stdout, stderr, next) {
  'use strict';

  var targetPath = args.arguments.pop();
  var sourcePaths = args.arguments;
  var target = new File(targetPath);

  if (!targetPath ||
      !sourcePaths.length ||
        (sourcePaths.length > 1 &&
         (!target.exists() || target.isFile())
        )
     ) {
    stderr.write('usage: mv source target\n \t mv source ... directory');
  } else if (!target.parentExists()) {
      stderr.write(FS.notFound('mv', target.dirname));
  } else {
    target.read(function (contents) {
      var success = sourcePaths.reduce(function (success, sourcePath) {
        if (success) {
          var source = new File(sourcePath);

          if (!source.exists()) {
            stderr.write(FS.notFound('mv', sourcePaths[0]));
          } else if (source.isDir() && target.isFile()) {
            stderr.write(FS.error('mv', 'rename ' + sourcePaths[0] + ' to ' + targetPath, 'Not a directory'));
          } else {
            source.read(function (contents) {
              if (target.isDir()) {
                target.dir[target.filename][source.filename] = contents;
              } else {
                target.dir[target.filename] = contents;
              }
              source.delete();
            });
            return true;
          }
        }

        return false;
      }, true);

      if (success) {
        FS.writeFS();
      } else {
        target.dir[target.filename] = contents;
      }
    });
  }
  
  next();
}

CommandManager.register('mv', mv);
