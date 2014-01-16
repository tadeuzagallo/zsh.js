var ArgsParser = require('./args-parser');

var CommandManager = {
  commands: {},
  aliases: {},
  isValid: function (cmd) {
    return !!(this.commands[cmd] || this.aliases[cmd]);
  },
  autoComplete: function (cmd) {
    var matches = [];

    (Object.keys(this.commands).concat(Object.keys(this.aliases))).forEach(function (command) {
      if (command.substr(0, cmd.length) === cmd) {
        matches.push(command);
      }
    });

    return matches;
  },
  exec: function (cmd, args, stdout) {
    if (this.aliases[cmd]) {
      var line = (this.aliases[cmd] + args).trim().split(' ');
      return this.exec(line.shift(), line.join(' '), stdout);
    }
    if (!this.commands[cmd]) {
      stdout('zsh: command not found: ' + cmd);
    } else {
      this.commands[cmd].call(undefined, ArgsParser.parse(args), stdout);
    }
  },
  register: function (cmd, fn) {
    this.commands[cmd] = fn;
  },
  alias: function (cmd, original) {
    this.aliases[cmd] = original;
  }
};

CommandManager.register('alias', function(args, stdout) {
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
        CommandManager.alias(key, command);
      }
    }
  }

  stdout('');
});

module.exports = CommandManager;
