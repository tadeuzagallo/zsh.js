'use strict';

var CommandManager = require('zsh.js/lib/command-manager');

return function (args, stdin, stdout, stderr, next) {
  stdout.write('commands:');
  stdout.write(Object.keys(CommandManager.commands).join(' '));

  stdout.write('\n');

  stdout.write('aliases:');
  stdout.write(Object.keys(CommandManager.aliases).map(function (key)  {
    return key + '="' + CommandManager.aliases[key] + '"';
  }).join(' '));

  next();
};
