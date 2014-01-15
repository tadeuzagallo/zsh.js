require('./commands');

window.CommandManager = {
  commands: window.commands,
  isValid: function (cmd) {
    return ~this.commands.indexOf(cmd);
  },
  autoComplete: function (cmd) {
    var matches = [];

    this.commands.forEach(function (command) {
      if (command.indexOf(cmd) == 0) {
        matches.push(command);
      }
    });

    return matches;
  },
  exec: function (cmd) {
    return 'zsh: command not found: ' + cmd;
  }
};

module.exports = CommandManager;
