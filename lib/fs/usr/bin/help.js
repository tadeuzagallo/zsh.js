'use strict';

return function (args, stdin, stdout, stderr, next) {
  stdout.write('commands:');
  stdout.write(Object.keys(ZSH.commandManager.commands).join(' '));

  stdout.write('\n');

  stdout.write('aliases:');
  stdout.write(Object.keys(ZSH.commandManager.aliases).map(function (key)  {
    return key + '="' + ZSH.commandManager.aliases[key] + '"';
  }).join(' '));

  next();
};
