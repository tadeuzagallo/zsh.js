var CommandManager = require('../command-manager');
var FS = require('../fs');
var File = require('../file');

function mv(args, stdin, stdout, stderr, next) {
  'use strict';

  var targetPath = args.arguments.pop();
  var sourcePaths = args.arguments;

  if (!targetPath || !sourcePaths.length) {
    stderr.write('usage: mv source target'); //\n \t mv source ... directory');
  } else {
    var source = new File(sourcePaths[0]);
    var target = new File(targetPath);

    if (!target.parentExists()) {
      stderr.write(FS.notFound('mv', target.dirname));
    } else if (!source.exists) {
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
    }
  }
  
  //args.arguments.forEach(function (arg) {
    //var path = arg.split('/');
    //var fileName = path.pop();
    //path = path.join('/');
    //var dir = FS.open(path);

    //if (dir === undefined) {
      //stderr.write(FS.notFound('rm', arg));
    //} else if (typeof(dir) !== 'object'){
      //stderr.write(FS.error('rm', arg, 'Not a directory'));
    //} else if (dir[fileName] === undefined) {
      //stderr.write(FS.notFound('rm', arg));
    //} else if (typeof(dir[fileName]) === 'object') {
      //stderr.write(FS.error('rm', arg, 'is a directory'));
    //} else {
      //delete dir[fileName];
    //}
  //});

  //FS.writeFS();
  next();
}

CommandManager.register('mv', mv);
