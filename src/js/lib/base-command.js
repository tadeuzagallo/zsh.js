var Command = (function () {
  function Command(name) {
    (window.commands = window.commands || []).push(name);
    this.name = name;
  }

  return Command;
})();

module.exports = Command;
