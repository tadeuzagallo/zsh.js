var CommandManager = require('./command-manager');

var REPL_MODE_DEFAULT = 1;
var REPL_MODE_VI = 1;

var LEFT = 37;
var UP = 38;
var RIGHT = 39;
var DOWN = 40;

var TAB = 9;

var ESC = 27;

var ENTER = 13;

var BACKSPACE = 8;

var R = 82;

var SPACE = 32;

window.REPL = {
  mode: REPL_MODE_DEFAULT,
  input: '',
  index: 0,
  _history: [],
  history: [],
  historyIndex: 0,
  listeners: {},
  lastKey: null,
};

REPL.on = function(event, callback) {
  ((this.listeners[event] = this.listeners[event] || [])).push(callback);
};

REPL.caret = (function () {
  var caret = document.createElement('span');
  caret.className = 'caret';

  return caret;
}());

REPL.use = function (span) {
  if (this.span) {
    this.removeCaret();
  }

  this.span = span;
  var self = this;

  window.onkeydown = function(e) {
    self.parse(e);
  };

  this.write();

  return this;
};

REPL.parse = function (event) {
  if (event.metaKey) {
    return;
  }

  event.preventDefault();

  switch (event.keyCode) {
    case LEFT:
    case RIGHT:
      this.moveCaret(event.keyCode);
      break;
    case UP:
    case DOWN:
      this.navigateHistory(event.keyCode);
      break;
    case TAB:
      this.autoComplete();
      break;
    case ENTER:
      this.submit();
      break;
    case BACKSPACE:
      this.backspace();
      break;
    default:
      this.update(event);
  }
};

REPL.moveCaret = function (direction) {
    if (direction == LEFT) {
      this.index = Math.max(this.index - 1, 0);
    } else {
      this.index = Math.min(this.index + 1, this.input.length + 1);
    }
    this.write();
};

REPL.autoComplete = function () {
  if (this.command() === this.input) {
    options = CommandManager.autoComplete(this.command());

    if (options.length === 1) {
      this.input = options.shift() + ' ';
      this.index = this.input.length;
      this.write();
    } else {
      this.trigger('output', options.join(' '));
    }
  }
};

REPL.navigateHistory = function (direction) {
  if (direction === UP) {
    this.historyIndex = Math.max(this.historyIndex - 1, 0);
  } else {
    this.historyIndex = Math.min(this.historyIndex + 1, this.history.length - 1);
  }

  this.input = this.history[this.historyIndex];
  this.index = this.input.length;
  this.write();
};

REPL.submit = function () {
  var input = this.input.trim();
  var cmd = this.command();
  var args = this.commandArgsString();

  this._history[this._history.length] = this.input;
  this.history = this._history.slice(0);
  this.historyIndex = this.history.length;

  this.clear();

  if (input) {
    CommandManager.exec(cmd, args, function (output) {
      REPL.trigger('output', output);
    });
  } else {
    this.trigger('output', '');
  }
};

REPL.trigger = function(evt, msg) {
  var callbacks = this.listeners[evt] || [];

  callbacks.forEach(function (callback) {
    callback(msg);
  });
};

REPL.removeCaret = function () {
  var caret = this.span.getElementsByClassName('caret');

  if (caret && caret[0]) {
    caret[0].remove();
  }
};

REPL.clear = function () {
  this.input = '';
  this.index = 0;
};

REPL.backspace = function () {
  if (this.index > 0) {
    this.input = this.input.substr(0, this.index - 1) + this.input.substr(this.index);
    this.index--;
    this.write();
  }
};

REPL.actualCharCode = function (code) {
  if (code >= 65 && code <= 90) {
    if (!event.shiftKey) {
      code += 32;
    }
  } else if (code >= 48 && code <= 57) {
    if (event.shiftKey) {
      code = ')!@#$%^&*('.charCodeAt(code - 48);
    }
  } else if (code >= 186 && code <= 192){
    options = ';=,-./`:+<_>?~';

    code -= 186;

    if (event.shiftKey) {
      code += options.length / 2;
    }

    code = options.charCodeAt(code);
  } else if (code >= 219 && code <= 222) {
    options = '[\\]\'{|}"';
    code -= 219;

    if (event.shiftKey) {
      code += options.length / 2;
    }

    code = options.charCodeAt(code);
  } else if (code != SPACE) {
    code = -1;
  }

  return code;
};

REPL.update = function(event) {
  code = this.actualCharCode(event.keyCode);

  if (!~code) {
    return;
  }

  char = String.fromCharCode(code);

  this.input = this.input.substr(0, this.index) + char + this.input.substr(this.index);
  this.index++;
  this.write();
};

REPL.command = function () {
  if (this.input !== this.__input_command) {
    this.__input_command = this.input;
    this.__command = this.input.split(' ').shift();
  }

  return this.__command;
};

REPL.commandArgsString = function () {
  if (this.input !== this.__input_cargs) {
    this.__input_cargs = this.input;
    this.__cargs = this.input.substr(this.command().length);
  }

  return this.__cargs;
};

REPL.write = function () {
  this.history[this.historyIndex] = this.input;
  this.caret.innerText = this.input[this.index] || '';

  var span = document.createElement('span');
  var command = this.command();
  var input = this.commandArgsString();
  var self = this;

  var putCaret = function (str, index) {
    self.caret.innerText = str[index] || ' ';
    return str.substr(0, index) + self.caret.outerHTML + str.substr(index + 1);
  };

  span.className = CommandManager.isValid(command) ? 'valid' : 'invalid';

  if (this.index < command.length) {
    command = putCaret(command, this.index);
  } else {
    input = putCaret(input, this.index - command.length);
  }

  span.innerHTML = command;

  this.span.innerHTML = span.outerHTML + input;
};

module.exports = REPL;
