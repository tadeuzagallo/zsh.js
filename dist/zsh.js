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
    var _this = this;

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
    zsh.stdin.on('data', function (event) {
      return _this.parse(event);
    });
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
        options = _CommandManager2['default'].autocomplete(this.command());
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
        _CommandManager2['default'].parse(input, this.zsh.stdin, this.zsh.stdout, this.zsh.stderr, this.zsh.prompt.bind(this.zsh));
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

      span.className = _CommandManager2['default'].isValid(command) ? 'valid' : 'invalid';

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

},{"./command-manager":"8EyLTk","./fs":"dDj8kd","./local-storage":14}],"zsh.js/args-parser":[function(require,module,exports){
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

},{}],"zsh.js/command-manager":[function(require,module,exports){
module.exports=require('8EyLTk');
},{}],"8EyLTk":[function(require,module,exports){
'use strict';

var _interopRequireDefault = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

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

exports['default'] = {
  commands: {},
  aliases: {},

  exists: function exists(cmd) {
    var path = _File2['default'].open('/usr/bin');
    return path.open(cmd + '.js').isFile();
  },

  load: function load(cmd) {
    var path = _File2['default'].open('/usr/bin');
    var source = path.open(cmd + '.js');
    var fn;
    if (source.isFile()) {
      var self = this;
      source = source.read();
      source = source.replace(/^import +([A-Za-z]+) +from +'([./\-_A-Za-z]+)'/gm, function (match, variable, file) {
        return 'var ' + variable + ' = require(\'' + file + '\')';
      });
      source = source.replace('export default', 'var __default__ =');
      fn = eval('(function () { ' + source + '; return __default__;})')();
    }
    return fn;
  },

  isValid: function isValid(cmd) {
    return !!(this.commands[cmd] || this.aliases[cmd] || this.exists(cmd));
  },

  autocomplete: function autocomplete(cmd) {
    var matches = [];
    cmd = cmd.toLowerCase();

    Object.keys(this.commands).concat(Object.keys(this.aliases)).forEach(function (command) {
      if (command.substr(0, cmd.length).toLowerCase() === cmd) {
        matches.push(command);
      }
    });

    return matches;
  },

  parse: function parse(cmd, stdin, stdout, stderr, next) {
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
  },

  exec: function exec(cmd, args, stdin, stdout, stderr, next) {
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
  },

  register: function register(cmd, fn) {
    this.commands[cmd] = fn;
  },

  alias: function alias(cmd, original) {
    if (arguments.length === 0) {
      return this.aliases;
    }
    this.aliases[cmd] = original;
  },

  unalias: function unalias(cmd) {
    delete this.aliases[cmd];
  },

  get: function get(cmd) {
    return this.commands[cmd];
  } };
module.exports = exports['default'];

},{"./args-parser":"3ed2tT","./file":"bMs+/F","./fs":"dDj8kd","./stream":15}],"zsh.js/console":[function(require,module,exports){
module.exports=require('CjB+4o');
},{}],"CjB+4o":[function(require,module,exports){
'use strict';

var _interopRequireDefault = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _zsh = require('./zsh');

var _zsh2 = _interopRequireDefault(_zsh);

'use strict';

var map = Array.prototype.map;
var stringify = function stringify(args) {
  return map.call(args, function (a) {
    return JSON.stringify(a) || [a] + '';
  }).join(' ');
};

var Console = (function () {
  function Console(stdout, stderr) {
    _classCallCheck(this, Console);

    this.stdout = stdout;
    this.stderr = stderr;
  }

  _createClass(Console, [{
    key: 'log',
    value: function log() {
      this.stdout.write(stringify(arguments));
    }
  }, {
    key: 'error',
    value: function error() {
      this.stderr.write(stringify(arguments));
    }
  }, {
    key: 'clear',
    value: function clear() {
      _zsh2['default'].clear();
    }
  }]);

  return Console;
})();

exports['default'] = Console;
module.exports = exports['default'];

},{"./zsh":"F2/ljt"}],8:[function(require,module,exports){
module.exports={
  "mtime": "2015-04-26T21:21:59.000Z",
  "ctime": "2015-04-26T21:21:59.000Z",
  "content": {
    "Users": {
      "mtime": "2015-04-26T21:21:59.000Z",
      "ctime": "2015-04-26T21:21:59.000Z",
      "content": {
        "guest": {
          "mtime": "2016-04-27T23:38:18.000Z",
          "ctime": "2016-04-27T23:38:18.000Z",
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
              "mtime": "2016-04-27T23:38:18.000Z",
              "ctime": "2016-04-27T23:38:18.000Z",
              "content": "# About me\n\nI'm a Software Engineer, currently working at Facebook, in the React Native\nPerformance team.  When I'm not working I like to learn about and play with\nCompilers and Low Level Programming.\n---\n\n# About this website\n\nI wanted something more than a boring portfolio, so I thought it'd be cool to\nwrite a copy of my terminal setup in JavaScript. The bits of it that I managed\nto implement look exactly like what I'm using on my development machine.\n---\n\n# Commands\n\nIf you want to know more about me, there are a few commands:\n  * about  (currently running)\n  * contact \n  * resume\n  * projects\n\nFor the terminal commands you can use `help` to list all the available commands.\n---\n    \n# Tmux is also available!\n\nThe prefix is the default (C-b) which means that you have to press ctrl+b before\nany tmux command.\nThe following commands are available:\n  * c - create a new window\n  * h or left - switch to previous window\n  * l or right - switch to next window\n  * q - close current window\n---\n\nI hope you have as much fun playing with the terminal as I had building it :)\n- @tadeuzagallo\n",
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
          "mtime": "2016-04-27T22:49:50.000Z",
          "ctime": "2016-04-27T22:49:50.000Z",
          "content": {
            "alias.js": {
              "mtime": "2016-04-27T21:24:43.000Z",
              "ctime": "2016-04-27T21:24:43.000Z",
              "content": "import CommandManager from 'zsh.js/command-manager';\n\nexport default function (args, stdin, stdout, stderr, next) {\n  var buffer = '';\n  if (args.arguments.length) {\n    var key = args.arguments.shift();\n    var index;\n    if (~(index = key.indexOf('='))) {\n      var command;\n\n      if (args.arguments.length && index === key.length - 1) {\n        command = args.arguments.join(' ');\n      } else {\n        command = key.substr(index + 1);\n      }\n\n      key = key.substr(0, index);\n\n      if (command) {\n        CommandManager.alias(key, command);\n      }\n    }\n  } else {\n    var aliases = CommandManager.alias();\n\n    for (var i in aliases) {\n      buffer += i + '=\\'' + aliases[i] + '\\'\\n';\n    }\n  }\n\n  stdout.write(buffer);\n  next();\n}\n",
              "type": "f"
            },
            "cat.js": {
              "mtime": "2016-04-27T21:25:32.000Z",
              "ctime": "2016-04-27T21:25:32.000Z",
              "content": "import File from 'zsh.js/file';\nimport FS from 'zsh.js/fs';\n\nexport default function (args, stdin, stdout, stderr, next) {\n  args.arguments.forEach(function (path) {\n    var file = File.open(path);\n\n    if (!file.exists()) {\n      stderr.write(FS.notFound('cat', path));\n    } else if (file.isDir()) {\n      stderr.write(FS.error('cat', path, 'Is a directory'));\n    } else {\n      stdout.write(file.read());\n    }\n  });\n\n  next();\n}\n",
              "type": "f"
            },
            "cd.js": {
              "mtime": "2016-04-27T21:25:44.000Z",
              "ctime": "2016-04-27T21:25:44.000Z",
              "content": "import File from 'zsh.js/file';\nimport FS from 'zsh.js/fs';\n\nexport default function (args, stdin, stdout, stderr, next) {\n  var path = args.arguments[0] || '~';\n  var dir = File.open(path);\n\n  if (!dir.exists()) {\n    stderr.write(FS.notFound('cd', path));\n  } else if (dir.isFile()) {\n    stderr.write(FS.error('cd', path, 'Is a file'));\n  } else {\n    FS.currentPath = dir.path;\n    FS.currentDir = dir.self();\n  }\n\n  FS.writeFS();\n  next();\n}\n",
              "type": "f"
            },
            "echo.js": {
              "mtime": "2016-04-27T21:25:57.000Z",
              "ctime": "2016-04-27T21:25:57.000Z",
              "content": "import ArgsParser from 'zsh.js/args-parser';\n\nexport default function (args, stdin, stdout, stderr, next) {\n  try {\n    stdout.write(ArgsParser.parseStrings(args.raw).join(' '));\n  } catch (err) {\n    stderr.write('zsh: ' + err.message);\n  }\n\n  next();\n}\n",
              "type": "f"
            },
            "help.js": {
              "mtime": "2016-04-27T22:10:02.000Z",
              "ctime": "2016-04-27T22:10:02.000Z",
              "content": "import CommandManager from 'zsh.js/command-manager';\nimport File from 'zsh.js/file';\n\nexport default function (args, stdin, stdout, stderr, next) {\n  stdout.write('registered commands:');\n  if (CommandManager.commands) {\n    stdout.write(Object.keys(CommandManager.commands).join(' '));\n  }\n\n  stdout.write('\\n');\n  stdout.write('executables (on /usr/bin):');\n  stdout.write(Object.keys(File.open('/usr/bin').read()).map(function(file) {\n    return file.replace(/\\.js$/, '');\n  }).join(' '));\n\n  stdout.write('\\n');\n\n  stdout.write('aliases:');\n\n  if (CommandManager.aliases) {\n    const it = (key) => `${key}=\"${CommandManager.aliases[key]}\"`;\n    stdout.write(Object.keys(CommandManager.aliases).map(it).join(' '));\n  }\n\n  next();\n}\n",
              "type": "f"
            },
            "ls.js": {
              "mtime": "2016-04-27T21:26:16.000Z",
              "ctime": "2016-04-27T21:26:16.000Z",
              "content": "import File from 'zsh.js/file';\nimport FS from 'zsh.js/fs';\n\nexport default function (args, stdin, stdout, stderr, next) {\n  if (!args.arguments.length) {\n    args.arguments.push('.');\n  }\n\n  args.arguments.forEach(function (arg) {\n    var dir = File.open(arg);\n\n    if (!dir.exists()) {\n      stderr.write(FS.notFound('ls', arg));\n    } else if (dir.isFile()) {\n      stderr.write(FS.error('ls', arg, 'Is a file'));\n    } else {\n      var files = Object.keys(dir.read());\n\n      if (!args.options.a) {\n        files = files.filter(function (file) {\n          return file[0] !== '.';\n        });\n      }\n\n      if (args.arguments.length > 1) {\n        stdout.write(arg + ':');\n      }\n\n      if (args.options.l) {\n        files = files.map(function (name) {\n          var file = dir.open(name);\n          var type = file.isDir() ? 'd' : '-';\n          var perms = type + 'rw-r--r--';\n\n          return perms + ' guest guest ' + file.length() + ' ' + file.mtime() + ' ' + name;\n        });\n      }\n\n      stdout.write(files.join(args.options.l ? '\\n' : ' '));\n    }\n  });\n\n  next();\n};\n",
              "type": "f"
            },
            "mkdir.js": {
              "mtime": "2016-04-27T21:26:20.000Z",
              "ctime": "2016-04-27T21:26:20.000Z",
              "content": "import File from 'zsh.js/file';\nimport FS from 'zsh.js/fs';\n\nexport default function (args, stdin, stdout, stderr, next) {\n  args.arguments.forEach(function (path) {\n    var file = File.open(path);\n\n    if (!file.parentExists()) {\n      stderr.write(FS.notFound('mkdir', path));\n    } else if (!file.isValid()) {\n      stderr.write(FS.error('mkdir', path, 'Not a directory'));\n    } else if (file.exists()) {\n      stderr.write(FS.error('mkdir', path, 'File exists'));\n    } else {\n      file.createFolder();\n    }\n  });\n\n  FS.writeFS();\n  next();\n}\n",
              "type": "f"
            },
            "mv.js": {
              "mtime": "2016-04-27T22:49:50.000Z",
              "ctime": "2016-04-27T22:49:50.000Z",
              "content": "import File from 'zsh.js/file';\nimport FS from 'zsh.js/fs';\n\nexport default function (args, stdin, stdout, stderr, next) {\n  var targetPath = args.arguments.pop();\n  var sourcePaths = args.arguments;\n  var target = File.open(targetPath);\n\n  if (!targetPath ||\n      !sourcePaths.length ||\n        (sourcePaths.length > 1 &&\n         (!target.exists() || target.isFile())\n        )\n     ) {\n    stderr.write('usage: mv source target\\n \\t mv source ... directory');\n  } else if (!target.parentExists()) {\n      stderr.write(FS.notFound('mv', target.dirname));\n  } else {\n    var backup = target.self();\n    var ok = sourcePaths.reduce(function (success, sourcePath) {\n      if (success) {\n        var source = File.open(sourcePath);\n\n        if (!source.exists()) {\n          stderr.write(FS.notFound('mv', sourcePaths[0]));\n        } else if (source.isDir() && target.isFile()) {\n          stderr.write(FS.error('mv', 'rename ' + sourcePaths[0] + ' to ' + targetPath, 'Not a directory'));\n        } else {\n          if (target.isDir()) {\n            target.read()[source.filename] = source.self();\n          } else if (source.isFile()) {\n            target.write(source.read(), false, true);\n          } else {\n            console.assert(!target.exists());\n            target.dir.content[target.filename] = source.self();\n          }\n\n          source.delete();\n          return true;\n        }\n      }\n\n      return false;\n    }, true);\n\n    if (ok) {\n      FS.writeFS();\n    } else {\n      target.dir[target.filename] = backup;\n    }\n  }\n\n  next();\n}\n",
              "type": "f"
            },
            "pwd.js": {
              "mtime": "2016-04-27T21:26:29.000Z",
              "ctime": "2016-04-27T21:26:29.000Z",
              "content": "import FS from 'zsh.js/fs';\n\nexport default function (args, stdin, stdout, stderr, next) {\n  var pwd = FS.currentPath;\n\n  if (stdout) {\n    stdout.write(pwd);\n    next();\n  } else {\n    return pwd;\n  }\n}\n",
              "type": "f"
            },
            "rm.js": {
              "mtime": "2016-04-27T21:26:33.000Z",
              "ctime": "2016-04-27T21:26:33.000Z",
              "content": "import File from 'zsh.js/file';\nimport FS from 'zsh.js/fs';\n\nexport default function (args, stdin, stdout, stderr, next) {\n  args.arguments.forEach(function (arg) {\n    var file = File.open(arg);\n\n    if (!file.exists()) {\n      stderr.write(FS.notFound('rm', arg));\n    } else if (!file.isValid()) {\n      stderr.write(FS.error('rm', arg, 'Not a directory'));\n    } else if (file.isDir()) {\n      stderr.write(FS.error('rm', arg, 'is a directory'));\n    } else {\n      file.delete();\n    }\n  });\n\n  FS.writeFS();\n  next();\n}\n",
              "type": "f"
            },
            "rmdir.js": {
              "mtime": "2016-04-27T21:26:38.000Z",
              "ctime": "2016-04-27T21:26:38.000Z",
              "content": "import File from 'zsh.js/file';\nimport FS from 'zsh.js/fs';\n\nexport default function (args, stdin, stdout, stderr, next) {\n  args.arguments.forEach(function (arg) {\n    var file = File.open(arg);\n\n    if (!file.parentExists() || !file.exists()) {\n      stderr.write(FS.notFound('rmdir', arg));\n    } else if (!file.isDir()) {\n      stderr.write(FS.error('rmdir', arg, 'Not a directory'));\n    } else {\n      file.delete();\n    }\n  });\n\n  FS.writeFS();\n  next();\n}\n",
              "type": "f"
            },
            "source.js": {
              "mtime": "2016-04-27T21:26:44.000Z",
              "ctime": "2016-04-27T21:26:44.000Z",
              "content": "/*eslint no-eval: 0*/\nimport Console from 'zsh.js/console';\nimport File from 'zsh.js/file';\n\nexport default function (args, stdin, stdout, stderr, next) {\n  if (args.arguments.length) {\n    var file = File.open(args.arguments[0]);\n    if (!file.exists()) {\n      stderr.write('source: no such file or directory: ' + file.path);\n    } else {\n      try {\n        var console = new Console(stdout, stderr); // jshint ignore: line\n        var result = JSON.stringify(eval(file.read()));\n        stdout.write('<- ' + result);\n      } catch (err) {\n        stderr.write(err.stack);\n      }\n    }\n  } else {\n    stderr.write('source: not enough arguments');\n  }\n\n  next();\n}\n",
              "type": "f"
            },
            "touch.js": {
              "mtime": "2016-04-27T21:26:53.000Z",
              "ctime": "2016-04-27T21:26:53.000Z",
              "content": "import File from 'zsh.js/file';\nimport FS from 'zsh.js/fs';\n\nexport default function (args, stdin, stdout, stderr, next) {\n  args.arguments.forEach(function (path) {\n    var file = File.open(path);\n\n    if (!file.parentExists()) {\n      stderr.write(FS.notFound('touch', path));\n    } else if (!file.isValid()){\n      stderr.write(FS.error('touch', path, 'Not a directory'));\n    } else {\n      file.write('', true, true);\n    }\n  });\n\n  FS.writeFS();\n  next();\n}\n",
              "type": "f"
            },
            "unalias.js": {
              "mtime": "2016-04-27T21:26:58.000Z",
              "ctime": "2016-04-27T21:26:58.000Z",
              "content": "import CommandManager from 'zsh.js/command-manager';\n\nexport default function (args, stdin, stdout, stderr, next) {\n  var cmd = args.arguments[0];\n\n  if (cmd) {\n    CommandManager.unalias(cmd);\n  }\n\n  next();\n}\n",
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
},{}],"zsh.js/file":[function(require,module,exports){
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
      }

      var _content = '';
      if (append) {
        _content += this.read();
      }

      this.dir.mtime = time;
      this.dir.content[this.filename].mtime = time;
      this.dir.content[this.filename].content = _content + content;
      _FS2['default'].writeFS();
    }
  }, {
    key: 'read',
    value: function read() {
      if (!this.exists()) {
        throw new Error('File %s doesn\'t exist', this.path);
      }
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
      return this.filename ? this.dir.content[this.filename] : this.dir;
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

},{"./fs":"dDj8kd"}],"zsh.js/fs":[function(require,module,exports){
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

    this.createStreams();

    this.rootContainer = this.container;
    this.REPL = new _REPL2['default'](this);
    this.FS = _FS2['default'];
    this.initializeInput();
    this.prompt();

    _bindFullScreen2['default'](this.container.parentElement, this.scroll.bind(this));

    _CommandManager2['default'].register('clear', this.clear.bind(this));
  }

  _createClass(ZSH, [{
    key: 'createStreams',
    value: function createStreams() {
      var _this = this;

      this.stdin = new _Stream2['default']();
      this.stderr = new _Stream2['default']();
      this.stdout = new _Stream2['default']();

      this.stderr.on('data', function (d) {
        return _this.output(d, 'stderr');
      });
      this.stdout.on('data', function (d) {
        return _this.output(d, 'stdout');
      });

      window.addEventListener('keydown', function (event) {
        _this.stdin.write(event);
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
        this.statusbar.innerHTML = text;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy90YWRldXphZ2FsbG8vZ2l0aHViL3pzaC5qcy9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvdGFkZXV6YWdhbGxvL2dpdGh1Yi96c2guanMvbGliL1JFUEwuanMiLCIvVXNlcnMvdGFkZXV6YWdhbGxvL2dpdGh1Yi96c2guanMvbGliL2FyZ3MtcGFyc2VyLmpzIiwiL1VzZXJzL3RhZGV1emFnYWxsby9naXRodWIvenNoLmpzL2xpYi9jb21tYW5kLW1hbmFnZXIuanMiLCIvVXNlcnMvdGFkZXV6YWdhbGxvL2dpdGh1Yi96c2guanMvbGliL2NvbnNvbGUuanMiLCIvVXNlcnMvdGFkZXV6YWdhbGxvL2dpdGh1Yi96c2guanMvbGliL2ZpbGUtc3lzdGVtLmpzb24iLCIvVXNlcnMvdGFkZXV6YWdhbGxvL2dpdGh1Yi96c2guanMvbGliL2ZpbGUuanMiLCIvVXNlcnMvdGFkZXV6YWdhbGxvL2dpdGh1Yi96c2guanMvbGliL2ZzLmpzIiwiL1VzZXJzL3RhZGV1emFnYWxsby9naXRodWIvenNoLmpzL2xpYi9mdWxsLXNjcmVlbi5qcyIsIi9Vc2Vycy90YWRldXphZ2FsbG8vZ2l0aHViL3pzaC5qcy9saWIvbG9jYWwtc3RvcmFnZS5qcyIsIi9Vc2Vycy90YWRldXphZ2FsbG8vZ2l0aHViL3pzaC5qcy9saWIvc3RyZWFtLmpzIiwiL1VzZXJzL3RhZGV1emFnYWxsby9naXRodWIvenNoLmpzL2xpYi96c2guanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7OEJDQTJCLG1CQUFtQjs7Ozs0QkFDckIsaUJBQWlCOzs7O2tCQUMzQixNQUFNOzs7Ozs7QUFJckIsSUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDO0FBQ2hCLElBQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQztBQUNkLElBQU0sS0FBSyxHQUFHLEVB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LE1BQU0sRUFBRTtBQUNqQixZQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7T0FDZixNQUFNO0FBQ0wsWUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7T0FDN0M7S0FDRjs7O1dBRUssZ0JBQUMsSUFBSSxFQUFFLFNBQVMsRUFBRTtBQUN0QixVQUFJLEdBQUcsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ3hDLFNBQUcsQ0FBQyxTQUFTLEdBQUcsT0FBTyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDdEMsU0FBRyxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUM7O0FBRXJCLFVBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ2hDLFVBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztLQUNmOzs7V0FFSyxrQkFBRztBQUNQLFVBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUM7QUFDM0IsZ0JBQVUsQ0FBQztlQUFNLENBQUMsQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDLFlBQVk7T0FBQSxFQUFFLENBQUMsQ0FBQyxDQUFDO0tBQ25EOzs7V0FFSSxpQkFBRztBQUNOLFVBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFHLEVBQUUsQ0FBQztBQUM5QixVQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7S0FDZjs7O1NBN0lHLEdBQUc7OztBQWlKVCxNQUFNLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQztxQkFDRixHQUFHIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsImltcG9ydCBDb21tYW5kTWFuYWdlciBmcm9tICcuL2NvbW1hbmQtbWFuYWdlcic7XG5pbXBvcnQgTG9jYWxTdG9yYWdlIGZyb20gJy4vbG9jYWwtc3RvcmFnZSc7XG5pbXBvcnQgRlMgZnJvbSAnLi9mcyc7XG5cbi8vIFRPRE86IEltcGxlbWVudCBWSSBiaW5kaW5nc1xuXG5jb25zdCBMRUZUID0gMzc7XG5jb25zdCBVUCA9IDM4O1xuY29uc3QgUklHSFQgPSAzOTtcbmNvbnN0IERPV04gPSA0MDtcblxuY29uc3QgVEFCID0gOTtcbmNvbnN0IEVOVEVSID0gMTM7XG5jb25zdCBCQUNLU1BBQ0UgPSA4O1xuY29uc3QgU1BBQ0UgPSAzMjtcblxuY29uc3QgSElTVE9SWV9TVE9SQUdFX0tFWSA9ICdURVJNSU5BTF9ISVNUT1JZJztcbmNvbnN0IEhJU1RPUllfU0laRSA9IDEwMDtcbmNvbnN0IEhJU1RPUllfU0VQQVJBVE9SID0gJyUlSElTVE9SWV9TRVBBUkFUT1IlJSc7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFJFUEwge1xuICBjb25zdHJ1Y3Rvcih6c2gpIHtcbiAgICB0aGlzLmlucHV0ID0gJyc7XG4gICAgdGhpcy5pbmRleCA9IDA7XG4gICAgdGhpcy5saXN0ZW5lcnMgPSB7fTtcbiAgICB0aGlzLmxhc3RLZXkgPSBudWxsO1xuICAgIHRoaXMuenNoID0genNoO1xuXG4gICAgdGhpcy5mdWxsSGlzdG9yeSA9IChbTG9jYWxTdG9yYWdlLmdldEl0ZW0oSElTVE9SWV9TVE9SQUdFX0tFWSldICsgJycpLnNwbGl0KEhJU1RPUllfU0VQQVJBVE9SKS5maWx0ZXIoU3RyaW5nKTtcbiAgICB0aGlzLmhpc3RvcnkgPSB0aGlzLmZ1bGxIaXN0b3J5LnNsaWNlKDApIHx8IFtdO1xuICAgIHRoaXMuaGlzdG9yeUluZGV4ID0gdGhpcy5oaXN0b3J5Lmxlbmd0aDtcblxuICAgIHRoaXMuY3JlYXRlQ2FyZXQoKTtcbiAgICB6c2guc3RkaW4ub24oJ2RhdGEnLCAoZXZlbnQpID0+IHRoaXMucGFyc2UoZXZlbnQpKTtcbiAgfVxuXG4gIGNyZWF0ZUNhcmV0KCkge1xuICAgIHRoaXMuY2FyZXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgdGhpcy5jYXJldC5jbGFzc05hbWUgPSAnY2FyZXQnO1xuICB9XG5cbiAgb24oZXZlbnQsIGNhbGxiYWNrKSB7XG4gICAgKCh0aGlzLmxpc3RlbmVyc1tldmVudF0gPSB0aGlzLmxpc3RlbmVyc1tldmVudF0gfHwgW10pKS5wdXNoKGNhbGxiYWNrKTtcbiAgfVxuXG4gIHVzZShzcGFuKSB7XG4gICAgdGhpcy5zcGFuICYmIHRoaXMucmVtb3ZlQ2FyZXQoKTtcbiAgICB0aGlzLnNwYW4gPSBzcGFuO1xuICAgIHRoaXMud3JpdGUoKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIHBhcnNlKGV2ZW50KSB7XG4gICAgaWYgKGV2ZW50Lm1ldGFLZXkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIHN3aXRjaCAoZXZlbnQua2V5Q29kZSkge1xuICAgICAgY2FzZSBMRUZUOlxuICAgICAgY2FzZSBSSUdIVDpcbiAgICAgICAgdGhpcy5tb3ZlQ2FyZXQoZXZlbnQua2V5Q29kZSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBVUDpcbiAgICAgIGNhc2UgRE9XTjpcbiAgICAgICAgdGhpcy5uYXZpZ2F0ZUhpc3RvcnkoZXZlbnQua2V5Q29kZSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBUQUI6XG4gICAgICAgIHRoaXMuYXV0b2NvbXBsZXRlKCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBFTlRFUjpcbiAgICAgICAgdGhpcy5zdWJtaXQoKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIEJBQ0tTUEFDRTpcbiAgICAgICAgdGhpcy5iYWNrc3BhY2UoKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBpZiAoZXZlbnQuY3RybEtleSkge1xuICAgICAgICAgIHRoaXMuYWN0aW9uKGV2ZW50KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLnVwZGF0ZShldmVudCk7XG4gICAgICAgIH1cbiAgICB9XG4gIH1cblxuICBtb3ZlQ2FyZXQoZGlyZWN0aW9uKSB7XG4gICAgaWYgKGRpcmVjdGlvbiA9PT0gTEVGVCkge1xuICAgICAgdGhpcy5pbmRleCA9IE1hdGgubWF4KHRoaXMuaW5kZXggLSAxLCAwKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5pbmRleCA9IE1hdGgubWluKHRoaXMuaW5kZXggKyAxLCB0aGlzLmlucHV0Lmxlbmd0aCArIDEpO1xuICAgIH1cbiAgICB0aGlzLndyaXRlKCk7XG4gIH1cblxuICBhdXRvY29tcGxldGUoKSB7XG4gICAgdmFyIG9wdGlvbnM7XG4gICAgdmFyIHBhdGggPSBmYWxzZTtcblxuICAgIGlmICh0aGlzLmNvbW1hbmQoKSA9PT0gdGhpcy5pbnB1dCkge1xuICAgICAgb3B0aW9ucyA9IENvbW1hbmRNYW5hZ2VyLmF1dG9jb21wbGV0ZSh0aGlzLmNvbW1hbmQoKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHBhdGggPSB0aGlzLmlucHV0LnNwbGl0KCcgJykucG9wKCk7XG4gICAgICBvcHRpb25zID0gRlMuYXV0b2NvbXBsZXRlKHBhdGgpO1xuICAgIH1cblxuICAgIGlmIChvcHRpb25zLmxlbmd0aCA9PT0gMSkge1xuICAgICAgaWYgKHBhdGggIT09IGZhbHNlKSB7XG4gICAgICAgIHBhdGggPSBwYXRoLnNwbGl0KCcvJyk7XG4gICAgICAgIHBhdGgucG9wKCk7XG4gICAgICAgIHBhdGgucHVzaCgnJyk7XG5cbiAgICAgICAgdGhpcy5pbnB1dCA9IHRoaXMuaW5wdXQucmVwbGFjZSgvIFteIF0qJC8sICcgJyArIHBhdGguam9pbignLycpICsgb3B0aW9ucy5zaGlmdCgpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuaW5wdXQgPSBvcHRpb25zLnNoaWZ0KCkgKyAnICc7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuaW5kZXggPSB0aGlzLmlucHV0Lmxlbmd0aDtcbiAgICAgIHRoaXMud3JpdGUoKTtcbiAgICB9IGVsc2UgaWYgKG9wdGlvbnMubGVuZ3RoKXtcbiAgICAgIHRoaXMuenNoLnN0ZG91dC53cml0ZShvcHRpb25zLmpvaW4oJyAnKSk7XG4gICAgICB0aGlzLnpzaC5wcm9tcHQoKTtcbiAgICB9XG4gIH1cblxuICBuYXZpZ2F0ZUhpc3RvcnkoZGlyZWN0aW9uKSB7XG4gICAgaWYgKGRpcmVjdGlvbiA9PT0gVVApIHtcbiAgICAgIHRoaXMuaGlzdG9yeUluZGV4ID0gTWF0aC5tYXgodGhpcy5oaXN0b3J5SW5kZXggLSAxLCAwKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5oaXN0b3J5SW5kZXggPSBNYXRoLm1pbih0aGlzLmhpc3RvcnlJbmRleCArIDEsIHRoaXMuaGlzdG9yeS5sZW5ndGggLSAxKTtcbiAgICB9XG5cbiAgICB0aGlzLmlucHV0ID0gdGhpcy5oaXN0b3J5W3RoaXMuaGlzdG9yeUluZGV4XSB8fCAnJztcbiAgICB0aGlzLmluZGV4ID0gdGhpcy5pbnB1dC5sZW5ndGg7XG4gICAgdGhpcy53cml0ZSgpO1xuICB9XG5cbiAgc3VibWl0KHByZXZlbnRXcml0ZSkge1xuICAgIHRoaXMuaW5kZXggPSB0aGlzLmlucHV0Lmxlbmd0aDtcblxuICAgIGlmICghcHJldmVudFdyaXRlKSB7XG4gICAgICB0aGlzLndyaXRlKCk7XG4gICAgfVxuXG4gICAgdmFyIGlucHV0ID0gdGhpcy5pbnB1dC50cmltKCk7XG5cbiAgICBpZiAoaW5wdXQgJiYgaW5wdXQgIT09IHRoaXMuZnVsbEhpc3RvcnlbdGhpcy5mdWxsSGlzdG9yeS5sZW5ndGggLSAxXSkge1xuICAgICAgdGhpcy5mdWxsSGlzdG9yeVt0aGlzLmZ1bGxIaXN0b3J5Lmxlbmd0aF0gPSBpbnB1dDtcbiAgICAgIExvY2FsU3RvcmFnZS5zZXRJdGVtKEhJU1RPUllfU1RPUkFHRV9LRVksIHRoaXMuZnVsbEhpc3Rvcnkuc2xpY2UoLUhJU1RPUllfU0laRSkuam9pbihISVNUT1JZX1NFUEFSQVRPUikpO1xuICAgIH1cblxuICAgIHRoaXMuaGlzdG9yeSA9IHRoaXMuZnVsbEhpc3Rvcnkuc2xpY2UoMCk7XG4gICAgdGhpcy5oaXN0b3J5SW5kZXggPSB0aGlzLmhpc3RvcnkubGVuZ3RoO1xuXG4gICAgdGhpcy5jbGVhcigpO1xuXG4gICAgaWYgKGlucHV0KSB7XG4gICAgICBDb21tYW5kTWFuYWdlci5wYXJzZShcbiAgICAgICAgaW5wdXQsXG4gICAgICAgIHRoaXMuenNoLnN0ZGluLFxuICAgICAgICB0aGlzLnpzaC5zdGRvdXQsXG4gICAgICAgIHRoaXMuenNoLnN0ZGVycixcbiAgICAgICAgdGhpcy56c2gucHJvbXB0LmJpbmQodGhpcy56c2gpXG4gICAgICApO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnpzaC5wcm9tcHQoKTtcbiAgICB9XG4gIH1cblxuICB0cmlnZ2VyKGV2dCwgbXNnKSB7XG4gICAgdmFyIGNhbGxiYWNrcyA9IHRoaXMubGlzdGVuZXJzW2V2dF0gfHwgW107XG5cbiAgICBjYWxsYmFja3MuZm9yRWFjaChmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgICAgIGNhbGxiYWNrKG1zZyk7XG4gICAgfSk7XG4gIH1cblxuICByZW1vdmVDYXJldCgpIHtcbiAgICB2YXIgY2FyZXQgPSB0aGlzLnNwYW4uZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSgnY2FyZXQnKTtcblxuICAgIGlmIChjYXJldCAmJiBjYXJldFswXSkge1xuICAgICAgY2FyZXRbMF0ucmVtb3ZlKCk7XG4gICAgfVxuICB9XG5cbiAgY2xlYXIoKSB7XG4gICAgdGhpcy5pbnB1dCA9ICcnO1xuICAgIHRoaXMuaW5kZXggPSAwO1xuICB9XG5cbiAgYmFja3NwYWNlKCkge1xuICAgIGlmICh0aGlzLmluZGV4ID4gMCkge1xuICAgICAgdGhpcy5pbnB1dCA9IHRoaXMuaW5wdXQuc3Vic3RyKDAsIHRoaXMuaW5kZXggLSAxKSArIHRoaXMuaW5wdXQuc3Vic3RyKHRoaXMuaW5kZXgpO1xuICAgICAgdGhpcy5pbmRleC0tO1xuICAgICAgdGhpcy53cml0ZSgpO1xuICAgIH1cbiAgfVxuXG4gIGFjdHVhbENoYXJDb2RlKGV2ZW50KSB7XG4gICAgdmFyIG9wdGlvbnM7XG4gICAgdmFyIGNvZGUgPSBldmVudC5rZXlDb2RlO1xuXG4gICAgY29kZSA9IHtcbiAgICAgIDE3MzogMTg5XG4gICAgfVtjb2RlXSB8fCBjb2RlO1xuXG4gICAgaWYgKGNvZGUgPj0gNjUgJiYgY29kZSA8PSA5MCkge1xuICAgICAgaWYgKCFldmVudC5zaGlmdEtleSkge1xuICAgICAgICBjb2RlICs9IDMyO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoY29kZSA+PSA0OCAmJiBjb2RlIDw9IDU3KSB7XG4gICAgICBpZiAoZXZlbnQuc2hpZnRLZXkpIHtcbiAgICAgICAgY29kZSA9ICcpIUAjJCVeJiooJy5jaGFyQ29kZUF0KGNvZGUgLSA0OCk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChjb2RlID49IDE4NiAmJiBjb2RlIDw9IDE5Mil7XG4gICAgICBvcHRpb25zID0gJzs9LC0uL2A6KzxfPj9+JztcblxuICAgICAgY29kZSAtPSAxODY7XG5cbiAgICAgIGlmIChldmVudC5zaGlmdEtleSkge1xuICAgICAgICBjb2RlICs9IG9wdGlvbnMubGVuZ3RoIC8gMjtcbiAgICAgIH1cblxuICAgICAgY29kZSA9IG9wdGlvbnMuY2hhckNvZGVBdChjb2RlKTtcbiAgICB9IGVsc2UgaWYgKGNvZGUgPj0gMjE5ICYmIGNvZGUgPD0gMjIyKSB7XG4gICAgICBvcHRpb25zID0gJ1tcXFxcXVxcJ3t8fVwiJztcbiAgICAgIGNvZGUgLT0gMjE5O1xuXG4gICAgICBpZiAoZXZlbnQuc2hpZnRLZXkpIHtcbiAgICAgICAgY29kZSArPSBvcHRpb25zLmxlbmd0aCAvIDI7XG4gICAgICB9XG5cbiAgICAgIGNvZGUgPSBvcHRpb25zLmNoYXJDb2RlQXQoY29kZSk7XG4gICAgfSBlbHNlIGlmIChjb2RlICE9PSBTUEFDRSkge1xuICAgICAgY29kZSA9IC0xO1xuICAgIH1cblxuICAgIHJldHVybiBjb2RlO1xuICB9XG5cbiAgYWN0aW9uKGV2ZW50KSB7XG4gICAgaWYgKFN0cmluZy5mcm9tQ2hhckNvZGUoZXZlbnQua2V5Q29kZSkgPT09ICdDJykge1xuICAgICAgdGhpcy5pbmRleCA9IHRoaXMuaW5wdXQubGVuZ3RoO1xuICAgICAgdGhpcy53cml0ZSgpO1xuICAgICAgdGhpcy5pbnB1dCA9ICcnO1xuICAgICAgdGhpcy5zdWJtaXQodHJ1ZSk7XG4gICAgfVxuICB9XG5cbiAgdXBkYXRlKGV2ZW50KSB7XG4gICAgdmFyIGNvZGUgPSB0aGlzLmFjdHVhbENoYXJDb2RlKGV2ZW50KTtcblxuICAgIGlmICghfmNvZGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgY2hhciA9IFN0cmluZy5mcm9tQ2hhckNvZGUoY29kZSk7XG5cbiAgICB0aGlzLmlucHV0ID0gdGhpcy5pbnB1dC5zdWJzdHIoMCwgdGhpcy5pbmRleCkgKyBjaGFyICsgdGhpcy5pbnB1dC5zdWJzdHIodGhpcy5pbmRleCk7XG4gICAgdGhpcy5pbmRleCsrO1xuICAgIHRoaXMud3JpdGUoKTtcbiAgfVxuXG4gIGNvbW1hbmQoKSB7XG4gICAgaWYgKHRoaXMuaW5wdXQgIT09IHRoaXMuX19pbnB1dENvbW1hbmQpIHtcbiAgICAgIHRoaXMuX19pbnB1dENvbW1hbmQgPSB0aGlzLmlucHV0O1xuICAgICAgdGhpcy5fX2NvbW1hbmQgPSB0aGlzLmlucHV0LnNwbGl0KCcgJykuc2hpZnQoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5fX2NvbW1hbmQ7XG4gIH1cblxuICBjb21tYW5kQXJnc1N0cmluZygpIHtcbiAgICBpZiAodGhpcy5pbnB1dCAhPT0gdGhpcy5fX2lucHV0Q0FyZ3MpIHtcbiAgICAgIHRoaXMuX19pbnB1dENBcmdzID0gdGhpcy5pbnB1dDtcbiAgICAgIHRoaXMuX19jYXJncyA9IHRoaXMuaW5wdXQuc3Vic3RyKHRoaXMuY29tbWFuZCgpLmxlbmd0aCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuX19jYXJncztcbiAgfVxuXG4gIHdyaXRlKCkge1xuICAgIHRoaXMuaGlzdG9yeVt0aGlzLmhpc3RvcnlJbmRleF0gPSB0aGlzLmlucHV0O1xuICAgIHRoaXMuY2FyZXQuaW5uZXJIVE1MID0gdGhpcy5pbnB1dFt0aGlzLmluZGV4XSB8fCAnJztcblxuICAgIHZhciBzcGFuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgIHZhciBjb21tYW5kID0gdGhpcy5jb21tYW5kKCk7XG4gICAgdmFyIGlucHV0ID0gdGhpcy5jb21tYW5kQXJnc1N0cmluZygpO1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIHZhciBwdXRDYXJldCA9IGZ1bmN0aW9uIChzdHIsIGluZGV4KSB7XG4gICAgICBzZWxmLmNhcmV0LmlubmVyVGV4dCA9IHN0cltpbmRleF0gfHwgJyAnO1xuICAgICAgcmV0dXJuIHN0ci5zdWJzdHIoMCwgaW5kZXgpICsgc2VsZi5jYXJldC5vdXRlckhUTUwgKyBzdHIuc3Vic3RyKGluZGV4ICsgMSk7XG4gICAgfTtcblxuICAgIHNwYW4uY2xhc3NOYW1lID0gQ29tbWFuZE1hbmFnZXIuaXNWYWxpZChjb21tYW5kKSA/ICd2YWxpZCcgOiAnaW52YWxpZCc7XG5cbiAgICBpZiAodGhpcy5pbmRleCA8IGNvbW1hbmQubGVuZ3RoKSB7XG4gICAgICBjb21tYW5kID0gcHV0Q2FyZXQoY29tbWFuZCwgdGhpcy5pbmRleCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlucHV0ID0gcHV0Q2FyZXQoaW5wdXQsIHRoaXMuaW5kZXggLSBjb21tYW5kLmxlbmd0aCk7XG4gICAgfVxuXG4gICAgc3Bhbi5pbm5lckhUTUwgPSBjb21tYW5kO1xuICAgIHRoaXMuc3Bhbi5pbm5lckhUTUwgPSBzcGFuLm91dGVySFRNTCArIGlucHV0O1xuICB9XG59XG4iLCJ2YXIgQXJnc1BhcnNlciA9IHt9O1xuXG5BcmdzUGFyc2VyLnBhcnNlU3RyaW5ncyA9IGZ1bmN0aW9uKHJhd1N0cmluZykge1xuICB2YXIgX2FyZ3MgPSBbXTtcbiAgdmFyIHdvcmQgPSAnJztcbiAgdmFyIHN0cmluZyA9IGZhbHNlO1xuICB2YXIgaSwgbDtcblxuICBmb3IgKGkgPSAwLCBsID0gcmF3U3RyaW5nLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIHZhciBjaGFyID0gcmF3U3RyaW5nW2ldO1xuICAgIGlmIChjaGFyID09PSAnXCInIHx8IGNoYXIgPT09ICdcXCcnKSB7XG4gICAgICBpZiAoc3RyaW5nKSB7XG4gICAgICAgIGlmIChjaGFyID09PSBzdHJpbmcpIHtcbiAgICAgICAgICBpZiAocmF3U3RyaW5nW2kgLSAxXSA9PT0gJ1xcXFwnKSB7XG4gICAgICAgICAgICB3b3JkID0gd29yZC5zbGljZSgwLCAtMSkgKyBjaGFyO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBfYXJncy5wdXNoKHdvcmQpO1xuICAgICAgICAgICAgd29yZCA9ICcnO1xuICAgICAgICAgICAgc3RyaW5nID0gbnVsbDtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgd29yZCArPSBjaGFyO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdHJpbmcgPSBjaGFyO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoY2hhciA9PT0gJyAnICYmICFzdHJpbmcpIHtcbiAgICAgIF9hcmdzLnB1c2god29yZCk7XG4gICAgICB3b3JkID0gJyc7XG4gICAgfSBlbHNlIHtcbiAgICAgIHdvcmQgKz0gY2hhcjtcbiAgICB9XG4gIH1cblxuICBpZiAoc3RyaW5nKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCd1bnRlcm1pbmF0ZWQgc3RyaW5nJyk7XG4gIH0gZWxzZSBpZiAod29yZCkge1xuICAgIF9hcmdzLnB1c2god29yZCk7XG4gIH1cblxuICByZXR1cm4gX2FyZ3M7XG59O1xuXG5BcmdzUGFyc2VyLnBhcnNlID0gZnVuY3Rpb24gKGFyZ3MpIHtcbiAgYXJncyA9IChbYXJnc10gKyAnJykudHJpbSgpO1xuXG4gIHZhciBvdXQgPSB7XG4gICAgYXJndW1lbnRzOiBbXSxcbiAgICBvcHRpb25zOiB7fSxcbiAgICByYXc6IGFyZ3NcbiAgfTtcblxuICBhcmdzID0gQXJnc1BhcnNlci5wYXJzZVN0cmluZ3MoYXJncyk7XG5cbiAgZnVuY3Rpb24gYWRkT3B0aW9uKG9wdGlvbiwgdmFsdWUpIHtcbiAgICBvdXQub3B0aW9uc1tvcHRpb25dID0gdHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJyA/IHZhbHVlIDogdHJ1ZTtcbiAgfVxuXG4gIGZvciAodmFyIGkgPSAwLCBsID0gYXJncy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICB2YXIgYXJnID0gYXJnc1tpXTtcblxuICAgIGlmICghYXJnKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBpZiAoYXJnLnN1YnN0cigwLCAyKSA9PT0gJy0tJykge1xuICAgICAgdmFyIG5leHQgPSBhcmdzW2kgKyAxXTtcbiAgICAgIGlmIChuZXh0ICYmIG5leHRbMF0gIT09ICctJykge1xuICAgICAgICBhZGRPcHRpb24oYXJnLnN1YnN0cigyKSwgbmV4dCk7XG4gICAgICAgIGkrKztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGFkZE9wdGlvbihhcmcuc3Vic3RyKDIpKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGFyZ1swXSA9PT0gJy0nKSB7XG4gICAgICBbXS5mb3JFYWNoLmNhbGwoYXJnLnN1YnN0cigxKSwgYWRkT3B0aW9uKTtcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0LmFyZ3VtZW50cy5wdXNoKGFyZyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG91dDtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IEFyZ3NQYXJzZXI7XG4iLCIvKmVzbGludCBuby1ldmFsOiAwKi9cbmltcG9ydCBBcmdzUGFyc2VyIGZyb20gJy4vYXJncy1wYXJzZXInO1xuaW1wb3J0IEZTIGZyb20gJy4vZnMnO1xuaW1wb3J0IEZpbGUgZnJvbSAnLi9maWxlJztcbmltcG9ydCBTdHJlYW0gZnJvbSAnLi9zdHJlYW0nO1xuXG5leHBvcnQgZGVmYXVsdCB7XG4gIGNvbW1hbmRzOiB7fSxcbiAgYWxpYXNlczoge30sXG5cbiAgZXhpc3RzKGNtZCkge1xuICAgIHZhciBwYXRoID0gRmlsZS5vcGVuKCcvdXNyL2JpbicpO1xuICAgIHJldHVybiBwYXRoLm9wZW4oY21kICsgJy5qcycpLmlzRmlsZSgpO1xuICB9LFxuXG4gIGxvYWQoY21kKSB7XG4gICAgdmFyIHBhdGggPSBGaWxlLm9wZW4oJy91c3IvYmluJyk7XG4gICAgdmFyIHNvdXJjZSA9IHBhdGgub3BlbihjbWQgKyAnLmpzJyk7XG4gICAgdmFyIGZuO1xuICAgIGlmIChzb3VyY2UuaXNGaWxlKCkpIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIHNvdXJjZSA9IHNvdXJjZS5yZWFkKCk7XG4gICAgICBzb3VyY2UgPSBzb3VyY2UucmVwbGFjZSgvXmltcG9ydCArKFtBLVphLXpdKykgK2Zyb20gKycoWy4vXFwtX0EtWmEtel0rKScvZ20sIChtYXRjaCwgdmFyaWFibGUsIGZpbGUpID0+IHtcbiAgICAgICAgcmV0dXJuIGB2YXIgJHt2YXJpYWJsZX0gPSByZXF1aXJlKCcke2ZpbGV9JylgO1xuICAgICAgfSk7XG4gICAgICBzb3VyY2UgPSBzb3VyY2UucmVwbGFjZSgnZXhwb3J0IGRlZmF1bHQnLCAndmFyIF9fZGVmYXVsdF9fID0nKTtcbiAgICAgIGZuID0gZXZhbCgnKGZ1bmN0aW9uICgpIHsgJyArIHNvdXJjZSArICc7IHJldHVybiBfX2RlZmF1bHRfXzt9KScpKCk7XG4gICAgfVxuICAgIHJldHVybiBmbjtcbiAgfSxcblxuICBpc1ZhbGlkKGNtZCkge1xuICAgIHJldHVybiAhISh0aGlzLmNvbW1hbmRzW2NtZF0gfHwgdGhpcy5hbGlhc2VzW2NtZF0gfHwgdGhpcy5leGlzdHMoY21kKSk7XG4gIH0sXG5cbiAgYXV0b2NvbXBsZXRlKGNtZCkge1xuICAgIHZhciBtYXRjaGVzID0gW107XG4gICAgY21kID0gY21kLnRvTG93ZXJDYXNlKCk7XG5cbiAgICAoT2JqZWN0LmtleXModGhpcy5jb21tYW5kcykuY29uY2F0KE9iamVjdC5rZXlzKHRoaXMuYWxpYXNlcykpKS5mb3JFYWNoKGZ1bmN0aW9uIChjb21tYW5kKSB7XG4gICAgICBpZiAoY29tbWFuZC5zdWJzdHIoMCwgY21kLmxlbmd0aCkudG9Mb3dlckNhc2UoKSA9PT0gY21kKSB7XG4gICAgICAgIG1hdGNoZXMucHVzaChjb21tYW5kKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBtYXRjaGVzO1xuICB9LFxuXG4gIHBhcnNlKGNtZCwgc3RkaW4sIHN0ZG91dCwgc3RkZXJyLCBuZXh0KSB7XG4gICAgaWYgKH5jbWQuaW5kZXhPZignfCcpKSB7XG4gICAgICBjbWQgPSBjbWQuc3BsaXQoJ3wnKTtcbiAgICAgIGNtZC5mb3JFYWNoKHRoaXMucGFyc2UuYmluZCh0aGlzKSk7XG4gICAgfVxuXG4gICAgY21kID0gY21kLnNwbGl0KCcgJyk7XG4gICAgdmFyIGNvbW1hbmQgPSBjbWQuc2hpZnQoKTtcbiAgICB2YXIgYXJncyA9IGNtZC5qb2luKCcgJyk7XG5cbiAgICB2YXIgaW5kZXg7XG5cbiAgICBpZiAofihpbmRleCA9IGFyZ3MuaW5kZXhPZignPicpKSkge1xuICAgICAgdmFyIHByZXYgPSBhcmdzW2luZGV4IC0gMV07XG4gICAgICB2YXIgYXBwZW5kID0gYXJnc1tpbmRleCArIDFdID09PSAnPic7XG4gICAgICB2YXIgaW5pdCA9IGluZGV4O1xuXG4gICAgICBpZiAofihbJzEnLCAnMicsICcmJ10pLmluZGV4T2YocHJldikpIHtcbiAgICAgICAgaW5pdC0tO1xuICAgICAgfVxuXG4gICAgICB2YXIgX2FyZ3MgPSBhcmdzLnN1YnN0cigwLCBpbml0KTtcbiAgICAgIGFyZ3MgPSBhcmdzLnN1YnN0cihpbmRleCArIGFwcGVuZCArIDEpLnNwbGl0KCcgJykuZmlsdGVyKFN0cmluZyk7XG4gICAgICB2YXIgcGF0aCA9IGFyZ3Muc2hpZnQoKTtcbiAgICAgIGFyZ3MgPSBfYXJncyArIGFyZ3Muam9pbignICcpO1xuXG4gICAgICBpZiAoIXBhdGgpIHtcbiAgICAgICAgc3Rkb3V0LndyaXRlKCd6c2g6IHBhcnNlIGVycm9yIG5lYXIgYFxcXFxuXFwnJyk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdmFyIGZpbGUgPSBGaWxlLm9wZW4ocGF0aCk7XG5cbiAgICAgIGlmICghZmlsZS5wYXJlbnRFeGlzdHMoKSkge1xuICAgICAgICBzdGRvdXQud3JpdGUoJ3pzaDogbm8gc3VjaCBmaWxlIG9yIGRpcmVjdG9yeTogJyArIGZpbGUucGF0aCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH0gZWxzZSBpZiAoIWZpbGUuaXNWYWxpZCgpKSB7XG4gICAgICAgIHN0ZG91dC53cml0ZSgnenNoOiBub3QgYSBkaXJlY3Rvcnk6ICcgKyBmaWxlLnBhdGgpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9IGVsc2UgaWYgKGZpbGUuaXNEaXIoKSkge1xuICAgICAgICBzdGRvdXQud3JpdGUoJ3pzaDogaXMgYSBkaXJlY3Rvcnk6ICcgKyBmaWxlLnBhdGgpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmICghYXBwZW5kKSB7XG4gICAgICAgIGZpbGUuY2xlYXIoKTtcbiAgICAgIH1cblxuICAgICAgdmFyIF9zdGRvdXQgPSBuZXcgU3RyZWFtKCk7XG4gICAgICBfc3Rkb3V0Lm9uKCdkYXRhJywgZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICBmaWxlLndyaXRlKGRhdGEgKyAnXFxuJywgdHJ1ZSwgdHJ1ZSk7XG4gICAgICB9KTtcblxuICAgICAgaWYgKHByZXYgIT09ICcyJykge1xuICAgICAgICBzdGRvdXQgPSBfc3Rkb3V0O1xuICAgICAgfVxuXG4gICAgICBpZiAocHJldiA9PT0gJzInIHx8IHByZXYgPT09ICcmJykge1xuICAgICAgICBzdGRlcnIgPSBfc3Rkb3V0O1xuICAgICAgfVxuXG4gICAgICB2YXIgX25leHQgPSBuZXh0O1xuICAgICAgbmV4dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgRlMud3JpdGVGUygpO1xuICAgICAgICBfbmV4dCgpO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICB0aGlzLmV4ZWMoY29tbWFuZCwgYXJncywgc3RkaW4sIHN0ZG91dCwgc3RkZXJyLCBuZXh0KTtcbiAgfSxcblxuICBleGVjKGNtZCwgYXJncywgc3RkaW4sIHN0ZG91dCwgc3RkZXJyLCBuZXh0KSB7XG4gICAgaWYgKHRoaXMuYWxpYXNlc1tjbWRdKSB7XG4gICAgICB2YXIgbGluZSA9ICh0aGlzLmFsaWFzZXNbY21kXSArICcgJyArIGFyZ3MpLnRyaW0oKS5zcGxpdCgnICcpO1xuICAgICAgdGhpcy5leGVjKGxpbmUuc2hpZnQoKSwgbGluZS5qb2luKCcgJyksIHN0ZGluLCBzdGRvdXQsIHN0ZGVyciwgbmV4dCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIGZuO1xuICAgIGlmICh0eXBlb2YgdGhpcy5jb21tYW5kc1tjbWRdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBmbiA9IHRoaXMuY29tbWFuZHNbY21kXTtcbiAgICB9IGVsc2UgaWYgKChmbiA9IHRoaXMubG9hZChjbWQpKSkge1xuICAgIH0gZWxzZSB7XG4gICAgICBzdGRlcnIud3JpdGUoJ3pzaDogY29tbWFuZCBub3QgZm91bmQ6ICcgKyBjbWQpO1xuICAgICAgbmV4dCgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICBhcmdzID0gQXJnc1BhcnNlci5wYXJzZShhcmdzKTtcbiAgICAgIGZuLmNhbGwodW5kZWZpbmVkLCBhcmdzLCBzdGRpbiwgc3Rkb3V0LCBzdGRlcnIsIG5leHQpO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgc3RkZXJyLndyaXRlKGVyci5zdGFjayk7XG4gICAgICBuZXh0KCk7XG4gICAgfVxuICB9LFxuXG4gIHJlZ2lzdGVyKGNtZCwgZm4pIHtcbiAgICB0aGlzLmNvbW1hbmRzW2NtZF0gPSBmbjtcbiAgfSxcblxuICBhbGlhcyhjbWQsIG9yaWdpbmFsKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiB0aGlzLmFsaWFzZXM7XG4gICAgfVxuICAgIHRoaXMuYWxpYXNlc1tjbWRdID0gb3JpZ2luYWw7XG4gIH0sXG5cbiAgdW5hbGlhcyhjbWQpIHtcbiAgICBkZWxldGUgdGhpcy5hbGlhc2VzW2NtZF07XG4gIH0sXG5cbiAgZ2V0KGNtZCkge1xuICAgIHJldHVybiB0aGlzLmNvbW1hbmRzW2NtZF07XG4gIH0sXG59XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCB6c2ggZnJvbSAnLi96c2gnO1xuXG5jb25zdCBtYXAgPSBBcnJheS5wcm90b3R5cGUubWFwO1xuY29uc3Qgc3RyaW5naWZ5ID0gKGFyZ3MpID0+XG4gIG1hcC5jYWxsKFxuICAgIGFyZ3MsXG4gICAgKGEpID0+IEpTT04uc3RyaW5naWZ5KGEpIHx8IFthXSsnJ1xuICApLmpvaW4oJyAnKTtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQ29uc29sZSB7XG4gIGNvbnN0cnVjdG9yKHN0ZG91dCwgc3RkZXJyKSB7XG4gICAgdGhpcy5zdGRvdXQgPSBzdGRvdXQ7XG4gICAgdGhpcy5zdGRlcnIgPSBzdGRlcnI7XG4gIH1cblxuICBsb2coKSB7XG4gICAgdGhpcy5zdGRvdXQud3JpdGUoc3RyaW5naWZ5KGFyZ3VtZW50cykpO1xuICB9XG5cbiAgZXJyb3IoKSB7XG4gICAgdGhpcy5zdGRlcnIud3JpdGUoc3RyaW5naWZ5KGFyZ3VtZW50cykpO1xuICB9XG5cbiAgY2xlYXIoKSB7XG4gICAgenNoLmNsZWFyKCk7XG4gIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzPXtcbiAgXCJtdGltZVwiOiBcIjIwMTUtMDQtMjZUMjE6MjE6NTkuMDAwWlwiLFxuICBcImN0aW1lXCI6IFwiMjAxNS0wNC0yNlQyMToyMTo1OS4wMDBaXCIsXG4gIFwiY29udGVudFwiOiB7XG4gICAgXCJVc2Vyc1wiOiB7XG4gICAgICBcIm10aW1lXCI6IFwiMjAxNS0wNC0yNlQyMToyMTo1OS4wMDBaXCIsXG4gICAgICBcImN0aW1lXCI6IFwiMjAxNS0wNC0yNlQyMToyMTo1OS4wMDBaXCIsXG4gICAgICBcImNvbnRlbnRcIjoge1xuICAgICAgICBcImd1ZXN0XCI6IHtcbiAgICAgICAgICBcIm10aW1lXCI6IFwiMjAxNi0wNC0yN1QyMzozODoxOC4wMDBaXCIsXG4gICAgICAgICAgXCJjdGltZVwiOiBcIjIwMTYtMDQtMjdUMjM6Mzg6MTguMDAwWlwiLFxuICAgICAgICAgIFwiY29udGVudFwiOiB7XG4gICAgICAgICAgICBcIi52aW1yY1wiOiB7XG4gICAgICAgICAgICAgIFwibXRpbWVcIjogXCIyMDE1LTA0LTI2VDIxOjIxOjU5LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjdGltZVwiOiBcIjIwMTUtMDQtMjZUMjE6MjE6NTkuMDAwWlwiLFxuICAgICAgICAgICAgICBcImNvbnRlbnRcIjogXCJcIixcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiZlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCIuenNocmNcIjoge1xuICAgICAgICAgICAgICBcIm10aW1lXCI6IFwiMjAxNS0wNC0yNlQyMToyMTo1OS4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY3RpbWVcIjogXCIyMDE1LTA0LTI2VDIxOjIxOjU5LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjb250ZW50XCI6IFwiXCIsXG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImZcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiYWJvdXQubWRcIjoge1xuICAgICAgICAgICAgICBcIm10aW1lXCI6IFwiMjAxNi0wNC0yN1QyMzozODoxOC4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY3RpbWVcIjogXCIyMDE2LTA0LTI3VDIzOjM4OjE4LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjb250ZW50XCI6IFwiIyBBYm91dCBtZVxcblxcbkknbSBhIFNvZnR3YXJlIEVuZ2luZWVyLCBjdXJyZW50bHkgd29ya2luZyBhdCBGYWNlYm9vaywgaW4gdGhlIFJlYWN0IE5hdGl2ZVxcblBlcmZvcm1hbmNlIHRlYW0uICBXaGVuIEknbSBub3Qgd29ya2luZyBJIGxpa2UgdG8gbGVhcm4gYWJvdXQgYW5kIHBsYXkgd2l0aFxcbkNvbXBpbGVycyBhbmQgTG93IExldmVsIFByb2dyYW1taW5nLlxcbi0tLVxcblxcbiMgQWJvdXQgdGhpcyB3ZWJzaXRlXFxuXFxuSSB3YW50ZWQgc29tZXRoaW5nIG1vcmUgdGhhbiBhIGJvcmluZyBwb3J0Zm9saW8sIHNvIEkgdGhvdWdodCBpdCdkIGJlIGNvb2wgdG9cXG53cml0ZSBhIGNvcHkgb2YgbXkgdGVybWluYWwgc2V0dXAgaW4gSmF2YVNjcmlwdC4gVGhlIGJpdHMgb2YgaXQgdGhhdCBJIG1hbmFnZWRcXG50byBpbXBsZW1lbnQgbG9vayBleGFjdGx5IGxpa2Ugd2hhdCBJJ20gdXNpbmcgb24gbXkgZGV2ZWxvcG1lbnQgbWFjaGluZS5cXG4tLS1cXG5cXG4jIENvbW1hbmRzXFxuXFxuSWYgeW91IHdhbnQgdG8ga25vdyBtb3JlIGFib3V0IG1lLCB0aGVyZSBhcmUgYSBmZXcgY29tbWFuZHM6XFxuICAqIGFib3V0ICAoY3VycmVudGx5IHJ1bm5pbmcpXFxuICAqIGNvbnRhY3QgXFxuICAqIHJlc3VtZVxcbiAgKiBwcm9qZWN0c1xcblxcbkZvciB0aGUgdGVybWluYWwgY29tbWFuZHMgeW91IGNhbiB1c2UgYGhlbHBgIHRvIGxpc3QgYWxsIHRoZSBhdmFpbGFibGUgY29tbWFuZHMuXFxuLS0tXFxuICAgIFxcbiMgVG11eCBpcyBhbHNvIGF2YWlsYWJsZSFcXG5cXG5UaGUgcHJlZml4IGlzIHRoZSBkZWZhdWx0IChDLWIpIHdoaWNoIG1lYW5zIHRoYXQgeW91IGhhdmUgdG8gcHJlc3MgY3RybCtiIGJlZm9yZVxcbmFueSB0bXV4IGNvbW1hbmQuXFxuVGhlIGZvbGxvd2luZyBjb21tYW5kcyBhcmUgYXZhaWxhYmxlOlxcbiAgKiBjIC0gY3JlYXRlIGEgbmV3IHdpbmRvd1xcbiAgKiBoIG9yIGxlZnQgLSBzd2l0Y2ggdG8gcHJldmlvdXMgd2luZG93XFxuICAqIGwgb3IgcmlnaHQgLSBzd2l0Y2ggdG8gbmV4dCB3aW5kb3dcXG4gICogcSAtIGNsb3NlIGN1cnJlbnQgd2luZG93XFxuLS0tXFxuXFxuSSBob3BlIHlvdSBoYXZlIGFzIG11Y2ggZnVuIHBsYXlpbmcgd2l0aCB0aGUgdGVybWluYWwgYXMgSSBoYWQgYnVpbGRpbmcgaXQgOilcXG4tIEB0YWRldXphZ2FsbG9cXG5cIixcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiZlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJjb250YWN0Lm1kXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTUtMDQtMjZUMjE6MjE6NTkuMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNS0wNC0yNlQyMToyMTo1OS4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcIiMgQWxsIG15IGNvbnRhY3RzLCBmZWVsIGZyZWUgdG8gcmVhY2ggbWUgYXQgYW55IG9mIHRoZXNlXFxuXFxuKiA8YSBocmVmPVxcXCJtYWlsdG86dGFkZXV6YWdhbGxvQGdtYWlsLmNvbVxcXCIgYWx0PVxcXCJFbWFpbFxcXCI+W0VtYWlsXShtYWlsdG86dGFkZXV6YWdhbGxvQGdtYWlsLmNvbSk8L2E+XFxuKiA8YSBocmVmPVxcXCJodHRwczovL2dpdGh1Yi5jb20vdGFkZXV6YWdhbGxvXFxcIiBhbHQ9XFxcIkdpdEh1YlxcXCIgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiPltHaXRIdWJdKGh0dHBzOi8vZ2l0aHViLmNvbS90YWRldXphZ2FsbG8pPC9hPlxcbiogPGEgaHJlZj1cXFwiaHR0cHM6Ly90d2l0dGVyLmNvbS90YWRldXphZ2FsbG9cXFwiIGFsdD1cXFwiVHdpdHRlclxcXCIgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiPltUd2l0dGVyXShodHRwczovL3R3aXR0ZXIuY29tL3RhZGV1emFnYWxsbyk8L2E+XFxuKiA8YSBocmVmPVxcXCJodHRwczovL2ZhY2Vib29rLmNvbS90YWRldXphZ2FsbG9cXFwiIGFsdD1cXFwiRmFjZWJvb2tcXFwiIHRhcmdldD1cXFwiX2JsYW5rXFxcIj5bRmFjZWJvb2tdKGh0dHBzOi8vZmFjZWJvb2suY29tL3RhZGV1emFnYWxsbyk8L2E+XFxuKiA8YSBocmVmPVxcXCJodHRwczovL3BsdXMuZ29vZ2xlLmNvbS8rVGFkZXVaYWdhbGxvXFxcIiBhbHQ9XFxcIkdvb2dsZSArXFxcIiB0YXJnZXQ9XFxcIl9ibGFua1xcXCI+W0dvb2dsZSArXShodHRwczovL3BsdXMuZ29vZ2xlLmNvbS8rVGFkZXVaYWdhbGxvKTwvYT5cXG4qIDxhIGhyZWY9XFxcImh0dHA6Ly93d3cubGlua2VkaW4uY29tL3Byb2ZpbGUvdmlldz9pZD0xNjAxNzcxNTlcXFwiIGFsdD1cXFwiTGlua2VkaW5cXFwiIHRhcmdldD1cXFwiX2JsYW5rXFxcIj5bTGlua2VkaW5dKGh0dHA6Ly93d3cubGlua2VkaW4uY29tL3Byb2ZpbGUvdmlldz9pZD0xNjAxNzcxNTkpPC9hPlxcbiogPGEgaHJlZj1cXFwic2t5cGU6Ly90YWRldXphZ2FsbG9cXFwiIGFsdD1cXFwiTGlua2VkaW5cXFwiPltTa3lwZV0oc2t5cGU6Ly90YWRldXphZ2FsbG8pPC9hPlxcblwiLFxuICAgICAgICAgICAgICBcInR5cGVcIjogXCJmXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcInByb2plY3RzLm1kXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTUtMDQtMjZUMjE6MjE6NTkuMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNS0wNC0yNlQyMToyMTo1OS4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcIkZvciBub3cgeW91IGNhbiBoYXZlIGEgbG9vayBhdCB0aGlzIG9uZSEgOilcXG4oVGhhdCdzIHdoYXQgSSdtIGRvaW5nKVxcblwiLFxuICAgICAgICAgICAgICBcInR5cGVcIjogXCJmXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcInJlYWRtZS5tZFwiOiB7XG4gICAgICAgICAgICAgIFwibXRpbWVcIjogXCIyMDE1LTA0LTI2VDIxOjIxOjU5LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjdGltZVwiOiBcIjIwMTUtMDQtMjZUMjE6MjE6NTkuMDAwWlwiLFxuICAgICAgICAgICAgICBcImNvbnRlbnRcIjogXCJmb28gYmFyIGJhelxcblwiLFxuICAgICAgICAgICAgICBcInR5cGVcIjogXCJmXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcInJlc3VtZS5tZFwiOiB7XG4gICAgICAgICAgICAgIFwibXRpbWVcIjogXCIyMDE1LTA0LTI2VDIxOjIxOjU5LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjdGltZVwiOiBcIjIwMTUtMDQtMjZUMjE6MjE6NTkuMDAwWlwiLFxuICAgICAgICAgICAgICBcImNvbnRlbnRcIjogXCIjIFRhZGV1IFphZ2FsbG8gZGEgU2lsdmFcXG4tLS1cXG5cXG4jIyBQcm9maWxlXFxuLS0tIFxcbiAgSSBhbSBwYXNzaW9uYXRlIGZvciBhbGwga2luZHMgb2YgZGV2ZWxvcG1lbnQsIGxvdmUgdG8gbGVhcm4gbmV3IGxhbmd1YWdlcyBhbmQgcGFyYWRpZ21zLCBhbHdheXMgcmVhZHkgZm9yIGEgZ29vZCBjaGFsbGVuZ2UuXFxuICBJIGFsc28gbGlrZSBNYXRoLCBHYW1lIGRldmVsb3BtZW50IGFuZCB3aGVuIHBvc3NpYmxlIGNvbnRyaWJ1dGUgdG8gb3BlbiBzb3VyY2UgcHJvamVjdHMuXFxuXFxuIyMgR2VuZXJhbCBJbmZvcm1hdGlvblxcbi0tLVxcbiAgKiBFbWFpbDogdGFkZXV6YWdhbGxvQGdtYWlsLmNvbVxcbiAgKiBQaG9uZTogKzU1IDMyIDg4NjMgMzY4NFxcbiAgKiBTa3lwZTogdGFkZXV6YWdhbGxvXFxuICAqIEdpdGh1YjogZ2l0aHViLmNvbS90YWRldXphZ2FsbG9cXG4gICogTG9jYXRpb246IEp1aXogZGUgRm9yYS9NRywgQnJhemlsXFxuXFxuIyMgRWR1Y2F0aW9uYWwgQmFja2dyb3VuZFxcbi0tLVxcblxcbiAgKiBXZWIgRGV2ZWxvcG1lbnQgYXQgSW5zdGl0dXRvIFZpYW5uYSBKdW5pb3IsIDIwMTBcXG4gICogR2VuZXJhbCBFbmdsaXNoIGF0IFRoZSBDYXJseWxlIEluc3RpdHV0ZSwgMjAxMVxcblxcbiMgV29yayBFeHBlcmllbmNlXFxuLS0tXFxuXFxuICAqIDxpPippT1MgRGV2ZWxvcGVyKjwvaT4gYXQgPGk+KlFyYW5pbyo8L2k+IGZyb20gPGk+KkRlY2VtYmVyLCAyMDEzKjwvaT4gYW5kIDxpPipjdXJyZW50bHkgZW1wbG95ZWQqPC9pPlxcbiAgICAtIFFyYW5pbyBpcyBhIHN0YXJ0dXAgdGhhdCBncmV3IGluc2lkZSB0aGUgY29tcGFueSBJIHdvcmsgKGVNaW9sby5jb20pIGFuZCBJIHdhcyBpbnZpdGVkIHRvIGxlYWQgdGhlIGlPUyBkZXZlbG9wbWVudCB0ZWFtXFxuICAgICAgb24gYSBjb21wbGV0ZWx5IHJld3JpdGVuIHZlcnNpb24gb2YgdGhlIGFwcFxcblxcbiAgKiA8aT4qV2ViIGFuZCBNb2JpbGUgRGV2ZWxvcGVyKjwvaT4gYXQgPGk+KkJvbnV6KjwvaT4gZnJvbSA8aT4qRmVicnVhcnksIDIwMTMqPC9pPiBhbmQgPGk+KmN1cnJlbnRseSBlbXBsb3llZCo8L2k+XFxuICAgIC0gSSBzdGFydGVkIGRldmVsb3BpbmcgdGhlIGlPUyBhcHAgYXMgYSBmcmVlbGFuY2VyLCBhZnRlciB0aGUgYXBwIHdhcyBwdWJsaXNoZWQgSSB3YXMgaW52aXRlZCB0byBtYWludGFpbiB0aGUgUnVieSBvbiBSYWlsc1xcbiAgICAgIGFwaSBhbmQgd29yayBvbiB0aGUgQW5kcm9pZCB2ZXJzaW9uIG9mIHRoZSBhcHBcXG5cXG4gICogPGk+KldlYiBhbmQgTW9iaWxlIERldmVsb3Blcio8L2k+IGF0IDxpPiplTWlvbG8uY29tKjwvaT4gZnJvbSA8aT4qQXByaWwsIDIwMTMqPC9pPiBhbmQgPGk+KmN1cnJlbnRseSBlbXBsb3llZCo8L2k+XFxuICAgIC0gVGhlIGNvbXBhbnkganVzdCB3b3JrZWQgd2l0aCBQSFAsIHNvIEkgam9pbmVkIHdpdGggdGhlIGludGVudGlvbiBvZiBicmluZ2luZyBuZXcgdGVjaG5vbG9naWVzLiBXb3JrZWQgd2l0aCBQeXRob24sIFJ1YnksIGlPUyxcXG4gICAgICBBbmRyb2lkIGFuZCBIVE1MNSBhcHBsaWNhdGlvbnNcXG5cXG4gICogPGk+KmlPUyBEZXZlbG9wZXIqPC9pPiBhdCA8aT4qUHJvRG9jdG9yIFNvZnR3YXJlIEx0ZGEuKjwvaT4gZnJvbSA8aT4qSnVseSwgMjAxMio8L2k+IHVudGlsIDxpPipPY3RvYmVyLCAyMDEyKjwvaT5cXG4gICAgLSBCcmllZmx5IHdvcmtlZCB3aXRoIHRoZSBpT1MgdGVhbSBvbiB0aGUgZGV2ZWxvcG1lbnQgb2YgdGhlaXIgZmlyc3QgbW9iaWxlIHZlcnNpb24gb2YgdGhlaXIgbWFpbiBwcm9kdWN0LCBhIG1lZGljYWwgc29mdHdhcmVcXG5cXG4gICogPGk+KldlYiBEZXZlbG9wZXIqPC9pPiBhdCA8aT4qQXRvIEludGVyYXRpdm8qPC9pPiBmcm9tIDxpPipGZWJydWFyeSwgMjAxMio8L2k+IHVudGlsIDxpPipKdWx5LCAyMDEyKjwvaT5cXG4gICAgLSBNb3N0IG9mIHRoZSB3b3JrIHdhcyB3aXRoIFBIUCBhbmQgTXlTUUwsIGFsc28gd29ya2luZyB3aXRoIEphdmFTY3JpcHQgb24gdGhlIGNsaWVudCBzaWRlLiBXb3JrZWQgd2l0aCBNU1NRTFxcbiAgICAgIGFuZCBPcmFjbGUgZGF0YWJhc2VzIGFzIHdlbGxcXG5cXG4gICogPGk+KldlYiBEZXZlbG9wZXIqPC9pPiBhdCA8aT4qTWFyaWEgRnVtYWPMp2EgQ3JpYWPMp2/Mg2VzKjwvaT4gZnJvbSA8aT4qT2N0b2JlciwgMjAxMCo8L2k+IHVudGlsIDxpPipKdW5lLCAyMDExKjwvaT5cXG4gICAgLSBJIHdvcmtlZCBtb3N0bHkgd2l0aCBQSFAgYW5kIE15U1FMLCBhbHNvIG1ha2luZyB0aGUgZnJvbnQgZW5kIHdpdGggSFRNTCBhbmQgQ1NTIGFuZCBtb3N0IGFuaW1hdGlvbnMgaW4gSmF2YVNjcmlwdCxcXG4gICAgICBhbHRob3VnaCBJIGFsc28gd29ya2VkIHdpdGggYSBmZXcgaW4gQVMzLiBCcmllZmx5IHdvcmtlZCB3aXRoIE1vbmdvREJcXG5cXG4jIyBBZGRpdGlvbmFsIEluZm9ybWF0aW9uXFxuLS0tXFxuXFxuKiBFeHBlcmllbmNlIHVuZGVyIExpbnV4IGFuZCBPUyBYIGVudmlyb25tZW50XFxuKiBTdHVkZW50IEV4Y2hhbmdlOiA2IG1vbnRocyBvZiByZXNpZGVuY2UgaW4gSXJlbGFuZFxcblxcbiMjIExhbmd1YWdlc1xcbi0tLVxcblxcbiogUG9ydHVndWVzZSDigJMgTmF0aXZlIFNwZWFrZXJcXG4qIEVuZ2xpc2gg4oCTIEZsdWVudCBMZXZlbFxcbiogU3BhbmlzaCDigJMgSW50ZXJtZWRpYXRlIExldmVsXFxuXFxuIyMgUHJvZ3JhbW1pbmcgbGFuZ3VhZ2VzIChvcmRlcmVkIGJ5IGtub3dsZWRnZSlcXG4tLS1cXG5cXG4qIEphdmFTY3JpcHRcXG4qIE9iamVjdGl2ZcKtQ1xcbiogQy9DKytcXG4qIFJ1Ynkgb24gUmFpbHNcXG4qIE5vZGVKU1xcbiogUEhQXFxuKiBKYXZhXFxuKiBQeXRob25cXG5cXG4jIyBBZGRpdGlvbmFsIHNraWxsc1xcbi0tLVxcblxcbiogSFRNTDUvQ1NTM1xcbiogTVZDXFxuKiBEZXNpZ24gUGF0dGVybnNcXG4qIFRERC9CRERcXG4qIEdpdFxcbiogQW5hbHlzaXMgYW5kIERlc2lnbiBvZiBBbGdvcml0aG1zXFxuXCIsXG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImZcIlxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiZFwiXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBcInR5cGVcIjogXCJkXCJcbiAgICB9LFxuICAgIFwidXNyXCI6IHtcbiAgICAgIFwibXRpbWVcIjogXCIyMDE1LTA0LTI2VDIxOjIxOjU5LjAwMFpcIixcbiAgICAgIFwiY3RpbWVcIjogXCIyMDE1LTA0LTI2VDIxOjIxOjU5LjAwMFpcIixcbiAgICAgIFwiY29udGVudFwiOiB7XG4gICAgICAgIFwiYmluXCI6IHtcbiAgICAgICAgICBcIm10aW1lXCI6IFwiMjAxNi0wNC0yN1QyMjo0OTo1MC4wMDBaXCIsXG4gICAgICAgICAgXCJjdGltZVwiOiBcIjIwMTYtMDQtMjdUMjI6NDk6NTAuMDAwWlwiLFxuICAgICAgICAgIFwiY29udGVudFwiOiB7XG4gICAgICAgICAgICBcImFsaWFzLmpzXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTYtMDQtMjdUMjE6MjQ6NDMuMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNi0wNC0yN1QyMToyNDo0My4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcImltcG9ydCBDb21tYW5kTWFuYWdlciBmcm9tICd6c2guanMvY29tbWFuZC1tYW5hZ2VyJztcXG5cXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAoYXJncywgc3RkaW4sIHN0ZG91dCwgc3RkZXJyLCBuZXh0KSB7XFxuICB2YXIgYnVmZmVyID0gJyc7XFxuICBpZiAoYXJncy5hcmd1bWVudHMubGVuZ3RoKSB7XFxuICAgIHZhciBrZXkgPSBhcmdzLmFyZ3VtZW50cy5zaGlmdCgpO1xcbiAgICB2YXIgaW5kZXg7XFxuICAgIGlmICh+KGluZGV4ID0ga2V5LmluZGV4T2YoJz0nKSkpIHtcXG4gICAgICB2YXIgY29tbWFuZDtcXG5cXG4gICAgICBpZiAoYXJncy5hcmd1bWVudHMubGVuZ3RoICYmIGluZGV4ID09PSBrZXkubGVuZ3RoIC0gMSkge1xcbiAgICAgICAgY29tbWFuZCA9IGFyZ3MuYXJndW1lbnRzLmpvaW4oJyAnKTtcXG4gICAgICB9IGVsc2Uge1xcbiAgICAgICAgY29tbWFuZCA9IGtleS5zdWJzdHIoaW5kZXggKyAxKTtcXG4gICAgICB9XFxuXFxuICAgICAga2V5ID0ga2V5LnN1YnN0cigwLCBpbmRleCk7XFxuXFxuICAgICAgaWYgKGNvbW1hbmQpIHtcXG4gICAgICAgIENvbW1hbmRNYW5hZ2VyLmFsaWFzKGtleSwgY29tbWFuZCk7XFxuICAgICAgfVxcbiAgICB9XFxuICB9IGVsc2Uge1xcbiAgICB2YXIgYWxpYXNlcyA9IENvbW1hbmRNYW5hZ2VyLmFsaWFzKCk7XFxuXFxuICAgIGZvciAodmFyIGkgaW4gYWxpYXNlcykge1xcbiAgICAgIGJ1ZmZlciArPSBpICsgJz1cXFxcJycgKyBhbGlhc2VzW2ldICsgJ1xcXFwnXFxcXG4nO1xcbiAgICB9XFxuICB9XFxuXFxuICBzdGRvdXQud3JpdGUoYnVmZmVyKTtcXG4gIG5leHQoKTtcXG59XFxuXCIsXG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImZcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiY2F0LmpzXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTYtMDQtMjdUMjE6MjU6MzIuMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNi0wNC0yN1QyMToyNTozMi4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcImltcG9ydCBGaWxlIGZyb20gJ3pzaC5qcy9maWxlJztcXG5pbXBvcnQgRlMgZnJvbSAnenNoLmpzL2ZzJztcXG5cXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAoYXJncywgc3RkaW4sIHN0ZG91dCwgc3RkZXJyLCBuZXh0KSB7XFxuICBhcmdzLmFyZ3VtZW50cy5mb3JFYWNoKGZ1bmN0aW9uIChwYXRoKSB7XFxuICAgIHZhciBmaWxlID0gRmlsZS5vcGVuKHBhdGgpO1xcblxcbiAgICBpZiAoIWZpbGUuZXhpc3RzKCkpIHtcXG4gICAgICBzdGRlcnIud3JpdGUoRlMubm90Rm91bmQoJ2NhdCcsIHBhdGgpKTtcXG4gICAgfSBlbHNlIGlmIChmaWxlLmlzRGlyKCkpIHtcXG4gICAgICBzdGRlcnIud3JpdGUoRlMuZXJyb3IoJ2NhdCcsIHBhdGgsICdJcyBhIGRpcmVjdG9yeScpKTtcXG4gICAgfSBlbHNlIHtcXG4gICAgICBzdGRvdXQud3JpdGUoZmlsZS5yZWFkKCkpO1xcbiAgICB9XFxuICB9KTtcXG5cXG4gIG5leHQoKTtcXG59XFxuXCIsXG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImZcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiY2QuanNcIjoge1xuICAgICAgICAgICAgICBcIm10aW1lXCI6IFwiMjAxNi0wNC0yN1QyMToyNTo0NC4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY3RpbWVcIjogXCIyMDE2LTA0LTI3VDIxOjI1OjQ0LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjb250ZW50XCI6IFwiaW1wb3J0IEZpbGUgZnJvbSAnenNoLmpzL2ZpbGUnO1xcbmltcG9ydCBGUyBmcm9tICd6c2guanMvZnMnO1xcblxcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIChhcmdzLCBzdGRpbiwgc3Rkb3V0LCBzdGRlcnIsIG5leHQpIHtcXG4gIHZhciBwYXRoID0gYXJncy5hcmd1bWVudHNbMF0gfHwgJ34nO1xcbiAgdmFyIGRpciA9IEZpbGUub3BlbihwYXRoKTtcXG5cXG4gIGlmICghZGlyLmV4aXN0cygpKSB7XFxuICAgIHN0ZGVyci53cml0ZShGUy5ub3RGb3VuZCgnY2QnLCBwYXRoKSk7XFxuICB9IGVsc2UgaWYgKGRpci5pc0ZpbGUoKSkge1xcbiAgICBzdGRlcnIud3JpdGUoRlMuZXJyb3IoJ2NkJywgcGF0aCwgJ0lzIGEgZmlsZScpKTtcXG4gIH0gZWxzZSB7XFxuICAgIEZTLmN1cnJlbnRQYXRoID0gZGlyLnBhdGg7XFxuICAgIEZTLmN1cnJlbnREaXIgPSBkaXIuc2VsZigpO1xcbiAgfVxcblxcbiAgRlMud3JpdGVGUygpO1xcbiAgbmV4dCgpO1xcbn1cXG5cIixcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiZlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJlY2hvLmpzXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTYtMDQtMjdUMjE6MjU6NTcuMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNi0wNC0yN1QyMToyNTo1Ny4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcImltcG9ydCBBcmdzUGFyc2VyIGZyb20gJ3pzaC5qcy9hcmdzLXBhcnNlcic7XFxuXFxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKGFyZ3MsIHN0ZGluLCBzdGRvdXQsIHN0ZGVyciwgbmV4dCkge1xcbiAgdHJ5IHtcXG4gICAgc3Rkb3V0LndyaXRlKEFyZ3NQYXJzZXIucGFyc2VTdHJpbmdzKGFyZ3MucmF3KS5qb2luKCcgJykpO1xcbiAgfSBjYXRjaCAoZXJyKSB7XFxuICAgIHN0ZGVyci53cml0ZSgnenNoOiAnICsgZXJyLm1lc3NhZ2UpO1xcbiAgfVxcblxcbiAgbmV4dCgpO1xcbn1cXG5cIixcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiZlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJoZWxwLmpzXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTYtMDQtMjdUMjI6MTA6MDIuMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNi0wNC0yN1QyMjoxMDowMi4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcImltcG9ydCBDb21tYW5kTWFuYWdlciBmcm9tICd6c2guanMvY29tbWFuZC1tYW5hZ2VyJztcXG5pbXBvcnQgRmlsZSBmcm9tICd6c2guanMvZmlsZSc7XFxuXFxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKGFyZ3MsIHN0ZGluLCBzdGRvdXQsIHN0ZGVyciwgbmV4dCkge1xcbiAgc3Rkb3V0LndyaXRlKCdyZWdpc3RlcmVkIGNvbW1hbmRzOicpO1xcbiAgaWYgKENvbW1hbmRNYW5hZ2VyLmNvbW1hbmRzKSB7XFxuICAgIHN0ZG91dC53cml0ZShPYmplY3Qua2V5cyhDb21tYW5kTWFuYWdlci5jb21tYW5kcykuam9pbignICcpKTtcXG4gIH1cXG5cXG4gIHN0ZG91dC53cml0ZSgnXFxcXG4nKTtcXG4gIHN0ZG91dC53cml0ZSgnZXhlY3V0YWJsZXMgKG9uIC91c3IvYmluKTonKTtcXG4gIHN0ZG91dC53cml0ZShPYmplY3Qua2V5cyhGaWxlLm9wZW4oJy91c3IvYmluJykucmVhZCgpKS5tYXAoZnVuY3Rpb24oZmlsZSkge1xcbiAgICByZXR1cm4gZmlsZS5yZXBsYWNlKC9cXFxcLmpzJC8sICcnKTtcXG4gIH0pLmpvaW4oJyAnKSk7XFxuXFxuICBzdGRvdXQud3JpdGUoJ1xcXFxuJyk7XFxuXFxuICBzdGRvdXQud3JpdGUoJ2FsaWFzZXM6Jyk7XFxuXFxuICBpZiAoQ29tbWFuZE1hbmFnZXIuYWxpYXNlcykge1xcbiAgICBjb25zdCBpdCA9IChrZXkpID0+IGAke2tleX09XFxcIiR7Q29tbWFuZE1hbmFnZXIuYWxpYXNlc1trZXldfVxcXCJgO1xcbiAgICBzdGRvdXQud3JpdGUoT2JqZWN0LmtleXMoQ29tbWFuZE1hbmFnZXIuYWxpYXNlcykubWFwKGl0KS5qb2luKCcgJykpO1xcbiAgfVxcblxcbiAgbmV4dCgpO1xcbn1cXG5cIixcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiZlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJscy5qc1wiOiB7XG4gICAgICAgICAgICAgIFwibXRpbWVcIjogXCIyMDE2LTA0LTI3VDIxOjI2OjE2LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjdGltZVwiOiBcIjIwMTYtMDQtMjdUMjE6MjY6MTYuMDAwWlwiLFxuICAgICAgICAgICAgICBcImNvbnRlbnRcIjogXCJpbXBvcnQgRmlsZSBmcm9tICd6c2guanMvZmlsZSc7XFxuaW1wb3J0IEZTIGZyb20gJ3pzaC5qcy9mcyc7XFxuXFxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKGFyZ3MsIHN0ZGluLCBzdGRvdXQsIHN0ZGVyciwgbmV4dCkge1xcbiAgaWYgKCFhcmdzLmFyZ3VtZW50cy5sZW5ndGgpIHtcXG4gICAgYXJncy5hcmd1bWVudHMucHVzaCgnLicpO1xcbiAgfVxcblxcbiAgYXJncy5hcmd1bWVudHMuZm9yRWFjaChmdW5jdGlvbiAoYXJnKSB7XFxuICAgIHZhciBkaXIgPSBGaWxlLm9wZW4oYXJnKTtcXG5cXG4gICAgaWYgKCFkaXIuZXhpc3RzKCkpIHtcXG4gICAgICBzdGRlcnIud3JpdGUoRlMubm90Rm91bmQoJ2xzJywgYXJnKSk7XFxuICAgIH0gZWxzZSBpZiAoZGlyLmlzRmlsZSgpKSB7XFxuICAgICAgc3RkZXJyLndyaXRlKEZTLmVycm9yKCdscycsIGFyZywgJ0lzIGEgZmlsZScpKTtcXG4gICAgfSBlbHNlIHtcXG4gICAgICB2YXIgZmlsZXMgPSBPYmplY3Qua2V5cyhkaXIucmVhZCgpKTtcXG5cXG4gICAgICBpZiAoIWFyZ3Mub3B0aW9ucy5hKSB7XFxuICAgICAgICBmaWxlcyA9IGZpbGVzLmZpbHRlcihmdW5jdGlvbiAoZmlsZSkge1xcbiAgICAgICAgICByZXR1cm4gZmlsZVswXSAhPT0gJy4nO1xcbiAgICAgICAgfSk7XFxuICAgICAgfVxcblxcbiAgICAgIGlmIChhcmdzLmFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XFxuICAgICAgICBzdGRvdXQud3JpdGUoYXJnICsgJzonKTtcXG4gICAgICB9XFxuXFxuICAgICAgaWYgKGFyZ3Mub3B0aW9ucy5sKSB7XFxuICAgICAgICBmaWxlcyA9IGZpbGVzLm1hcChmdW5jdGlvbiAobmFtZSkge1xcbiAgICAgICAgICB2YXIgZmlsZSA9IGRpci5vcGVuKG5hbWUpO1xcbiAgICAgICAgICB2YXIgdHlwZSA9IGZpbGUuaXNEaXIoKSA/ICdkJyA6ICctJztcXG4gICAgICAgICAgdmFyIHBlcm1zID0gdHlwZSArICdydy1yLS1yLS0nO1xcblxcbiAgICAgICAgICByZXR1cm4gcGVybXMgKyAnIGd1ZXN0IGd1ZXN0ICcgKyBmaWxlLmxlbmd0aCgpICsgJyAnICsgZmlsZS5tdGltZSgpICsgJyAnICsgbmFtZTtcXG4gICAgICAgIH0pO1xcbiAgICAgIH1cXG5cXG4gICAgICBzdGRvdXQud3JpdGUoZmlsZXMuam9pbihhcmdzLm9wdGlvbnMubCA/ICdcXFxcbicgOiAnICcpKTtcXG4gICAgfVxcbiAgfSk7XFxuXFxuICBuZXh0KCk7XFxufTtcXG5cIixcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiZlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJta2Rpci5qc1wiOiB7XG4gICAgICAgICAgICAgIFwibXRpbWVcIjogXCIyMDE2LTA0LTI3VDIxOjI2OjIwLjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjdGltZVwiOiBcIjIwMTYtMDQtMjdUMjE6MjY6MjAuMDAwWlwiLFxuICAgICAgICAgICAgICBcImNvbnRlbnRcIjogXCJpbXBvcnQgRmlsZSBmcm9tICd6c2guanMvZmlsZSc7XFxuaW1wb3J0IEZTIGZyb20gJ3pzaC5qcy9mcyc7XFxuXFxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKGFyZ3MsIHN0ZGluLCBzdGRvdXQsIHN0ZGVyciwgbmV4dCkge1xcbiAgYXJncy5hcmd1bWVudHMuZm9yRWFjaChmdW5jdGlvbiAocGF0aCkge1xcbiAgICB2YXIgZmlsZSA9IEZpbGUub3BlbihwYXRoKTtcXG5cXG4gICAgaWYgKCFmaWxlLnBhcmVudEV4aXN0cygpKSB7XFxuICAgICAgc3RkZXJyLndyaXRlKEZTLm5vdEZvdW5kKCdta2RpcicsIHBhdGgpKTtcXG4gICAgfSBlbHNlIGlmICghZmlsZS5pc1ZhbGlkKCkpIHtcXG4gICAgICBzdGRlcnIud3JpdGUoRlMuZXJyb3IoJ21rZGlyJywgcGF0aCwgJ05vdCBhIGRpcmVjdG9yeScpKTtcXG4gICAgfSBlbHNlIGlmIChmaWxlLmV4aXN0cygpKSB7XFxuICAgICAgc3RkZXJyLndyaXRlKEZTLmVycm9yKCdta2RpcicsIHBhdGgsICdGaWxlIGV4aXN0cycpKTtcXG4gICAgfSBlbHNlIHtcXG4gICAgICBmaWxlLmNyZWF0ZUZvbGRlcigpO1xcbiAgICB9XFxuICB9KTtcXG5cXG4gIEZTLndyaXRlRlMoKTtcXG4gIG5leHQoKTtcXG59XFxuXCIsXG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImZcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwibXYuanNcIjoge1xuICAgICAgICAgICAgICBcIm10aW1lXCI6IFwiMjAxNi0wNC0yN1QyMjo0OTo1MC4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY3RpbWVcIjogXCIyMDE2LTA0LTI3VDIyOjQ5OjUwLjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjb250ZW50XCI6IFwiaW1wb3J0IEZpbGUgZnJvbSAnenNoLmpzL2ZpbGUnO1xcbmltcG9ydCBGUyBmcm9tICd6c2guanMvZnMnO1xcblxcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIChhcmdzLCBzdGRpbiwgc3Rkb3V0LCBzdGRlcnIsIG5leHQpIHtcXG4gIHZhciB0YXJnZXRQYXRoID0gYXJncy5hcmd1bWVudHMucG9wKCk7XFxuICB2YXIgc291cmNlUGF0aHMgPSBhcmdzLmFyZ3VtZW50cztcXG4gIHZhciB0YXJnZXQgPSBGaWxlLm9wZW4odGFyZ2V0UGF0aCk7XFxuXFxuICBpZiAoIXRhcmdldFBhdGggfHxcXG4gICAgICAhc291cmNlUGF0aHMubGVuZ3RoIHx8XFxuICAgICAgICAoc291cmNlUGF0aHMubGVuZ3RoID4gMSAmJlxcbiAgICAgICAgICghdGFyZ2V0LmV4aXN0cygpIHx8IHRhcmdldC5pc0ZpbGUoKSlcXG4gICAgICAgIClcXG4gICAgICkge1xcbiAgICBzdGRlcnIud3JpdGUoJ3VzYWdlOiBtdiBzb3VyY2UgdGFyZ2V0XFxcXG4gXFxcXHQgbXYgc291cmNlIC4uLiBkaXJlY3RvcnknKTtcXG4gIH0gZWxzZSBpZiAoIXRhcmdldC5wYXJlbnRFeGlzdHMoKSkge1xcbiAgICAgIHN0ZGVyci53cml0ZShGUy5ub3RGb3VuZCgnbXYnLCB0YXJnZXQuZGlybmFtZSkpO1xcbiAgfSBlbHNlIHtcXG4gICAgdmFyIGJhY2t1cCA9IHRhcmdldC5zZWxmKCk7XFxuICAgIHZhciBvayA9IHNvdXJjZVBhdGhzLnJlZHVjZShmdW5jdGlvbiAoc3VjY2Vzcywgc291cmNlUGF0aCkge1xcbiAgICAgIGlmIChzdWNjZXNzKSB7XFxuICAgICAgICB2YXIgc291cmNlID0gRmlsZS5vcGVuKHNvdXJjZVBhdGgpO1xcblxcbiAgICAgICAgaWYgKCFzb3VyY2UuZXhpc3RzKCkpIHtcXG4gICAgICAgICAgc3RkZXJyLndyaXRlKEZTLm5vdEZvdW5kKCdtdicsIHNvdXJjZVBhdGhzWzBdKSk7XFxuICAgICAgICB9IGVsc2UgaWYgKHNvdXJjZS5pc0RpcigpICYmIHRhcmdldC5pc0ZpbGUoKSkge1xcbiAgICAgICAgICBzdGRlcnIud3JpdGUoRlMuZXJyb3IoJ212JywgJ3JlbmFtZSAnICsgc291cmNlUGF0aHNbMF0gKyAnIHRvICcgKyB0YXJnZXRQYXRoLCAnTm90IGEgZGlyZWN0b3J5JykpO1xcbiAgICAgICAgfSBlbHNlIHtcXG4gICAgICAgICAgaWYgKHRhcmdldC5pc0RpcigpKSB7XFxuICAgICAgICAgICAgdGFyZ2V0LnJlYWQoKVtzb3VyY2UuZmlsZW5hbWVdID0gc291cmNlLnNlbGYoKTtcXG4gICAgICAgICAgfSBlbHNlIGlmIChzb3VyY2UuaXNGaWxlKCkpIHtcXG4gICAgICAgICAgICB0YXJnZXQud3JpdGUoc291cmNlLnJlYWQoKSwgZmFsc2UsIHRydWUpO1xcbiAgICAgICAgICB9IGVsc2Uge1xcbiAgICAgICAgICAgIGNvbnNvbGUuYXNzZXJ0KCF0YXJnZXQuZXhpc3RzKCkpO1xcbiAgICAgICAgICAgIHRhcmdldC5kaXIuY29udGVudFt0YXJnZXQuZmlsZW5hbWVdID0gc291cmNlLnNlbGYoKTtcXG4gICAgICAgICAgfVxcblxcbiAgICAgICAgICBzb3VyY2UuZGVsZXRlKCk7XFxuICAgICAgICAgIHJldHVybiB0cnVlO1xcbiAgICAgICAgfVxcbiAgICAgIH1cXG5cXG4gICAgICByZXR1cm4gZmFsc2U7XFxuICAgIH0sIHRydWUpO1xcblxcbiAgICBpZiAob2spIHtcXG4gICAgICBGUy53cml0ZUZTKCk7XFxuICAgIH0gZWxzZSB7XFxuICAgICAgdGFyZ2V0LmRpclt0YXJnZXQuZmlsZW5hbWVdID0gYmFja3VwO1xcbiAgICB9XFxuICB9XFxuXFxuICBuZXh0KCk7XFxufVxcblwiLFxuICAgICAgICAgICAgICBcInR5cGVcIjogXCJmXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcInB3ZC5qc1wiOiB7XG4gICAgICAgICAgICAgIFwibXRpbWVcIjogXCIyMDE2LTA0LTI3VDIxOjI2OjI5LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjdGltZVwiOiBcIjIwMTYtMDQtMjdUMjE6MjY6MjkuMDAwWlwiLFxuICAgICAgICAgICAgICBcImNvbnRlbnRcIjogXCJpbXBvcnQgRlMgZnJvbSAnenNoLmpzL2ZzJztcXG5cXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAoYXJncywgc3RkaW4sIHN0ZG91dCwgc3RkZXJyLCBuZXh0KSB7XFxuICB2YXIgcHdkID0gRlMuY3VycmVudFBhdGg7XFxuXFxuICBpZiAoc3Rkb3V0KSB7XFxuICAgIHN0ZG91dC53cml0ZShwd2QpO1xcbiAgICBuZXh0KCk7XFxuICB9IGVsc2Uge1xcbiAgICByZXR1cm4gcHdkO1xcbiAgfVxcbn1cXG5cIixcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiZlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJybS5qc1wiOiB7XG4gICAgICAgICAgICAgIFwibXRpbWVcIjogXCIyMDE2LTA0LTI3VDIxOjI2OjMzLjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjdGltZVwiOiBcIjIwMTYtMDQtMjdUMjE6MjY6MzMuMDAwWlwiLFxuICAgICAgICAgICAgICBcImNvbnRlbnRcIjogXCJpbXBvcnQgRmlsZSBmcm9tICd6c2guanMvZmlsZSc7XFxuaW1wb3J0IEZTIGZyb20gJ3pzaC5qcy9mcyc7XFxuXFxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKGFyZ3MsIHN0ZGluLCBzdGRvdXQsIHN0ZGVyciwgbmV4dCkge1xcbiAgYXJncy5hcmd1bWVudHMuZm9yRWFjaChmdW5jdGlvbiAoYXJnKSB7XFxuICAgIHZhciBmaWxlID0gRmlsZS5vcGVuKGFyZyk7XFxuXFxuICAgIGlmICghZmlsZS5leGlzdHMoKSkge1xcbiAgICAgIHN0ZGVyci53cml0ZShGUy5ub3RGb3VuZCgncm0nLCBhcmcpKTtcXG4gICAgfSBlbHNlIGlmICghZmlsZS5pc1ZhbGlkKCkpIHtcXG4gICAgICBzdGRlcnIud3JpdGUoRlMuZXJyb3IoJ3JtJywgYXJnLCAnTm90IGEgZGlyZWN0b3J5JykpO1xcbiAgICB9IGVsc2UgaWYgKGZpbGUuaXNEaXIoKSkge1xcbiAgICAgIHN0ZGVyci53cml0ZShGUy5lcnJvcigncm0nLCBhcmcsICdpcyBhIGRpcmVjdG9yeScpKTtcXG4gICAgfSBlbHNlIHtcXG4gICAgICBmaWxlLmRlbGV0ZSgpO1xcbiAgICB9XFxuICB9KTtcXG5cXG4gIEZTLndyaXRlRlMoKTtcXG4gIG5leHQoKTtcXG59XFxuXCIsXG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImZcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwicm1kaXIuanNcIjoge1xuICAgICAgICAgICAgICBcIm10aW1lXCI6IFwiMjAxNi0wNC0yN1QyMToyNjozOC4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY3RpbWVcIjogXCIyMDE2LTA0LTI3VDIxOjI2OjM4LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjb250ZW50XCI6IFwiaW1wb3J0IEZpbGUgZnJvbSAnenNoLmpzL2ZpbGUnO1xcbmltcG9ydCBGUyBmcm9tICd6c2guanMvZnMnO1xcblxcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIChhcmdzLCBzdGRpbiwgc3Rkb3V0LCBzdGRlcnIsIG5leHQpIHtcXG4gIGFyZ3MuYXJndW1lbnRzLmZvckVhY2goZnVuY3Rpb24gKGFyZykge1xcbiAgICB2YXIgZmlsZSA9IEZpbGUub3BlbihhcmcpO1xcblxcbiAgICBpZiAoIWZpbGUucGFyZW50RXhpc3RzKCkgfHwgIWZpbGUuZXhpc3RzKCkpIHtcXG4gICAgICBzdGRlcnIud3JpdGUoRlMubm90Rm91bmQoJ3JtZGlyJywgYXJnKSk7XFxuICAgIH0gZWxzZSBpZiAoIWZpbGUuaXNEaXIoKSkge1xcbiAgICAgIHN0ZGVyci53cml0ZShGUy5lcnJvcigncm1kaXInLCBhcmcsICdOb3QgYSBkaXJlY3RvcnknKSk7XFxuICAgIH0gZWxzZSB7XFxuICAgICAgZmlsZS5kZWxldGUoKTtcXG4gICAgfVxcbiAgfSk7XFxuXFxuICBGUy53cml0ZUZTKCk7XFxuICBuZXh0KCk7XFxufVxcblwiLFxuICAgICAgICAgICAgICBcInR5cGVcIjogXCJmXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcInNvdXJjZS5qc1wiOiB7XG4gICAgICAgICAgICAgIFwibXRpbWVcIjogXCIyMDE2LTA0LTI3VDIxOjI2OjQ0LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjdGltZVwiOiBcIjIwMTYtMDQtMjdUMjE6MjY6NDQuMDAwWlwiLFxuICAgICAgICAgICAgICBcImNvbnRlbnRcIjogXCIvKmVzbGludCBuby1ldmFsOiAwKi9cXG5pbXBvcnQgQ29uc29sZSBmcm9tICd6c2guanMvY29uc29sZSc7XFxuaW1wb3J0IEZpbGUgZnJvbSAnenNoLmpzL2ZpbGUnO1xcblxcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIChhcmdzLCBzdGRpbiwgc3Rkb3V0LCBzdGRlcnIsIG5leHQpIHtcXG4gIGlmIChhcmdzLmFyZ3VtZW50cy5sZW5ndGgpIHtcXG4gICAgdmFyIGZpbGUgPSBGaWxlLm9wZW4oYXJncy5hcmd1bWVudHNbMF0pO1xcbiAgICBpZiAoIWZpbGUuZXhpc3RzKCkpIHtcXG4gICAgICBzdGRlcnIud3JpdGUoJ3NvdXJjZTogbm8gc3VjaCBmaWxlIG9yIGRpcmVjdG9yeTogJyArIGZpbGUucGF0aCk7XFxuICAgIH0gZWxzZSB7XFxuICAgICAgdHJ5IHtcXG4gICAgICAgIHZhciBjb25zb2xlID0gbmV3IENvbnNvbGUoc3Rkb3V0LCBzdGRlcnIpOyAvLyBqc2hpbnQgaWdub3JlOiBsaW5lXFxuICAgICAgICB2YXIgcmVzdWx0ID0gSlNPTi5zdHJpbmdpZnkoZXZhbChmaWxlLnJlYWQoKSkpO1xcbiAgICAgICAgc3Rkb3V0LndyaXRlKCc8LSAnICsgcmVzdWx0KTtcXG4gICAgICB9IGNhdGNoIChlcnIpIHtcXG4gICAgICAgIHN0ZGVyci53cml0ZShlcnIuc3RhY2spO1xcbiAgICAgIH1cXG4gICAgfVxcbiAgfSBlbHNlIHtcXG4gICAgc3RkZXJyLndyaXRlKCdzb3VyY2U6IG5vdCBlbm91Z2ggYXJndW1lbnRzJyk7XFxuICB9XFxuXFxuICBuZXh0KCk7XFxufVxcblwiLFxuICAgICAgICAgICAgICBcInR5cGVcIjogXCJmXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcInRvdWNoLmpzXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTYtMDQtMjdUMjE6MjY6NTMuMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNi0wNC0yN1QyMToyNjo1My4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcImltcG9ydCBGaWxlIGZyb20gJ3pzaC5qcy9maWxlJztcXG5pbXBvcnQgRlMgZnJvbSAnenNoLmpzL2ZzJztcXG5cXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAoYXJncywgc3RkaW4sIHN0ZG91dCwgc3RkZXJyLCBuZXh0KSB7XFxuICBhcmdzLmFyZ3VtZW50cy5mb3JFYWNoKGZ1bmN0aW9uIChwYXRoKSB7XFxuICAgIHZhciBmaWxlID0gRmlsZS5vcGVuKHBhdGgpO1xcblxcbiAgICBpZiAoIWZpbGUucGFyZW50RXhpc3RzKCkpIHtcXG4gICAgICBzdGRlcnIud3JpdGUoRlMubm90Rm91bmQoJ3RvdWNoJywgcGF0aCkpO1xcbiAgICB9IGVsc2UgaWYgKCFmaWxlLmlzVmFsaWQoKSl7XFxuICAgICAgc3RkZXJyLndyaXRlKEZTLmVycm9yKCd0b3VjaCcsIHBhdGgsICdOb3QgYSBkaXJlY3RvcnknKSk7XFxuICAgIH0gZWxzZSB7XFxuICAgICAgZmlsZS53cml0ZSgnJywgdHJ1ZSwgdHJ1ZSk7XFxuICAgIH1cXG4gIH0pO1xcblxcbiAgRlMud3JpdGVGUygpO1xcbiAgbmV4dCgpO1xcbn1cXG5cIixcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiZlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJ1bmFsaWFzLmpzXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTYtMDQtMjdUMjE6MjY6NTguMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNi0wNC0yN1QyMToyNjo1OC4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcImltcG9ydCBDb21tYW5kTWFuYWdlciBmcm9tICd6c2guanMvY29tbWFuZC1tYW5hZ2VyJztcXG5cXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAoYXJncywgc3RkaW4sIHN0ZG91dCwgc3RkZXJyLCBuZXh0KSB7XFxuICB2YXIgY21kID0gYXJncy5hcmd1bWVudHNbMF07XFxuXFxuICBpZiAoY21kKSB7XFxuICAgIENvbW1hbmRNYW5hZ2VyLnVuYWxpYXMoY21kKTtcXG4gIH1cXG5cXG4gIG5leHQoKTtcXG59XFxuXCIsXG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImZcIlxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiZFwiXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBcInR5cGVcIjogXCJkXCJcbiAgICB9XG4gIH0sXG4gIFwidHlwZVwiOiBcImRcIlxufSIsImltcG9ydCBGUyBmcm9tICcuL2ZzJztcblxuY29uc3QgTU9OVEhTID0gWydKYW4nLCAnRmViJywgJ01hcicsICdBcHInLCAnTWF5JywgJ0p1bicsICdKdWwnLCAnQXVnJywgJ1NlcCcsICdPY3QnLCAnTm92JywgJ0RlYyddO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBGaWxlIHtcbiAgY29uc3RydWN0b3IocGF0aCkge1xuICAgIHRoaXMucGF0aCA9IEZTLnRyYW5zbGF0ZVBhdGgocGF0aCk7XG4gICAgcGF0aCA9IHRoaXMucGF0aC5zcGxpdCgnLycpO1xuICAgIHRoaXMuZmlsZW5hbWUgPSBwYXRoLnBvcCgpO1xuICAgIHRoaXMuZGlybmFtZSA9IHBhdGguam9pbignLycpIHx8ICcvJztcbiAgICB0aGlzLmRpciA9IEZTLm9wZW4odGhpcy5kaXJuYW1lKTtcbiAgfVxuXG4gIHN0YXRpYyBvcGVuKHBhdGgpIHtcbiAgICByZXR1cm4gbmV3IEZpbGUocGF0aCk7XG4gIH1cblxuICBzdGF0aWMgZ2V0VGltZXN0YW1wICgpIHtcbiAgICByZXR1cm4gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuICB9XG5cbiAgcGFyZW50RXhpc3RzKCkge1xuICAgIHJldHVybiB0aGlzLmRpciAhPT0gdW5kZWZpbmVkO1xuICB9XG5cbiAgaXNWYWxpZCgpIHtcbiAgICByZXR1cm4gdHlwZW9mIHRoaXMuZGlyID09PSAnb2JqZWN0JyAmJiB0aGlzLmRpci50eXBlID09PSAnZCc7XG4gIH1cblxuICBleGlzdHMoKSB7XG4gICAgcmV0dXJuIHRoaXMuaXNWYWxpZCgpICYmICghdGhpcy5maWxlbmFtZSB8fCB0eXBlb2YgdGhpcy5kaXIuY29udGVudFt0aGlzLmZpbGVuYW1lXSAhPT0gJ3VuZGVmaW5lZCcpO1xuICB9XG5cbiAgaXNGaWxlKCkge1xuICAgIHJldHVybiB0aGlzLmV4aXN0cygpICYmIHRoaXMuZmlsZW5hbWUgJiZcbiAgICAgIHRoaXMuZGlyLmNvbnRlbnRbdGhpcy5maWxlbmFtZV0udHlwZSA9PT0gJ2YnO1xuICB9XG5cbiAgaXNEaXIoKSB7XG4gICAgcmV0dXJuIHRoaXMuZXhpc3RzKCkgJiZcbiAgICAgICghdGhpcy5maWxlbmFtZSB8fCB0aGlzLmRpci5jb250ZW50W3RoaXMuZmlsZW5hbWVdLnR5cGUgPT09ICdkJyk7XG4gIH1cblxuICBkZWxldGUoKSB7XG4gICAgaWYgKHRoaXMuZXhpc3RzKCkpIHtcbiAgICAgIGRlbGV0ZSB0aGlzLmRpci5jb250ZW50W3RoaXMuZmlsZW5hbWVdO1xuICAgICAgRlMud3JpdGVGUygpO1xuICAgIH1cbiAgfVxuXG4gIGNsZWFyKCkge1xuICAgIHRoaXMud3JpdGUoJycsIGZhbHNlLCB0cnVlKTtcbiAgfVxuXG4gIHdyaXRlKGNvbnRlbnQsIGFwcGVuZCwgZm9yY2UpIHtcbiAgICB2YXIgdGltZSA9IEZpbGUuZ2V0VGltZXN0YW1wKCk7XG5cbiAgICBpZiAoIXRoaXMuZXhpc3RzKCkpIHtcbiAgICAgIGlmIChmb3JjZSAmJiB0aGlzLmlzVmFsaWQoKSkge1xuICAgICAgICB0aGlzLmNyZWF0ZUZpbGUodGltZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgZmlsZTogJyArIHRoaXMucGF0aCk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICghdGhpcy5pc0ZpbGUoKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYW5ub3Qgd3JpdGUgdG8gZGlyZWN0b3J5OiAlcycsIHRoaXMucGF0aCk7XG4gICAgfVxuXG4gICAgdmFyIF9jb250ZW50ID0gJyc7XG4gICAgaWYgKGFwcGVuZCkge1xuICAgICAgX2NvbnRlbnQgKz0gdGhpcy5yZWFkKCk7XG4gICAgfVxuXG4gICAgdGhpcy5kaXIubXRpbWUgPSB0aW1lO1xuICAgIHRoaXMuZGlyLmNvbnRlbnRbdGhpcy5maWxlbmFtZV0ubXRpbWUgPSB0aW1lO1xuICAgIHRoaXMuZGlyLmNvbnRlbnRbdGhpcy5maWxlbmFtZV0uY29udGVudCA9IF9jb250ZW50ICsgY29udGVudDtcbiAgICBGUy53cml0ZUZTKCk7XG4gIH1cblxuICByZWFkKCkge1xuICAgIGlmICghdGhpcy5leGlzdHMoKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdGaWxlICVzIGRvZXNuXFwndCBleGlzdCcsIHRoaXMucGF0aCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmZpbGVuYW1lID8gdGhpcy5kaXIuY29udGVudFt0aGlzLmZpbGVuYW1lXS5jb250ZW50IDogdGhpcy5kaXIuY29udGVudDtcbiAgfVxuXG4gIF9jcmVhdGUodHlwZSwgY29udGVudCwgdGltZXN0YW1wKSB7XG4gICAgaWYgKHRoaXMuZXhpc3RzKCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignRmlsZSAlcyBhbHJlYWR5IGV4aXN0cycsIHRoaXMucGF0aCk7XG4gICAgfVxuXG4gICAgaWYgKCF0aW1lc3RhbXApIHtcbiAgICAgIHRpbWVzdGFtcCA9IEZpbGUuZ2V0VGltZXN0YW1wKCk7XG4gICAgfVxuXG4gICAgdGhpcy5kaXIuY29udGVudFt0aGlzLmZpbGVuYW1lXSA9IHtcbiAgICAgIGN0aW1lOiB0aW1lc3RhbXAsXG4gICAgICBtdGltZTogdGltZXN0YW1wLFxuICAgICAgY29udGVudDogY29udGVudCxcbiAgICAgIHR5cGU6IHR5cGVcbiAgICB9O1xuXG4gICAgRlMud3JpdGVGUygpO1xuICB9XG5cbiAgY3JlYXRlRm9sZGVyKHRpbWVzdGFtcCkge1xuICAgIHRoaXMuX2NyZWF0ZSgnZCcsIHt9LCB0aW1lc3RhbXApO1xuICB9XG5cbiAgY3JlYXRlRmlsZSh0aW1lc3RhbXApIHtcbiAgICB0aGlzLl9jcmVhdGUoJ2YnLCAnJywgdGltZXN0YW1wKTtcbiAgfVxuXG4gIHNlbGYoKSB7XG4gICAgcmV0dXJuIHRoaXMuZmlsZW5hbWUgPyB0aGlzLmRpci5jb250ZW50W3RoaXMuZmlsZW5hbWVdIDogdGhpcy5kaXI7XG4gIH1cblxuICBvcGVuKGZpbGUpIHtcbiAgICByZXR1cm4gRmlsZS5vcGVuKHRoaXMucGF0aCArICcvJyArIGZpbGUpO1xuICB9XG5cbiAgbGVuZ3RoKCkge1xuICAgIHZhciBjb250ZW50ID0gdGhpcy5yZWFkKCk7XG5cbiAgICBpZiAodGhpcy5pc0ZpbGUoKSkge1xuICAgICAgcmV0dXJuIGNvbnRlbnQubGVuZ3RoO1xuICAgIH0gZWxzZSBpZiAodGhpcy5pc0RpcigpKSB7XG4gICAgICByZXR1cm4gT2JqZWN0LmtleXMoY29udGVudCkubGVuZ3RoO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gMDtcbiAgICB9XG4gIH1cblxuICBtdGltZSgpIHtcbiAgICB2YXIgdCA9IG5ldyBEYXRlKHRoaXMuc2VsZigpLm10aW1lKTtcblxuICAgIHZhciBkYXlBbmRNb250aCA9IE1PTlRIU1t0LmdldE1vbnRoKCldICsgJyAnICsgdC5nZXREYXkoKTtcbiAgICBpZiAoRGF0ZS5ub3coKSAtIHQuZ2V0VGltZSgpID4gNiAqIDMwICogMjQgKiA2MCAqIDYwICogMTAwMCkge1xuICAgICAgcmV0dXJuIGRheUFuZE1vbnRoICsgJyAnICsgdC5nZXRGdWxsWWVhcigpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gZGF5QW5kTW9udGggKyAnICcgKyB0LmdldEhvdXJzKCkgKyAnOicgKyB0LmdldE1pbnV0ZXMoKTtcbiAgICB9XG4gIH07XG59XG4iLCJpbXBvcnQgTG9jYWxTdG9yYWdlIGZyb20gJy4vbG9jYWwtc3RvcmFnZSc7XG5cbnZhciBGUyA9IHt9O1xudmFyIEZJTEVfU1lTVEVNX0tFWSA9ICdmaWxlX3N5c3RlbSc7XG5cbkZTLndyaXRlRlMgPSBmdW5jdGlvbiAoKSB7XG4gIExvY2FsU3RvcmFnZS5zZXRJdGVtKEZJTEVfU1lTVEVNX0tFWSwgSlNPTi5zdHJpbmdpZnkoRlMucm9vdCkpO1xufTtcblxuXG5GUy5yb290ID0gSlNPTi5wYXJzZShMb2NhbFN0b3JhZ2UuZ2V0SXRlbShGSUxFX1NZU1RFTV9LRVkpKTtcbnZhciBmaWxlU3lzdGVtID0gcmVxdWlyZSgnLi9maWxlLXN5c3RlbS5qc29uJyk7XG52YXIgY29weSA9IGZ1bmN0aW9uIGNvcHkob2xkLCBubmV3KSB7XG4gIGZvciAodmFyIGtleSBpbiBubmV3KSB7XG4gICAgb2xkW2tleV0gPSBubmV3W2tleV07XG4gIH1cbn07XG5cbmlmICghRlMucm9vdCB8fCAhRlMucm9vdC5jb250ZW50KSB7XG4gIEZTLnJvb3QgPSBmaWxlU3lzdGVtO1xufSBlbHNlIHtcbiAgdmFyIHRpbWUgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG5cbiAgKGZ1bmN0aW9uIHJlYWRkaXIob2xkLCBubmV3KSB7XG4gICAgaWYgKHR5cGVvZiBvbGQuY29udGVudCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIGZvciAodmFyIGtleSBpbiBubmV3LmNvbnRlbnQpIHtcbiAgICAgICAgdmFyIG4gPSBubmV3LmNvbnRlbnRba2V5XTtcbiAgICAgICAgdmFyIG8gPSBvbGQuY29udGVudFtrZXldO1xuXG4gICAgICAgIGlmICghby5jb250ZW50KSB7XG4gICAgICAgICAgbyA9IHtcbiAgICAgICAgICAgIGN0aW1lOiB0aW1lLFxuICAgICAgICAgICAgbXRpbWU6IHRpbWUsXG4gICAgICAgICAgICBjb250ZW50OiBvLmNvbnRlbnQsXG4gICAgICAgICAgICB0eXBlOiB0eXBlb2YgbyA9PT0gJ3N0cmluZycgPyAnZicgOiAnZCdcbiAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG8udHlwZSA9PT0gJ2YnICYmIG8ubXRpbWUgPT09IG8uY3RpbWUpIHtcbiAgICAgICAgICBjb3B5KG8sIG4pO1xuICAgICAgICB9IGVsc2UgaWYgKG8udHlwZSA9PT0gJ2QnKSB7XG4gICAgICAgICAgcmVhZGRpcihvLCBuKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfSkoRlMucm9vdCwgZmlsZVN5c3RlbSk7XG5cbiAgRlMud3JpdGVGUygpO1xufVxuXG5GUy5jdXJyZW50UGF0aCA9IEZTLmhvbWUgPSAnL1VzZXJzL2d1ZXN0JztcbkZTLmN1cnJlbnREaXIgPSBGUy5yb290LmNvbnRlbnQuVXNlcnMuY29udGVudC5ndWVzdDtcblxuRlMuZGlybmFtZSA9IGZ1bmN0aW9uIChwYXRoKSB7XG4gIHJldHVybiBwYXRoLnNwbGl0KCcvJykuc2xpY2UoMCwgLTEpLmpvaW4oJy8nKTtcbn07XG5cbkZTLmJhc2VuYW1lID0gZnVuY3Rpb24gKHBhdGgpIHtcbiAgcmV0dXJuIHBhdGguc3BsaXQoJy8nKS5wb3AoKTtcbn07XG5cbkZTLnRyYW5zbGF0ZVBhdGggPSBmdW5jdGlvbiAocGF0aCkge1xuICB2YXIgaW5kZXg7XG5cbiAgcGF0aCA9IHBhdGgucmVwbGFjZSgnficsIEZTLmhvbWUpO1xuXG4gIGlmIChwYXRoWzBdICE9PSAnLycpIHtcbiAgICBwYXRoID0gKEZTLmN1cnJlbnRQYXRoICE9PSAnLycgPyBGUy5jdXJyZW50UGF0aCArICcvJyA6ICcvJykgKyBwYXRoO1xuICB9XG5cbiAgcGF0aCA9IHBhdGguc3BsaXQoJy8nKTtcblxuICB3aGlsZSh+KGluZGV4ID0gcGF0aC5pbmRleE9mKCcuLicpKSkge1xuICAgIHBhdGguc3BsaWNlKGluZGV4IC0gMSwgMik7XG4gIH1cblxuICB3aGlsZSh+KGluZGV4ID0gcGF0aC5pbmRleE9mKCcuJykpKSB7XG4gICAgcGF0aC5zcGxpY2UoaW5kZXgsIDEpO1xuICB9XG5cbiAgaWYgKHBhdGhbMF0gPT09ICcuJykge1xuICAgIHBhdGguc2hpZnQoKTtcbiAgfVxuXG4gIGlmIChwYXRoLmxlbmd0aCA8IDIpIHtcbiAgICBwYXRoID0gWywgLCBdO1xuICB9XG5cbiAgcmV0dXJuIHBhdGguam9pbignLycpLnJlcGxhY2UoLyhbXi9dKylcXC8rJC8sICckMScpO1xufTtcblxuRlMucmVhbHBhdGggPSBmdW5jdGlvbihwYXRoKSB7XG4gIHBhdGggPSBGUy50cmFuc2xhdGVQYXRoKHBhdGgpO1xuXG4gIHJldHVybiBGUy5leGlzdHMocGF0aCkgPyBwYXRoIDogbnVsbDtcbn07XG5cblxuRlMub3BlbiA9IGZ1bmN0aW9uIChwYXRoKSB7XG4gIGlmIChwYXRoWzBdICE9PSAnLycpIHtcbiAgICBwYXRoID0gRlMudHJhbnNsYXRlUGF0aChwYXRoKTtcbiAgfVxuXG4gIHBhdGggPSBwYXRoLnN1YnN0cigxKS5zcGxpdCgnLycpLmZpbHRlcihTdHJpbmcpO1xuXG4gIHZhciBjd2QgPSBGUy5yb290O1xuICB3aGlsZShwYXRoLmxlbmd0aCAmJiBjd2QuY29udGVudCkge1xuICAgIGN3ZCA9IGN3ZC5jb250ZW50W3BhdGguc2hpZnQoKV07XG4gIH1cblxuICByZXR1cm4gY3dkO1xufTtcblxuRlMuZXhpc3RzID0gZnVuY3Rpb24gKHBhdGgpIHtcbiAgcmV0dXJuICEhRlMub3BlbihwYXRoKTtcbn07XG5cbkZTLmVycm9yID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gW10uam9pbi5jYWxsKGFyZ3VtZW50cywgJzogJyk7XG59O1xuXG5GUy5ub3RGb3VuZCA9IGZ1bmN0aW9uIChjbWQsIGFyZykge1xuICByZXR1cm4gRlMuZXJyb3IoY21kLCBhcmcsICdObyBzdWNoIGZpbGUgb3IgZGlyZWN0b3J5Jyk7XG59O1xuXG5GUy5hdXRvY29tcGxldGUgPSBmdW5jdGlvbiAoX3BhdGgpIHtcbiAgdmFyIHBhdGggPSB0aGlzLnRyYW5zbGF0ZVBhdGgoX3BhdGgpO1xuICB2YXIgb3B0aW9ucyA9IFtdO1xuXG4gIGlmIChfcGF0aC5zbGljZSgtMSkgPT09ICcvJykge1xuICAgIHBhdGggKz0gJy8nO1xuICB9XG5cbiAgaWYgKHBhdGggIT09IHVuZGVmaW5lZCkge1xuICAgIHZhciBmaWxlbmFtZSA9IF9wYXRoLnNwbGl0KCcvJykucG9wKCk7XG4gICAgdmFyIG9wZW5QYXRoID0gZmlsZW5hbWUubGVuZ3RoID4gMSA/IHBhdGguc2xpY2UoMCwgLTEpIDogcGF0aDtcbiAgICB2YXIgZGlyID0gRlMub3BlbihvcGVuUGF0aCk7XG4gICAgdmFyIGZpbGVOYW1lID0gJyc7XG4gICAgdmFyIHBhcmVudFBhdGggPSBwYXRoO1xuXG4gICAgaWYgKCFkaXIpIHtcbiAgICAgIHBhdGggPSBwYXRoLnNwbGl0KCcvJyk7XG4gICAgICBmaWxlTmFtZSA9IHBhdGgucG9wKCkudG9Mb3dlckNhc2UoKTtcbiAgICAgIHBhcmVudFBhdGggPSBwYXRoLmpvaW4oJy8nKSB8fCAnLyc7XG4gICAgICBkaXIgPSBGUy5vcGVuKHBhcmVudFBhdGgpO1xuICAgIH1cblxuICAgIGlmIChkaXIgJiYgdHlwZW9mIGRpci5jb250ZW50ID09PSAnb2JqZWN0Jykge1xuICAgICAgZm9yICh2YXIga2V5IGluIGRpci5jb250ZW50KSB7XG4gICAgICAgIGlmIChrZXkuc3Vic3RyKDAsIGZpbGVOYW1lLmxlbmd0aCkudG9Mb3dlckNhc2UoKSA9PT0gZmlsZU5hbWUpIHtcbiAgICAgICAgICBpZiAodHlwZW9mIGRpci5jb250ZW50W2tleV0uY29udGVudCA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIGtleSArPSAnLyc7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgb3B0aW9ucy5wdXNoKGtleSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gb3B0aW9ucztcbn07XG5cbmV4cG9ydCBkZWZhdWx0IEZTO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGNvbnRhaW5lciwgc2Nyb2xsKSB7XG4gIHdpbmRvdy5vbnJlc2l6ZSA9IHNjcm9sbDtcblxuICBjb250YWluZXIucXVlcnlTZWxlY3RvcignLmZ1bGwtc2NyZWVuJykub25jbGljayA9IGZ1bmN0aW9uIChlKSB7XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgaWYgKCFkb2N1bWVudC5mdWxsc2NyZWVuRWxlbWVudCAmJlxuICAgICAgICAhZG9jdW1lbnQubW96RnVsbFNjcmVlbkVsZW1lbnQgJiZcbiAgICAgICAgICAhZG9jdW1lbnQud2Via2l0RnVsbHNjcmVlbkVsZW1lbnQgJiZcbiAgICAgICAgICAgICFkb2N1bWVudC5tc0Z1bGxzY3JlZW5FbGVtZW50ICkge1xuICAgICAgaWYgKGNvbnRhaW5lci5yZXF1ZXN0RnVsbHNjcmVlbikge1xuICAgICAgICBjb250YWluZXIucmVxdWVzdEZ1bGxzY3JlZW4oKTtcbiAgICAgIH0gZWxzZSBpZiAoY29udGFpbmVyLm1zUmVxdWVzdEZ1bGxzY3JlZW4pIHtcbiAgICAgICAgY29udGFpbmVyLm1zUmVxdWVzdEZ1bGxzY3JlZW4oKTtcbiAgICAgIH0gZWxzZSBpZiAoY29udGFpbmVyLm1velJlcXVlc3RGdWxsU2NyZWVuKSB7XG4gICAgICAgIGNvbnRhaW5lci5tb3pSZXF1ZXN0RnVsbFNjcmVlbigpO1xuICAgICAgfSBlbHNlIGlmIChjb250YWluZXIud2Via2l0UmVxdWVzdEZ1bGxzY3JlZW4pIHtcbiAgICAgICAgY29udGFpbmVyLndlYmtpdFJlcXVlc3RGdWxsc2NyZWVuKEVsZW1lbnQuQUxMT1dfS0VZQk9BUkRfSU5QVVQpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoZG9jdW1lbnQuZXhpdEZ1bGxzY3JlZW4pIHtcbiAgICAgICAgZG9jdW1lbnQuZXhpdEZ1bGxzY3JlZW4oKTtcbiAgICAgIH0gZWxzZSBpZiAoZG9jdW1lbnQubXNFeGl0RnVsbHNjcmVlbikge1xuICAgICAgICBkb2N1bWVudC5tc0V4aXRGdWxsc2NyZWVuKCk7XG4gICAgICB9IGVsc2UgaWYgKGRvY3VtZW50Lm1vekNhbmNlbEZ1bGxTY3JlZW4pIHtcbiAgICAgICAgZG9jdW1lbnQubW96Q2FuY2VsRnVsbFNjcmVlbigpO1xuICAgICAgfSBlbHNlIGlmIChkb2N1bWVudC53ZWJraXRFeGl0RnVsbHNjcmVlbikge1xuICAgICAgICBkb2N1bWVudC53ZWJraXRFeGl0RnVsbHNjcmVlbigpO1xuICAgICAgfVxuICAgIH1cbiAgfTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gdHlwZW9mIGxvY2FsU3RvcmFnZSA9PT0gJ3VuZGVmaW5lZCcgP1xuICB7XG4gICAgc2V0SXRlbTogZnVuY3Rpb24oKSB7fSxcbiAgICBnZXRJdGVtOiBmdW5jdGlvbigpIHsgcmV0dXJuIG51bGw7IH1cbiAgfVxuOlxuICBsb2NhbFN0b3JhZ2U7XG4iLCJleHBvcnQgZGVmYXVsdCBjbGFzcyBTdHJlYW0ge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLl9jYWxsYmFja3MgPSB7fTtcbiAgfVxuXG4gIG9uKGV2ZW50LCBjYWxsYmFjaykge1xuICAgIGlmICghdGhpcy5fY2FsbGJhY2tzW2V2ZW50XSkge1xuICAgICAgdGhpcy5fY2FsbGJhY2tzW2V2ZW50XSA9IFtdO1xuICAgIH1cblxuICAgIHRoaXMuX2NhbGxiYWNrc1tldmVudF0ucHVzaChjYWxsYmFjayk7XG4gIH1cblxuICB3cml0ZShkYXRhKSB7XG4gICAgdGhpcy5lbW1pdCgnZGF0YScsIGRhdGEpO1xuICB9XG5cbiAgZW1taXQoZXZlbnQsIGRhdGEpIHtcbiAgICB2YXIgY2FsbGJhY2tzID0gdGhpcy5fY2FsbGJhY2tzW2V2ZW50XTtcbiAgICBjYWxsYmFja3MgJiYgY2FsbGJhY2tzLmZvckVhY2goZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgICBjYWxsYmFjayhkYXRhKTtcbiAgICB9KTtcbiAgfVxufVxuIiwiaW1wb3J0IGJpbmRGdWxsU2NyZWVuIGZyb20gJy4vZnVsbC1zY3JlZW4nO1xuaW1wb3J0IENvbW1hbmRNYW5hZ2VyIGZyb20gJy4vY29tbWFuZC1tYW5hZ2VyJztcbmltcG9ydCBGUyBmcm9tICcuL2ZzJztcbmltcG9ydCBSRVBMIGZyb20gJy4vUkVQTCc7XG5pbXBvcnQgU3RyZWFtIGZyb20gJy4vc3RyZWFtJztcblxuLyoqXG4gKiBPbmx5IHVzZWQgYnkgc291cmNlLmpzIC0gdW51c2VkIGltcG9ydCBzbyBpdCBnZXRzIGludG8gdGhlIGJ1bmRsZVxuICovXG5pbXBvcnQgQ29uc29sZSBmcm9tICcuL2NvbnNvbGUnO1xuXG5jbGFzcyBaU0gge1xuICBjb25zdHJ1Y3Rvcihjb250YWluZXIsIHN0YXR1c2JhciwgY3JlYXRlSFRNTCkge1xuICAgIGlmIChjcmVhdGVIVE1MKSB7XG4gICAgICB0aGlzLmNyZWF0ZShjb250YWluZXIpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmNvbnRhaW5lciA9IGNvbnRhaW5lcjtcbiAgICAgIHRoaXMuc3RhdHVzYmFyID0gc3RhdHVzYmFyO1xuICAgIH1cblxuICAgIHRoaXMuY3JlYXRlU3RyZWFtcygpO1xuXG4gICAgdGhpcy5yb290Q29udGFpbmVyID0gdGhpcy5jb250YWluZXI7XG4gICAgdGhpcy5SRVBMID0gbmV3IFJFUEwodGhpcyk7XG4gICAgdGhpcy5GUyA9IEZTO1xuICAgIHRoaXMuaW5pdGlhbGl6ZUlucHV0KCk7XG4gICAgdGhpcy5wcm9tcHQoKTtcblxuICAgIGJpbmRGdWxsU2NyZWVuKHRoaXMuY29udGFpbmVyLnBhcmVudEVsZW1lbnQsIHRoaXMuc2Nyb2xsLmJpbmQodGhpcykpO1xuXG4gICAgQ29tbWFuZE1hbmFnZXIucmVnaXN0ZXIoJ2NsZWFyJywgdGhpcy5jbGVhci5iaW5kKHRoaXMpKTtcbiAgfVxuXG4gIGNyZWF0ZVN0cmVhbXMoKSB7XG4gICAgdGhpcy5zdGRpbiA9IG5ldyBTdHJlYW0oKTtcbiAgICB0aGlzLnN0ZGVyciA9IG5ldyBTdHJlYW0oKTtcbiAgICB0aGlzLnN0ZG91dCA9IG5ldyBTdHJlYW0oKTtcblxuICAgIHRoaXMuc3RkZXJyLm9uKCdkYXRhJywgKGQpID0+IHRoaXMub3V0cHV0KGQsICdzdGRlcnInKSk7XG4gICAgdGhpcy5zdGRvdXQub24oJ2RhdGEnLCAoZCkgPT4gdGhpcy5vdXRwdXQoZCwgJ3N0ZG91dCcpKTtcblxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgKGV2ZW50KSA9PiB7XG4gICAgICB0aGlzLnN0ZGluLndyaXRlKGV2ZW50KTtcbiAgICB9KTtcbiAgfVxuXG4gIHB3ZCgpIHtcbiAgICByZXR1cm4gRlMuY3VycmVudFBhdGgucmVwbGFjZShGUy5ob21lLCAnficpO1xuICB9XG5cbiAgJFBTMSgpIHtcbiAgICByZXR1cm4gYFxuICAgICAgPHNwYW4gY2xhc3M9XCJ3aG9cIj5ndWVzdDwvc3Bhbj5cbiAgICAgIG9uXG4gICAgICA8c3BhbiBjbGFzcz1cIndoZXJlXCI+ICR7dGhpcy5wd2QoKX0gPC9zcGFuPlxuICAgICAgPHNwYW4gY2xhc3M9XCJicmFuY2hcIj7CsW1hc3Rlcjwvc3Bhbj4mZ3Q7XG4gICAgYDtcbiAgfVxuXG4gIHByb21wdCgpIHtcbiAgICB2YXIgcm93ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgdmFyIHNwYW4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgdmFyIGNvZGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG5cbiAgICBzcGFuLmNsYXNzTmFtZSA9ICdwczEnO1xuICAgIGNvZGUuY2xhc3NOYW1lID0gJ2NvZGUnO1xuXG4gICAgc3Bhbi5pbm5lckhUTUwgPSB0aGlzLiRQUzEoKTtcblxuICAgIHJvdy5hcHBlbmRDaGlsZChzcGFuKTtcbiAgICByb3cuYXBwZW5kQ2hpbGQoY29kZSk7XG5cbiAgICB0aGlzLmNvbnRhaW5lci5hcHBlbmRDaGlsZChyb3cpO1xuICAgIHRoaXMuUkVQTC51c2UoY29kZSk7XG4gICAgdGhpcy5zdGF0dXModGhpcy5wd2QoKSk7XG4gICAgdGhpcy5zY3JvbGwoKTtcbiAgICByb3cuYXBwZW5kQ2hpbGQodGhpcy5pbnB1dCk7XG4gICAgdGhpcy5pbnB1dC5mb2N1cygpO1xuICB9XG5cbiAgc3RhdHVzKHRleHQpIHtcbiAgICBpZiAodGhpcy5zdGF0dXNiYXIpIHtcbiAgICAgIHRoaXMuc3RhdHVzYmFyLmlubmVySFRNTCA9IHRleHQ7XG4gICAgfVxuICB9XG5cbiAgaW5pdGlhbGl6ZUlucHV0KCkge1xuICAgIHZhciBpbnB1dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lucHV0Jyk7XG4gICAgaW5wdXQuY2xhc3NOYW1lID0gJ2Zha2UtaW5wdXQnO1xuICAgIHRoaXMucm9vdENvbnRhaW5lci5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChlKSA9PiB7XG4gICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICBpZiAoaW5wdXQgPT09IGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQpIHtcbiAgICAgICAgaW5wdXQuYmx1cigpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaW5wdXQuZm9jdXMoKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHRoaXMuaW5wdXQgPSBpbnB1dDtcbiAgfVxuXG4gIGNyZWF0ZShjb250YWluZXIpIHtcbiAgICBpZiAodHlwZW9mIGNvbnRhaW5lciA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGNvbnRhaW5lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGNvbnRhaW5lcik7XG4gICAgfVxuXG4gICAgY29udGFpbmVyLmlubmVySFRNTCA9IGBcbiAgICAgIDxkaXYgY2xhc3M9XCJ0ZXJtaW5hbFwiPlxuICAgICAgICA8ZGl2IGNsYXNzPVwiYmFyXCI+XG4gICAgICAgICAgPGRpdiBjbGFzcz1cImJ1dHRvbnNcIj5cbiAgICAgICAgICAgIDxhIGNsYXNzPVwiY2xvc2VcIiBocmVmPVwiI1wiPjwvYT5cbiAgICAgICAgICAgIDxhIGNsYXNzPVwibWluaW1pemVcIiBocmVmPVwiI1wiPjwvYT5cbiAgICAgICAgICAgIDxhIGNsYXNzPVwibWF4aW1pemVcIiBocmVmPVwiI1wiPjwvYT5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8ZGl2IGNsYXNzPVwidGl0bGVcIj48L2Rpdj5cbiAgICAgICAgICA8YSBjbGFzcz1cImZ1bGwtc2NyZWVuXCIgaHJlZj1cIiNcIj48L2E+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzPVwiY29udGVudFwiPjwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzPVwic3RhdHVzLWJhclwiPjwvZGl2PlxuICAgICAgPC9kaXY+XG4gICAgYDtcblxuICAgIHRoaXMuY29udGFpbmVyID0gY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3IoJy5jb250ZW50Jyk7XG4gICAgdGhpcy5zdGF0dXNiYXIgPSBjb250YWluZXIucXVlcnlTZWxlY3RvcignLnN0YXR1cy1iYXInKTtcbiAgfVxuXG4gIHVwZGF0ZSgpIHtcbiAgICB2YXIgY29kZXMgPSB0aGlzLmNvbnRhaW5lci5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCdjb2RlJyk7XG4gICAgaWYgKCFjb2Rlcy5sZW5ndGgpIHtcbiAgICAgIHRoaXMucHJvbXB0KCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuUkVQTC51c2UoY29kZXNbY29kZXMubGVuZ3RoIC0gMV0sIFpTSCk7XG4gICAgfVxuICB9XG5cbiAgb3V0cHV0KHRleHQsIGNsYXNzTmFtZSkge1xuICAgIHZhciBvdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICBvdXQuY2xhc3NOYW1lID0gJ2NvZGUgJyArIFtjbGFzc05hbWVdO1xuICAgIG91dC5pbm5lckhUTUwgPSB0ZXh0O1xuXG4gICAgdGhpcy5jb250YWluZXIuYXBwZW5kQ2hpbGQob3V0KTtcbiAgICB0aGlzLnNjcm9sbCgpO1xuICB9XG5cbiAgc2Nyb2xsKCkge1xuICAgIHZhciBjID0gdGhpcy5yb290Q29udGFpbmVyO1xuICAgIHNldFRpbWVvdXQoKCkgPT4gYy5zY3JvbGxUb3AgPSBjLnNjcm9sbEhlaWdodCwgMCk7XG4gIH1cblxuICBjbGVhcigpIHtcbiAgICB0aGlzLmNvbnRhaW5lci5pbm5lckhUTUwgPSAnJztcbiAgICB0aGlzLnByb21wdCgpO1xuICB9XG5cbn1cblxud2luZG93LlpTSCA9IFpTSDtcbmV4cG9ydCBkZWZhdWx0IFpTSDtcbiJdfQ==
