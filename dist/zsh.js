require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var _interopRequireDefault = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _CommandManager = require('./command-manager');

var _CommandManager2 = _interopRequireDefault(_CommandManager);

var _LocalStorage = require('./local-storage');

var _LocalStorage2 = _interopRequireDefault(_LocalStorage);

var _FS = require('./fs');

var _FS2 = _interopRequireDefault(_FS);

// TODO: Implement VI bindings

var LEFT = 37;
var UP = 38;
var RIGHT = 39;
var DOWN = 40;

var TAB = 9;
var ENTER = 13;
var BACKSPACE = 8;
var SPACE = 32;

var HISTORY_STORAGE_KEY = 'TERMINAL_HISTORY';
var HISTORY_SIZE = 100;
var HISTORY_SEPARATOR = '%%HISTORY_SEPARATOR%%';

var REPL = (function () {
  function REPL(zsh) {
    _classCallCheck(this, REPL);

    this.input = '';
    this.index = 0;
    this.listeners = {};
    this.lastKey = null;
    this.zsh = zsh;

    this.fullHistory = ([_LocalStorage2['default'].getItem(HISTORY_STORAGE_KEY)] + '').split(HISTORY_SEPARATOR).filter(String);
    this.history = this.fullHistory.slice(0) || [];
    this.historyIndex = this.history.length;

    this.createCaret();
  }

  _createClass(REPL, [{
    key: 'createCaret',
    value: function createCaret() {
      this.caret = document.createElement('span');
      this.caret.className = 'caret';
    }
  }, {
    key: 'on',
    value: function on(event, callback) {
      (this.listeners[event] = this.listeners[event] || []).push(callback);
    }
  }, {
    key: 'use',
    value: function use(span) {
      this.span && this.removeCaret();
      this.span = span;
      window.onkeydown = this.parse.bind(this);
      this.write();
      return this;
    }
  }, {
    key: 'parse',
    value: function parse(event) {
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
  }, {
    key: 'moveCaret',
    value: function moveCaret(direction) {
      if (direction === LEFT) {
        this.index = Math.max(this.index - 1, 0);
      } else {
        this.index = Math.min(this.index + 1, this.input.length + 1);
      }
      this.write();
    }
  }, {
    key: 'autocomplete',
    value: function autocomplete() {
      var options;
      var path = false;

      if (this.command() === this.input) {
        options = this.zsh.CommandManager.autocomplete(this.command());
      } else {
        path = this.input.split(' ').pop();
        options = _FS2['default'].autocomplete(path);
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
      } else if (options.length) {
        this.zsh.stdout.write(options.join(' '));
        this.zsh.prompt();
      }
    }
  }, {
    key: 'navigateHistory',
    value: function navigateHistory(direction) {
      if (direction === UP) {
        this.historyIndex = Math.max(this.historyIndex - 1, 0);
      } else {
        this.historyIndex = Math.min(this.historyIndex + 1, this.history.length - 1);
      }

      this.input = this.history[this.historyIndex] || '';
      this.index = this.input.length;
      this.write();
    }
  }, {
    key: 'submit',
    value: function submit(preventWrite) {
      this.index = this.input.length;

      if (!preventWrite) {
        this.write();
      }

      var input = this.input.trim();

      if (input && input !== this.fullHistory[this.fullHistory.length - 1]) {
        this.fullHistory[this.fullHistory.length] = input;
        _LocalStorage2['default'].setItem(HISTORY_STORAGE_KEY, this.fullHistory.slice(-HISTORY_SIZE).join(HISTORY_SEPARATOR));
      }

      this.history = this.fullHistory.slice(0);
      this.historyIndex = this.history.length;

      this.clear();

      if (input) {
        this.zsh.CommandManager.parse(input, this.zsh.stdin, this.zsh.stdout, this.zsh.stderr, this.zsh.prompt.bind(this.zsh));
      } else {
        this.zsh.prompt();
      }
    }
  }, {
    key: 'trigger',
    value: function trigger(evt, msg) {
      var callbacks = this.listeners[evt] || [];

      callbacks.forEach(function (callback) {
        callback(msg);
      });
    }
  }, {
    key: 'removeCaret',
    value: function removeCaret() {
      var caret = this.span.getElementsByClassName('caret');

      if (caret && caret[0]) {
        caret[0].remove();
      }
    }
  }, {
    key: 'clear',
    value: function clear() {
      this.input = '';
      this.index = 0;
    }
  }, {
    key: 'backspace',
    value: function backspace() {
      if (this.index > 0) {
        this.input = this.input.substr(0, this.index - 1) + this.input.substr(this.index);
        this.index--;
        this.write();
      }
    }
  }, {
    key: 'actualCharCode',
    value: function actualCharCode(event) {
      var options;
      var code = event.keyCode;

      code = ({
        173: 189
      })[code] || code;

      if (code >= 65 && code <= 90) {
        if (!event.shiftKey) {
          code += 32;
        }
      } else if (code >= 48 && code <= 57) {
        if (event.shiftKey) {
          code = ')!@#$%^&*('.charCodeAt(code - 48);
        }
      } else if (code >= 186 && code <= 192) {
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
  }, {
    key: 'action',
    value: function action(event) {
      if (String.fromCharCode(event.keyCode) === 'C') {
        this.index = this.input.length;
        this.write();
        this.input = '';
        this.submit(true);
      }
    }
  }, {
    key: 'update',
    value: function update(event) {
      var code = this.actualCharCode(event);

      if (! ~code) {
        return;
      }

      var char = String.fromCharCode(code);

      this.input = this.input.substr(0, this.index) + char + this.input.substr(this.index);
      this.index++;
      this.write();
    }
  }, {
    key: 'command',
    value: function command() {
      if (this.input !== this.__inputCommand) {
        this.__inputCommand = this.input;
        this.__command = this.input.split(' ').shift();
      }

      return this.__command;
    }
  }, {
    key: 'commandArgsString',
    value: function commandArgsString() {
      if (this.input !== this.__inputCArgs) {
        this.__inputCArgs = this.input;
        this.__cargs = this.input.substr(this.command().length);
      }

      return this.__cargs;
    }
  }, {
    key: 'write',
    value: function write() {
      this.history[this.historyIndex] = this.input;
      this.caret.innerHTML = this.input[this.index] || '';

      var span = document.createElement('span');
      var command = this.command();
      var input = this.commandArgsString();
      var self = this;

      var putCaret = function putCaret(str, index) {
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
  }]);

  return REPL;
})();

exports['default'] = REPL;
module.exports = exports['default'];

},{"./command-manager":"8EyLTk","./fs":"dDj8kd","./local-storage":14}],"zsh.js/lib/args-parser":[function(require,module,exports){
module.exports=require('3ed2tT');
},{}],"3ed2tT":[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
var ArgsParser = {};

ArgsParser.parseStrings = function (rawString) {
  var _args = [];
  var word = '';
  var string = false;
  var i, l;

  for (i = 0, l = rawString.length; i < l; i++) {
    var char = rawString[i];
    if (char === '"' || char === '\'') {
      if (string) {
        if (char === string) {
          if (rawString[i - 1] === '\\') {
            word = word.slice(0, -1) + char;
          } else {
            _args.push(word);
            word = '';
            string = null;
          }
        } else {
          word += char;
        }
      } else {
        string = char;
      }
    } else if (char === ' ' && !string) {
      _args.push(word);
      word = '';
    } else {
      word += char;
    }
  }

  if (string) {
    throw new Error('unterminated string');
  } else if (word) {
    _args.push(word);
  }

  return _args;
};

ArgsParser.parse = function (args) {
  args = ([args] + '').trim();

  var out = {
    arguments: [],
    options: {},
    raw: args
  };

  args = ArgsParser.parseStrings(args);

  function addOption(option, value) {
    out.options[option] = typeof value === 'string' ? value : true;
  }

  for (var i = 0, l = args.length; i < l; i++) {
    var arg = args[i];

    if (!arg) {
      continue;
    }

    if (arg.substr(0, 2) === '--') {
      var next = args[i + 1];
      if (next && next[0] !== '-') {
        addOption(arg.substr(2), next);
        i++;
      } else {
        addOption(arg.substr(2));
      }
    } else if (arg[0] === '-') {
      [].forEach.call(arg.substr(1), addOption);
    } else {
      out.arguments.push(arg);
    }
  }

  return out;
};

exports['default'] = ArgsParser;
module.exports = exports['default'];

},{}],"8EyLTk":[function(require,module,exports){
'use strict';

var _interopRequireDefault = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, '__esModule', {
  value: true
});
/*eslint no-eval: 0*/

var _ArgsParser = require('./args-parser');

var _ArgsParser2 = _interopRequireDefault(_ArgsParser);

var _FS = require('./fs');

var _FS2 = _interopRequireDefault(_FS);

var _File = require('./file');

var _File2 = _interopRequireDefault(_File);

var _Stream = require('./stream');

var _Stream2 = _interopRequireDefault(_Stream);

var CommandManager = (function () {
  function CommandManager(zsh) {
    _classCallCheck(this, CommandManager);

    this.commands = {};
    this.aliases = {};
    this.zsh = zsh;
  }

  _createClass(CommandManager, [{
    key: 'exists',
    value: function exists(cmd) {
      var path = _File2['default'].open('/usr/bin');
      return path.open(cmd + '.js').isFile();
    }
  }, {
    key: 'import',
    value: function _import(originalFile) {
      var file = originalFile.toLowerCase();
      switch (file) {
        case './zsh':
          return 'self.zsh';
        case './repl':
          return 'self.zsh.repl';
        case './command-manager':
          return 'self';
        default:
          return 'require(\'' + originalFile + '\')';
      }
    }
  }, {
    key: 'load',
    value: function load(cmd) {
      var _this = this;

      var path = _File2['default'].open('/usr/bin');
      var source = path.open(cmd + '.js');
      var fn;
      if (source.isFile()) {
        var self = this;
        source = source.read();
        source = source.replace(/^import +([A-Za-z]+) +from +'([./\-_A-Za-z]+)'/gm, function (match, variable, file) {
          return 'var ' + variable + ' = ' + _this['import'](file);
        });
        source = source.replace('export default', 'var __default__ =');
        fn = eval('(function () { ' + source + '; return __default__;})')();
      }
      return fn;
    }
  }, {
    key: 'isValid',
    value: function isValid(cmd) {
      return !!(this.commands[cmd] || this.aliases[cmd] || this.exists(cmd));
    }
  }, {
    key: 'autocomplete',
    value: function autocomplete(cmd) {
      var matches = [];
      cmd = cmd.toLowerCase();

      Object.keys(this.commands).concat(Object.keys(this.aliases)).forEach(function (command) {
        if (command.substr(0, cmd.length).toLowerCase() === cmd) {
          matches.push(command);
        }
      });

      return matches;
    }
  }, {
    key: 'parse',
    value: function parse(cmd, stdin, stdout, stderr, next) {
      if (~cmd.indexOf('|')) {
        cmd = cmd.split('|');
        cmd.forEach(this.parse.bind(this));
      }

      cmd = cmd.split(' ');
      var command = cmd.shift();
      var args = cmd.join(' ');

      var index;

      if (~(index = args.indexOf('>'))) {
        var prev = args[index - 1];
        var append = args[index + 1] === '>';
        var init = index;

        if (~['1', '2', '&'].indexOf(prev)) {
          init--;
        }

        var _args = args.substr(0, init);
        args = args.substr(index + append + 1).split(' ').filter(String);
        var path = args.shift();
        args = _args + args.join(' ');

        if (!path) {
          stdout.write('zsh: parse error near `\\n\'');
          return;
        }

        var file = _File2['default'].open(path);

        if (!file.parentExists()) {
          stdout.write('zsh: no such file or directory: ' + file.path);
          return;
        } else if (!file.isValid()) {
          stdout.write('zsh: not a directory: ' + file.path);
          return;
        } else if (file.isDir()) {
          stdout.write('zsh: is a directory: ' + file.path);
          return;
        }

        if (!append) {
          file.clear();
        }

        var _stdout = new _Stream2['default']();
        _stdout.on('data', function (data) {
          file.write(data + '\n', true, true);
        });

        if (prev !== '2') {
          stdout = _stdout;
        }

        if (prev === '2' || prev === '&') {
          stderr = _stdout;
        }

        var _next = next;
        next = function () {
          _FS2['default'].writeFS();
          _next();
        };
      }

      this.exec(command, args, stdin, stdout, stderr, next);
    }
  }, {
    key: 'exec',
    value: function exec(cmd, args, stdin, stdout, stderr, next) {
      if (this.aliases[cmd]) {
        var line = (this.aliases[cmd] + ' ' + args).trim().split(' ');
        this.exec(line.shift(), line.join(' '), stdin, stdout, stderr, next);
        return;
      }

      var fn;
      if (typeof this.commands[cmd] === 'function') {
        fn = this.commands[cmd];
      } else if (fn = this.load(cmd)) {} else {
        stderr.write('zsh: command not found: ' + cmd);
        next();
        return;
      }

      try {
        args = _ArgsParser2['default'].parse(args);
        fn.call(undefined, args, stdin, stdout, stderr, next);
      } catch (err) {
        stderr.write(err.stack);
        next();
      }
    }
  }, {
    key: 'register',
    value: function register(cmd, fn) {
      this.commands[cmd] = fn;
    }
  }, {
    key: 'alias',
    value: function alias(cmd, original) {
      if (arguments.length === 0) {
        return this.aliases;
      }
      this.aliases[cmd] = original;
    }
  }, {
    key: 'unalias',
    value: function unalias(cmd) {
      delete this.aliases[cmd];
    }
  }, {
    key: 'get',
    value: function get(cmd) {
      return this.commands[cmd];
    }
  }]);

  return CommandManager;
})();

exports['default'] = CommandManager;
module.exports = exports['default'];

},{"./args-parser":"3ed2tT","./file":"bMs+/F","./fs":"dDj8kd","./stream":15}],"zsh.js/lib/command-manager":[function(require,module,exports){
module.exports=require('8EyLTk');
},{}],"CjB+4o":[function(require,module,exports){
'use strict';

var zsh = require('./zsh');

var Console = (function () {
  function Console(stdout, stderr) {
    this.stdout = stdout;
    this.stderr = stderr;
    this.external = typeof console === 'undefined' ? {} : window.console;
  }

  function stringify(args) {
    return [].map.call(args, function (a) {
      return JSON.stringify(a) || [a] + '';
    }).join(' ');
  }

  Console.prototype.log = function () {
    this.stdout.write(stringify(arguments));
  };

  Console.prototype.error = function () {
    this.stderr.write(stringify(arguments));
  };

  Console.prototype.clear = function () {
    zsh.clear();
  };

  return Console;
})();

module.exports = Console;

},{"./zsh":"F2/ljt"}],"zsh.js/lib/console":[function(require,module,exports){
module.exports=require('CjB+4o');
},{}],8:[function(require,module,exports){
module.exports={
  "mtime": "2015-04-26T21:21:59.000Z",
  "ctime": "2015-04-26T21:21:59.000Z",
  "content": {
    "Users": {
      "mtime": "2015-04-26T21:21:59.000Z",
      "ctime": "2015-04-26T21:21:59.000Z",
      "content": {
        "guest": {
          "mtime": "2015-04-26T21:21:59.000Z",
          "ctime": "2015-04-26T21:21:59.000Z",
          "content": {
            ".vimrc": {
              "mtime": "2015-04-26T21:21:59.000Z",
              "ctime": "2015-04-26T21:21:59.000Z",
              "content": "",
              "type": "f"
            },
            ".zshrc": {
              "mtime": "2015-04-26T21:21:59.000Z",
              "ctime": "2015-04-26T21:21:59.000Z",
              "content": "",
              "type": "f"
            },
            "about.md": {
              "mtime": "2015-04-26T21:21:59.000Z",
              "ctime": "2015-04-26T21:21:59.000Z",
              "content": "# tadeuzagallo.com\n\n* About me\n  I'm a Full Stack Developer, JS Passionate, Ruby Fan, C++ Something, Game Development Enthusiast,\n  Always willing to contribute to open source projects and trying to learn some more math.\n\n* About this website\n  I wanted more than just show my work, I wanted to show my work environment.\n  Since I do some mobile development as well  I also use (sadly) some IDEs, but always trying\n  to do as much as I can on this terminal, so I made a very similar copy (at least visually)\n  of it so people could get to see what I do and how I (usually) do.\n\n* Commands\n  If you want to know more about me, there are a few commands:\n    * about  (currently running)\n    * contact \n    * resume\n    * projects\n\n  If you need some help about the terminal, or want to know what functionalities are currrently implemented, type `help` any time.\n\nHope you have as much fun as I had doing it :)\n\nTadeu Zagallo\n      \n",
              "type": "f"
            },
            "contact.md": {
              "mtime": "2015-04-26T21:21:59.000Z",
              "ctime": "2015-04-26T21:21:59.000Z",
              "content": "# All my contacts, feel free to reach me at any of these\n\n* <a href=\"mailto:tadeuzagallo@gmail.com\" alt=\"Email\">[Email](mailto:tadeuzagallo@gmail.com)</a>\n* <a href=\"https://github.com/tadeuzagallo\" alt=\"GitHub\" target=\"_blank\">[GitHub](https://github.com/tadeuzagallo)</a>\n* <a href=\"https://twitter.com/tadeuzagallo\" alt=\"Twitter\" target=\"_blank\">[Twitter](https://twitter.com/tadeuzagallo)</a>\n* <a href=\"https://facebook.com/tadeuzagallo\" alt=\"Facebook\" target=\"_blank\">[Facebook](https://facebook.com/tadeuzagallo)</a>\n* <a href=\"https://plus.google.com/+TadeuZagallo\" alt=\"Google +\" target=\"_blank\">[Google +](https://plus.google.com/+TadeuZagallo)</a>\n* <a href=\"http://www.linkedin.com/profile/view?id=160177159\" alt=\"Linkedin\" target=\"_blank\">[Linkedin](http://www.linkedin.com/profile/view?id=160177159)</a>\n* <a href=\"skype://tadeuzagallo\" alt=\"Linkedin\">[Skype](skype://tadeuzagallo)</a>\n",
              "type": "f"
            },
            "projects.md": {
              "mtime": "2015-04-26T21:21:59.000Z",
              "ctime": "2015-04-26T21:21:59.000Z",
              "content": "For now you can have a look at this one! :)\n(That's what I'm doing)\n",
              "type": "f"
            },
            "readme.md": {
              "mtime": "2015-04-26T21:21:59.000Z",
              "ctime": "2015-04-26T21:21:59.000Z",
              "content": "foo bar baz\n",
              "type": "f"
            },
            "resume.md": {
              "mtime": "2015-04-26T21:21:59.000Z",
              "ctime": "2015-04-26T21:21:59.000Z",
              "content": "# Tadeu Zagallo da Silva\n---\n\n## Profile\n--- \n  I am passionate for all kinds of development, love to learn new languages and paradigms, always ready for a good challenge.\n  I also like Math, Game development and when possible contribute to open source projects.\n\n## General Information\n---\n  * Email: tadeuzagallo@gmail.com\n  * Phone: +55 32 8863 3684\n  * Skype: tadeuzagallo\n  * Github: github.com/tadeuzagallo\n  * Location: Juiz de Fora/MG, Brazil\n\n## Educational Background\n---\n\n  * Web Development at Instituto Vianna Junior, 2010\n  * General English at The Carlyle Institute, 2011\n\n# Work Experience\n---\n\n  * <i>*iOS Developer*</i> at <i>*Qranio*</i> from <i>*December, 2013*</i> and <i>*currently employed*</i>\n    - Qranio is a startup that grew inside the company I work (eMiolo.com) and I was invited to lead the iOS development team\n      on a completely rewriten version of the app\n\n  * <i>*Web and Mobile Developer*</i> at <i>*Bonuz*</i> from <i>*February, 2013*</i> and <i>*currently employed*</i>\n    - I started developing the iOS app as a freelancer, after the app was published I was invited to maintain the Ruby on Rails\n      api and work on the Android version of the app\n\n  * <i>*Web and Mobile Developer*</i> at <i>*eMiolo.com*</i> from <i>*April, 2013*</i> and <i>*currently employed*</i>\n    - The company just worked with PHP, so I joined with the intention of bringing new technologies. Worked with Python, Ruby, iOS,\n      Android and HTML5 applications\n\n  * <i>*iOS Developer*</i> at <i>*ProDoctor Software Ltda.*</i> from <i>*July, 2012*</i> until <i>*October, 2012*</i>\n    - Briefly worked with the iOS team on the development of their first mobile version of their main product, a medical software\n\n  * <i>*Web Developer*</i> at <i>*Ato Interativo*</i> from <i>*February, 2012*</i> until <i>*July, 2012*</i>\n    - Most of the work was with PHP and MySQL, also working with JavaScript on the client side. Worked with MSSQL\n      and Oracle databases as well\n\n  * <i>*Web Developer*</i> at <i>*Maria Fumaça Criações*</i> from <i>*October, 2010*</i> until <i>*June, 2011*</i>\n    - I worked mostly with PHP and MySQL, also making the front end with HTML and CSS and most animations in JavaScript,\n      although I also worked with a few in AS3. Briefly worked with MongoDB\n\n## Additional Information\n---\n\n* Experience under Linux and OS X environment\n* Student Exchange: 6 months of residence in Ireland\n\n## Languages\n---\n\n* Portuguese – Native Speaker\n* English – Fluent Level\n* Spanish – Intermediate Level\n\n## Programming languages (ordered by knowledge)\n---\n\n* JavaScript\n* Objective­C\n* C/C++\n* Ruby on Rails\n* NodeJS\n* PHP\n* Java\n* Python\n\n## Additional skills\n---\n\n* HTML5/CSS3\n* MVC\n* Design Patterns\n* TDD/BDD\n* Git\n* Analysis and Design of Algorithms\n",
              "type": "f"
            }
          },
          "type": "d"
        }
      },
      "type": "d"
    },
    "usr": {
      "mtime": "2015-04-26T21:21:59.000Z",
      "ctime": "2015-04-26T21:21:59.000Z",
      "content": {
        "bin": {
          "mtime": "2015-04-27T01:15:07.000Z",
          "ctime": "2015-04-27T01:15:07.000Z",
          "content": {
            "alias.js": {
              "mtime": "2015-04-27T00:51:12.000Z",
              "ctime": "2015-04-27T00:51:12.000Z",
              "content": "import CommandManager from './command-manager';\n\nexport default function (args, stdin, stdout, stderr, next) {\n  var buffer = '';\n  if (args.arguments.length) {\n    var key = args.arguments.shift();\n    var index;\n    if (~(index = key.indexOf('='))) {\n      var command;\n\n      if (args.arguments.length && index === key.length - 1) {\n        command = args.arguments.join(' ');\n      } else {\n        command = key.substr(index + 1);\n      }\n\n      key = key.substr(0, index);\n\n      if (command) {\n        CommandManager.alias(key, command);\n      }\n    }\n  } else {\n    var aliases = CommandManager.alias();\n\n    for (var i in aliases) {\n      buffer += i + '=\\'' + aliases[i] + '\\'\\n';\n    }\n  }\n\n  stdout.write(buffer);\n  next();\n}\n",
              "type": "f"
            },
            "cat.js": {
              "mtime": "2015-04-27T00:54:26.000Z",
              "ctime": "2015-04-27T00:54:26.000Z",
              "content": "import File from './file';\nimport FS from './fs';\n\nexport default function (args, stdin, stdout, stderr, next) {\n  args.arguments.forEach(function (path) {\n    var file = File.open(path);\n\n    if (!file.exists()) {\n      stderr.write(FS.notFound('cat', path));\n    } else if (file.isDir()) {\n      stderr.write(FS.error('cat', path, 'Is a directory'));\n    } else {\n      stdout.write(file.read());\n    }\n  });\n\n  next();\n}\n",
              "type": "f"
            },
            "cd.js": {
              "mtime": "2015-04-27T00:55:48.000Z",
              "ctime": "2015-04-27T00:55:48.000Z",
              "content": "import File from './file';\nimport FS from './fs';\n\nexport default function (args, stdin, stdout, stderr, next) {\n  var path = args.arguments[0] || '~';\n  var dir = File.open(path);\n\n  if (!dir.exists()) {\n    stderr.write(FS.notFound('cd', path));\n  } else if (dir.isFile()) {\n    stderr.write(FS.error('cd', path, 'Is a file'));\n  } else {\n    FS.currentPath = dir.path;\n    FS.currentDir = dir.self();\n  }\n\n  FS.writeFS();\n  next();\n}\n",
              "type": "f"
            },
            "echo.js": {
              "mtime": "2015-04-27T00:57:10.000Z",
              "ctime": "2015-04-27T00:57:10.000Z",
              "content": "import ArgsParser from './args-parser';\n\nexport default function (args, stdin, stdout, stderr, next) {\n  try {\n    stdout.write(ArgsParser.parseStrings(args.raw).join(' '));\n  } catch (err) {\n    stderr.write('zsh: ' + err.message);\n  }\n\n  next();\n}\n",
              "type": "f"
            },
            "help.js": {
              "mtime": "2015-04-27T01:14:39.000Z",
              "ctime": "2015-04-27T01:14:39.000Z",
              "content": "import CommandManager from './command-manager';\nimport File from './file';\n\nexport default function (args, stdin, stdout, stderr, next) {\n  stdout.write('registered commands:');\n  stdout.write(Object.keys(CommandManager.commands).join(' '));\n\n  stdout.write('\\n');\n  stdout.write('executables (on /usr/bin)');\n  stdout.write(Object.keys(File.open('/usr/bin').read()).map(function(file) {\n    return file.replace(/\\.js$/, '');\n  }).join(' '));\n\n  stdout.write('\\n');\n\n  stdout.write('aliases:');\n  stdout.write(Object.keys(CommandManager.aliases).map(function (key) {\n    return key + '=\"' + CommandManager.aliases[key] + '\"';\n  }).join(' '));\n\n  next();\n}\n",
              "type": "f"
            },
            "ls.js": {
              "mtime": "2015-04-27T00:45:57.000Z",
              "ctime": "2015-04-27T00:45:57.000Z",
              "content": "import File from './file';\nimport FS from './fs';\n\nexport default function (args, stdin, stdout, stderr, next) {\n  if (!args.arguments.length) {\n    args.arguments.push('.');\n  }\n\n  args.arguments.forEach(function (arg) {\n    var dir = File.open(arg);\n\n    if (!dir.exists()) {\n      stderr.write(FS.notFound('ls', arg));\n    } else if (dir.isFile()) {\n      stderr.write(FS.error('ls', arg, 'Is a file'));\n    } else {\n      var files = Object.keys(dir.read());\n\n      if (!args.options.a) {\n        files = files.filter(function (file) {\n          return file[0] !== '.';\n        });\n      }\n\n      if (args.arguments.length > 1) {\n        stdout.write(arg + ':');\n      }\n\n      if (args.options.l) {\n        files = files.map(function (name) {\n          var file = dir.open(name);\n          var type = file.isDir() ? 'd' : '-';\n          var perms = type + 'rw-r--r--';\n\n          return perms + ' guest guest ' + file.length() + ' ' + file.mtime() + ' ' + name;\n        });\n      }\n\n      stdout.write(files.join(args.options.l ? '\\n' : ' '));\n    }\n  });\n\n  next();\n};\n",
              "type": "f"
            },
            "mkdir.js": {
              "mtime": "2015-04-27T00:59:11.000Z",
              "ctime": "2015-04-27T00:59:11.000Z",
              "content": "import File from './file';\nimport FS from './fs';\n\nexport default function (args, stdin, stdout, stderr, next) {\n  args.arguments.forEach(function (path) {\n    var file = File.open(path);\n\n    if (!file.parentExists()) {\n      stderr.write(FS.notFound('mkdir', path));\n    } else if (!file.isValid()) {\n      stderr.write(FS.error('mkdir', path, 'Not a directory'));\n    } else if (file.exists()) {\n      stderr.write(FS.error('mkdir', path, 'File exists'));\n    } else {\n      file.createFolder();\n    }\n  });\n\n  FS.writeFS();\n  next();\n}\n",
              "type": "f"
            },
            "mv.js": {
              "mtime": "2015-04-27T01:00:36.000Z",
              "ctime": "2015-04-27T01:00:36.000Z",
              "content": "import File from './file';\nimport FS from './fs';\n\nexport default function (args, stdin, stdout, stderr, next) {\n  var targetPath = args.arguments.pop();\n  var sourcePaths = args.arguments;\n  var target = File.open(targetPath);\n\n  if (!targetPath ||\n      !sourcePaths.length ||\n        (sourcePaths.length > 1 &&\n         (!target.exists() || target.isFile())\n        )\n     ) {\n    stderr.write('usage: mv source target\\n \\t mv source ... directory');\n  } else if (!target.parentExists()) {\n      stderr.write(FS.notFound('mv', target.dirname));\n  } else {\n    var backup = target.self();\n    var ok = sourcePaths.reduce(function (success, sourcePath) {\n      if (success) {\n        var source = File.open(sourcePath);\n\n        if (!source.exists()) {\n          stderr.write(FS.notFound('mv', sourcePaths[0]));\n        } else if (source.isDir() && target.isFile()) {\n          stderr.write(FS.error('mv', 'rename ' + sourcePaths[0] + ' to ' + targetPath, 'Not a directory'));\n        } else {\n          if (!target.isFile()) {\n            target.read()[source.filename] = source.self();\n          } else {\n            target.write(source.read(), false, true);\n          }\n\n          source.delete();\n          return true;\n        }\n      }\n\n      return false;\n    }, true);\n\n    if (ok) {\n      FS.writeFS();\n    } else {\n      target.dir[target.filename] = backup;\n    }\n  }\n\n  next();\n}\n",
              "type": "f"
            },
            "pwd.js": {
              "mtime": "2015-04-27T01:01:10.000Z",
              "ctime": "2015-04-27T01:01:10.000Z",
              "content": "import FS from './fs';\n\nexport default function (args, stdin, stdout, stderr, next) {\n  var pwd = FS.currentPath;\n\n  if (stdout) {\n    stdout.write(pwd);\n    next();\n  } else {\n    return pwd;\n  }\n}\n",
              "type": "f"
            },
            "rm.js": {
              "mtime": "2015-04-27T01:02:08.000Z",
              "ctime": "2015-04-27T01:02:08.000Z",
              "content": "import File from './file';\nimport FS from './fs';\n\nexport default function (args, stdin, stdout, stderr, next) {\n  args.arguments.forEach(function (arg) {\n    var file = File.open(arg);\n\n    if (!file.exists()) {\n      stderr.write(FS.notFound('rm', arg));\n    } else if (!file.isValid()) {\n      stderr.write(FS.error('rm', arg, 'Not a directory'));\n    } else if (file.isDir()) {\n      stderr.write(FS.error('rm', arg, 'is a directory'));\n    } else {\n      file.delete();\n    }\n  });\n\n  FS.writeFS();\n  next();\n}\n",
              "type": "f"
            },
            "rmdir.js": {
              "mtime": "2015-04-27T01:02:47.000Z",
              "ctime": "2015-04-27T01:02:47.000Z",
              "content": "import File from './file';\nimport FS from './fs';\n\nexport default function (args, stdin, stdout, stderr, next) {\n  args.arguments.forEach(function (arg) {\n    var file = File.open(arg);\n\n    if (!file.parentExists() || !file.exists()) {\n      stderr.write(FS.notFound('rmdir', arg));\n    } else if (!file.isDir()) {\n      stderr.write(FS.error('rmdir', arg, 'Not a directory'));\n    } else {\n      file.delete();\n    }\n  });\n\n  FS.writeFS();\n  next();\n}\n",
              "type": "f"
            },
            "source.js": {
              "mtime": "2015-04-27T01:04:01.000Z",
              "ctime": "2015-04-27T01:04:01.000Z",
              "content": "/*eslint no-eval: 0*/\nimport Console from './console';\nimport File from './file';\n\nexport default function (args, stdin, stdout, stderr, next) {\n  if (args.arguments.length) {\n    var file = File.open(args.arguments[0]);\n    if (!file.exists()) {\n      stderr.write('source: no such file or directory: ' + file.path);\n    } else {\n      try {\n        var console = new Console(stdout, stderr); // jshint ignore: line\n        var result = JSON.stringify(eval(file.read()));\n        stdout.write('<- ' + result);\n      } catch (err) {\n        stderr.write(err.stack);\n      }\n    }\n  } else {\n    stderr.write('source: not enough arguments');\n  }\n\n  next();\n}\n",
              "type": "f"
            },
            "touch.js": {
              "mtime": "2015-04-27T01:07:26.000Z",
              "ctime": "2015-04-27T01:07:26.000Z",
              "content": "import File from './file';\nimport FS from './fs';\n\nexport default function (args, stdin, stdout, stderr, next) {\n  args.arguments.forEach(function (path) {\n    var file = File.open(path);\n\n    if (!file.parentExists()) {\n      stderr.write(FS.notFound('touch', path));\n    } else if (!file.isValid()){\n      stderr.write(FS.error('touch', path, 'Not a directory'));\n    } else {\n      file.write('', true, true);\n    }\n  });\n\n  FS.writeFS();\n  next();\n}\n",
              "type": "f"
            },
            "unalias.js": {
              "mtime": "2015-04-27T01:07:49.000Z",
              "ctime": "2015-04-27T01:07:49.000Z",
              "content": "import CommandManager from './command-manager';\n\nexport default function (args, stdin, stdout, stderr, next) {\n  var cmd = args.arguments[0];\n\n  if (cmd) {\n    CommandManager.unalias(cmd);\n  }\n\n  next();\n}\n",
              "type": "f"
            }
          },
          "type": "d"
        }
      },
      "type": "d"
    }
  },
  "type": "d"
}
},{}],"zsh.js/lib/file":[function(require,module,exports){
module.exports=require('bMs+/F');
},{}],"bMs+/F":[function(require,module,exports){
'use strict';

var _interopRequireDefault = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _FS = require('./fs');

var _FS2 = _interopRequireDefault(_FS);

var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

var File = (function () {
  function File(path) {
    _classCallCheck(this, File);

    this.path = _FS2['default'].translatePath(path);
    path = this.path.split('/');
    this.filename = path.pop();
    this.dirname = path.join('/') || '/';
    this.dir = _FS2['default'].open(this.dirname);
  }

  _createClass(File, [{
    key: 'parentExists',
    value: function parentExists() {
      return this.dir !== undefined;
    }
  }, {
    key: 'isValid',
    value: function isValid() {
      return typeof this.dir === 'object' && this.dir.type === 'd';
    }
  }, {
    key: 'exists',
    value: function exists() {
      return this.isValid() && (!this.filename || typeof this.dir.content[this.filename] !== 'undefined');
    }
  }, {
    key: 'isFile',
    value: function isFile() {
      return this.exists() && this.filename && this.dir.content[this.filename].type === 'f';
    }
  }, {
    key: 'isDir',
    value: function isDir() {
      return this.exists() && (!this.filename || this.dir.content[this.filename].type === 'd');
    }
  }, {
    key: 'delete',
    value: function _delete() {
      if (this.exists()) {
        delete this.dir.content[this.filename];
        _FS2['default'].writeFS();
      }
    }
  }, {
    key: 'clear',
    value: function clear() {
      this.write('', false, true);
    }
  }, {
    key: 'write',
    value: function write(content, append, force) {
      var time = File.getTimestamp();

      if (!this.exists()) {
        if (force && this.isValid()) {
          this.createFile(time);
        } else {
          throw new Error('Invalid file: ' + this.path);
        }
      } else if (!this.isFile()) {
        throw new Error('Cannot write to directory: %s', this.path);
      } else {
        var _content = '';
        if (append) {
          _content += this.read();
        }

        this.dir.mtime = time;
        this.dir.content[this.filename].mtime = time;
        this.dir.content[this.filename].content = _content + content;
        _FS2['default'].writeFS();
      }
    }
  }, {
    key: 'read',
    value: function read() {
      return this.filename ? this.dir.content[this.filename].content : this.dir.content;
    }
  }, {
    key: '_create',
    value: function _create(type, content, timestamp) {
      if (this.exists()) {
        throw new Error('File %s already exists', this.path);
      }

      if (!timestamp) {
        timestamp = File.getTimestamp();
      }

      this.dir.content[this.filename] = {
        ctime: timestamp,
        mtime: timestamp,
        content: content,
        type: type
      };

      _FS2['default'].writeFS();
    }
  }, {
    key: 'createFolder',
    value: function createFolder(timestamp) {
      this._create('d', {}, timestamp);
    }
  }, {
    key: 'createFile',
    value: function createFile(timestamp) {
      this._create('f', '', timestamp);
    }
  }, {
    key: 'self',
    value: function self() {
      return this.filename ? this.dir : this.dir.content[this.filename];
    }
  }, {
    key: 'open',
    value: function open(file) {
      return File.open(this.path + '/' + file);
    }
  }, {
    key: 'length',
    value: function length() {
      var content = this.read();

      if (this.isFile()) {
        return content.length;
      } else if (this.isDir()) {
        return Object.keys(content).length;
      } else {
        return 0;
      }
    }
  }, {
    key: 'mtime',
    value: function mtime() {
      var t = new Date(this.self().mtime);

      var dayAndMonth = MONTHS[t.getMonth()] + ' ' + t.getDay();
      if (Date.now() - t.getTime() > 6 * 30 * 24 * 60 * 60 * 1000) {
        return dayAndMonth + ' ' + t.getFullYear();
      } else {
        return dayAndMonth + ' ' + t.getHours() + ':' + t.getMinutes();
      }
    }
  }], [{
    key: 'open',
    value: function open(path) {
      return new File(path);
    }
  }, {
    key: 'getTimestamp',
    value: function getTimestamp() {
      return new Date().toISOString();
    }
  }]);

  return File;
})();

exports['default'] = File;
module.exports = exports['default'];

},{"./fs":"dDj8kd"}],"zsh.js/lib/fs":[function(require,module,exports){
module.exports=require('dDj8kd');
},{}],"dDj8kd":[function(require,module,exports){
'use strict';

var _interopRequireDefault = function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { 'default': obj };
};

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _LocalStorage = require('./local-storage');

var _LocalStorage2 = _interopRequireDefault(_LocalStorage);

var FS = {};
var FILE_SYSTEM_KEY = 'file_system';

FS.writeFS = function () {
  _LocalStorage2['default'].setItem(FILE_SYSTEM_KEY, JSON.stringify(FS.root));
};

FS.root = JSON.parse(_LocalStorage2['default'].getItem(FILE_SYSTEM_KEY));
var fileSystem = require('./file-system.json');
var copy = function copy(old, nnew) {
  for (var key in nnew) {
    old[key] = nnew[key];
  }
};

if (!FS.root || !FS.root.content) {
  FS.root = fileSystem;
} else {
  var time = new Date().toISOString();

  (function readdir(old, nnew) {
    if (typeof old.content !== 'undefined') {
      for (var key in nnew.content) {
        var n = nnew.content[key];
        var o = old.content[key];

        if (!o.content) {
          o = {
            ctime: time,
            mtime: time,
            content: o.content,
            type: typeof o === 'string' ? 'f' : 'd'
          };
        }

        if (o.type === 'f' && o.mtime === o.ctime) {
          copy(o, n);
        } else if (o.type === 'd') {
          readdir(o, n);
        }
      }
    }
  })(FS.root, fileSystem);

  FS.writeFS();
}

FS.currentPath = FS.home = '/Users/guest';
FS.currentDir = FS.root.content.Users.content.guest;

FS.dirname = function (path) {
  return path.split('/').slice(0, -1).join('/');
};

FS.basename = function (path) {
  return path.split('/').pop();
};

FS.translatePath = function (path) {
  var index;

  path = path.replace('~', FS.home);

  if (path[0] !== '/') {
    path = (FS.currentPath !== '/' ? FS.currentPath + '/' : '/') + path;
  }

  path = path.split('/');

  while (~(index = path.indexOf('..'))) {
    path.splice(index - 1, 2);
  }

  while (~(index = path.indexOf('.'))) {
    path.splice(index, 1);
  }

  if (path[0] === '.') {
    path.shift();
  }

  if (path.length < 2) {
    path = [,,];
  }

  return path.join('/').replace(/([^/]+)\/+$/, '$1');
};

FS.realpath = function (path) {
  path = FS.translatePath(path);

  return FS.exists(path) ? path : null;
};

FS.open = function (path) {
  if (path[0] !== '/') {
    path = FS.translatePath(path);
  }

  path = path.substr(1).split('/').filter(String);

  var cwd = FS.root;
  while (path.length && cwd.content) {
    cwd = cwd.content[path.shift()];
  }

  return cwd;
};

FS.exists = function (path) {
  return !!FS.open(path);
};

FS.error = function () {
  return [].join.call(arguments, ': ');
};

FS.notFound = function (cmd, arg) {
  return FS.error(cmd, arg, 'No such file or directory');
};

FS.autocomplete = function (_path) {
  var path = this.translatePath(_path);
  var options = [];

  if (_path.slice(-1) === '/') {
    path += '/';
  }

  if (path !== undefined) {
    var filename = _path.split('/').pop();
    var openPath = filename.length > 1 ? path.slice(0, -1) : path;
    var dir = FS.open(openPath);
    var fileName = '';
    var parentPath = path;

    if (!dir) {
      path = path.split('/');
      fileName = path.pop().toLowerCase();
      parentPath = path.join('/') || '/';
      dir = FS.open(parentPath);
    }

    if (dir && typeof dir.content === 'object') {
      for (var key in dir.content) {
        if (key.substr(0, fileName.length).toLowerCase() === fileName) {
          if (typeof dir.content[key].content === 'object') {
            key += '/';
          }

          options.push(key);
        }
      }
    }
  }

  return options;
};

exports['default'] = FS;
module.exports = exports['default'];

},{"./file-system.json":8,"./local-storage":14}],13:[function(require,module,exports){
'use strict';

module.exports = function (container, scroll) {
  window.onresize = scroll;

  container.querySelector('.full-screen').onclick = function (e) {
    e.preventDefault();

    if (!document.fullscreenElement && !document.mozFullScreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {
      if (container.requestFullscreen) {
        container.requestFullscreen();
      } else if (container.msRequestFullscreen) {
        container.msRequestFullscreen();
      } else if (container.mozRequestFullScreen) {
        container.mozRequestFullScreen();
      } else if (container.webkitRequestFullscreen) {
        container.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
  };
};

},{}],14:[function(require,module,exports){
'use strict';

module.exports = typeof localStorage === 'undefined' ? {
  setItem: function setItem() {},
  getItem: function getItem() {
    return null;
  }
} : localStorage;

},{}],15:[function(require,module,exports){
'use strict';

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, '__esModule', {
  value: true
});

var Stream = (function () {
  function Stream() {
    _classCallCheck(this, Stream);

    this._callbacks = {};
  }

  _createClass(Stream, [{
    key: 'on',
    value: function on(event, callback) {
      if (!this._callbacks[event]) {
        this._callbacks[event] = [];
      }

      this._callbacks[event].push(callback);
    }
  }, {
    key: 'write',
    value: function write(data) {
      this.emmit('data', data);
    }
  }, {
    key: 'emmit',
    value: function emmit(event, data) {
      var callbacks = this._callbacks[event];
      callbacks && callbacks.forEach(function (callback) {
        callback(data);
      });
    }
  }]);

  return Stream;
})();

exports['default'] = Stream;
module.exports = exports['default'];

},{}],"zsh.js":[function(require,module,exports){
module.exports=require('F2/ljt');
},{}],"F2/ljt":[function(require,module,exports){
'use strict';

var _interopRequireDefault = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _bindFullScreen = require('./full-screen');

var _bindFullScreen2 = _interopRequireDefault(_bindFullScreen);

var _CommandManager = require('./command-manager');

var _CommandManager2 = _interopRequireDefault(_CommandManager);

var _FS = require('./fs');

var _FS2 = _interopRequireDefault(_FS);

var _REPL = require('./REPL');

var _REPL2 = _interopRequireDefault(_REPL);

var _Stream = require('./stream');

var _Stream2 = _interopRequireDefault(_Stream);

/**
 * Only used by source.js - unused import so it gets into the bundle
 */

var _Console = require('./console');

var _Console2 = _interopRequireDefault(_Console);

var ZSH = (function () {
  function ZSH(container, statusbar, createHTML) {
    _classCallCheck(this, ZSH);

    if (createHTML) {
      this.create(container);
    } else {
      this.container = container;
      this.statusbar = statusbar;
    }

    this.rootContainer = this.container;
    this.CommandManager = new _CommandManager2['default']();
    this.REPL = new _REPL2['default'](this);
    this.FS = _FS2['default'];
    this.createStreams();
    this.initializeInput();
    this.prompt();

    _bindFullScreen2['default'](this.container.parentElement, this.scroll.bind(this));

    this.CommandManager.register('clear', this.clear.bind(this));
  }

  _createClass(ZSH, [{
    key: 'createStreams',
    value: function createStreams() {
      var _this = this;

      this.stderr = new _Stream2['default']();
      this.stdout = new _Stream2['default']();

      this.stderr.on('data', function (d) {
        return _this.output(d, 'stderr');
      });
      this.stdout.on('data', function (d) {
        return _this.output(d, 'stdout');
      });
    }
  }, {
    key: 'pwd',
    value: function pwd() {
      return _FS2['default'].currentPath.replace(_FS2['default'].home, '~');
    }
  }, {
    key: '$PS1',
    value: function $PS1() {
      return '\n      <span class="who">guest</span>\n      on\n      <span class="where"> ' + this.pwd() + ' </span>\n      <span class="branch">±master</span>&gt;\n    ';
    }
  }, {
    key: 'prompt',
    value: function prompt() {
      var row = document.createElement('div');
      var span = document.createElement('span');
      var code = document.createElement('span');

      span.className = 'ps1';
      code.className = 'code';

      span.innerHTML = this.$PS1();

      row.appendChild(span);
      row.appendChild(code);

      this.container.appendChild(row);
      this.REPL.use(code);
      this.status(this.pwd());
      this.scroll();
      row.appendChild(this.input);
      this.input.focus();
    }
  }, {
    key: 'status',
    value: function status(text) {
      if (this.statusbar) {
        this.statusbar.innerText = text;
      }
    }
  }, {
    key: 'initializeInput',
    value: function initializeInput() {
      var input = document.createElement('input');
      input.className = 'fake-input';
      this.rootContainer.addEventListener('click', function (e) {
        e.preventDefault();
        if (input === document.activeElement) {
          input.blur();
        } else {
          input.focus();
        }
      });

      this.input = input;
    }
  }, {
    key: 'create',
    value: function create(container) {
      if (typeof container === 'string') {
        container = document.getElementById(container);
      }

      container.innerHTML = '\n      <div class="terminal">\n        <div class="bar">\n          <div class="buttons">\n            <a class="close" href="#"></a>\n            <a class="minimize" href="#"></a>\n            <a class="maximize" href="#"></a>\n          </div>\n          <div class="title"></div>\n          <a class="full-screen" href="#"></a>\n        </div>\n        <div class="content"></div>\n        <div class="status-bar"></div>\n      </div>\n    ';

      this.container = container.querySelector('.content');
      this.statusbar = container.querySelector('.status-bar');
    }
  }, {
    key: 'update',
    value: function update() {
      var codes = this.container.getElementsByClassName('code');
      if (!codes.length) {
        this.prompt();
      } else {
        this.REPL.use(codes[codes.length - 1], ZSH);
      }
    }
  }, {
    key: 'output',
    value: function output(text, className) {
      var out = document.createElement('div');
      out.className = 'code ' + [className];
      out.innerHTML = text;

      this.container.appendChild(out);
      this.scroll();
    }
  }, {
    key: 'scroll',
    value: function scroll() {
      var c = this.rootContainer;
      setTimeout(function () {
        return c.scrollTop = c.scrollHeight;
      }, 0);
    }
  }, {
    key: 'clear',
    value: function clear() {
      this.container.innerHTML = '';
      this.prompt();
    }
  }]);

  return ZSH;
})();

window.ZSH = ZSH;
exports['default'] = ZSH;
module.exports = exports['default'];

},{"./REPL":1,"./command-manager":"8EyLTk","./console":"CjB+4o","./fs":"dDj8kd","./full-screen":13,"./stream":15}]},{},["F2/ljt"])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy90YWRldXphZ2FsbG8vZ2l0aHViL3pzaC5qcy9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvdGFkZXV6YWdhbGxvL2dpdGh1Yi96c2guanMvbGliL1JFUEwuanMiLCIvVXNlcnMvdGFkZXV6YWdhbGxvL2dpdGh1Yi96c2guanMvbGliL2FyZ3MtcGFyc2VyLmpzIiwiL1VzZXJzL3RhZGV1emFnYWxsby9naXRodWIvenNoLmpzL2xpYi9jb21tYW5kLW1hbmFnZXIuanMiLCIvVXNlcnMvdGFkZXV6YWdhbGxvL2dpdGh1Yi96c2guanMvbGliL2NvbnNvbGUuanMiLCIvVXNlcnMvdGFkZXV6YWdhbGxvL2dpdGh1Yi96c2guanMvbGliL2ZpbGUtc3lzdGVtLmpzb24iLCIvVXNlcnMvdGFkZXV6YWdhbGxvL2dpdGh1Yi96c2guanMvbGliL2ZpbGUuanMiLCIvVXNlcnMvdGFkZXV6YWdhbGxvL2dpdGh1Yi96c2guanMvbGliL2ZzLmpzIiwiL1VzZXJzL3RhZGV1emFnYWxsby9naXRodWIvenNoLmpzL2xpYi9mdWxsLXNjcmVlbi5qcyIsIi9Vc2Vycy90YWRldXphZ2FsbG8vZ2l0aHViL3pzaC5qcy9saWIvbG9jYWwtc3RvcmFnZS5qcyIsIi9Vc2Vycy90YWRldXphZ2FsbG8vZ2l0aHViL3pzaC5qcy9saWIvc3RyZWFtLmpzIiwiL1VzZXJzL3RhZGV1emFnYWxsby9naXRodWIvenNoLmpzL2xpYi96c2guanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7OEJDQTJCLG1CQUFtQjs7Ozs0QkFDckIsaUJBQWlCOzs7O2tCQUMzQixNQUFNOzs7Ozs7QUFJckIsSUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDO0FBQ2hCLElBQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQztBQUNkLElBQU0sS0FBSyxHQUFHLEVBQUUsQ0FBQztBQUNqQixJQUFNLElBQUksR0FBRyxFQUFFLENBQUM7O0FBRWhCLElBQU0sR0FBRyxHQUFHLENBQUMsQ0FBQztBQUNkLElBQU0sS0FBSyxHQUFHLEVBQUUsQ0FBQztBQUNqQixJQUFNLFNBQVMsR0FBRyxDQUFDLENBQUM7QUFDcEIsSUFBTSxLQUFLLEdBQUcsRUFBRSxDQUFDOztBQUVqQixJQUFNLG1CQUFtQixHQUFHLGtCQUFrQixDQUFDO0FBQy9DLElBQU0sWUFBWSxHQUFHLEdBQUcsQ0FBQztBQUN6QixJQUFNLGlCQUFpQixHQUFHLHVCQUF1QixDQUFDOztJQUU3QixJQUFJO0FBQ1osV0FEUSxJQUFJLENBQ1gsR0FBRyxFQUFFOzBCQURFLElBQUk7O0FBRXJCLFFBQUksQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDO0FBQ2hCLFFBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDO0FBQ2YsUUFBSSxDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUM7QUFDcEIsUUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7QUFDcEIsUUFBSSxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUM7O0FBRWYsUUFBSSxDQUFDLFdBQVcsR0FBRyxDQUFDLENBQUMsMEJBQWEsT0FBTyxDQUFDLG1CQUFtQixDQUFDLENBQUMsR0FBRyxFQUFFLENBQUEsQ0FBRSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDOUcsUUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7QUFDL0MsUUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQzs7QUFFeEMsUUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO0dBQ3BCOztlQWJrQixJQUFJOztXQWVaLHVCQUFHO0FBQ1osVUFBSSxDQUFDLEtBQUssR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzVDLFVBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxHQUFHLE9BQU8sQ0FBQztLQUNoQzs7O1dBRUMsWUFBQyxLQUFLLEVBQUUsUUFBUSxFQUFFO0FBQ2xCLE9BQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQSxDQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztLQUN4RTs7O1dBRUUsYUFBQyxJQUFJLEVBQUU7QUFDUixVQUFJLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztBQUNoQyxVQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztBQUNqQixZQUFNLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3pDLFVBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztBQUNiLGFBQU8sSUFBSSxDQUFDO0tBQ2I7OztXQUVJLGVBQUMsS0FBSyxFQUFFO0FBQ1gsVUFBSSxLQUFLLENBQUMsT0FBTyxFQUFFO0FBQ2pCLGVBQU87T0FDUjs7QUFFRCxXQUFLLENBQUMsY0FBYyxFQUFFLENBQUM7QUFDdkIsY0FBUSxLQUFLLENBQUMsT0FBTztBQUNuQixhQUFLLElBQUksQ0FBQztBQUNWLGFBQUssS0FBSztBQUNSLGNBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQzlCLGdCQUFNO0FBQUEsQUFDUixhQUFLLEVBQUUsQ0FBQztBQUNSLGFBQUssSUFBSTtBQUNQLGNBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQ3BDLGdCQUFNO0FBQUEsQUFDUixhQUFLLEdBQUc7QUFDTixjQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7QUFDcEIsZ0JBQU07QUFBQSxBQUNSLGFBQUssS0FBSztBQUNSLGNBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztBQUNkLGdCQUFNO0FBQUEsQUFDUixhQUFLLFNBQVM7QUFDWixjQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7QUFDakIsZ0JBQU07QUFBQSxBQUNSO0FBQ0UsY0FBSSxLQUFLLENBQUMsT0FBTyxFQUFFO0FBQ2pCLGdCQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO1dBQ3BCLE1BQU07QUFDTCxnQkFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztXQUNwQjtBQUFBLE9BQ0o7S0FDRjs7O1dBRVEsbUJBQUMsU0FBUyxFQUFFO0FBQ25CLFVBQUksU0FBUyxLQUFLLElBQUksRUFBRTtBQUN0QixZQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7T0FDMUMsTUFBTTtBQUNMLFlBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztPQUM5RDtBQUNELFVBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztLQUNkOzs7V0FFVyx3QkFBRztBQUNiLFVBQUksT0FBTyxDQUFDO0FBQ1osVUFBSSxJQUFJLEdBQUcsS0FBSyxDQUFDOztBQUVqQixVQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxJQUFJLENBQUMsS0FBSyxFQUFFO0FBQ2pDLGVBQU8sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7T0FDaEUsTUFBTTtBQUNMLFlBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUNuQyxlQUFPLEdBQUcsZ0JBQUcsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDO09BQ2pDOztBQUVELFVBQUksT0FBTyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7QUFDeEIsWUFBSSxJQUFJLEtBQUssS0FBSyxFQUFFO0FBQ2xCLGNBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3ZCLGNBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUNYLGNBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7O0FBRWQsY0FBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7U0FDcEYsTUFBTTtBQUNMLGNBQUksQ0FBQyxLQUFLLEdBQUcsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLEdBQUcsQ0FBQztTQUNwQzs7QUFFRCxZQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDO0FBQy9CLFlBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztPQUNkLE1BQU0sSUFBSSxPQUFPLENBQUMsTUFBTSxFQUFDO0FBQ3hCLFlBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFDekMsWUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQztPQUNuQjtLQUNGOzs7V0FFYyx5QkFBQyxTQUFTLEVBQUU7QUFDekIsVUFBSSxTQUFTLEtBQUssRUFBRSxFQUFFO0FBQ3BCLFlBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsWUFBWSxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztPQUN4RCxNQUFNO0FBQ0wsWUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO09BQzlFOztBQUVELFVBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxDQUFDO0FBQ25ELFVBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUM7QUFDL0IsVUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0tBQ2Q7OztXQUVLLGdCQUFDLFlBQVksRUFBRTtBQUNuQixVQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDOztBQUUvQixVQUFJLENBQUMsWUFBWSxFQUFFO0FBQ2pCLFlBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztPQUNkOztBQUVELFVBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7O0FBRTlCLFVBQUksS0FBSyxJQUFJLEtBQUssS0FBSyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxFQUFFO0FBQ3BFLFlBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsR0FBRyxLQUFLLENBQUM7QUFDbEQsa0NBQWEsT0FBTyxDQUFDLG1CQUFtQixFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQztPQUMxRzs7QUFFRCxVQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3pDLFVBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUM7O0FBRXhDLFVBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQzs7QUFFYixVQUFJLEtBQUssRUFBRTtBQUNULFlBQUksQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FDM0IsS0FBSyxFQUNMLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUNkLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUNmLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUNmLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQy9CLENBQUM7T0FDSCxNQUFNO0FBQ0wsWUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQztPQUNuQjtLQUNGOzs7V0FFTSxpQkFBQyxHQUFHLEVBQUUsR0FBRyxFQUFFO0FBQ2hCLFVBQUksU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDOztBQUUxQyxlQUFTLENBQUMsT0FBTyxDQUFDLFVBQVUsUUFBUSxFQUFFO0FBQ3BDLGdCQUFRLENBQUMsR0FBRyxDQUFDLENBQUM7T0FDZixDQUFDLENBQUM7S0FDSjs7O1dBRVUsdUJBQUc7QUFDWixVQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLE9BQU8sQ0FBQyxDQUFDOztBQUV0RCxVQUFJLEtBQUssSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUU7QUFDckIsYUFBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO09BQ25CO0tBQ0Y7OztXQUVJLGlCQUFHO0FBQ04sVUFBSSxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUM7QUFDaEIsVUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUM7S0FDaEI7OztXQUVRLHFCQUFHO0FBQ1YsVUFBSSxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsRUFBRTtBQUNsQixZQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUNsRixZQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7QUFDYixZQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7T0FDZDtLQUNGOzs7V0FFYSx3QkFBQyxLQUFLLEVBQUU7QUFDcEIsVUFBSSxPQUFPLENBQUM7QUFDWixVQUFJLElBQUksR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDOztBQUV6QixVQUFJLEdBQUcsQ0FBQTtBQUNMLFdBQUcsRUFBRSxHQUFHO1FBQ1QsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUM7O0FBRWhCLFVBQUksSUFBSSxJQUFJLEVBQUUsSUFBSSxJQUFJLElBQUksRUFBRSxFQUFFO0FBQzVCLFlBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFO0FBQ25CLGNBQUksSUFBSSxFQUFFLENBQUM7U0FDWjtPQUNGLE1BQU0sSUFBSSxJQUFJLElBQUksRUFBRSxJQUFJLElBQUksSUFBSSxFQUFFLEVBQUU7QUFDbkMsWUFBSSxLQUFLLENBQUMsUUFBUSxFQUFFO0FBQ2xCLGNBQUksR0FBRyxZQUFZLENBQUMsVUFBVSxDQUFDLElBQUksR0FBRyxFQUFFLENBQUMsQ0FBQztTQUMzQztPQUNGLE1BQU0sSUFBSSxJQUFJLElBQUksR0FBRyxJQUFJLElBQUksSUFBSSxHQUFHLEVBQUM7QUFDcEMsZUFBTyxHQUFHLGdCQUFnQixDQUFDOztBQUUzQixZQUFJLElBQUksR0FBRyxDQUFDOztBQUVaLFlBQUksS0FBSyxDQUFDLFFBQVEsRUFBRTtBQUNsQixjQUFJLElBQUksT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7U0FDNUI7O0FBRUQsWUFBSSxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7T0FDakMsTUFBTSxJQUFJLElBQUksSUFBSSxHQUFHLElBQUksSUFBSSxJQUFJLEdBQUcsRUFBRTtBQUNyQyxlQUFPLEdBQUcsWUFBWSxDQUFDO0FBQ3ZCLFlBQUksSUFBSSxHQUFHLENBQUM7O0FBRVosWUFBSSxLQUFLLENBQUMsUUFBUSxFQUFFO0FBQ2xCLGNBQUksSUFBSSxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztTQUM1Qjs7QUFFRCxZQUFJLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztPQUNqQyxNQUFNLElBQUksSUFBSSxLQUFLLEtBQUssRUFBRTtBQUN6QixZQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUM7T0FDWDs7QUFFRCxhQUFPLElBQUksQ0FBQztLQUNiOzs7V0FFSyxnQkFBQyxLQUFLLEVBQUU7QUFDWixVQUFJLE1BQU0sQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEdBQUcsRUFBRTtBQUM5QyxZQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDO0FBQy9CLFlBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztBQUNiLFlBQUksQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDO0FBQ2hCLFlBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7T0FDbkI7S0FDRjs7O1dBRUssZ0JBQUMsS0FBSyxFQUFFO0FBQ1osVUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQzs7QUFFdEMsVUFBSSxFQUFDLENBQUMsSUFBSSxFQUFFO0FBQ1YsZUFBTztPQUNSOztBQUVELFVBQUksSUFBSSxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUM7O0FBRXJDLFVBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ3JGLFVBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztBQUNiLFVBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztLQUNkOzs7V0FFTSxtQkFBRztBQUNSLFVBQUksSUFBSSxDQUFDLEtBQUssS0FBSyxJQUFJLENBQUMsY0FBYyxFQUFFO0FBQ3RDLFlBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQztBQUNqQyxZQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDO09BQ2hEOztBQUVELGFBQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQztLQUN2Qjs7O1dBRWdCLDZCQUFHO0FBQ2xCLFVBQUksSUFBSSxDQUFDLEtBQUssS0FBSyxJQUFJLENBQUMsWUFBWSxFQUFFO0FBQ3BDLFlBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQztBQUMvQixZQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQztPQUN6RDs7QUFFRCxhQUFPLElBQUksQ0FBQyxPQUFPLENBQUM7S0FDckI7OztXQUVJLGlCQUFHO0FBQ04sVUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQztBQUM3QyxVQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7O0FBRXBELFVBQUksSUFBSSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDMUMsVUFBSSxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO0FBQzdCLFVBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO0FBQ3JDLFVBQUksSUFBSSxHQUFHLElBQUksQ0FBQzs7QUFFaEIsVUFBSSxRQUFRLEdBQUcsa0JBQVUsR0FBRyxFQUFFLEtBQUssRUFBRTtBQUNuQyxZQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxDQUFDO0FBQ3pDLGVBQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUM7T0FDNUUsQ0FBQzs7QUFFRixVQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxPQUFPLEdBQUcsU0FBUyxDQUFDOztBQUVoRixVQUFJLElBQUksQ0FBQyxLQUFLLEdBQUcsT0FBTyxDQUFDLE1BQU0sRUFBRTtBQUMvQixlQUFPLEdBQUcsUUFBUSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7T0FDekMsTUFBTTtBQUNMLGFBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO09BQ3REOztBQUVELFVBQUksQ0FBQyxTQUFTLEdBQUcsT0FBTyxDQUFDO0FBQ3pCLFVBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDO0tBQzlDOzs7U0E1UmtCLElBQUk7OztxQkFBSixJQUFJOzs7Ozs7Ozs7OztBQ3BCekIsSUFBSSxVQUFVLEdBQUcsRUFBRSxDQUFDOztBQUVwQixVQUFVLENBQUMsWUFBWSxHQUFHLFVBQVMsU0FBUyxFQUFFO0FBQzVDLE1BQUksS0FBSyxHQUFHLEVBQUUsQ0FBQztBQUNmLE1BQUksSUFBSSxHQUFHLEVBQUUsQ0FBQztBQUNkLE1BQUksTUFBTSxHQUFHLEtBQUssQ0FBQztBQUNuQixNQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7O0FBRVQsT0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7QUFDNUMsUUFBSSxJQUFJLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3hCLFFBQUksSUFBSSxLQUFLLEdBQUcsSUFBSSxJQUFJLEtBQUssSUFBSSxFQUFFO0FBQ2pDLFVBQUksTUFBTSxFQUFFO0FBQ1YsWUFBSSxJQUFJLEtBQUssTUFBTSxFQUFFO0FBQ25CLGNBQUksU0FBUyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxJQUFJLEVBQUU7QUFDN0IsZ0JBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQztXQUNqQyxNQUFNO0FBQ0wsaUJBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDakIsZ0JBQUksR0FBRyxFQUFFLENBQUM7QUFDVixrQkFBTSxHQUFHLElBQUksQ0FBQztXQUNmO1NBQ0YsTUFBTTtBQUNMLGNBQUksSUFBSSxJQUFJLENBQUM7U0FDZDtPQUNGLE1BQU07QUFDTCxjQUFNLEdBQUcsSUFBSSxDQUFDO09BQ2Y7S0FDRixNQUFNLElBQUksSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRTtBQUNsQyxXQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ2pCLFVBQUksR0FBRyxFQUFFLENBQUM7S0FDWCxNQUFNO0FBQ0wsVUFBSSxJQUFJLElBQUksQ0FBQztLQUNkO0dBQ0Y7O0FBRUQsTUFBSSxNQUFNLEVBQUU7QUFDVixVQUFNLElBQUksS0FBSyxDQUFDLHFCQUFxQixDQUFDLENBQUM7R0FDeEMsTUFBTSxJQUFJLElBQUksRUFBRTtBQUNmLFNBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7R0FDbEI7O0FBRUQsU0FBTyxLQUFLLENBQUM7Q0FDZCxDQUFDOztBQUVGLFVBQVUsQ0FBQyxLQUFLLEdBQUcsVUFBVSxJQUFJLEVBQUU7QUFDakMsTUFBSSxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUEsQ0FBRSxJQUFJLEVBQUUsQ0FBQzs7QUFFNUIsTUFBSSxHQUFHLEdBQUc7QUFDUixhQUFTLEVBQUUsRUFBRTtBQUNiLFdBQU8sRUFBRSxFQUFFO0FBQ1gsT0FBRyxFQUFFLElBQUk7R0FDVixDQUFDOztBQUVGLE1BQUksR0FBRyxVQUFVLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDOztBQUVyQyxXQUFTLFNBQVMsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFO0FBQ2hDLE9BQUcsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEdBQUcsT0FBTyxLQUFLLEtBQUssUUFBUSxHQUFHLEtBQUssR0FBRyxJQUFJLENBQUM7R0FDaEU7O0FBRUQsT0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtBQUMzQyxRQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRWxCLFFBQUksQ0FBQyxHQUFHLEVBQUU7QUFDUixlQUFTO0tBQ1Y7O0FBRUQsUUFBSSxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxJQUFJLEVBQUU7QUFDN0IsVUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUN2QixVQUFJLElBQUksSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFO0FBQzNCLGlCQUFTLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztBQUMvQixTQUFDLEVBQUUsQ0FBQztPQUNMLE1BQU07QUFDTCxpQkFBUyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztPQUMxQjtLQUNGLE1BQU0sSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFO0FBQ3pCLFFBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7S0FDM0MsTUFBTTtBQUNMLFNBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0tBQ3pCO0dBQ0Y7O0FBRUQsU0FBTyxHQUFHLENBQUM7Q0FDWixDQUFDOztxQkFFYSxVQUFVOzs7Ozs7Ozs7Ozs7Ozs7OzswQkNsRkYsZUFBZTs7OztrQkFDdkIsTUFBTTs7OztvQkFDSixRQUFROzs7O3NCQUNOLFVBQVU7Ozs7SUFFUixjQUFjO0FBQ3RCLFdBRFEsY0FBYyxDQUNyQixHQUFHLEVBQUU7MEJBREUsY0FBYzs7QUFFL0IsUUFBSSxDQUFDLFFBQVEsR0FBRyxFQUFFLENBQUM7QUFDbkIsUUFBSSxDQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7QUFDbEIsUUFBSSxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUM7R0FDaEI7O2VBTGtCLGNBQWM7O1dBTzNCLGdCQUFDLEdBQUcsRUFBRTtBQUNWLFVBQUksSUFBSSxHQUFHLGtCQUFLLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUNqQyxhQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLEtBQUssQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO0tBQ3hDOzs7V0FFSyxpQkFBQyxZQUFZLEVBQUU7QUFDbkIsVUFBSSxJQUFJLEdBQUcsWUFBWSxDQUFDLFdBQVcsRUFBRSxDQUFDO0FBQ3RDLGNBQVEsSUFBSTtBQUNWLGFBQUssT0FBTztBQUNWLGlCQUFPLFVBQVUsQ0FBQztBQUFBLEFBQ3BCLGFBQUssUUFBUTtBQUNYLGlCQUFPLGVBQWUsQ0FBQztBQUFBLEFBQ3pCLGFBQUssbUJBQW1CO0FBQ3RCLGlCQUFPLE1BQU0sQ0FBQztBQUFBLEFBQ2hCO0FBQ0UsZ0NBQW1CLFlBQVksU0FBSztBQUFBLE9BQ3ZDO0tBQ0Y7OztXQUVHLGNBQUMsR0FBRyxFQUFFOzs7QUFDUixVQUFJLElBQUksR0FBRyxrQkFBSyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDakMsVUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsS0FBSyxDQUFDLENBQUM7QUFDcEMsVUFBSSxFQUFFLENBQUM7QUFDUCxVQUFJLE1BQU0sQ0FBQyxNQUFNLEVBQUUsRUFBRTtBQUNuQixZQUFJLElBQUksR0FBRyxJQUFJLENBQUM7QUFDaEIsY0FBTSxHQUFHLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQztBQUN2QixjQUFNLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxrREFBa0QsRUFBRSxVQUFDLEtBQUssRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFLO0FBQ3JHLDBCQUFjLFFBQVEsV0FBTSxlQUFXLENBQUMsSUFBSSxDQUFDLENBQUc7U0FDakQsQ0FBQyxDQUFDO0FBQ0gsY0FBTSxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztBQUMvRCxVQUFFLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixHQUFHLE1BQU0sR0FBRyx5QkFBeUIsQ0FBQyxFQUFFLENBQUM7T0FDckU7QUFDRCxhQUFPLEVBQUUsQ0FBQztLQUNYOzs7V0FFTSxpQkFBQyxHQUFHLEVBQUU7QUFDWCxhQUFPLENBQUMsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQSxBQUFDLENBQUM7S0FDeEU7OztXQUVXLHNCQUFDLEdBQUcsRUFBRTtBQUNoQixVQUFJLE9BQU8sR0FBRyxFQUFFLENBQUM7QUFDakIsU0FBRyxHQUFHLEdBQUcsQ0FBQyxXQUFXLEVBQUUsQ0FBQzs7QUFFeEIsQUFBQyxZQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBRSxPQUFPLENBQUMsVUFBVSxPQUFPLEVBQUU7QUFDeEYsWUFBSSxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsV0FBVyxFQUFFLEtBQUssR0FBRyxFQUFFO0FBQ3ZELGlCQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1NBQ3ZCO09BQ0YsQ0FBQyxDQUFDOztBQUVILGFBQU8sT0FBTyxDQUFDO0tBQ2hCOzs7V0FFSSxlQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUU7QUFDdEMsVUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUU7QUFDckIsV0FBRyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDckIsV0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO09BQ3BDOztBQUVELFNBQUcsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3JCLFVBQUksT0FBTyxHQUFHLEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQztBQUMxQixVQUFJLElBQUksR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDOztBQUV6QixVQUFJLEtBQUssQ0FBQzs7QUFFVixVQUFJLEVBQUUsS0FBSyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUEsQUFBQyxFQUFFO0FBQ2hDLFlBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFDM0IsWUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUM7QUFDckMsWUFBSSxJQUFJLEdBQUcsS0FBSyxDQUFDOztBQUVqQixZQUFJLENBQUMsQUFBQyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFO0FBQ3BDLGNBQUksRUFBRSxDQUFDO1NBQ1I7O0FBRUQsWUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDakMsWUFBSSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFHLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ2pFLFlBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztBQUN4QixZQUFJLEdBQUcsS0FBSyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7O0FBRTlCLFlBQUksQ0FBQyxJQUFJLEVBQUU7QUFDVCxnQkFBTSxDQUFDLEtBQUssQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO0FBQzdDLGlCQUFPO1NBQ1I7O0FBRUQsWUFBSSxJQUFJLEdBQUcsa0JBQUssSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDOztBQUUzQixZQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxFQUFFO0FBQ3hCLGdCQUFNLENBQUMsS0FBSyxDQUFDLGtDQUFrQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUM3RCxpQkFBTztTQUNSLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsRUFBRTtBQUMxQixnQkFBTSxDQUFDLEtBQUssQ0FBQyx3QkFBd0IsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDbkQsaUJBQU87U0FDUixNQUFNLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRSxFQUFFO0FBQ3ZCLGdCQUFNLENBQUMsS0FBSyxDQUFDLHVCQUF1QixHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNsRCxpQkFBTztTQUNSOztBQUVELFlBQUksQ0FBQyxNQUFNLEVBQUU7QUFDWCxjQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7U0FDZDs7QUFFRCxZQUFJLE9BQU8sR0FBRyx5QkFBWSxDQUFDO0FBQzNCLGVBQU8sQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLFVBQVMsSUFBSSxFQUFFO0FBQ2hDLGNBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxHQUFHLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7U0FDckMsQ0FBQyxDQUFDOztBQUVILFlBQUksSUFBSSxLQUFLLEdBQUcsRUFBRTtBQUNoQixnQkFBTSxHQUFHLE9BQU8sQ0FBQztTQUNsQjs7QUFFRCxZQUFJLElBQUksS0FBSyxHQUFHLElBQUksSUFBSSxLQUFLLEdBQUcsRUFBRTtBQUNoQyxnQkFBTSxHQUFHLE9BQU8sQ0FBQztTQUNsQjs7QUFFRCxZQUFJLEtBQUssR0FBRyxJQUFJLENBQUM7QUFDakIsWUFBSSxHQUFHLFlBQVk7QUFDakIsMEJBQUcsT0FBTyxFQUFFLENBQUM7QUFDYixlQUFLLEVBQUUsQ0FBQztTQUNULENBQUM7T0FDSDs7QUFFRCxVQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7S0FDdkQ7OztXQUVHLGNBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUU7QUFDM0MsVUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFO0FBQ3JCLFlBQUksSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFBLENBQUUsSUFBSSxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQzlELFlBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDckUsZUFBTztPQUNSOztBQUVELFVBQUksRUFBRSxDQUFDO0FBQ1AsVUFBSSxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEtBQUssVUFBVSxFQUFFO0FBQzVDLFVBQUUsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDO09BQ3pCLE1BQU0sSUFBSyxFQUFFLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRyxFQUNqQyxNQUFNO0FBQ0wsY0FBTSxDQUFDLEtBQUssQ0FBQywwQkFBMEIsR0FBRyxHQUFHLENBQUMsQ0FBQztBQUMvQyxZQUFJLEVBQUUsQ0FBQztBQUNQLGVBQU87T0FDUjs7QUFFRCxVQUFJO0FBQ0YsWUFBSSxHQUFHLHdCQUFXLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUM5QixVQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7T0FDdkQsQ0FBQyxPQUFPLEdBQUcsRUFBRTtBQUNaLGNBQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ3hCLFlBQUksRUFBRSxDQUFDO09BQ1I7S0FDRjs7O1dBRU8sa0JBQUMsR0FBRyxFQUFFLEVBQUUsRUFBRTtBQUNoQixVQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQztLQUN6Qjs7O1dBRUksZUFBQyxHQUFHLEVBQUUsUUFBUSxFQUFFO0FBQ25CLFVBQUksU0FBUyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7QUFDMUIsZUFBTyxJQUFJLENBQUMsT0FBTyxDQUFDO09BQ3JCO0FBQ0QsVUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxRQUFRLENBQUM7S0FDOUI7OztXQUVNLGlCQUFDLEdBQUcsRUFBRTtBQUNYLGFBQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztLQUMxQjs7O1dBRUUsYUFBQyxHQUFHLEVBQUU7QUFDUCxhQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUM7S0FDM0I7OztTQTdLa0IsY0FBYzs7O3FCQUFkLGNBQWM7Ozs7OztBQ05uQyxZQUFZLENBQUM7O0FBRWIsSUFBSSxHQUFHLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDOztBQUUzQixJQUFJLE9BQU8sR0FBRyxDQUFDLFlBQVk7QUFDekIsV0FBUyxPQUFPLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRTtBQUMvQixRQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztBQUNyQixRQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztBQUNyQixRQUFJLENBQUMsUUFBUSxHQUFHLE9BQU8sT0FBTyxLQUFLLFdBQVcsR0FBRyxFQUFFLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQztHQUN0RTs7QUFFRCxXQUFTLFNBQVMsQ0FBQyxJQUFJLEVBQUU7QUFDdkIsV0FBTyxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLEVBQUU7QUFDcEMsYUFBTyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDO0tBQ3BDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7R0FDZDs7QUFFRCxTQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBRyxZQUFZO0FBQ2xDLFFBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO0dBQ3pDLENBQUM7O0FBRUYsU0FBTyxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUcsWUFBWTtBQUNwQyxRQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztHQUN6QyxDQUFDOztBQUVGLFNBQU8sQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFHLFlBQVk7QUFDcEMsT0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDO0dBQ2IsQ0FBQzs7QUFFRixTQUFPLE9BQU8sQ0FBQztDQUNoQixDQUFBLEVBQUcsQ0FBQzs7QUFHTCxNQUFNLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQzs7Ozs7QUNqQ3pCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNB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YSxDQUFDO0FBQzNCLGdCQUFVLENBQUM7ZUFBTSxDQUFDLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQyxZQUFZO09BQUEsRUFBRSxDQUFDLENBQUMsQ0FBQztLQUNuRDs7O1dBRUksaUJBQUc7QUFDTixVQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUM7QUFDOUIsVUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO0tBQ2Y7OztTQXhJRyxHQUFHOzs7QUE0SVQsTUFBTSxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUM7cUJBQ0YsR0FBRyIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJpbXBvcnQgQ29tbWFuZE1hbmFnZXIgZnJvbSAnLi9jb21tYW5kLW1hbmFnZXInO1xuaW1wb3J0IExvY2FsU3RvcmFnZSBmcm9tICcuL2xvY2FsLXN0b3JhZ2UnO1xuaW1wb3J0IEZTIGZyb20gJy4vZnMnO1xuXG4vLyBUT0RPOiBJbXBsZW1lbnQgVkkgYmluZGluZ3NcblxuY29uc3QgTEVGVCA9IDM3O1xuY29uc3QgVVAgPSAzODtcbmNvbnN0IFJJR0hUID0gMzk7XG5jb25zdCBET1dOID0gNDA7XG5cbmNvbnN0IFRBQiA9IDk7XG5jb25zdCBFTlRFUiA9IDEzO1xuY29uc3QgQkFDS1NQQUNFID0gODtcbmNvbnN0IFNQQUNFID0gMzI7XG5cbmNvbnN0IEhJU1RPUllfU1RPUkFHRV9LRVkgPSAnVEVSTUlOQUxfSElTVE9SWSc7XG5jb25zdCBISVNUT1JZX1NJWkUgPSAxMDA7XG5jb25zdCBISVNUT1JZX1NFUEFSQVRPUiA9ICclJUhJU1RPUllfU0VQQVJBVE9SJSUnO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBSRVBMIHtcbiAgY29uc3RydWN0b3IoenNoKSB7XG4gICAgdGhpcy5pbnB1dCA9ICcnO1xuICAgIHRoaXMuaW5kZXggPSAwO1xuICAgIHRoaXMubGlzdGVuZXJzID0ge307XG4gICAgdGhpcy5sYXN0S2V5ID0gbnVsbDtcbiAgICB0aGlzLnpzaCA9IHpzaDtcblxuICAgIHRoaXMuZnVsbEhpc3RvcnkgPSAoW0xvY2FsU3RvcmFnZS5nZXRJdGVtKEhJU1RPUllfU1RPUkFHRV9LRVkpXSArICcnKS5zcGxpdChISVNUT1JZX1NFUEFSQVRPUikuZmlsdGVyKFN0cmluZyk7XG4gICAgdGhpcy5oaXN0b3J5ID0gdGhpcy5mdWxsSGlzdG9yeS5zbGljZSgwKSB8fCBbXTtcbiAgICB0aGlzLmhpc3RvcnlJbmRleCA9IHRoaXMuaGlzdG9yeS5sZW5ndGg7XG5cbiAgICB0aGlzLmNyZWF0ZUNhcmV0KCk7XG4gIH1cblxuICBjcmVhdGVDYXJldCgpIHtcbiAgICB0aGlzLmNhcmV0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgIHRoaXMuY2FyZXQuY2xhc3NOYW1lID0gJ2NhcmV0JztcbiAgfVxuXG4gIG9uKGV2ZW50LCBjYWxsYmFjaykge1xuICAgICgodGhpcy5saXN0ZW5lcnNbZXZlbnRdID0gdGhpcy5saXN0ZW5lcnNbZXZlbnRdIHx8IFtdKSkucHVzaChjYWxsYmFjayk7XG4gIH1cblxuICB1c2Uoc3Bhbikge1xuICAgIHRoaXMuc3BhbiAmJiB0aGlzLnJlbW92ZUNhcmV0KCk7XG4gICAgdGhpcy5zcGFuID0gc3BhbjtcbiAgICB3aW5kb3cub25rZXlkb3duID0gdGhpcy5wYXJzZS5iaW5kKHRoaXMpO1xuICAgIHRoaXMud3JpdGUoKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIHBhcnNlKGV2ZW50KSB7XG4gICAgaWYgKGV2ZW50Lm1ldGFLZXkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIHN3aXRjaCAoZXZlbnQua2V5Q29kZSkge1xuICAgICAgY2FzZSBMRUZUOlxuICAgICAgY2FzZSBSSUdIVDpcbiAgICAgICAgdGhpcy5tb3ZlQ2FyZXQoZXZlbnQua2V5Q29kZSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBVUDpcbiAgICAgIGNhc2UgRE9XTjpcbiAgICAgICAgdGhpcy5uYXZpZ2F0ZUhpc3RvcnkoZXZlbnQua2V5Q29kZSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBUQUI6XG4gICAgICAgIHRoaXMuYXV0b2NvbXBsZXRlKCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBFTlRFUjpcbiAgICAgICAgdGhpcy5zdWJtaXQoKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIEJBQ0tTUEFDRTpcbiAgICAgICAgdGhpcy5iYWNrc3BhY2UoKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBpZiAoZXZlbnQuY3RybEtleSkge1xuICAgICAgICAgIHRoaXMuYWN0aW9uKGV2ZW50KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLnVwZGF0ZShldmVudCk7XG4gICAgICAgIH1cbiAgICB9XG4gIH1cblxuICBtb3ZlQ2FyZXQoZGlyZWN0aW9uKSB7XG4gICAgaWYgKGRpcmVjdGlvbiA9PT0gTEVGVCkge1xuICAgICAgdGhpcy5pbmRleCA9IE1hdGgubWF4KHRoaXMuaW5kZXggLSAxLCAwKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5pbmRleCA9IE1hdGgubWluKHRoaXMuaW5kZXggKyAxLCB0aGlzLmlucHV0Lmxlbmd0aCArIDEpO1xuICAgIH1cbiAgICB0aGlzLndyaXRlKCk7XG4gIH1cblxuICBhdXRvY29tcGxldGUoKSB7XG4gICAgdmFyIG9wdGlvbnM7XG4gICAgdmFyIHBhdGggPSBmYWxzZTtcblxuICAgIGlmICh0aGlzLmNvbW1hbmQoKSA9PT0gdGhpcy5pbnB1dCkge1xuICAgICAgb3B0aW9ucyA9IHRoaXMuenNoLkNvbW1hbmRNYW5hZ2VyLmF1dG9jb21wbGV0ZSh0aGlzLmNvbW1hbmQoKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHBhdGggPSB0aGlzLmlucHV0LnNwbGl0KCcgJykucG9wKCk7XG4gICAgICBvcHRpb25zID0gRlMuYXV0b2NvbXBsZXRlKHBhdGgpO1xuICAgIH1cblxuICAgIGlmIChvcHRpb25zLmxlbmd0aCA9PT0gMSkge1xuICAgICAgaWYgKHBhdGggIT09IGZhbHNlKSB7XG4gICAgICAgIHBhdGggPSBwYXRoLnNwbGl0KCcvJyk7XG4gICAgICAgIHBhdGgucG9wKCk7XG4gICAgICAgIHBhdGgucHVzaCgnJyk7XG5cbiAgICAgICAgdGhpcy5pbnB1dCA9IHRoaXMuaW5wdXQucmVwbGFjZSgvIFteIF0qJC8sICcgJyArIHBhdGguam9pbignLycpICsgb3B0aW9ucy5zaGlmdCgpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuaW5wdXQgPSBvcHRpb25zLnNoaWZ0KCkgKyAnICc7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuaW5kZXggPSB0aGlzLmlucHV0Lmxlbmd0aDtcbiAgICAgIHRoaXMud3JpdGUoKTtcbiAgICB9IGVsc2UgaWYgKG9wdGlvbnMubGVuZ3RoKXtcbiAgICAgIHRoaXMuenNoLnN0ZG91dC53cml0ZShvcHRpb25zLmpvaW4oJyAnKSk7XG4gICAgICB0aGlzLnpzaC5wcm9tcHQoKTtcbiAgICB9XG4gIH1cblxuICBuYXZpZ2F0ZUhpc3RvcnkoZGlyZWN0aW9uKSB7XG4gICAgaWYgKGRpcmVjdGlvbiA9PT0gVVApIHtcbiAgICAgIHRoaXMuaGlzdG9yeUluZGV4ID0gTWF0aC5tYXgodGhpcy5oaXN0b3J5SW5kZXggLSAxLCAwKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5oaXN0b3J5SW5kZXggPSBNYXRoLm1pbih0aGlzLmhpc3RvcnlJbmRleCArIDEsIHRoaXMuaGlzdG9yeS5sZW5ndGggLSAxKTtcbiAgICB9XG5cbiAgICB0aGlzLmlucHV0ID0gdGhpcy5oaXN0b3J5W3RoaXMuaGlzdG9yeUluZGV4XSB8fCAnJztcbiAgICB0aGlzLmluZGV4ID0gdGhpcy5pbnB1dC5sZW5ndGg7XG4gICAgdGhpcy53cml0ZSgpO1xuICB9XG5cbiAgc3VibWl0KHByZXZlbnRXcml0ZSkge1xuICAgIHRoaXMuaW5kZXggPSB0aGlzLmlucHV0Lmxlbmd0aDtcblxuICAgIGlmICghcHJldmVudFdyaXRlKSB7XG4gICAgICB0aGlzLndyaXRlKCk7XG4gICAgfVxuXG4gICAgdmFyIGlucHV0ID0gdGhpcy5pbnB1dC50cmltKCk7XG5cbiAgICBpZiAoaW5wdXQgJiYgaW5wdXQgIT09IHRoaXMuZnVsbEhpc3RvcnlbdGhpcy5mdWxsSGlzdG9yeS5sZW5ndGggLSAxXSkge1xuICAgICAgdGhpcy5mdWxsSGlzdG9yeVt0aGlzLmZ1bGxIaXN0b3J5Lmxlbmd0aF0gPSBpbnB1dDtcbiAgICAgIExvY2FsU3RvcmFnZS5zZXRJdGVtKEhJU1RPUllfU1RPUkFHRV9LRVksIHRoaXMuZnVsbEhpc3Rvcnkuc2xpY2UoLUhJU1RPUllfU0laRSkuam9pbihISVNUT1JZX1NFUEFSQVRPUikpO1xuICAgIH1cblxuICAgIHRoaXMuaGlzdG9yeSA9IHRoaXMuZnVsbEhpc3Rvcnkuc2xpY2UoMCk7XG4gICAgdGhpcy5oaXN0b3J5SW5kZXggPSB0aGlzLmhpc3RvcnkubGVuZ3RoO1xuXG4gICAgdGhpcy5jbGVhcigpO1xuXG4gICAgaWYgKGlucHV0KSB7XG4gICAgICB0aGlzLnpzaC5Db21tYW5kTWFuYWdlci5wYXJzZShcbiAgICAgICAgaW5wdXQsXG4gICAgICAgIHRoaXMuenNoLnN0ZGluLFxuICAgICAgICB0aGlzLnpzaC5zdGRvdXQsXG4gICAgICAgIHRoaXMuenNoLnN0ZGVycixcbiAgICAgICAgdGhpcy56c2gucHJvbXB0LmJpbmQodGhpcy56c2gpXG4gICAgICApO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnpzaC5wcm9tcHQoKTtcbiAgICB9XG4gIH1cblxuICB0cmlnZ2VyKGV2dCwgbXNnKSB7XG4gICAgdmFyIGNhbGxiYWNrcyA9IHRoaXMubGlzdGVuZXJzW2V2dF0gfHwgW107XG5cbiAgICBjYWxsYmFja3MuZm9yRWFjaChmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgICAgIGNhbGxiYWNrKG1zZyk7XG4gICAgfSk7XG4gIH1cblxuICByZW1vdmVDYXJldCgpIHtcbiAgICB2YXIgY2FyZXQgPSB0aGlzLnNwYW4uZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSgnY2FyZXQnKTtcblxuICAgIGlmIChjYXJldCAmJiBjYXJldFswXSkge1xuICAgICAgY2FyZXRbMF0ucmVtb3ZlKCk7XG4gICAgfVxuICB9XG5cbiAgY2xlYXIoKSB7XG4gICAgdGhpcy5pbnB1dCA9ICcnO1xuICAgIHRoaXMuaW5kZXggPSAwO1xuICB9XG5cbiAgYmFja3NwYWNlKCkge1xuICAgIGlmICh0aGlzLmluZGV4ID4gMCkge1xuICAgICAgdGhpcy5pbnB1dCA9IHRoaXMuaW5wdXQuc3Vic3RyKDAsIHRoaXMuaW5kZXggLSAxKSArIHRoaXMuaW5wdXQuc3Vic3RyKHRoaXMuaW5kZXgpO1xuICAgICAgdGhpcy5pbmRleC0tO1xuICAgICAgdGhpcy53cml0ZSgpO1xuICAgIH1cbiAgfVxuXG4gIGFjdHVhbENoYXJDb2RlKGV2ZW50KSB7XG4gICAgdmFyIG9wdGlvbnM7XG4gICAgdmFyIGNvZGUgPSBldmVudC5rZXlDb2RlO1xuXG4gICAgY29kZSA9IHtcbiAgICAgIDE3MzogMTg5XG4gICAgfVtjb2RlXSB8fCBjb2RlO1xuXG4gICAgaWYgKGNvZGUgPj0gNjUgJiYgY29kZSA8PSA5MCkge1xuICAgICAgaWYgKCFldmVudC5zaGlmdEtleSkge1xuICAgICAgICBjb2RlICs9IDMyO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoY29kZSA+PSA0OCAmJiBjb2RlIDw9IDU3KSB7XG4gICAgICBpZiAoZXZlbnQuc2hpZnRLZXkpIHtcbiAgICAgICAgY29kZSA9ICcpIUAjJCVeJiooJy5jaGFyQ29kZUF0KGNvZGUgLSA0OCk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChjb2RlID49IDE4NiAmJiBjb2RlIDw9IDE5Mil7XG4gICAgICBvcHRpb25zID0gJzs9LC0uL2A6KzxfPj9+JztcblxuICAgICAgY29kZSAtPSAxODY7XG5cbiAgICAgIGlmIChldmVudC5zaGlmdEtleSkge1xuICAgICAgICBjb2RlICs9IG9wdGlvbnMubGVuZ3RoIC8gMjtcbiAgICAgIH1cblxuICAgICAgY29kZSA9IG9wdGlvbnMuY2hhckNvZGVBdChjb2RlKTtcbiAgICB9IGVsc2UgaWYgKGNvZGUgPj0gMjE5ICYmIGNvZGUgPD0gMjIyKSB7XG4gICAgICBvcHRpb25zID0gJ1tcXFxcXVxcJ3t8fVwiJztcbiAgICAgIGNvZGUgLT0gMjE5O1xuXG4gICAgICBpZiAoZXZlbnQuc2hpZnRLZXkpIHtcbiAgICAgICAgY29kZSArPSBvcHRpb25zLmxlbmd0aCAvIDI7XG4gICAgICB9XG5cbiAgICAgIGNvZGUgPSBvcHRpb25zLmNoYXJDb2RlQXQoY29kZSk7XG4gICAgfSBlbHNlIGlmIChjb2RlICE9PSBTUEFDRSkge1xuICAgICAgY29kZSA9IC0xO1xuICAgIH1cblxuICAgIHJldHVybiBjb2RlO1xuICB9XG5cbiAgYWN0aW9uKGV2ZW50KSB7XG4gICAgaWYgKFN0cmluZy5mcm9tQ2hhckNvZGUoZXZlbnQua2V5Q29kZSkgPT09ICdDJykge1xuICAgICAgdGhpcy5pbmRleCA9IHRoaXMuaW5wdXQubGVuZ3RoO1xuICAgICAgdGhpcy53cml0ZSgpO1xuICAgICAgdGhpcy5pbnB1dCA9ICcnO1xuICAgICAgdGhpcy5zdWJtaXQodHJ1ZSk7XG4gICAgfVxuICB9XG5cbiAgdXBkYXRlKGV2ZW50KSB7XG4gICAgdmFyIGNvZGUgPSB0aGlzLmFjdHVhbENoYXJDb2RlKGV2ZW50KTtcblxuICAgIGlmICghfmNvZGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgY2hhciA9IFN0cmluZy5mcm9tQ2hhckNvZGUoY29kZSk7XG5cbiAgICB0aGlzLmlucHV0ID0gdGhpcy5pbnB1dC5zdWJzdHIoMCwgdGhpcy5pbmRleCkgKyBjaGFyICsgdGhpcy5pbnB1dC5zdWJzdHIodGhpcy5pbmRleCk7XG4gICAgdGhpcy5pbmRleCsrO1xuICAgIHRoaXMud3JpdGUoKTtcbiAgfVxuXG4gIGNvbW1hbmQoKSB7XG4gICAgaWYgKHRoaXMuaW5wdXQgIT09IHRoaXMuX19pbnB1dENvbW1hbmQpIHtcbiAgICAgIHRoaXMuX19pbnB1dENvbW1hbmQgPSB0aGlzLmlucHV0O1xuICAgICAgdGhpcy5fX2NvbW1hbmQgPSB0aGlzLmlucHV0LnNwbGl0KCcgJykuc2hpZnQoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5fX2NvbW1hbmQ7XG4gIH1cblxuICBjb21tYW5kQXJnc1N0cmluZygpIHtcbiAgICBpZiAodGhpcy5pbnB1dCAhPT0gdGhpcy5fX2lucHV0Q0FyZ3MpIHtcbiAgICAgIHRoaXMuX19pbnB1dENBcmdzID0gdGhpcy5pbnB1dDtcbiAgICAgIHRoaXMuX19jYXJncyA9IHRoaXMuaW5wdXQuc3Vic3RyKHRoaXMuY29tbWFuZCgpLmxlbmd0aCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuX19jYXJncztcbiAgfVxuXG4gIHdyaXRlKCkge1xuICAgIHRoaXMuaGlzdG9yeVt0aGlzLmhpc3RvcnlJbmRleF0gPSB0aGlzLmlucHV0O1xuICAgIHRoaXMuY2FyZXQuaW5uZXJIVE1MID0gdGhpcy5pbnB1dFt0aGlzLmluZGV4XSB8fCAnJztcblxuICAgIHZhciBzcGFuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgIHZhciBjb21tYW5kID0gdGhpcy5jb21tYW5kKCk7XG4gICAgdmFyIGlucHV0ID0gdGhpcy5jb21tYW5kQXJnc1N0cmluZygpO1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIHZhciBwdXRDYXJldCA9IGZ1bmN0aW9uIChzdHIsIGluZGV4KSB7XG4gICAgICBzZWxmLmNhcmV0LmlubmVyVGV4dCA9IHN0cltpbmRleF0gfHwgJyAnO1xuICAgICAgcmV0dXJuIHN0ci5zdWJzdHIoMCwgaW5kZXgpICsgc2VsZi5jYXJldC5vdXRlckhUTUwgKyBzdHIuc3Vic3RyKGluZGV4ICsgMSk7XG4gICAgfTtcblxuICAgIHNwYW4uY2xhc3NOYW1lID0gdGhpcy56c2guQ29tbWFuZE1hbmFnZXIuaXNWYWxpZChjb21tYW5kKSA/ICd2YWxpZCcgOiAnaW52YWxpZCc7XG5cbiAgICBpZiAodGhpcy5pbmRleCA8IGNvbW1hbmQubGVuZ3RoKSB7XG4gICAgICBjb21tYW5kID0gcHV0Q2FyZXQoY29tbWFuZCwgdGhpcy5pbmRleCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlucHV0ID0gcHV0Q2FyZXQoaW5wdXQsIHRoaXMuaW5kZXggLSBjb21tYW5kLmxlbmd0aCk7XG4gICAgfVxuXG4gICAgc3Bhbi5pbm5lckhUTUwgPSBjb21tYW5kO1xuICAgIHRoaXMuc3Bhbi5pbm5lckhUTUwgPSBzcGFuLm91dGVySFRNTCArIGlucHV0O1xuICB9XG59XG4iLCJ2YXIgQXJnc1BhcnNlciA9IHt9O1xuXG5BcmdzUGFyc2VyLnBhcnNlU3RyaW5ncyA9IGZ1bmN0aW9uKHJhd1N0cmluZykge1xuICB2YXIgX2FyZ3MgPSBbXTtcbiAgdmFyIHdvcmQgPSAnJztcbiAgdmFyIHN0cmluZyA9IGZhbHNlO1xuICB2YXIgaSwgbDtcblxuICBmb3IgKGkgPSAwLCBsID0gcmF3U3RyaW5nLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIHZhciBjaGFyID0gcmF3U3RyaW5nW2ldO1xuICAgIGlmIChjaGFyID09PSAnXCInIHx8IGNoYXIgPT09ICdcXCcnKSB7XG4gICAgICBpZiAoc3RyaW5nKSB7XG4gICAgICAgIGlmIChjaGFyID09PSBzdHJpbmcpIHtcbiAgICAgICAgICBpZiAocmF3U3RyaW5nW2kgLSAxXSA9PT0gJ1xcXFwnKSB7XG4gICAgICAgICAgICB3b3JkID0gd29yZC5zbGljZSgwLCAtMSkgKyBjaGFyO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBfYXJncy5wdXNoKHdvcmQpO1xuICAgICAgICAgICAgd29yZCA9ICcnO1xuICAgICAgICAgICAgc3RyaW5nID0gbnVsbDtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgd29yZCArPSBjaGFyO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdHJpbmcgPSBjaGFyO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoY2hhciA9PT0gJyAnICYmICFzdHJpbmcpIHtcbiAgICAgIF9hcmdzLnB1c2god29yZCk7XG4gICAgICB3b3JkID0gJyc7XG4gICAgfSBlbHNlIHtcbiAgICAgIHdvcmQgKz0gY2hhcjtcbiAgICB9XG4gIH1cblxuICBpZiAoc3RyaW5nKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCd1bnRlcm1pbmF0ZWQgc3RyaW5nJyk7XG4gIH0gZWxzZSBpZiAod29yZCkge1xuICAgIF9hcmdzLnB1c2god29yZCk7XG4gIH1cblxuICByZXR1cm4gX2FyZ3M7XG59O1xuXG5BcmdzUGFyc2VyLnBhcnNlID0gZnVuY3Rpb24gKGFyZ3MpIHtcbiAgYXJncyA9IChbYXJnc10gKyAnJykudHJpbSgpO1xuXG4gIHZhciBvdXQgPSB7XG4gICAgYXJndW1lbnRzOiBbXSxcbiAgICBvcHRpb25zOiB7fSxcbiAgICByYXc6IGFyZ3NcbiAgfTtcblxuICBhcmdzID0gQXJnc1BhcnNlci5wYXJzZVN0cmluZ3MoYXJncyk7XG5cbiAgZnVuY3Rpb24gYWRkT3B0aW9uKG9wdGlvbiwgdmFsdWUpIHtcbiAgICBvdXQub3B0aW9uc1tvcHRpb25dID0gdHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJyA/IHZhbHVlIDogdHJ1ZTtcbiAgfVxuXG4gIGZvciAodmFyIGkgPSAwLCBsID0gYXJncy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICB2YXIgYXJnID0gYXJnc1tpXTtcblxuICAgIGlmICghYXJnKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBpZiAoYXJnLnN1YnN0cigwLCAyKSA9PT0gJy0tJykge1xuICAgICAgdmFyIG5leHQgPSBhcmdzW2kgKyAxXTtcbiAgICAgIGlmIChuZXh0ICYmIG5leHRbMF0gIT09ICctJykge1xuICAgICAgICBhZGRPcHRpb24oYXJnLnN1YnN0cigyKSwgbmV4dCk7XG4gICAgICAgIGkrKztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGFkZE9wdGlvbihhcmcuc3Vic3RyKDIpKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGFyZ1swXSA9PT0gJy0nKSB7XG4gICAgICBbXS5mb3JFYWNoLmNhbGwoYXJnLnN1YnN0cigxKSwgYWRkT3B0aW9uKTtcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0LmFyZ3VtZW50cy5wdXNoKGFyZyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG91dDtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IEFyZ3NQYXJzZXI7XG4iLCIvKmVzbGludCBuby1ldmFsOiAwKi9cbmltcG9ydCBBcmdzUGFyc2VyIGZyb20gJy4vYXJncy1wYXJzZXInO1xuaW1wb3J0IEZTIGZyb20gJy4vZnMnO1xuaW1wb3J0IEZpbGUgZnJvbSAnLi9maWxlJztcbmltcG9ydCBTdHJlYW0gZnJvbSAnLi9zdHJlYW0nO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBDb21tYW5kTWFuYWdlciB7XG4gIGNvbnN0cnVjdG9yKHpzaCkge1xuICAgIHRoaXMuY29tbWFuZHMgPSB7fTtcbiAgICB0aGlzLmFsaWFzZXMgPSB7fTtcbiAgICB0aGlzLnpzaCA9IHpzaDtcbiAgfVxuXG4gIGV4aXN0cyhjbWQpIHtcbiAgICB2YXIgcGF0aCA9IEZpbGUub3BlbignL3Vzci9iaW4nKTtcbiAgICByZXR1cm4gcGF0aC5vcGVuKGNtZCArICcuanMnKS5pc0ZpbGUoKTtcbiAgfVxuXG4gIGltcG9ydChvcmlnaW5hbEZpbGUpIHtcbiAgICB2YXIgZmlsZSA9IG9yaWdpbmFsRmlsZS50b0xvd2VyQ2FzZSgpO1xuICAgIHN3aXRjaCAoZmlsZSkge1xuICAgICAgY2FzZSAnLi96c2gnOlxuICAgICAgICByZXR1cm4gJ3NlbGYuenNoJztcbiAgICAgIGNhc2UgJy4vcmVwbCc6XG4gICAgICAgIHJldHVybiAnc2VsZi56c2gucmVwbCc7XG4gICAgICBjYXNlICcuL2NvbW1hbmQtbWFuYWdlcic6XG4gICAgICAgIHJldHVybiAnc2VsZic7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICByZXR1cm4gYHJlcXVpcmUoJyR7b3JpZ2luYWxGaWxlfScpYDtcbiAgICB9XG4gIH1cblxuICBsb2FkKGNtZCkge1xuICAgIHZhciBwYXRoID0gRmlsZS5vcGVuKCcvdXNyL2JpbicpO1xuICAgIHZhciBzb3VyY2UgPSBwYXRoLm9wZW4oY21kICsgJy5qcycpO1xuICAgIHZhciBmbjtcbiAgICBpZiAoc291cmNlLmlzRmlsZSgpKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICBzb3VyY2UgPSBzb3VyY2UucmVhZCgpO1xuICAgICAgc291cmNlID0gc291cmNlLnJlcGxhY2UoL15pbXBvcnQgKyhbQS1aYS16XSspICtmcm9tICsnKFsuL1xcLV9BLVphLXpdKyknL2dtLCAobWF0Y2gsIHZhcmlhYmxlLCBmaWxlKSA9PiB7XG4gICAgICAgIHJldHVybiBgdmFyICR7dmFyaWFibGV9ID0gJHt0aGlzLmltcG9ydChmaWxlKX1gO1xuICAgICAgfSk7XG4gICAgICBzb3VyY2UgPSBzb3VyY2UucmVwbGFjZSgnZXhwb3J0IGRlZmF1bHQnLCAndmFyIF9fZGVmYXVsdF9fID0nKTtcbiAgICAgIGZuID0gZXZhbCgnKGZ1bmN0aW9uICgpIHsgJyArIHNvdXJjZSArICc7IHJldHVybiBfX2RlZmF1bHRfXzt9KScpKCk7XG4gICAgfVxuICAgIHJldHVybiBmbjtcbiAgfVxuXG4gIGlzVmFsaWQoY21kKSB7XG4gICAgcmV0dXJuICEhKHRoaXMuY29tbWFuZHNbY21kXSB8fCB0aGlzLmFsaWFzZXNbY21kXSB8fCB0aGlzLmV4aXN0cyhjbWQpKTtcbiAgfVxuXG4gIGF1dG9jb21wbGV0ZShjbWQpIHtcbiAgICB2YXIgbWF0Y2hlcyA9IFtdO1xuICAgIGNtZCA9IGNtZC50b0xvd2VyQ2FzZSgpO1xuXG4gICAgKE9iamVjdC5rZXlzKHRoaXMuY29tbWFuZHMpLmNvbmNhdChPYmplY3Qua2V5cyh0aGlzLmFsaWFzZXMpKSkuZm9yRWFjaChmdW5jdGlvbiAoY29tbWFuZCkge1xuICAgICAgaWYgKGNvbW1hbmQuc3Vic3RyKDAsIGNtZC5sZW5ndGgpLnRvTG93ZXJDYXNlKCkgPT09IGNtZCkge1xuICAgICAgICBtYXRjaGVzLnB1c2goY29tbWFuZCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gbWF0Y2hlcztcbiAgfVxuXG4gIHBhcnNlKGNtZCwgc3RkaW4sIHN0ZG91dCwgc3RkZXJyLCBuZXh0KSB7XG4gICAgaWYgKH5jbWQuaW5kZXhPZignfCcpKSB7XG4gICAgICBjbWQgPSBjbWQuc3BsaXQoJ3wnKTtcbiAgICAgIGNtZC5mb3JFYWNoKHRoaXMucGFyc2UuYmluZCh0aGlzKSk7XG4gICAgfVxuXG4gICAgY21kID0gY21kLnNwbGl0KCcgJyk7XG4gICAgdmFyIGNvbW1hbmQgPSBjbWQuc2hpZnQoKTtcbiAgICB2YXIgYXJncyA9IGNtZC5qb2luKCcgJyk7XG5cbiAgICB2YXIgaW5kZXg7XG5cbiAgICBpZiAofihpbmRleCA9IGFyZ3MuaW5kZXhPZignPicpKSkge1xuICAgICAgdmFyIHByZXYgPSBhcmdzW2luZGV4IC0gMV07XG4gICAgICB2YXIgYXBwZW5kID0gYXJnc1tpbmRleCArIDFdID09PSAnPic7XG4gICAgICB2YXIgaW5pdCA9IGluZGV4O1xuXG4gICAgICBpZiAofihbJzEnLCAnMicsICcmJ10pLmluZGV4T2YocHJldikpIHtcbiAgICAgICAgaW5pdC0tO1xuICAgICAgfVxuXG4gICAgICB2YXIgX2FyZ3MgPSBhcmdzLnN1YnN0cigwLCBpbml0KTtcbiAgICAgIGFyZ3MgPSBhcmdzLnN1YnN0cihpbmRleCArIGFwcGVuZCArIDEpLnNwbGl0KCcgJykuZmlsdGVyKFN0cmluZyk7XG4gICAgICB2YXIgcGF0aCA9IGFyZ3Muc2hpZnQoKTtcbiAgICAgIGFyZ3MgPSBfYXJncyArIGFyZ3Muam9pbignICcpO1xuXG4gICAgICBpZiAoIXBhdGgpIHtcbiAgICAgICAgc3Rkb3V0LndyaXRlKCd6c2g6IHBhcnNlIGVycm9yIG5lYXIgYFxcXFxuXFwnJyk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdmFyIGZpbGUgPSBGaWxlLm9wZW4ocGF0aCk7XG5cbiAgICAgIGlmICghZmlsZS5wYXJlbnRFeGlzdHMoKSkge1xuICAgICAgICBzdGRvdXQud3JpdGUoJ3pzaDogbm8gc3VjaCBmaWxlIG9yIGRpcmVjdG9yeTogJyArIGZpbGUucGF0aCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH0gZWxzZSBpZiAoIWZpbGUuaXNWYWxpZCgpKSB7XG4gICAgICAgIHN0ZG91dC53cml0ZSgnenNoOiBub3QgYSBkaXJlY3Rvcnk6ICcgKyBmaWxlLnBhdGgpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9IGVsc2UgaWYgKGZpbGUuaXNEaXIoKSkge1xuICAgICAgICBzdGRvdXQud3JpdGUoJ3pzaDogaXMgYSBkaXJlY3Rvcnk6ICcgKyBmaWxlLnBhdGgpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmICghYXBwZW5kKSB7XG4gICAgICAgIGZpbGUuY2xlYXIoKTtcbiAgICAgIH1cblxuICAgICAgdmFyIF9zdGRvdXQgPSBuZXcgU3RyZWFtKCk7XG4gICAgICBfc3Rkb3V0Lm9uKCdkYXRhJywgZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICBmaWxlLndyaXRlKGRhdGEgKyAnXFxuJywgdHJ1ZSwgdHJ1ZSk7XG4gICAgICB9KTtcblxuICAgICAgaWYgKHByZXYgIT09ICcyJykge1xuICAgICAgICBzdGRvdXQgPSBfc3Rkb3V0O1xuICAgICAgfVxuXG4gICAgICBpZiAocHJldiA9PT0gJzInIHx8IHByZXYgPT09ICcmJykge1xuICAgICAgICBzdGRlcnIgPSBfc3Rkb3V0O1xuICAgICAgfVxuXG4gICAgICB2YXIgX25leHQgPSBuZXh0O1xuICAgICAgbmV4dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgRlMud3JpdGVGUygpO1xuICAgICAgICBfbmV4dCgpO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICB0aGlzLmV4ZWMoY29tbWFuZCwgYXJncywgc3RkaW4sIHN0ZG91dCwgc3RkZXJyLCBuZXh0KTtcbiAgfVxuXG4gIGV4ZWMoY21kLCBhcmdzLCBzdGRpbiwgc3Rkb3V0LCBzdGRlcnIsIG5leHQpIHtcbiAgICBpZiAodGhpcy5hbGlhc2VzW2NtZF0pIHtcbiAgICAgIHZhciBsaW5lID0gKHRoaXMuYWxpYXNlc1tjbWRdICsgJyAnICsgYXJncykudHJpbSgpLnNwbGl0KCcgJyk7XG4gICAgICB0aGlzLmV4ZWMobGluZS5zaGlmdCgpLCBsaW5lLmpvaW4oJyAnKSwgc3RkaW4sIHN0ZG91dCwgc3RkZXJyLCBuZXh0KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgZm47XG4gICAgaWYgKHR5cGVvZiB0aGlzLmNvbW1hbmRzW2NtZF0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGZuID0gdGhpcy5jb21tYW5kc1tjbWRdO1xuICAgIH0gZWxzZSBpZiAoKGZuID0gdGhpcy5sb2FkKGNtZCkpKSB7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ZGVyci53cml0ZSgnenNoOiBjb21tYW5kIG5vdCBmb3VuZDogJyArIGNtZCk7XG4gICAgICBuZXh0KCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIGFyZ3MgPSBBcmdzUGFyc2VyLnBhcnNlKGFyZ3MpO1xuICAgICAgZm4uY2FsbCh1bmRlZmluZWQsIGFyZ3MsIHN0ZGluLCBzdGRvdXQsIHN0ZGVyciwgbmV4dCk7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBzdGRlcnIud3JpdGUoZXJyLnN0YWNrKTtcbiAgICAgIG5leHQoKTtcbiAgICB9XG4gIH1cblxuICByZWdpc3RlcihjbWQsIGZuKSB7XG4gICAgdGhpcy5jb21tYW5kc1tjbWRdID0gZm47XG4gIH1cblxuICBhbGlhcyhjbWQsIG9yaWdpbmFsKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiB0aGlzLmFsaWFzZXM7XG4gICAgfVxuICAgIHRoaXMuYWxpYXNlc1tjbWRdID0gb3JpZ2luYWw7XG4gIH1cblxuICB1bmFsaWFzKGNtZCkge1xuICAgIGRlbGV0ZSB0aGlzLmFsaWFzZXNbY21kXTtcbiAgfVxuXG4gIGdldChjbWQpIHtcbiAgICByZXR1cm4gdGhpcy5jb21tYW5kc1tjbWRdO1xuICB9XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB6c2ggPSByZXF1aXJlKCcuL3pzaCcpO1xuXG52YXIgQ29uc29sZSA9IChmdW5jdGlvbiAoKSB7XG4gIGZ1bmN0aW9uIENvbnNvbGUoc3Rkb3V0LCBzdGRlcnIpIHtcbiAgICB0aGlzLnN0ZG91dCA9IHN0ZG91dDtcbiAgICB0aGlzLnN0ZGVyciA9IHN0ZGVycjtcbiAgICB0aGlzLmV4dGVybmFsID0gdHlwZW9mIGNvbnNvbGUgPT09ICd1bmRlZmluZWQnID8ge30gOiB3aW5kb3cuY29uc29sZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHN0cmluZ2lmeShhcmdzKSB7XG4gICAgcmV0dXJuIFtdLm1hcC5jYWxsKGFyZ3MsIGZ1bmN0aW9uIChhKSB7XG4gICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoYSkgfHwgW2FdKycnO1xuICAgIH0pLmpvaW4oJyAnKTtcbiAgfVxuXG4gIENvbnNvbGUucHJvdG90eXBlLmxvZyA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnN0ZG91dC53cml0ZShzdHJpbmdpZnkoYXJndW1lbnRzKSk7XG4gIH07XG5cbiAgQ29uc29sZS5wcm90b3R5cGUuZXJyb3IgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5zdGRlcnIud3JpdGUoc3RyaW5naWZ5KGFyZ3VtZW50cykpO1xuICB9O1xuXG4gIENvbnNvbGUucHJvdG90eXBlLmNsZWFyID0gZnVuY3Rpb24gKCkge1xuICAgIHpzaC5jbGVhcigpO1xuICB9O1xuXG4gIHJldHVybiBDb25zb2xlO1xufSkoKTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IENvbnNvbGU7XG4iLCJtb2R1bGUuZXhwb3J0cz17XG4gIFwibXRpbWVcIjogXCIyMDE1LTA0LTI2VDIxOjIxOjU5LjAwMFpcIixcbiAgXCJjdGltZVwiOiBcIjIwMTUtMDQtMjZUMjE6MjE6NTkuMDAwWlwiLFxuICBcImNvbnRlbnRcIjoge1xuICAgIFwiVXNlcnNcIjoge1xuICAgICAgXCJtdGltZVwiOiBcIjIwMTUtMDQtMjZUMjE6MjE6NTkuMDAwWlwiLFxuICAgICAgXCJjdGltZVwiOiBcIjIwMTUtMDQtMjZUMjE6MjE6NTkuMDAwWlwiLFxuICAgICAgXCJjb250ZW50XCI6IHtcbiAgICAgICAgXCJndWVzdFwiOiB7XG4gICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTUtMDQtMjZUMjE6MjE6NTkuMDAwWlwiLFxuICAgICAgICAgIFwiY3RpbWVcIjogXCIyMDE1LTA0LTI2VDIxOjIxOjU5LjAwMFpcIixcbiAgICAgICAgICBcImNvbnRlbnRcIjoge1xuICAgICAgICAgICAgXCIudmltcmNcIjoge1xuICAgICAgICAgICAgICBcIm10aW1lXCI6IFwiMjAxNS0wNC0yNlQyMToyMTo1OS4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY3RpbWVcIjogXCIyMDE1LTA0LTI2VDIxOjIxOjU5LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjb250ZW50XCI6IFwiXCIsXG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImZcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiLnpzaHJjXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTUtMDQtMjZUMjE6MjE6NTkuMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNS0wNC0yNlQyMToyMTo1OS4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcIlwiLFxuICAgICAgICAgICAgICBcInR5cGVcIjogXCJmXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImFib3V0Lm1kXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTUtMDQtMjZUMjE6MjE6NTkuMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNS0wNC0yNlQyMToyMTo1OS4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcIiMgdGFkZXV6YWdhbGxvLmNvbVxcblxcbiogQWJvdXQgbWVcXG4gIEknbSBhIEZ1bGwgU3RhY2sgRGV2ZWxvcGVyLCBKUyBQYXNzaW9uYXRlLCBSdWJ5IEZhbiwgQysrIFNvbWV0aGluZywgR2FtZSBEZXZlbG9wbWVudCBFbnRodXNpYXN0LFxcbiAgQWx3YXlzIHdpbGxpbmcgdG8gY29udHJpYnV0ZSB0byBvcGVuIHNvdXJjZSBwcm9qZWN0cyBhbmQgdHJ5aW5nIHRvIGxlYXJuIHNvbWUgbW9yZSBtYXRoLlxcblxcbiogQWJvdXQgdGhpcyB3ZWJzaXRlXFxuICBJIHdhbnRlZCBtb3JlIHRoYW4ganVzdCBzaG93IG15IHdvcmssIEkgd2FudGVkIHRvIHNob3cgbXkgd29yayBlbnZpcm9ubWVudC5cXG4gIFNpbmNlIEkgZG8gc29tZSBtb2JpbGUgZGV2ZWxvcG1lbnQgYXMgd2VsbCAgSSBhbHNvIHVzZSAoc2FkbHkpIHNvbWUgSURFcywgYnV0IGFsd2F5cyB0cnlpbmdcXG4gIHRvIGRvIGFzIG11Y2ggYXMgSSBjYW4gb24gdGhpcyB0ZXJtaW5hbCwgc28gSSBtYWRlIGEgdmVyeSBzaW1pbGFyIGNvcHkgKGF0IGxlYXN0IHZpc3VhbGx5KVxcbiAgb2YgaXQgc28gcGVvcGxlIGNvdWxkIGdldCB0byBzZWUgd2hhdCBJIGRvIGFuZCBob3cgSSAodXN1YWxseSkgZG8uXFxuXFxuKiBDb21tYW5kc1xcbiAgSWYgeW91IHdhbnQgdG8ga25vdyBtb3JlIGFib3V0IG1lLCB0aGVyZSBhcmUgYSBmZXcgY29tbWFuZHM6XFxuICAgICogYWJvdXQgIChjdXJyZW50bHkgcnVubmluZylcXG4gICAgKiBjb250YWN0IFxcbiAgICAqIHJlc3VtZVxcbiAgICAqIHByb2plY3RzXFxuXFxuICBJZiB5b3UgbmVlZCBzb21lIGhlbHAgYWJvdXQgdGhlIHRlcm1pbmFsLCBvciB3YW50IHRvIGtub3cgd2hhdCBmdW5jdGlvbmFsaXRpZXMgYXJlIGN1cnJyZW50bHkgaW1wbGVtZW50ZWQsIHR5cGUgYGhlbHBgIGFueSB0aW1lLlxcblxcbkhvcGUgeW91IGhhdmUgYXMgbXVjaCBmdW4gYXMgSSBoYWQgZG9pbmcgaXQgOilcXG5cXG5UYWRldSBaYWdhbGxvXFxuICAgICAgXFxuXCIsXG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImZcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiY29udGFjdC5tZFwiOiB7XG4gICAgICAgICAgICAgIFwibXRpbWVcIjogXCIyMDE1LTA0LTI2VDIxOjIxOjU5LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjdGltZVwiOiBcIjIwMTUtMDQtMjZUMjE6MjE6NTkuMDAwWlwiLFxuICAgICAgICAgICAgICBcImNvbnRlbnRcIjogXCIjIEFsbCBteSBjb250YWN0cywgZmVlbCBmcmVlIHRvIHJlYWNoIG1lIGF0IGFueSBvZiB0aGVzZVxcblxcbiogPGEgaHJlZj1cXFwibWFpbHRvOnRhZGV1emFnYWxsb0BnbWFpbC5jb21cXFwiIGFsdD1cXFwiRW1haWxcXFwiPltFbWFpbF0obWFpbHRvOnRhZGV1emFnYWxsb0BnbWFpbC5jb20pPC9hPlxcbiogPGEgaHJlZj1cXFwiaHR0cHM6Ly9naXRodWIuY29tL3RhZGV1emFnYWxsb1xcXCIgYWx0PVxcXCJHaXRIdWJcXFwiIHRhcmdldD1cXFwiX2JsYW5rXFxcIj5bR2l0SHViXShodHRwczovL2dpdGh1Yi5jb20vdGFkZXV6YWdhbGxvKTwvYT5cXG4qIDxhIGhyZWY9XFxcImh0dHBzOi8vdHdpdHRlci5jb20vdGFkZXV6YWdhbGxvXFxcIiBhbHQ9XFxcIlR3aXR0ZXJcXFwiIHRhcmdldD1cXFwiX2JsYW5rXFxcIj5bVHdpdHRlcl0oaHR0cHM6Ly90d2l0dGVyLmNvbS90YWRldXphZ2FsbG8pPC9hPlxcbiogPGEgaHJlZj1cXFwiaHR0cHM6Ly9mYWNlYm9vay5jb20vdGFkZXV6YWdhbGxvXFxcIiBhbHQ9XFxcIkZhY2Vib29rXFxcIiB0YXJnZXQ9XFxcIl9ibGFua1xcXCI+W0ZhY2Vib29rXShodHRwczovL2ZhY2Vib29rLmNvbS90YWRldXphZ2FsbG8pPC9hPlxcbiogPGEgaHJlZj1cXFwiaHR0cHM6Ly9wbHVzLmdvb2dsZS5jb20vK1RhZGV1WmFnYWxsb1xcXCIgYWx0PVxcXCJHb29nbGUgK1xcXCIgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiPltHb29nbGUgK10oaHR0cHM6Ly9wbHVzLmdvb2dsZS5jb20vK1RhZGV1WmFnYWxsbyk8L2E+XFxuKiA8YSBocmVmPVxcXCJodHRwOi8vd3d3LmxpbmtlZGluLmNvbS9wcm9maWxlL3ZpZXc/aWQ9MTYwMTc3MTU5XFxcIiBhbHQ9XFxcIkxpbmtlZGluXFxcIiB0YXJnZXQ9XFxcIl9ibGFua1xcXCI+W0xpbmtlZGluXShodHRwOi8vd3d3LmxpbmtlZGluLmNvbS9wcm9maWxlL3ZpZXc/aWQ9MTYwMTc3MTU5KTwvYT5cXG4qIDxhIGhyZWY9XFxcInNreXBlOi8vdGFkZXV6YWdhbGxvXFxcIiBhbHQ9XFxcIkxpbmtlZGluXFxcIj5bU2t5cGVdKHNreXBlOi8vdGFkZXV6YWdhbGxvKTwvYT5cXG5cIixcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiZlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJwcm9qZWN0cy5tZFwiOiB7XG4gICAgICAgICAgICAgIFwibXRpbWVcIjogXCIyMDE1LTA0LTI2VDIxOjIxOjU5LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjdGltZVwiOiBcIjIwMTUtMDQtMjZUMjE6MjE6NTkuMDAwWlwiLFxuICAgICAgICAgICAgICBcImNvbnRlbnRcIjogXCJGb3Igbm93IHlvdSBjYW4gaGF2ZSBhIGxvb2sgYXQgdGhpcyBvbmUhIDopXFxuKFRoYXQncyB3aGF0IEknbSBkb2luZylcXG5cIixcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiZlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJyZWFkbWUubWRcIjoge1xuICAgICAgICAgICAgICBcIm10aW1lXCI6IFwiMjAxNS0wNC0yNlQyMToyMTo1OS4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY3RpbWVcIjogXCIyMDE1LTA0LTI2VDIxOjIxOjU5LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjb250ZW50XCI6IFwiZm9vIGJhciBiYXpcXG5cIixcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiZlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJyZXN1bWUubWRcIjoge1xuICAgICAgICAgICAgICBcIm10aW1lXCI6IFwiMjAxNS0wNC0yNlQyMToyMTo1OS4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY3RpbWVcIjogXCIyMDE1LTA0LTI2VDIxOjIxOjU5LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjb250ZW50XCI6IFwiIyBUYWRldSBaYWdhbGxvIGRhIFNpbHZhXFxuLS0tXFxuXFxuIyMgUHJvZmlsZVxcbi0tLSBcXG4gIEkgYW0gcGFzc2lvbmF0ZSBmb3IgYWxsIGtpbmRzIG9mIGRldmVsb3BtZW50LCBsb3ZlIHRvIGxlYXJuIG5ldyBsYW5ndWFnZXMgYW5kIHBhcmFkaWdtcywgYWx3YXlzIHJlYWR5IGZvciBhIGdvb2QgY2hhbGxlbmdlLlxcbiAgSSBhbHNvIGxpa2UgTWF0aCwgR2FtZSBkZXZlbG9wbWVudCBhbmQgd2hlbiBwb3NzaWJsZSBjb250cmlidXRlIHRvIG9wZW4gc291cmNlIHByb2plY3RzLlxcblxcbiMjIEdlbmVyYWwgSW5mb3JtYXRpb25cXG4tLS1cXG4gICogRW1haWw6IHRhZGV1emFnYWxsb0BnbWFpbC5jb21cXG4gICogUGhvbmU6ICs1NSAzMiA4ODYzIDM2ODRcXG4gICogU2t5cGU6IHRhZGV1emFnYWxsb1xcbiAgKiBHaXRodWI6IGdpdGh1Yi5jb20vdGFkZXV6YWdhbGxvXFxuICAqIExvY2F0aW9uOiBKdWl6IGRlIEZvcmEvTUcsIEJyYXppbFxcblxcbiMjIEVkdWNhdGlvbmFsIEJhY2tncm91bmRcXG4tLS1cXG5cXG4gICogV2ViIERldmVsb3BtZW50IGF0IEluc3RpdHV0byBWaWFubmEgSnVuaW9yLCAyMDEwXFxuICAqIEdlbmVyYWwgRW5nbGlzaCBhdCBUaGUgQ2FybHlsZSBJbnN0aXR1dGUsIDIwMTFcXG5cXG4jIFdvcmsgRXhwZXJpZW5jZVxcbi0tLVxcblxcbiAgKiA8aT4qaU9TIERldmVsb3Blcio8L2k+IGF0IDxpPipRcmFuaW8qPC9pPiBmcm9tIDxpPipEZWNlbWJlciwgMjAxMyo8L2k+IGFuZCA8aT4qY3VycmVudGx5IGVtcGxveWVkKjwvaT5cXG4gICAgLSBRcmFuaW8gaXMgYSBzdGFydHVwIHRoYXQgZ3JldyBpbnNpZGUgdGhlIGNvbXBhbnkgSSB3b3JrIChlTWlvbG8uY29tKSBhbmQgSSB3YXMgaW52aXRlZCB0byBsZWFkIHRoZSBpT1MgZGV2ZWxvcG1lbnQgdGVhbVxcbiAgICAgIG9uIGEgY29tcGxldGVseSByZXdyaXRlbiB2ZXJzaW9uIG9mIHRoZSBhcHBcXG5cXG4gICogPGk+KldlYiBhbmQgTW9iaWxlIERldmVsb3Blcio8L2k+IGF0IDxpPipCb251eio8L2k+IGZyb20gPGk+KkZlYnJ1YXJ5LCAyMDEzKjwvaT4gYW5kIDxpPipjdXJyZW50bHkgZW1wbG95ZWQqPC9pPlxcbiAgICAtIEkgc3RhcnRlZCBkZXZlbG9waW5nIHRoZSBpT1MgYXBwIGFzIGEgZnJlZWxhbmNlciwgYWZ0ZXIgdGhlIGFwcCB3YXMgcHVibGlzaGVkIEkgd2FzIGludml0ZWQgdG8gbWFpbnRhaW4gdGhlIFJ1Ynkgb24gUmFpbHNcXG4gICAgICBhcGkgYW5kIHdvcmsgb24gdGhlIEFuZHJvaWQgdmVyc2lvbiBvZiB0aGUgYXBwXFxuXFxuICAqIDxpPipXZWIgYW5kIE1vYmlsZSBEZXZlbG9wZXIqPC9pPiBhdCA8aT4qZU1pb2xvLmNvbSo8L2k+IGZyb20gPGk+KkFwcmlsLCAyMDEzKjwvaT4gYW5kIDxpPipjdXJyZW50bHkgZW1wbG95ZWQqPC9pPlxcbiAgICAtIFRoZSBjb21wYW55IGp1c3Qgd29ya2VkIHdpdGggUEhQLCBzbyBJIGpvaW5lZCB3aXRoIHRoZSBpbnRlbnRpb24gb2YgYnJpbmdpbmcgbmV3IHRlY2hub2xvZ2llcy4gV29ya2VkIHdpdGggUHl0aG9uLCBSdWJ5LCBpT1MsXFxuICAgICAgQW5kcm9pZCBhbmQgSFRNTDUgYXBwbGljYXRpb25zXFxuXFxuICAqIDxpPippT1MgRGV2ZWxvcGVyKjwvaT4gYXQgPGk+KlByb0RvY3RvciBTb2Z0d2FyZSBMdGRhLio8L2k+IGZyb20gPGk+Kkp1bHksIDIwMTIqPC9pPiB1bnRpbCA8aT4qT2N0b2JlciwgMjAxMio8L2k+XFxuICAgIC0gQnJpZWZseSB3b3JrZWQgd2l0aCB0aGUgaU9TIHRlYW0gb24gdGhlIGRldmVsb3BtZW50IG9mIHRoZWlyIGZpcnN0IG1vYmlsZSB2ZXJzaW9uIG9mIHRoZWlyIG1haW4gcHJvZHVjdCwgYSBtZWRpY2FsIHNvZnR3YXJlXFxuXFxuICAqIDxpPipXZWIgRGV2ZWxvcGVyKjwvaT4gYXQgPGk+KkF0byBJbnRlcmF0aXZvKjwvaT4gZnJvbSA8aT4qRmVicnVhcnksIDIwMTIqPC9pPiB1bnRpbCA8aT4qSnVseSwgMjAxMio8L2k+XFxuICAgIC0gTW9zdCBvZiB0aGUgd29yayB3YXMgd2l0aCBQSFAgYW5kIE15U1FMLCBhbHNvIHdvcmtpbmcgd2l0aCBKYXZhU2NyaXB0IG9uIHRoZSBjbGllbnQgc2lkZS4gV29ya2VkIHdpdGggTVNTUUxcXG4gICAgICBhbmQgT3JhY2xlIGRhdGFiYXNlcyBhcyB3ZWxsXFxuXFxuICAqIDxpPipXZWIgRGV2ZWxvcGVyKjwvaT4gYXQgPGk+Kk1hcmlhIEZ1bWFjzKdhIENyaWFjzKdvzINlcyo8L2k+IGZyb20gPGk+Kk9jdG9iZXIsIDIwMTAqPC9pPiB1bnRpbCA8aT4qSnVuZSwgMjAxMSo8L2k+XFxuICAgIC0gSSB3b3JrZWQgbW9zdGx5IHdpdGggUEhQIGFuZCBNeVNRTCwgYWxzbyBtYWtpbmcgdGhlIGZyb250IGVuZCB3aXRoIEhUTUwgYW5kIENTUyBhbmQgbW9zdCBhbmltYXRpb25zIGluIEphdmFTY3JpcHQsXFxuICAgICAgYWx0aG91Z2ggSSBhbHNvIHdvcmtlZCB3aXRoIGEgZmV3IGluIEFTMy4gQnJpZWZseSB3b3JrZWQgd2l0aCBNb25nb0RCXFxuXFxuIyMgQWRkaXRpb25hbCBJbmZvcm1hdGlvblxcbi0tLVxcblxcbiogRXhwZXJpZW5jZSB1bmRlciBMaW51eCBhbmQgT1MgWCBlbnZpcm9ubWVudFxcbiogU3R1ZGVudCBFeGNoYW5nZTogNiBtb250aHMgb2YgcmVzaWRlbmNlIGluIElyZWxhbmRcXG5cXG4jIyBMYW5ndWFnZXNcXG4tLS1cXG5cXG4qIFBvcnR1Z3Vlc2Ug4oCTIE5hdGl2ZSBTcGVha2VyXFxuKiBFbmdsaXNoIOKAkyBGbHVlbnQgTGV2ZWxcXG4qIFNwYW5pc2gg4oCTIEludGVybWVkaWF0ZSBMZXZlbFxcblxcbiMjIFByb2dyYW1taW5nIGxhbmd1YWdlcyAob3JkZXJlZCBieSBrbm93bGVkZ2UpXFxuLS0tXFxuXFxuKiBKYXZhU2NyaXB0XFxuKiBPYmplY3RpdmXCrUNcXG4qIEMvQysrXFxuKiBSdWJ5IG9uIFJhaWxzXFxuKiBOb2RlSlNcXG4qIFBIUFxcbiogSmF2YVxcbiogUHl0aG9uXFxuXFxuIyMgQWRkaXRpb25hbCBza2lsbHNcXG4tLS1cXG5cXG4qIEhUTUw1L0NTUzNcXG4qIE1WQ1xcbiogRGVzaWduIFBhdHRlcm5zXFxuKiBUREQvQkREXFxuKiBHaXRcXG4qIEFuYWx5c2lzIGFuZCBEZXNpZ24gb2YgQWxnb3JpdGhtc1xcblwiLFxuICAgICAgICAgICAgICBcInR5cGVcIjogXCJmXCJcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIFwidHlwZVwiOiBcImRcIlxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgXCJ0eXBlXCI6IFwiZFwiXG4gICAgfSxcbiAgICBcInVzclwiOiB7XG4gICAgICBcIm10aW1lXCI6IFwiMjAxNS0wNC0yNlQyMToyMTo1OS4wMDBaXCIsXG4gICAgICBcImN0aW1lXCI6IFwiMjAxNS0wNC0yNlQyMToyMTo1OS4wMDBaXCIsXG4gICAgICBcImNvbnRlbnRcIjoge1xuICAgICAgICBcImJpblwiOiB7XG4gICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTUtMDQtMjdUMDE6MTU6MDcuMDAwWlwiLFxuICAgICAgICAgIFwiY3RpbWVcIjogXCIyMDE1LTA0LTI3VDAxOjE1OjA3LjAwMFpcIixcbiAgICAgICAgICBcImNvbnRlbnRcIjoge1xuICAgICAgICAgICAgXCJhbGlhcy5qc1wiOiB7XG4gICAgICAgICAgICAgIFwibXRpbWVcIjogXCIyMDE1LTA0LTI3VDAwOjUxOjEyLjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjdGltZVwiOiBcIjIwMTUtMDQtMjdUMDA6NTE6MTIuMDAwWlwiLFxuICAgICAgICAgICAgICBcImNvbnRlbnRcIjogXCJpbXBvcnQgQ29tbWFuZE1hbmFnZXIgZnJvbSAnLi9jb21tYW5kLW1hbmFnZXInO1xcblxcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIChhcmdzLCBzdGRpbiwgc3Rkb3V0LCBzdGRlcnIsIG5leHQpIHtcXG4gIHZhciBidWZmZXIgPSAnJztcXG4gIGlmIChhcmdzLmFyZ3VtZW50cy5sZW5ndGgpIHtcXG4gICAgdmFyIGtleSA9IGFyZ3MuYXJndW1lbnRzLnNoaWZ0KCk7XFxuICAgIHZhciBpbmRleDtcXG4gICAgaWYgKH4oaW5kZXggPSBrZXkuaW5kZXhPZignPScpKSkge1xcbiAgICAgIHZhciBjb21tYW5kO1xcblxcbiAgICAgIGlmIChhcmdzLmFyZ3VtZW50cy5sZW5ndGggJiYgaW5kZXggPT09IGtleS5sZW5ndGggLSAxKSB7XFxuICAgICAgICBjb21tYW5kID0gYXJncy5hcmd1bWVudHMuam9pbignICcpO1xcbiAgICAgIH0gZWxzZSB7XFxuICAgICAgICBjb21tYW5kID0ga2V5LnN1YnN0cihpbmRleCArIDEpO1xcbiAgICAgIH1cXG5cXG4gICAgICBrZXkgPSBrZXkuc3Vic3RyKDAsIGluZGV4KTtcXG5cXG4gICAgICBpZiAoY29tbWFuZCkge1xcbiAgICAgICAgQ29tbWFuZE1hbmFnZXIuYWxpYXMoa2V5LCBjb21tYW5kKTtcXG4gICAgICB9XFxuICAgIH1cXG4gIH0gZWxzZSB7XFxuICAgIHZhciBhbGlhc2VzID0gQ29tbWFuZE1hbmFnZXIuYWxpYXMoKTtcXG5cXG4gICAgZm9yICh2YXIgaSBpbiBhbGlhc2VzKSB7XFxuICAgICAgYnVmZmVyICs9IGkgKyAnPVxcXFwnJyArIGFsaWFzZXNbaV0gKyAnXFxcXCdcXFxcbic7XFxuICAgIH1cXG4gIH1cXG5cXG4gIHN0ZG91dC53cml0ZShidWZmZXIpO1xcbiAgbmV4dCgpO1xcbn1cXG5cIixcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiZlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJjYXQuanNcIjoge1xuICAgICAgICAgICAgICBcIm10aW1lXCI6IFwiMjAxNS0wNC0yN1QwMDo1NDoyNi4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY3RpbWVcIjogXCIyMDE1LTA0LTI3VDAwOjU0OjI2LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjb250ZW50XCI6IFwiaW1wb3J0IEZpbGUgZnJvbSAnLi9maWxlJztcXG5pbXBvcnQgRlMgZnJvbSAnLi9mcyc7XFxuXFxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKGFyZ3MsIHN0ZGluLCBzdGRvdXQsIHN0ZGVyciwgbmV4dCkge1xcbiAgYXJncy5hcmd1bWVudHMuZm9yRWFjaChmdW5jdGlvbiAocGF0aCkge1xcbiAgICB2YXIgZmlsZSA9IEZpbGUub3BlbihwYXRoKTtcXG5cXG4gICAgaWYgKCFmaWxlLmV4aXN0cygpKSB7XFxuICAgICAgc3RkZXJyLndyaXRlKEZTLm5vdEZvdW5kKCdjYXQnLCBwYXRoKSk7XFxuICAgIH0gZWxzZSBpZiAoZmlsZS5pc0RpcigpKSB7XFxuICAgICAgc3RkZXJyLndyaXRlKEZTLmVycm9yKCdjYXQnLCBwYXRoLCAnSXMgYSBkaXJlY3RvcnknKSk7XFxuICAgIH0gZWxzZSB7XFxuICAgICAgc3Rkb3V0LndyaXRlKGZpbGUucmVhZCgpKTtcXG4gICAgfVxcbiAgfSk7XFxuXFxuICBuZXh0KCk7XFxufVxcblwiLFxuICAgICAgICAgICAgICBcInR5cGVcIjogXCJmXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImNkLmpzXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTUtMDQtMjdUMDA6NTU6NDguMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNS0wNC0yN1QwMDo1NTo0OC4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcImltcG9ydCBGaWxlIGZyb20gJy4vZmlsZSc7XFxuaW1wb3J0IEZTIGZyb20gJy4vZnMnO1xcblxcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIChhcmdzLCBzdGRpbiwgc3Rkb3V0LCBzdGRlcnIsIG5leHQpIHtcXG4gIHZhciBwYXRoID0gYXJncy5hcmd1bWVudHNbMF0gfHwgJ34nO1xcbiAgdmFyIGRpciA9IEZpbGUub3BlbihwYXRoKTtcXG5cXG4gIGlmICghZGlyLmV4aXN0cygpKSB7XFxuICAgIHN0ZGVyci53cml0ZShGUy5ub3RGb3VuZCgnY2QnLCBwYXRoKSk7XFxuICB9IGVsc2UgaWYgKGRpci5pc0ZpbGUoKSkge1xcbiAgICBzdGRlcnIud3JpdGUoRlMuZXJyb3IoJ2NkJywgcGF0aCwgJ0lzIGEgZmlsZScpKTtcXG4gIH0gZWxzZSB7XFxuICAgIEZTLmN1cnJlbnRQYXRoID0gZGlyLnBhdGg7XFxuICAgIEZTLmN1cnJlbnREaXIgPSBkaXIuc2VsZigpO1xcbiAgfVxcblxcbiAgRlMud3JpdGVGUygpO1xcbiAgbmV4dCgpO1xcbn1cXG5cIixcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiZlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJlY2hvLmpzXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTUtMDQtMjdUMDA6NTc6MTAuMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNS0wNC0yN1QwMDo1NzoxMC4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcImltcG9ydCBBcmdzUGFyc2VyIGZyb20gJy4vYXJncy1wYXJzZXInO1xcblxcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIChhcmdzLCBzdGRpbiwgc3Rkb3V0LCBzdGRlcnIsIG5leHQpIHtcXG4gIHRyeSB7XFxuICAgIHN0ZG91dC53cml0ZShBcmdzUGFyc2VyLnBhcnNlU3RyaW5ncyhhcmdzLnJhdykuam9pbignICcpKTtcXG4gIH0gY2F0Y2ggKGVycikge1xcbiAgICBzdGRlcnIud3JpdGUoJ3pzaDogJyArIGVyci5tZXNzYWdlKTtcXG4gIH1cXG5cXG4gIG5leHQoKTtcXG59XFxuXCIsXG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImZcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiaGVscC5qc1wiOiB7XG4gICAgICAgICAgICAgIFwibXRpbWVcIjogXCIyMDE1LTA0LTI3VDAxOjE0OjM5LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjdGltZVwiOiBcIjIwMTUtMDQtMjdUMDE6MTQ6MzkuMDAwWlwiLFxuICAgICAgICAgICAgICBcImNvbnRlbnRcIjogXCJpbXBvcnQgQ29tbWFuZE1hbmFnZXIgZnJvbSAnLi9jb21tYW5kLW1hbmFnZXInO1xcbmltcG9ydCBGaWxlIGZyb20gJy4vZmlsZSc7XFxuXFxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKGFyZ3MsIHN0ZGluLCBzdGRvdXQsIHN0ZGVyciwgbmV4dCkge1xcbiAgc3Rkb3V0LndyaXRlKCdyZWdpc3RlcmVkIGNvbW1hbmRzOicpO1xcbiAgc3Rkb3V0LndyaXRlKE9iamVjdC5rZXlzKENvbW1hbmRNYW5hZ2VyLmNvbW1hbmRzKS5qb2luKCcgJykpO1xcblxcbiAgc3Rkb3V0LndyaXRlKCdcXFxcbicpO1xcbiAgc3Rkb3V0LndyaXRlKCdleGVjdXRhYmxlcyAob24gL3Vzci9iaW4pJyk7XFxuICBzdGRvdXQud3JpdGUoT2JqZWN0LmtleXMoRmlsZS5vcGVuKCcvdXNyL2JpbicpLnJlYWQoKSkubWFwKGZ1bmN0aW9uKGZpbGUpIHtcXG4gICAgcmV0dXJuIGZpbGUucmVwbGFjZSgvXFxcXC5qcyQvLCAnJyk7XFxuICB9KS5qb2luKCcgJykpO1xcblxcbiAgc3Rkb3V0LndyaXRlKCdcXFxcbicpO1xcblxcbiAgc3Rkb3V0LndyaXRlKCdhbGlhc2VzOicpO1xcbiAgc3Rkb3V0LndyaXRlKE9iamVjdC5rZXlzKENvbW1hbmRNYW5hZ2VyLmFsaWFzZXMpLm1hcChmdW5jdGlvbiAoa2V5KSB7XFxuICAgIHJldHVybiBrZXkgKyAnPVxcXCInICsgQ29tbWFuZE1hbmFnZXIuYWxpYXNlc1trZXldICsgJ1xcXCInO1xcbiAgfSkuam9pbignICcpKTtcXG5cXG4gIG5leHQoKTtcXG59XFxuXCIsXG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImZcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwibHMuanNcIjoge1xuICAgICAgICAgICAgICBcIm10aW1lXCI6IFwiMjAxNS0wNC0yN1QwMDo0NTo1Ny4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY3RpbWVcIjogXCIyMDE1LTA0LTI3VDAwOjQ1OjU3LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjb250ZW50XCI6IFwiaW1wb3J0IEZpbGUgZnJvbSAnLi9maWxlJztcXG5pbXBvcnQgRlMgZnJvbSAnLi9mcyc7XFxuXFxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKGFyZ3MsIHN0ZGluLCBzdGRvdXQsIHN0ZGVyciwgbmV4dCkge1xcbiAgaWYgKCFhcmdzLmFyZ3VtZW50cy5sZW5ndGgpIHtcXG4gICAgYXJncy5hcmd1bWVudHMucHVzaCgnLicpO1xcbiAgfVxcblxcbiAgYXJncy5hcmd1bWVudHMuZm9yRWFjaChmdW5jdGlvbiAoYXJnKSB7XFxuICAgIHZhciBkaXIgPSBGaWxlLm9wZW4oYXJnKTtcXG5cXG4gICAgaWYgKCFkaXIuZXhpc3RzKCkpIHtcXG4gICAgICBzdGRlcnIud3JpdGUoRlMubm90Rm91bmQoJ2xzJywgYXJnKSk7XFxuICAgIH0gZWxzZSBpZiAoZGlyLmlzRmlsZSgpKSB7XFxuICAgICAgc3RkZXJyLndyaXRlKEZTLmVycm9yKCdscycsIGFyZywgJ0lzIGEgZmlsZScpKTtcXG4gICAgfSBlbHNlIHtcXG4gICAgICB2YXIgZmlsZXMgPSBPYmplY3Qua2V5cyhkaXIucmVhZCgpKTtcXG5cXG4gICAgICBpZiAoIWFyZ3Mub3B0aW9ucy5hKSB7XFxuICAgICAgICBmaWxlcyA9IGZpbGVzLmZpbHRlcihmdW5jdGlvbiAoZmlsZSkge1xcbiAgICAgICAgICByZXR1cm4gZmlsZVswXSAhPT0gJy4nO1xcbiAgICAgICAgfSk7XFxuICAgICAgfVxcblxcbiAgICAgIGlmIChhcmdzLmFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XFxuICAgICAgICBzdGRvdXQud3JpdGUoYXJnICsgJzonKTtcXG4gICAgICB9XFxuXFxuICAgICAgaWYgKGFyZ3Mub3B0aW9ucy5sKSB7XFxuICAgICAgICBmaWxlcyA9IGZpbGVzLm1hcChmdW5jdGlvbiAobmFtZSkge1xcbiAgICAgICAgICB2YXIgZmlsZSA9IGRpci5vcGVuKG5hbWUpO1xcbiAgICAgICAgICB2YXIgdHlwZSA9IGZpbGUuaXNEaXIoKSA/ICdkJyA6ICctJztcXG4gICAgICAgICAgdmFyIHBlcm1zID0gdHlwZSArICdydy1yLS1yLS0nO1xcblxcbiAgICAgICAgICByZXR1cm4gcGVybXMgKyAnIGd1ZXN0IGd1ZXN0ICcgKyBmaWxlLmxlbmd0aCgpICsgJyAnICsgZmlsZS5tdGltZSgpICsgJyAnICsgbmFtZTtcXG4gICAgICAgIH0pO1xcbiAgICAgIH1cXG5cXG4gICAgICBzdGRvdXQud3JpdGUoZmlsZXMuam9pbihhcmdzLm9wdGlvbnMubCA/ICdcXFxcbicgOiAnICcpKTtcXG4gICAgfVxcbiAgfSk7XFxuXFxuICBuZXh0KCk7XFxufTtcXG5cIixcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiZlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJta2Rpci5qc1wiOiB7XG4gICAgICAgICAgICAgIFwibXRpbWVcIjogXCIyMDE1LTA0LTI3VDAwOjU5OjExLjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjdGltZVwiOiBcIjIwMTUtMDQtMjdUMDA6NTk6MTEuMDAwWlwiLFxuICAgICAgICAgICAgICBcImNvbnRlbnRcIjogXCJpbXBvcnQgRmlsZSBmcm9tICcuL2ZpbGUnO1xcbmltcG9ydCBGUyBmcm9tICcuL2ZzJztcXG5cXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAoYXJncywgc3RkaW4sIHN0ZG91dCwgc3RkZXJyLCBuZXh0KSB7XFxuICBhcmdzLmFyZ3VtZW50cy5mb3JFYWNoKGZ1bmN0aW9uIChwYXRoKSB7XFxuICAgIHZhciBmaWxlID0gRmlsZS5vcGVuKHBhdGgpO1xcblxcbiAgICBpZiAoIWZpbGUucGFyZW50RXhpc3RzKCkpIHtcXG4gICAgICBzdGRlcnIud3JpdGUoRlMubm90Rm91bmQoJ21rZGlyJywgcGF0aCkpO1xcbiAgICB9IGVsc2UgaWYgKCFmaWxlLmlzVmFsaWQoKSkge1xcbiAgICAgIHN0ZGVyci53cml0ZShGUy5lcnJvcignbWtkaXInLCBwYXRoLCAnTm90IGEgZGlyZWN0b3J5JykpO1xcbiAgICB9IGVsc2UgaWYgKGZpbGUuZXhpc3RzKCkpIHtcXG4gICAgICBzdGRlcnIud3JpdGUoRlMuZXJyb3IoJ21rZGlyJywgcGF0aCwgJ0ZpbGUgZXhpc3RzJykpO1xcbiAgICB9IGVsc2Uge1xcbiAgICAgIGZpbGUuY3JlYXRlRm9sZGVyKCk7XFxuICAgIH1cXG4gIH0pO1xcblxcbiAgRlMud3JpdGVGUygpO1xcbiAgbmV4dCgpO1xcbn1cXG5cIixcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiZlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJtdi5qc1wiOiB7XG4gICAgICAgICAgICAgIFwibXRpbWVcIjogXCIyMDE1LTA0LTI3VDAxOjAwOjM2LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjdGltZVwiOiBcIjIwMTUtMDQtMjdUMDE6MDA6MzYuMDAwWlwiLFxuICAgICAgICAgICAgICBcImNvbnRlbnRcIjogXCJpbXBvcnQgRmlsZSBmcm9tICcuL2ZpbGUnO1xcbmltcG9ydCBGUyBmcm9tICcuL2ZzJztcXG5cXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAoYXJncywgc3RkaW4sIHN0ZG91dCwgc3RkZXJyLCBuZXh0KSB7XFxuICB2YXIgdGFyZ2V0UGF0aCA9IGFyZ3MuYXJndW1lbnRzLnBvcCgpO1xcbiAgdmFyIHNvdXJjZVBhdGhzID0gYXJncy5hcmd1bWVudHM7XFxuICB2YXIgdGFyZ2V0ID0gRmlsZS5vcGVuKHRhcmdldFBhdGgpO1xcblxcbiAgaWYgKCF0YXJnZXRQYXRoIHx8XFxuICAgICAgIXNvdXJjZVBhdGhzLmxlbmd0aCB8fFxcbiAgICAgICAgKHNvdXJjZVBhdGhzLmxlbmd0aCA+IDEgJiZcXG4gICAgICAgICAoIXRhcmdldC5leGlzdHMoKSB8fCB0YXJnZXQuaXNGaWxlKCkpXFxuICAgICAgICApXFxuICAgICApIHtcXG4gICAgc3RkZXJyLndyaXRlKCd1c2FnZTogbXYgc291cmNlIHRhcmdldFxcXFxuIFxcXFx0IG12IHNvdXJjZSAuLi4gZGlyZWN0b3J5Jyk7XFxuICB9IGVsc2UgaWYgKCF0YXJnZXQucGFyZW50RXhpc3RzKCkpIHtcXG4gICAgICBzdGRlcnIud3JpdGUoRlMubm90Rm91bmQoJ212JywgdGFyZ2V0LmRpcm5hbWUpKTtcXG4gIH0gZWxzZSB7XFxuICAgIHZhciBiYWNrdXAgPSB0YXJnZXQuc2VsZigpO1xcbiAgICB2YXIgb2sgPSBzb3VyY2VQYXRocy5yZWR1Y2UoZnVuY3Rpb24gKHN1Y2Nlc3MsIHNvdXJjZVBhdGgpIHtcXG4gICAgICBpZiAoc3VjY2Vzcykge1xcbiAgICAgICAgdmFyIHNvdXJjZSA9IEZpbGUub3Blbihzb3VyY2VQYXRoKTtcXG5cXG4gICAgICAgIGlmICghc291cmNlLmV4aXN0cygpKSB7XFxuICAgICAgICAgIHN0ZGVyci53cml0ZShGUy5ub3RGb3VuZCgnbXYnLCBzb3VyY2VQYXRoc1swXSkpO1xcbiAgICAgICAgfSBlbHNlIGlmIChzb3VyY2UuaXNEaXIoKSAmJiB0YXJnZXQuaXNGaWxlKCkpIHtcXG4gICAgICAgICAgc3RkZXJyLndyaXRlKEZTLmVycm9yKCdtdicsICdyZW5hbWUgJyArIHNvdXJjZVBhdGhzWzBdICsgJyB0byAnICsgdGFyZ2V0UGF0aCwgJ05vdCBhIGRpcmVjdG9yeScpKTtcXG4gICAgICAgIH0gZWxzZSB7XFxuICAgICAgICAgIGlmICghdGFyZ2V0LmlzRmlsZSgpKSB7XFxuICAgICAgICAgICAgdGFyZ2V0LnJlYWQoKVtzb3VyY2UuZmlsZW5hbWVdID0gc291cmNlLnNlbGYoKTtcXG4gICAgICAgICAgfSBlbHNlIHtcXG4gICAgICAgICAgICB0YXJnZXQud3JpdGUoc291cmNlLnJlYWQoKSwgZmFsc2UsIHRydWUpO1xcbiAgICAgICAgICB9XFxuXFxuICAgICAgICAgIHNvdXJjZS5kZWxldGUoKTtcXG4gICAgICAgICAgcmV0dXJuIHRydWU7XFxuICAgICAgICB9XFxuICAgICAgfVxcblxcbiAgICAgIHJldHVybiBmYWxzZTtcXG4gICAgfSwgdHJ1ZSk7XFxuXFxuICAgIGlmIChvaykge1xcbiAgICAgIEZTLndyaXRlRlMoKTtcXG4gICAgfSBlbHNlIHtcXG4gICAgICB0YXJnZXQuZGlyW3RhcmdldC5maWxlbmFtZV0gPSBiYWNrdXA7XFxuICAgIH1cXG4gIH1cXG5cXG4gIG5leHQoKTtcXG59XFxuXCIsXG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImZcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwicHdkLmpzXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTUtMDQtMjdUMDE6MDE6MTAuMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNS0wNC0yN1QwMTowMToxMC4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcImltcG9ydCBGUyBmcm9tICcuL2ZzJztcXG5cXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAoYXJncywgc3RkaW4sIHN0ZG91dCwgc3RkZXJyLCBuZXh0KSB7XFxuICB2YXIgcHdkID0gRlMuY3VycmVudFBhdGg7XFxuXFxuICBpZiAoc3Rkb3V0KSB7XFxuICAgIHN0ZG91dC53cml0ZShwd2QpO1xcbiAgICBuZXh0KCk7XFxuICB9IGVsc2Uge1xcbiAgICByZXR1cm4gcHdkO1xcbiAgfVxcbn1cXG5cIixcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiZlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJybS5qc1wiOiB7XG4gICAgICAgICAgICAgIFwibXRpbWVcIjogXCIyMDE1LTA0LTI3VDAxOjAyOjA4LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjdGltZVwiOiBcIjIwMTUtMDQtMjdUMDE6MDI6MDguMDAwWlwiLFxuICAgICAgICAgICAgICBcImNvbnRlbnRcIjogXCJpbXBvcnQgRmlsZSBmcm9tICcuL2ZpbGUnO1xcbmltcG9ydCBGUyBmcm9tICcuL2ZzJztcXG5cXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAoYXJncywgc3RkaW4sIHN0ZG91dCwgc3RkZXJyLCBuZXh0KSB7XFxuICBhcmdzLmFyZ3VtZW50cy5mb3JFYWNoKGZ1bmN0aW9uIChhcmcpIHtcXG4gICAgdmFyIGZpbGUgPSBGaWxlLm9wZW4oYXJnKTtcXG5cXG4gICAgaWYgKCFmaWxlLmV4aXN0cygpKSB7XFxuICAgICAgc3RkZXJyLndyaXRlKEZTLm5vdEZvdW5kKCdybScsIGFyZykpO1xcbiAgICB9IGVsc2UgaWYgKCFmaWxlLmlzVmFsaWQoKSkge1xcbiAgICAgIHN0ZGVyci53cml0ZShGUy5lcnJvcigncm0nLCBhcmcsICdOb3QgYSBkaXJlY3RvcnknKSk7XFxuICAgIH0gZWxzZSBpZiAoZmlsZS5pc0RpcigpKSB7XFxuICAgICAgc3RkZXJyLndyaXRlKEZTLmVycm9yKCdybScsIGFyZywgJ2lzIGEgZGlyZWN0b3J5JykpO1xcbiAgICB9IGVsc2Uge1xcbiAgICAgIGZpbGUuZGVsZXRlKCk7XFxuICAgIH1cXG4gIH0pO1xcblxcbiAgRlMud3JpdGVGUygpO1xcbiAgbmV4dCgpO1xcbn1cXG5cIixcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiZlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJybWRpci5qc1wiOiB7XG4gICAgICAgICAgICAgIFwibXRpbWVcIjogXCIyMDE1LTA0LTI3VDAxOjAyOjQ3LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjdGltZVwiOiBcIjIwMTUtMDQtMjdUMDE6MDI6NDcuMDAwWlwiLFxuICAgICAgICAgICAgICBcImNvbnRlbnRcIjogXCJpbXBvcnQgRmlsZSBmcm9tICcuL2ZpbGUnO1xcbmltcG9ydCBGUyBmcm9tICcuL2ZzJztcXG5cXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAoYXJncywgc3RkaW4sIHN0ZG91dCwgc3RkZXJyLCBuZXh0KSB7XFxuICBhcmdzLmFyZ3VtZW50cy5mb3JFYWNoKGZ1bmN0aW9uIChhcmcpIHtcXG4gICAgdmFyIGZpbGUgPSBGaWxlLm9wZW4oYXJnKTtcXG5cXG4gICAgaWYgKCFmaWxlLnBhcmVudEV4aXN0cygpIHx8ICFmaWxlLmV4aXN0cygpKSB7XFxuICAgICAgc3RkZXJyLndyaXRlKEZTLm5vdEZvdW5kKCdybWRpcicsIGFyZykpO1xcbiAgICB9IGVsc2UgaWYgKCFmaWxlLmlzRGlyKCkpIHtcXG4gICAgICBzdGRlcnIud3JpdGUoRlMuZXJyb3IoJ3JtZGlyJywgYXJnLCAnTm90IGEgZGlyZWN0b3J5JykpO1xcbiAgICB9IGVsc2Uge1xcbiAgICAgIGZpbGUuZGVsZXRlKCk7XFxuICAgIH1cXG4gIH0pO1xcblxcbiAgRlMud3JpdGVGUygpO1xcbiAgbmV4dCgpO1xcbn1cXG5cIixcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiZlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJzb3VyY2UuanNcIjoge1xuICAgICAgICAgICAgICBcIm10aW1lXCI6IFwiMjAxNS0wNC0yN1QwMTowNDowMS4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY3RpbWVcIjogXCIyMDE1LTA0LTI3VDAxOjA0OjAxLjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjb250ZW50XCI6IFwiLyplc2xpbnQgbm8tZXZhbDogMCovXFxuaW1wb3J0IENvbnNvbGUgZnJvbSAnLi9jb25zb2xlJztcXG5pbXBvcnQgRmlsZSBmcm9tICcuL2ZpbGUnO1xcblxcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIChhcmdzLCBzdGRpbiwgc3Rkb3V0LCBzdGRlcnIsIG5leHQpIHtcXG4gIGlmIChhcmdzLmFyZ3VtZW50cy5sZW5ndGgpIHtcXG4gICAgdmFyIGZpbGUgPSBGaWxlLm9wZW4oYXJncy5hcmd1bWVudHNbMF0pO1xcbiAgICBpZiAoIWZpbGUuZXhpc3RzKCkpIHtcXG4gICAgICBzdGRlcnIud3JpdGUoJ3NvdXJjZTogbm8gc3VjaCBmaWxlIG9yIGRpcmVjdG9yeTogJyArIGZpbGUucGF0aCk7XFxuICAgIH0gZWxzZSB7XFxuICAgICAgdHJ5IHtcXG4gICAgICAgIHZhciBjb25zb2xlID0gbmV3IENvbnNvbGUoc3Rkb3V0LCBzdGRlcnIpOyAvLyBqc2hpbnQgaWdub3JlOiBsaW5lXFxuICAgICAgICB2YXIgcmVzdWx0ID0gSlNPTi5zdHJpbmdpZnkoZXZhbChmaWxlLnJlYWQoKSkpO1xcbiAgICAgICAgc3Rkb3V0LndyaXRlKCc8LSAnICsgcmVzdWx0KTtcXG4gICAgICB9IGNhdGNoIChlcnIpIHtcXG4gICAgICAgIHN0ZGVyci53cml0ZShlcnIuc3RhY2spO1xcbiAgICAgIH1cXG4gICAgfVxcbiAgfSBlbHNlIHtcXG4gICAgc3RkZXJyLndyaXRlKCdzb3VyY2U6IG5vdCBlbm91Z2ggYXJndW1lbnRzJyk7XFxuICB9XFxuXFxuICBuZXh0KCk7XFxufVxcblwiLFxuICAgICAgICAgICAgICBcInR5cGVcIjogXCJmXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcInRvdWNoLmpzXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTUtMDQtMjdUMDE6MDc6MjYuMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNS0wNC0yN1QwMTowNzoyNi4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcImltcG9ydCBGaWxlIGZyb20gJy4vZmlsZSc7XFxuaW1wb3J0IEZTIGZyb20gJy4vZnMnO1xcblxcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIChhcmdzLCBzdGRpbiwgc3Rkb3V0LCBzdGRlcnIsIG5leHQpIHtcXG4gIGFyZ3MuYXJndW1lbnRzLmZvckVhY2goZnVuY3Rpb24gKHBhdGgpIHtcXG4gICAgdmFyIGZpbGUgPSBGaWxlLm9wZW4ocGF0aCk7XFxuXFxuICAgIGlmICghZmlsZS5wYXJlbnRFeGlzdHMoKSkge1xcbiAgICAgIHN0ZGVyci53cml0ZShGUy5ub3RGb3VuZCgndG91Y2gnLCBwYXRoKSk7XFxuICAgIH0gZWxzZSBpZiAoIWZpbGUuaXNWYWxpZCgpKXtcXG4gICAgICBzdGRlcnIud3JpdGUoRlMuZXJyb3IoJ3RvdWNoJywgcGF0aCwgJ05vdCBhIGRpcmVjdG9yeScpKTtcXG4gICAgfSBlbHNlIHtcXG4gICAgICBmaWxlLndyaXRlKCcnLCB0cnVlLCB0cnVlKTtcXG4gICAgfVxcbiAgfSk7XFxuXFxuICBGUy53cml0ZUZTKCk7XFxuICBuZXh0KCk7XFxufVxcblwiLFxuICAgICAgICAgICAgICBcInR5cGVcIjogXCJmXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcInVuYWxpYXMuanNcIjoge1xuICAgICAgICAgICAgICBcIm10aW1lXCI6IFwiMjAxNS0wNC0yN1QwMTowNzo0OS4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY3RpbWVcIjogXCIyMDE1LTA0LTI3VDAxOjA3OjQ5LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjb250ZW50XCI6IFwiaW1wb3J0IENvbW1hbmRNYW5hZ2VyIGZyb20gJy4vY29tbWFuZC1tYW5hZ2VyJztcXG5cXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAoYXJncywgc3RkaW4sIHN0ZG91dCwgc3RkZXJyLCBuZXh0KSB7XFxuICB2YXIgY21kID0gYXJncy5hcmd1bWVudHNbMF07XFxuXFxuICBpZiAoY21kKSB7XFxuICAgIENvbW1hbmRNYW5hZ2VyLnVuYWxpYXMoY21kKTtcXG4gIH1cXG5cXG4gIG5leHQoKTtcXG59XFxuXCIsXG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImZcIlxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiZFwiXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBcInR5cGVcIjogXCJkXCJcbiAgICB9XG4gIH0sXG4gIFwidHlwZVwiOiBcImRcIlxufSIsImltcG9ydCBGUyBmcm9tICcuL2ZzJztcblxuY29uc3QgTU9OVEhTID0gWydKYW4nLCAnRmViJywgJ01hcicsICdBcHInLCAnTWF5JywgJ0p1bicsICdKdWwnLCAnQXVnJywgJ1NlcCcsICdPY3QnLCAnTm92JywgJ0RlYyddO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBGaWxlIHtcbiAgY29uc3RydWN0b3IocGF0aCkge1xuICAgIHRoaXMucGF0aCA9IEZTLnRyYW5zbGF0ZVBhdGgocGF0aCk7XG4gICAgcGF0aCA9IHRoaXMucGF0aC5zcGxpdCgnLycpO1xuICAgIHRoaXMuZmlsZW5hbWUgPSBwYXRoLnBvcCgpO1xuICAgIHRoaXMuZGlybmFtZSA9IHBhdGguam9pbignLycpIHx8ICcvJztcbiAgICB0aGlzLmRpciA9IEZTLm9wZW4odGhpcy5kaXJuYW1lKTtcbiAgfVxuXG4gIHN0YXRpYyBvcGVuKHBhdGgpIHtcbiAgICByZXR1cm4gbmV3IEZpbGUocGF0aCk7XG4gIH1cblxuICBzdGF0aWMgZ2V0VGltZXN0YW1wICgpIHtcbiAgICByZXR1cm4gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuICB9XG5cbiAgcGFyZW50RXhpc3RzKCkge1xuICAgIHJldHVybiB0aGlzLmRpciAhPT0gdW5kZWZpbmVkO1xuICB9XG5cbiAgaXNWYWxpZCgpIHtcbiAgICByZXR1cm4gdHlwZW9mIHRoaXMuZGlyID09PSAnb2JqZWN0JyAmJiB0aGlzLmRpci50eXBlID09PSAnZCc7XG4gIH1cblxuICBleGlzdHMoKSB7XG4gICAgcmV0dXJuIHRoaXMuaXNWYWxpZCgpICYmICghdGhpcy5maWxlbmFtZSB8fCB0eXBlb2YgdGhpcy5kaXIuY29udGVudFt0aGlzLmZpbGVuYW1lXSAhPT0gJ3VuZGVmaW5lZCcpO1xuICB9XG5cbiAgaXNGaWxlKCkge1xuICAgIHJldHVybiB0aGlzLmV4aXN0cygpICYmIHRoaXMuZmlsZW5hbWUgJiZcbiAgICAgIHRoaXMuZGlyLmNvbnRlbnRbdGhpcy5maWxlbmFtZV0udHlwZSA9PT0gJ2YnO1xuICB9XG5cbiAgaXNEaXIoKSB7XG4gICAgcmV0dXJuIHRoaXMuZXhpc3RzKCkgJiZcbiAgICAgICghdGhpcy5maWxlbmFtZSB8fCB0aGlzLmRpci5jb250ZW50W3RoaXMuZmlsZW5hbWVdLnR5cGUgPT09ICdkJyk7XG4gIH1cblxuICBkZWxldGUoKSB7XG4gICAgaWYgKHRoaXMuZXhpc3RzKCkpIHtcbiAgICAgIGRlbGV0ZSB0aGlzLmRpci5jb250ZW50W3RoaXMuZmlsZW5hbWVdO1xuICAgICAgRlMud3JpdGVGUygpO1xuICAgIH1cbiAgfVxuXG4gIGNsZWFyKCkge1xuICAgIHRoaXMud3JpdGUoJycsIGZhbHNlLCB0cnVlKTtcbiAgfVxuXG4gIHdyaXRlKGNvbnRlbnQsIGFwcGVuZCwgZm9yY2UpIHtcbiAgICB2YXIgdGltZSA9IEZpbGUuZ2V0VGltZXN0YW1wKCk7XG5cbiAgICBpZiAoIXRoaXMuZXhpc3RzKCkpIHtcbiAgICAgIGlmIChmb3JjZSAmJiB0aGlzLmlzVmFsaWQoKSkge1xuICAgICAgICB0aGlzLmNyZWF0ZUZpbGUodGltZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgZmlsZTogJyArIHRoaXMucGF0aCk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICghdGhpcy5pc0ZpbGUoKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYW5ub3Qgd3JpdGUgdG8gZGlyZWN0b3J5OiAlcycsIHRoaXMucGF0aCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBfY29udGVudCA9ICcnO1xuICAgICAgaWYgKGFwcGVuZCkge1xuICAgICAgICBfY29udGVudCArPSB0aGlzLnJlYWQoKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5kaXIubXRpbWUgPSB0aW1lO1xuICAgICAgdGhpcy5kaXIuY29udGVudFt0aGlzLmZpbGVuYW1lXS5tdGltZSA9IHRpbWU7XG4gICAgICB0aGlzLmRpci5jb250ZW50W3RoaXMuZmlsZW5hbWVdLmNvbnRlbnQgPSBfY29udGVudCArIGNvbnRlbnQ7XG4gICAgICBGUy53cml0ZUZTKCk7XG4gICAgfVxuICB9XG5cbiAgcmVhZCgpIHtcbiAgICByZXR1cm4gdGhpcy5maWxlbmFtZSA/IHRoaXMuZGlyLmNvbnRlbnRbdGhpcy5maWxlbmFtZV0uY29udGVudCA6IHRoaXMuZGlyLmNvbnRlbnQ7XG4gIH1cblxuICBfY3JlYXRlKHR5cGUsIGNvbnRlbnQsIHRpbWVzdGFtcCkge1xuICAgIGlmICh0aGlzLmV4aXN0cygpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZpbGUgJXMgYWxyZWFkeSBleGlzdHMnLCB0aGlzLnBhdGgpO1xuICAgIH1cblxuICAgIGlmICghdGltZXN0YW1wKSB7XG4gICAgICB0aW1lc3RhbXAgPSBGaWxlLmdldFRpbWVzdGFtcCgpO1xuICAgIH1cblxuICAgIHRoaXMuZGlyLmNvbnRlbnRbdGhpcy5maWxlbmFtZV0gPSB7XG4gICAgICBjdGltZTogdGltZXN0YW1wLFxuICAgICAgbXRpbWU6IHRpbWVzdGFtcCxcbiAgICAgIGNvbnRlbnQ6IGNvbnRlbnQsXG4gICAgICB0eXBlOiB0eXBlXG4gICAgfTtcblxuICAgIEZTLndyaXRlRlMoKTtcbiAgfVxuXG4gIGNyZWF0ZUZvbGRlcih0aW1lc3RhbXApIHtcbiAgICB0aGlzLl9jcmVhdGUoJ2QnLCB7fSwgdGltZXN0YW1wKTtcbiAgfVxuXG4gIGNyZWF0ZUZpbGUodGltZXN0YW1wKSB7XG4gICAgdGhpcy5fY3JlYXRlKCdmJywgJycsIHRpbWVzdGFtcCk7XG4gIH1cblxuICBzZWxmKCkge1xuICAgIHJldHVybiB0aGlzLmZpbGVuYW1lID8gdGhpcy5kaXIgOiB0aGlzLmRpci5jb250ZW50W3RoaXMuZmlsZW5hbWVdO1xuICB9XG5cbiAgb3BlbihmaWxlKSB7XG4gICAgcmV0dXJuIEZpbGUub3Blbih0aGlzLnBhdGggKyAnLycgKyBmaWxlKTtcbiAgfVxuXG4gIGxlbmd0aCgpIHtcbiAgICB2YXIgY29udGVudCA9IHRoaXMucmVhZCgpO1xuXG4gICAgaWYgKHRoaXMuaXNGaWxlKCkpIHtcbiAgICAgIHJldHVybiBjb250ZW50Lmxlbmd0aDtcbiAgICB9IGVsc2UgaWYgKHRoaXMuaXNEaXIoKSkge1xuICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKGNvbnRlbnQpLmxlbmd0aDtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIDA7XG4gICAgfVxuICB9XG5cbiAgbXRpbWUoKSB7XG4gICAgdmFyIHQgPSBuZXcgRGF0ZSh0aGlzLnNlbGYoKS5tdGltZSk7XG5cbiAgICB2YXIgZGF5QW5kTW9udGggPSBNT05USFNbdC5nZXRNb250aCgpXSArICcgJyArIHQuZ2V0RGF5KCk7XG4gICAgaWYgKERhdGUubm93KCkgLSB0LmdldFRpbWUoKSA+IDYgKiAzMCAqIDI0ICogNjAgKiA2MCAqIDEwMDApIHtcbiAgICAgIHJldHVybiBkYXlBbmRNb250aCArICcgJyArIHQuZ2V0RnVsbFllYXIoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGRheUFuZE1vbnRoICsgJyAnICsgdC5nZXRIb3VycygpICsgJzonICsgdC5nZXRNaW51dGVzKCk7XG4gICAgfVxuICB9O1xufVxuIiwiaW1wb3J0IExvY2FsU3RvcmFnZSBmcm9tICcuL2xvY2FsLXN0b3JhZ2UnO1xuXG52YXIgRlMgPSB7fTtcbnZhciBGSUxFX1NZU1RFTV9LRVkgPSAnZmlsZV9zeXN0ZW0nO1xuXG5GUy53cml0ZUZTID0gZnVuY3Rpb24gKCkge1xuICBMb2NhbFN0b3JhZ2Uuc2V0SXRlbShGSUxFX1NZU1RFTV9LRVksIEpTT04uc3RyaW5naWZ5KEZTLnJvb3QpKTtcbn07XG5cblxuRlMucm9vdCA9IEpTT04ucGFyc2UoTG9jYWxTdG9yYWdlLmdldEl0ZW0oRklMRV9TWVNURU1fS0VZKSk7XG52YXIgZmlsZVN5c3RlbSA9IHJlcXVpcmUoJy4vZmlsZS1zeXN0ZW0uanNvbicpO1xudmFyIGNvcHkgPSBmdW5jdGlvbiBjb3B5KG9sZCwgbm5ldykge1xuICBmb3IgKHZhciBrZXkgaW4gbm5ldykge1xuICAgIG9sZFtrZXldID0gbm5ld1trZXldO1xuICB9XG59O1xuXG5pZiAoIUZTLnJvb3QgfHwgIUZTLnJvb3QuY29udGVudCkge1xuICBGUy5yb290ID0gZmlsZVN5c3RlbTtcbn0gZWxzZSB7XG4gIHZhciB0aW1lID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuXG4gIChmdW5jdGlvbiByZWFkZGlyKG9sZCwgbm5ldykge1xuICAgIGlmICh0eXBlb2Ygb2xkLmNvbnRlbnQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICBmb3IgKHZhciBrZXkgaW4gbm5ldy5jb250ZW50KSB7XG4gICAgICAgIHZhciBuID0gbm5ldy5jb250ZW50W2tleV07XG4gICAgICAgIHZhciBvID0gb2xkLmNvbnRlbnRba2V5XTtcblxuICAgICAgICBpZiAoIW8uY29udGVudCkge1xuICAgICAgICAgIG8gPSB7XG4gICAgICAgICAgICBjdGltZTogdGltZSxcbiAgICAgICAgICAgIG10aW1lOiB0aW1lLFxuICAgICAgICAgICAgY29udGVudDogby5jb250ZW50LFxuICAgICAgICAgICAgdHlwZTogdHlwZW9mIG8gPT09ICdzdHJpbmcnID8gJ2YnIDogJ2QnXG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChvLnR5cGUgPT09ICdmJyAmJiBvLm10aW1lID09PSBvLmN0aW1lKSB7XG4gICAgICAgICAgY29weShvLCBuKTtcbiAgICAgICAgfSBlbHNlIGlmIChvLnR5cGUgPT09ICdkJykge1xuICAgICAgICAgIHJlYWRkaXIobywgbik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH0pKEZTLnJvb3QsIGZpbGVTeXN0ZW0pO1xuXG4gIEZTLndyaXRlRlMoKTtcbn1cblxuRlMuY3VycmVudFBhdGggPSBGUy5ob21lID0gJy9Vc2Vycy9ndWVzdCc7XG5GUy5jdXJyZW50RGlyID0gRlMucm9vdC5jb250ZW50LlVzZXJzLmNvbnRlbnQuZ3Vlc3Q7XG5cbkZTLmRpcm5hbWUgPSBmdW5jdGlvbiAocGF0aCkge1xuICByZXR1cm4gcGF0aC5zcGxpdCgnLycpLnNsaWNlKDAsIC0xKS5qb2luKCcvJyk7XG59O1xuXG5GUy5iYXNlbmFtZSA9IGZ1bmN0aW9uIChwYXRoKSB7XG4gIHJldHVybiBwYXRoLnNwbGl0KCcvJykucG9wKCk7XG59O1xuXG5GUy50cmFuc2xhdGVQYXRoID0gZnVuY3Rpb24gKHBhdGgpIHtcbiAgdmFyIGluZGV4O1xuXG4gIHBhdGggPSBwYXRoLnJlcGxhY2UoJ34nLCBGUy5ob21lKTtcblxuICBpZiAocGF0aFswXSAhPT0gJy8nKSB7XG4gICAgcGF0aCA9IChGUy5jdXJyZW50UGF0aCAhPT0gJy8nID8gRlMuY3VycmVudFBhdGggKyAnLycgOiAnLycpICsgcGF0aDtcbiAgfVxuXG4gIHBhdGggPSBwYXRoLnNwbGl0KCcvJyk7XG5cbiAgd2hpbGUofihpbmRleCA9IHBhdGguaW5kZXhPZignLi4nKSkpIHtcbiAgICBwYXRoLnNwbGljZShpbmRleCAtIDEsIDIpO1xuICB9XG5cbiAgd2hpbGUofihpbmRleCA9IHBhdGguaW5kZXhPZignLicpKSkge1xuICAgIHBhdGguc3BsaWNlKGluZGV4LCAxKTtcbiAgfVxuXG4gIGlmIChwYXRoWzBdID09PSAnLicpIHtcbiAgICBwYXRoLnNoaWZ0KCk7XG4gIH1cblxuICBpZiAocGF0aC5sZW5ndGggPCAyKSB7XG4gICAgcGF0aCA9IFssICwgXTtcbiAgfVxuXG4gIHJldHVybiBwYXRoLmpvaW4oJy8nKS5yZXBsYWNlKC8oW14vXSspXFwvKyQvLCAnJDEnKTtcbn07XG5cbkZTLnJlYWxwYXRoID0gZnVuY3Rpb24ocGF0aCkge1xuICBwYXRoID0gRlMudHJhbnNsYXRlUGF0aChwYXRoKTtcblxuICByZXR1cm4gRlMuZXhpc3RzKHBhdGgpID8gcGF0aCA6IG51bGw7XG59O1xuXG5cbkZTLm9wZW4gPSBmdW5jdGlvbiAocGF0aCkge1xuICBpZiAocGF0aFswXSAhPT0gJy8nKSB7XG4gICAgcGF0aCA9IEZTLnRyYW5zbGF0ZVBhdGgocGF0aCk7XG4gIH1cblxuICBwYXRoID0gcGF0aC5zdWJzdHIoMSkuc3BsaXQoJy8nKS5maWx0ZXIoU3RyaW5nKTtcblxuICB2YXIgY3dkID0gRlMucm9vdDtcbiAgd2hpbGUocGF0aC5sZW5ndGggJiYgY3dkLmNvbnRlbnQpIHtcbiAgICBjd2QgPSBjd2QuY29udGVudFtwYXRoLnNoaWZ0KCldO1xuICB9XG5cbiAgcmV0dXJuIGN3ZDtcbn07XG5cbkZTLmV4aXN0cyA9IGZ1bmN0aW9uIChwYXRoKSB7XG4gIHJldHVybiAhIUZTLm9wZW4ocGF0aCk7XG59O1xuXG5GUy5lcnJvciA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIFtdLmpvaW4uY2FsbChhcmd1bWVudHMsICc6ICcpO1xufTtcblxuRlMubm90Rm91bmQgPSBmdW5jdGlvbiAoY21kLCBhcmcpIHtcbiAgcmV0dXJuIEZTLmVycm9yKGNtZCwgYXJnLCAnTm8gc3VjaCBmaWxlIG9yIGRpcmVjdG9yeScpO1xufTtcblxuRlMuYXV0b2NvbXBsZXRlID0gZnVuY3Rpb24gKF9wYXRoKSB7XG4gIHZhciBwYXRoID0gdGhpcy50cmFuc2xhdGVQYXRoKF9wYXRoKTtcbiAgdmFyIG9wdGlvbnMgPSBbXTtcblxuICBpZiAoX3BhdGguc2xpY2UoLTEpID09PSAnLycpIHtcbiAgICBwYXRoICs9ICcvJztcbiAgfVxuXG4gIGlmIChwYXRoICE9PSB1bmRlZmluZWQpIHtcbiAgICB2YXIgZmlsZW5hbWUgPSBfcGF0aC5zcGxpdCgnLycpLnBvcCgpO1xuICAgIHZhciBvcGVuUGF0aCA9IGZpbGVuYW1lLmxlbmd0aCA+IDEgPyBwYXRoLnNsaWNlKDAsIC0xKSA6IHBhdGg7XG4gICAgdmFyIGRpciA9IEZTLm9wZW4ob3BlblBhdGgpO1xuICAgIHZhciBmaWxlTmFtZSA9ICcnO1xuICAgIHZhciBwYXJlbnRQYXRoID0gcGF0aDtcblxuICAgIGlmICghZGlyKSB7XG4gICAgICBwYXRoID0gcGF0aC5zcGxpdCgnLycpO1xuICAgICAgZmlsZU5hbWUgPSBwYXRoLnBvcCgpLnRvTG93ZXJDYXNlKCk7XG4gICAgICBwYXJlbnRQYXRoID0gcGF0aC5qb2luKCcvJykgfHwgJy8nO1xuICAgICAgZGlyID0gRlMub3BlbihwYXJlbnRQYXRoKTtcbiAgICB9XG5cbiAgICBpZiAoZGlyICYmIHR5cGVvZiBkaXIuY29udGVudCA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGZvciAodmFyIGtleSBpbiBkaXIuY29udGVudCkge1xuICAgICAgICBpZiAoa2V5LnN1YnN0cigwLCBmaWxlTmFtZS5sZW5ndGgpLnRvTG93ZXJDYXNlKCkgPT09IGZpbGVOYW1lKSB7XG4gICAgICAgICAgaWYgKHR5cGVvZiBkaXIuY29udGVudFtrZXldLmNvbnRlbnQgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICBrZXkgKz0gJy8nO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIG9wdGlvbnMucHVzaChrZXkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG9wdGlvbnM7XG59O1xuXG5leHBvcnQgZGVmYXVsdCBGUztcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihjb250YWluZXIsIHNjcm9sbCkge1xuICB3aW5kb3cub25yZXNpemUgPSBzY3JvbGw7XG5cbiAgY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3IoJy5mdWxsLXNjcmVlbicpLm9uY2xpY2sgPSBmdW5jdGlvbiAoZSkge1xuICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgIGlmICghZG9jdW1lbnQuZnVsbHNjcmVlbkVsZW1lbnQgJiZcbiAgICAgICAgIWRvY3VtZW50Lm1vekZ1bGxTY3JlZW5FbGVtZW50ICYmXG4gICAgICAgICAgIWRvY3VtZW50LndlYmtpdEZ1bGxzY3JlZW5FbGVtZW50ICYmXG4gICAgICAgICAgICAhZG9jdW1lbnQubXNGdWxsc2NyZWVuRWxlbWVudCApIHtcbiAgICAgIGlmIChjb250YWluZXIucmVxdWVzdEZ1bGxzY3JlZW4pIHtcbiAgICAgICAgY29udGFpbmVyLnJlcXVlc3RGdWxsc2NyZWVuKCk7XG4gICAgICB9IGVsc2UgaWYgKGNvbnRhaW5lci5tc1JlcXVlc3RGdWxsc2NyZWVuKSB7XG4gICAgICAgIGNvbnRhaW5lci5tc1JlcXVlc3RGdWxsc2NyZWVuKCk7XG4gICAgICB9IGVsc2UgaWYgKGNvbnRhaW5lci5tb3pSZXF1ZXN0RnVsbFNjcmVlbikge1xuICAgICAgICBjb250YWluZXIubW96UmVxdWVzdEZ1bGxTY3JlZW4oKTtcbiAgICAgIH0gZWxzZSBpZiAoY29udGFpbmVyLndlYmtpdFJlcXVlc3RGdWxsc2NyZWVuKSB7XG4gICAgICAgIGNvbnRhaW5lci53ZWJraXRSZXF1ZXN0RnVsbHNjcmVlbihFbGVtZW50LkFMTE9XX0tFWUJPQVJEX0lOUFVUKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKGRvY3VtZW50LmV4aXRGdWxsc2NyZWVuKSB7XG4gICAgICAgIGRvY3VtZW50LmV4aXRGdWxsc2NyZWVuKCk7XG4gICAgICB9IGVsc2UgaWYgKGRvY3VtZW50Lm1zRXhpdEZ1bGxzY3JlZW4pIHtcbiAgICAgICAgZG9jdW1lbnQubXNFeGl0RnVsbHNjcmVlbigpO1xuICAgICAgfSBlbHNlIGlmIChkb2N1bWVudC5tb3pDYW5jZWxGdWxsU2NyZWVuKSB7XG4gICAgICAgIGRvY3VtZW50Lm1vekNhbmNlbEZ1bGxTY3JlZW4oKTtcbiAgICAgIH0gZWxzZSBpZiAoZG9jdW1lbnQud2Via2l0RXhpdEZ1bGxzY3JlZW4pIHtcbiAgICAgICAgZG9jdW1lbnQud2Via2l0RXhpdEZ1bGxzY3JlZW4oKTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHR5cGVvZiBsb2NhbFN0b3JhZ2UgPT09ICd1bmRlZmluZWQnID9cbiAge1xuICAgIHNldEl0ZW06IGZ1bmN0aW9uKCkge30sXG4gICAgZ2V0SXRlbTogZnVuY3Rpb24oKSB7IHJldHVybiBudWxsOyB9XG4gIH1cbjpcbiAgbG9jYWxTdG9yYWdlO1xuIiwiZXhwb3J0IGRlZmF1bHQgY2xhc3MgU3RyZWFtIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5fY2FsbGJhY2tzID0ge307XG4gIH1cblxuICBvbihldmVudCwgY2FsbGJhY2spIHtcbiAgICBpZiAoIXRoaXMuX2NhbGxiYWNrc1tldmVudF0pIHtcbiAgICAgIHRoaXMuX2NhbGxiYWNrc1tldmVudF0gPSBbXTtcbiAgICB9XG5cbiAgICB0aGlzLl9jYWxsYmFja3NbZXZlbnRdLnB1c2goY2FsbGJhY2spO1xuICB9XG5cbiAgd3JpdGUoZGF0YSkge1xuICAgIHRoaXMuZW1taXQoJ2RhdGEnLCBkYXRhKTtcbiAgfVxuXG4gIGVtbWl0KGV2ZW50LCBkYXRhKSB7XG4gICAgdmFyIGNhbGxiYWNrcyA9IHRoaXMuX2NhbGxiYWNrc1tldmVudF07XG4gICAgY2FsbGJhY2tzICYmIGNhbGxiYWNrcy5mb3JFYWNoKGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgICAgY2FsbGJhY2soZGF0YSk7XG4gICAgfSk7XG4gIH1cbn1cbiIsImltcG9ydCBiaW5kRnVsbFNjcmVlbiBmcm9tICcuL2Z1bGwtc2NyZWVuJztcbmltcG9ydCBDb21tYW5kTWFuYWdlciBmcm9tICcuL2NvbW1hbmQtbWFuYWdlcic7XG5pbXBvcnQgRlMgZnJvbSAnLi9mcyc7XG5pbXBvcnQgUkVQTCBmcm9tICcuL1JFUEwnO1xuaW1wb3J0IFN0cmVhbSBmcm9tICcuL3N0cmVhbSc7XG5cbi8qKlxuICogT25seSB1c2VkIGJ5IHNvdXJjZS5qcyAtIHVudXNlZCBpbXBvcnQgc28gaXQgZ2V0cyBpbnRvIHRoZSBidW5kbGVcbiAqL1xuaW1wb3J0IENvbnNvbGUgZnJvbSAnLi9jb25zb2xlJztcblxuY2xhc3MgWlNIIHtcbiAgY29uc3RydWN0b3IoY29udGFpbmVyLCBzdGF0dXNiYXIsIGNyZWF0ZUhUTUwpIHtcbiAgICBpZiAoY3JlYXRlSFRNTCkge1xuICAgICAgdGhpcy5jcmVhdGUoY29udGFpbmVyKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5jb250YWluZXIgPSBjb250YWluZXI7XG4gICAgICB0aGlzLnN0YXR1c2JhciA9IHN0YXR1c2JhcjtcbiAgICB9XG5cbiAgICB0aGlzLnJvb3RDb250YWluZXIgPSB0aGlzLmNvbnRhaW5lcjtcbiAgICB0aGlzLkNvbW1hbmRNYW5hZ2VyID0gbmV3IENvbW1hbmRNYW5hZ2VyKCk7XG4gICAgdGhpcy5SRVBMID0gbmV3IFJFUEwodGhpcyk7XG4gICAgdGhpcy5GUyA9IEZTO1xuICAgIHRoaXMuY3JlYXRlU3RyZWFtcygpO1xuICAgIHRoaXMuaW5pdGlhbGl6ZUlucHV0KCk7XG4gICAgdGhpcy5wcm9tcHQoKTtcblxuICAgIGJpbmRGdWxsU2NyZWVuKHRoaXMuY29udGFpbmVyLnBhcmVudEVsZW1lbnQsIHRoaXMuc2Nyb2xsLmJpbmQodGhpcykpO1xuXG4gICAgdGhpcy5Db21tYW5kTWFuYWdlci5yZWdpc3RlcignY2xlYXInLCB0aGlzLmNsZWFyLmJpbmQodGhpcykpO1xuICB9XG5cbiAgY3JlYXRlU3RyZWFtcygpIHtcbiAgICB0aGlzLnN0ZGVyciA9IG5ldyBTdHJlYW0oKTtcbiAgICB0aGlzLnN0ZG91dCA9IG5ldyBTdHJlYW0oKTtcblxuICAgIHRoaXMuc3RkZXJyLm9uKCdkYXRhJywgKGQpID0+IHRoaXMub3V0cHV0KGQsICdzdGRlcnInKSk7XG4gICAgdGhpcy5zdGRvdXQub24oJ2RhdGEnLCAoZCkgPT4gdGhpcy5vdXRwdXQoZCwgJ3N0ZG91dCcpKTtcbiAgfVxuXG4gIHB3ZCgpIHtcbiAgICByZXR1cm4gRlMuY3VycmVudFBhdGgucmVwbGFjZShGUy5ob21lLCAnficpO1xuICB9XG5cbiAgJFBTMSgpIHtcbiAgICByZXR1cm4gYFxuICAgICAgPHNwYW4gY2xhc3M9XCJ3aG9cIj5ndWVzdDwvc3Bhbj5cbiAgICAgIG9uXG4gICAgICA8c3BhbiBjbGFzcz1cIndoZXJlXCI+ICR7dGhpcy5wd2QoKX0gPC9zcGFuPlxuICAgICAgPHNwYW4gY2xhc3M9XCJicmFuY2hcIj7CsW1hc3Rlcjwvc3Bhbj4mZ3Q7XG4gICAgYDtcbiAgfVxuXG4gIHByb21wdCgpIHtcbiAgICB2YXIgcm93ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgdmFyIHNwYW4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgdmFyIGNvZGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG5cbiAgICBzcGFuLmNsYXNzTmFtZSA9ICdwczEnO1xuICAgIGNvZGUuY2xhc3NOYW1lID0gJ2NvZGUnO1xuXG4gICAgc3Bhbi5pbm5lckhUTUwgPSB0aGlzLiRQUzEoKTtcblxuICAgIHJvdy5hcHBlbmRDaGlsZChzcGFuKTtcbiAgICByb3cuYXBwZW5kQ2hpbGQoY29kZSk7XG5cbiAgICB0aGlzLmNvbnRhaW5lci5hcHBlbmRDaGlsZChyb3cpO1xuICAgIHRoaXMuUkVQTC51c2UoY29kZSk7XG4gICAgdGhpcy5zdGF0dXModGhpcy5wd2QoKSk7XG4gICAgdGhpcy5zY3JvbGwoKTtcbiAgICByb3cuYXBwZW5kQ2hpbGQodGhpcy5pbnB1dCk7XG4gICAgdGhpcy5pbnB1dC5mb2N1cygpO1xuICB9XG5cbiAgc3RhdHVzKHRleHQpIHtcbiAgICBpZiAodGhpcy5zdGF0dXNiYXIpIHtcbiAgICAgIHRoaXMuc3RhdHVzYmFyLmlubmVyVGV4dCA9IHRleHQ7XG4gICAgfVxuICB9XG5cbiAgaW5pdGlhbGl6ZUlucHV0KCkge1xuICAgIHZhciBpbnB1dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lucHV0Jyk7XG4gICAgaW5wdXQuY2xhc3NOYW1lID0gJ2Zha2UtaW5wdXQnO1xuICAgIHRoaXMucm9vdENvbnRhaW5lci5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChlKSA9PiB7XG4gICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICBpZiAoaW5wdXQgPT09IGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQpIHtcbiAgICAgICAgaW5wdXQuYmx1cigpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaW5wdXQuZm9jdXMoKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHRoaXMuaW5wdXQgPSBpbnB1dDtcbiAgfVxuXG4gIGNyZWF0ZShjb250YWluZXIpIHtcbiAgICBpZiAodHlwZW9mIGNvbnRhaW5lciA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGNvbnRhaW5lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGNvbnRhaW5lcik7XG4gICAgfVxuXG4gICAgY29udGFpbmVyLmlubmVySFRNTCA9IGBcbiAgICAgIDxkaXYgY2xhc3M9XCJ0ZXJtaW5hbFwiPlxuICAgICAgICA8ZGl2IGNsYXNzPVwiYmFyXCI+XG4gICAgICAgICAgPGRpdiBjbGFzcz1cImJ1dHRvbnNcIj5cbiAgICAgICAgICAgIDxhIGNsYXNzPVwiY2xvc2VcIiBocmVmPVwiI1wiPjwvYT5cbiAgICAgICAgICAgIDxhIGNsYXNzPVwibWluaW1pemVcIiBocmVmPVwiI1wiPjwvYT5cbiAgICAgICAgICAgIDxhIGNsYXNzPVwibWF4aW1pemVcIiBocmVmPVwiI1wiPjwvYT5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8ZGl2IGNsYXNzPVwidGl0bGVcIj48L2Rpdj5cbiAgICAgICAgICA8YSBjbGFzcz1cImZ1bGwtc2NyZWVuXCIgaHJlZj1cIiNcIj48L2E+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzPVwiY29udGVudFwiPjwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzPVwic3RhdHVzLWJhclwiPjwvZGl2PlxuICAgICAgPC9kaXY+XG4gICAgYDtcblxuICAgIHRoaXMuY29udGFpbmVyID0gY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3IoJy5jb250ZW50Jyk7XG4gICAgdGhpcy5zdGF0dXNiYXIgPSBjb250YWluZXIucXVlcnlTZWxlY3RvcignLnN0YXR1cy1iYXInKTtcbiAgfVxuXG4gIHVwZGF0ZSgpIHtcbiAgICB2YXIgY29kZXMgPSB0aGlzLmNvbnRhaW5lci5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCdjb2RlJyk7XG4gICAgaWYgKCFjb2Rlcy5sZW5ndGgpIHtcbiAgICAgIHRoaXMucHJvbXB0KCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuUkVQTC51c2UoY29kZXNbY29kZXMubGVuZ3RoIC0gMV0sIFpTSCk7XG4gICAgfVxuICB9XG5cbiAgb3V0cHV0KHRleHQsIGNsYXNzTmFtZSkge1xuICAgIHZhciBvdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICBvdXQuY2xhc3NOYW1lID0gJ2NvZGUgJyArIFtjbGFzc05hbWVdO1xuICAgIG91dC5pbm5lckhUTUwgPSB0ZXh0O1xuXG4gICAgdGhpcy5jb250YWluZXIuYXBwZW5kQ2hpbGQob3V0KTtcbiAgICB0aGlzLnNjcm9sbCgpO1xuICB9XG5cbiAgc2Nyb2xsKCkge1xuICAgIHZhciBjID0gdGhpcy5yb290Q29udGFpbmVyO1xuICAgIHNldFRpbWVvdXQoKCkgPT4gYy5zY3JvbGxUb3AgPSBjLnNjcm9sbEhlaWdodCwgMCk7XG4gIH1cblxuICBjbGVhcigpIHtcbiAgICB0aGlzLmNvbnRhaW5lci5pbm5lckhUTUwgPSAnJztcbiAgICB0aGlzLnByb21wdCgpO1xuICB9XG5cbn1cblxud2luZG93LlpTSCA9IFpTSDtcbmV4cG9ydCBkZWZhdWx0IFpTSDtcbiJdfQ==
