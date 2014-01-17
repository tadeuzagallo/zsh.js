var ArgsParser = require('./args-parser');

var CommandManager = {
  commands: {},
  aliases: {},
};

CommandManager.isValid = function (cmd) {
  return !!(this.commands[cmd] || this.aliases[cmd]);
};

CommandManager.autoComplete = function (cmd) {
  var matches = [];

  (Object.keys(this.commands).concat(Object.keys(this.aliases))).forEach(function (command) {
    if (command.substr(0, cmd.length) === cmd) {
      matches.push(command);
    }
  });

  return matches;
};

CommandManager.exec = function (cmd, args, stdin, stdout, stderr, next) {
  if (this.aliases[cmd]) {
    var line = (this.aliases[cmd] + ' ' + args).trim().split(' ');
    return this.exec(line.shift(), line.join(' '), stdin, stdout, stderr, next);
  }
  if (!this.commands[cmd]) {
    stdout.write('zsh: command not found: ' + cmd);
    next();
  } else {
    this.commands[cmd].call(undefined, ArgsParser.parse(args), stdin, stdout, stderr, next);
  }
};

CommandManager.register = function (cmd, fn) {
  this.commands[cmd] = fn;
};

CommandManager.alias = function (cmd, original) {
  if (arguments.length === 0) {
    return this.aliases;
  }
  this.aliases[cmd] = original;
};

CommandManager.get = function(cmd) {
  return this.commands[cmd];
};

module.exports = CommandManager;
