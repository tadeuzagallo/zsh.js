'use strict';

return function (args, stdin, stdout, stderr, next) {
  var buffer = '';
  if (args.arguments.length) {
    var key = args.arguments.shift();
    var index;
    if (~(index = key.indexOf('='))) {
      var command;

      if (args.arguments.length && index === key.length - 1) {
        command = args.arguments.join(' ');
      } else {
        command = key.substr(index+1);
      }

      key = key.substr(0, index);

      if (command) {
        ZSH.commandManager.alias(key, command);
      }
    }
  } else {
    var aliases = ZSH.commandManager.alias();

    for (var i in aliases) {
      buffer += i + '=\'' + aliases[i] + '\'\n';
    }
  }

  stdout.write(buffer);
  next();
};
