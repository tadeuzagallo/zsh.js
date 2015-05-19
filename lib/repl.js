import CommandManager from './command-manager';
import LocalStorage from './local-storage';
import FS from './fs';

// TODO: Implement VI bindings

const LEFT = 37;
const UP = 38;
const RIGHT = 39;
const DOWN = 40;

const TAB = 9;
const ENTER = 13;
const BACKSPACE = 8;
const SPACE = 32;

const HISTORY_STORAGE_KEY = 'TERMINAL_HISTORY';
const HISTORY_SIZE = 100;
const HISTORY_SEPARATOR = '%%HISTORY_SEPARATOR%%';

export default class REPL {
  constructor(zsh) {
    this.input = '';
    this.index = 0;
    this.listeners = {};
    this.lastKey = null;
    this.zsh = zsh;

    this.fullHistory = ([LocalStorage.getItem(HISTORY_STORAGE_KEY)] + '').split(HISTORY_SEPARATOR).filter(String);
    this.history = this.fullHistory.slice(0) || [];
    this.historyIndex = this.history.length;

    this.createCaret();
    zsh.stdin.on('data', (event) => this.parse(event));
  }

  createCaret() {
    this.caret = document.createElement('span');
    this.caret.className = 'caret';
  }

  on(event, callback) {
    ((this.listeners[event] = this.listeners[event] || [])).push(callback);
  }

  use(span) {
    this.span && this.removeCaret();
    this.span = span;
    this.write();
    return this;
  }

  parse(event) {
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
        this.autocomplete();
        break;
      case ENTER:
        this.submit();
        break;
      case BACKSPACE:
        this.backspace();
        break;
      default:
        if (event.ctrlKey) {
          this.action(event);
        } else {
          this.update(event);
        }
    }
  }

  moveCaret(direction) {
    if (direction === LEFT) {
      this.index = Math.max(this.index - 1, 0);
    } else {
      this.index = Math.min(this.index + 1, this.input.length + 1);
    }
    this.write();
  }

  autocomplete() {
    var options;
    var path = false;

    if (this.command() === this.input) {
      options = this.zsh.CommandManager.autocomplete(this.command());
    } else {
      path = this.input.split(' ').pop();
      options = FS.autocomplete(path);
    }

    if (options.length === 1) {
      if (path !== false) {
        path = path.split('/');
        path.pop();
        path.push('');

        this.input = this.input.replace(/ [^ ]*$/, ' ' + path.join('/') + options.shift());
      } else {
        this.input = options.shift() + ' ';
      }

      this.index = this.input.length;
      this.write();
    } else if (options.length){
      this.zsh.stdout.write(options.join(' '));
      this.zsh.prompt();
    }
  }

  navigateHistory(direction) {
    if (direction === UP) {
      this.historyIndex = Math.max(this.historyIndex - 1, 0);
    } else {
      this.historyIndex = Math.min(this.historyIndex + 1, this.history.length - 1);
    }

    this.input = this.history[this.historyIndex] || '';
    this.index = this.input.length;
    this.write();
  }

  submit(preventWrite) {
    this.index = this.input.length;

    if (!preventWrite) {
      this.write();
    }

    var input = this.input.trim();

    if (input && input !== this.fullHistory[this.fullHistory.length - 1]) {
      this.fullHistory[this.fullHistory.length] = input;
      LocalStorage.setItem(HISTORY_STORAGE_KEY, this.fullHistory.slice(-HISTORY_SIZE).join(HISTORY_SEPARATOR));
    }

    this.history = this.fullHistory.slice(0);
    this.historyIndex = this.history.length;

    this.clear();

    if (input) {
      this.zsh.CommandManager.parse(
        input,
        this.zsh.stdin,
        this.zsh.stdout,
        this.zsh.stderr,
        this.zsh.prompt.bind(this.zsh)
      );
    } else {
      this.zsh.prompt();
    }
  }

  trigger(evt, msg) {
    var callbacks = this.listeners[evt] || [];

    callbacks.forEach(function (callback) {
      callback(msg);
    });
  }

  removeCaret() {
    var caret = this.span.getElementsByClassName('caret');

    if (caret && caret[0]) {
      caret[0].remove();
    }
  }

  clear() {
    this.input = '';
    this.index = 0;
  }

  backspace() {
    if (this.index > 0) {
      this.input = this.input.substr(0, this.index - 1) + this.input.substr(this.index);
      this.index--;
      this.write();
    }
  }

  actualCharCode(event) {
    var options;
    var code = event.keyCode;

    code = {
      173: 189
    }[code] || code;

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
    } else if (code !== SPACE) {
      code = -1;
    }

    return code;
  }

  action(event) {
    if (String.fromCharCode(event.keyCode) === 'C') {
      this.index = this.input.length;
      this.write();
      this.input = '';
      this.submit(true);
    }
  }

  update(event) {
    var code = this.actualCharCode(event);

    if (!~code) {
      return;
    }

    var char = String.fromCharCode(code);

    this.input = this.input.substr(0, this.index) + char + this.input.substr(this.index);
    this.index++;
    this.write();
  }

  command() {
    if (this.input !== this.__inputCommand) {
      this.__inputCommand = this.input;
      this.__command = this.input.split(' ').shift();
    }

    return this.__command;
  }

  commandArgsString() {
    if (this.input !== this.__inputCArgs) {
      this.__inputCArgs = this.input;
      this.__cargs = this.input.substr(this.command().length);
    }

    return this.__cargs;
  }

  write() {
    this.history[this.historyIndex] = this.input;
    this.caret.innerHTML = this.input[this.index] || '';

    var span = document.createElement('span');
    var command = this.command();
    var input = this.commandArgsString();
    var self = this;

    var putCaret = function (str, index) {
      self.caret.innerText = str[index] || ' ';
      return str.substr(0, index) + self.caret.outerHTML + str.substr(index + 1);
    };

    span.className = this.zsh.CommandManager.isValid(command) ? 'valid' : 'invalid';

    if (this.index < command.length) {
      command = putCaret(command, this.index);
    } else {
      input = putCaret(input, this.index - command.length);
    }

    span.innerHTML = command;
    this.span.innerHTML = span.outerHTML + input;
  }
}
