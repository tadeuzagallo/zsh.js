var CommandManager = require('../command-manager');
var FS = require('../fs');

CommandManager.register('ls', ls);

function ls(args, stdin, stdout, stderr) {
  var outputs = [];

  if (!args.arguments.length) {
    args.arguments.push('.');
  }

  args.arguments.forEach(function (arg) {
    var dir = FS.open(arg);

    outputs.push({
      path: arg,
      success: !!dir,
      files: dir ? Object.keys(dir).join(' ') : FS.notFound('ls', arg)
    });
  });

  if (outputs.length === 1) {
    stdout(outputs.shift().files);
  } else {
    var out = '';
    outputs.forEach(function (output) {
      out += (output.success ? output.path+':\n' + output.files:output.files) + '\n';
    });
    stdout(out);
  }
}
