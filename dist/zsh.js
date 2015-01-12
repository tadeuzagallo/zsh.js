require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// jshint bitwise: false
'use strict';

var CommandManager = require('./command-manager');
var LocalStorage = require('./local-storage');
var FS = require('./fs');

var REPL_MODE_DEFAULT = 1;

/* TODO: Implement VI bindings
 * var REPL_MODE_VI = 1;
 * var ESC = 27;
 */

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

var REPL = window.REPL = {
  mode: REPL_MODE_DEFAULT,
  input: '',
  index: 0,
  listeners: {},
  lastKey: null,
};

REPL._history = ([LocalStorage.getItem(HISTORY_STORAGE_KEY)]+'').split(HISTORY_SEPARATOR).filter(String);
REPL.history = REPL._history.slice(0) || [];
REPL.historyIndex = REPL.history.length;

REPL.on = function(event, callback) {
  ((this.listeners[event] = this.listeners[event] || [])).push(callback);
};

REPL.caret = (function () {
  var caret = document.createElement('span');
  caret.className = 'caret';

  return caret;
}());

REPL.use = function (span, zsh) {
  if (this.span) {
    this.removeCaret();
  }

  this.span = span;
  this.zsh = zsh;

  window.onkeydown = this.parse;

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
      REPL.moveCaret(event.keyCode);
    break;
    case UP:
      case DOWN:
      REPL.navigateHistory(event.keyCode);
    break;
    case TAB:
      REPL.autocomplete();
    break;
    case ENTER:
      REPL.submit();
    break;
    case BACKSPACE:
      REPL.backspace();
    break;
    default:
      if (event.ctrlKey) {
        REPL.action(event);
      } else {
        REPL.update(event);
      }
  }
};

REPL.moveCaret = function (direction) {
  if (direction === LEFT) {
    this.index = Math.max(this.index - 1, 0);
  } else {
    this.index = Math.min(this.index + 1, this.input.length + 1);
  }
  this.write();
};

REPL.autocomplete = function () {
  var options;
  var path = false;

  if (this.command() === this.input) {
    options = CommandManager.autocomplete(this.command());
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
};

REPL.navigateHistory = function (direction) {
  if (direction === UP) {
    this.historyIndex = Math.max(this.historyIndex - 1, 0);
  } else {
    this.historyIndex = Math.min(this.historyIndex + 1, this.history.length - 1);
  }

  this.input = this.history[this.historyIndex] || '';
  this.index = this.input.length;
  this.write();
};

REPL.submit = function (preventWrite) {
  this.index = this.input.length;

  if (!preventWrite) {
    this.write();
  }

  var input = this.input.trim();

  if (input && input !== this._history[this._history.length - 1]) {
    this._history[this._history.length] = input;
    LocalStorage.setItem(HISTORY_STORAGE_KEY, this._history.slice(-HISTORY_SIZE).join(HISTORY_SEPARATOR));
  }

  this.history = this._history.slice(0);
  this.historyIndex = this.history.length;

  this.clear();

  if (input) {
    CommandManager.parse(input,
                         this.zsh.stdin,
                         this.zsh.stdout,
                         this.zsh.stderr,
                         this.zsh.prompt);
  } else {
    this.zsh.prompt();
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

REPL.actualCharCode = function (event) {
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
};

REPL.action = function(event) {
  if (String.fromCharCode(event.keyCode) === 'C') {
    this.index = this.input.length;
    this.write();
    this.input = '';
    this.submit(true);
  }
};

REPL.update = function(event) {
  var code = this.actualCharCode(event);

  if (!~code) {
    return;
  }

  var char = String.fromCharCode(code);

  this.input = this.input.substr(0, this.index) + char + this.input.substr(this.index);
  this.index++;
  this.write();
};

REPL.command = function () {
  if (this.input !== this.__inputCommand) {
    this.__inputCommand = this.input;
    this.__command = this.input.split(' ').shift();
  }

  return this.__command;
};

REPL.commandArgsString = function () {
  if (this.input !== this.__inputCArgs) {
    this.__inputCArgs = this.input;
    this.__cargs = this.input.substr(this.command().length);
  }

  return this.__cargs;
};

REPL.write = function () {
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

},{"./command-manager":"8EyLTk","./fs":"dDj8kd","./local-storage":14}],"zsh.js/lib/args-parser":[function(require,module,exports){
module.exports=require('3ed2tT');
},{}],"3ed2tT":[function(require,module,exports){
'use strict';

var ArgsParser = {};

ArgsParser.parseStrings = function(rawString) {
  var _args = [];
  var word = '';
  var string = false;
  var i, l;

  for (i = 0, l = rawString.length; i < l; i++) {
    var char = rawString[i];
    if (char === '"' || char === '\'') {
      if (string) {
        if (char === string) {
          if (rawString[i-1] === '\\') {
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

  var out =  {
    arguments: [],
    options: {},
    raw: args
  };

  args = ArgsParser.parseStrings(args);

  function addOption(option, value) {
    out.options[option] = typeof(value) === 'string' ? value : true;
  }

  for (var i = 0, l = args.length; i < l; i++) {
    var arg = args[i];

    if (!arg)  {
      continue;
    }

    if (arg.substr(0, 2) === '--') {
      var next = args[i+1];
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

module.exports = ArgsParser;

},{}],"8EyLTk":[function(require,module,exports){
// jshint evil: true, bitwise: false
'use strict';

var ArgsParser = require('./args-parser');
var FS = require('./fs');
var File = require('./file');
var Stream = require('./stream');

var path = File.open('/usr/bin');
var load = function (cmd) {
  var source = path.open(cmd + '.js');
  var fn;
  if (!source.isFile()) {
    fn = false;
  } else {
    fn = eval('(function () { ' + source.read() + '})')();
  }
  return fn;
};

var CommandManager = {
  commands: {},
  aliases: {},
};

CommandManager.isValid = function (cmd) {
  return !!(this.commands[cmd] || this.aliases[cmd] || load(cmd));
};

CommandManager.autocomplete = function (cmd) {
  var matches = [];
  cmd = cmd.toLowerCase();

  (Object.keys(this.commands).concat(Object.keys(this.aliases))).forEach(function (command) {
    if (command.substr(0, cmd.length).toLowerCase() === cmd) {
      matches.push(command);
    }
  });

  return matches;
};
CommandManager.parse = function (cmd, stdin, stdout, stderr, next) {
  if (~cmd.indexOf('|')) {
    cmd = cmd.split('|');
    cmd.forEach(CommandManager.parse);
  }

  cmd = cmd.split(' ');
  var command = cmd.shift();
  var args = cmd.join(' ');

  var index;

  if (~(index = args.indexOf('>'))) {
    var prev = args[index-1];
    var append = args[index+1] === '>';
    var init = index;

    if (~(['1','2','&']).indexOf(prev)) {
      init--;
    }

    var _args = args.substr(0, init);
    args = args.substr(index+append+1).split(' ').filter(String);
    var path = args.shift();
    args = _args + args.join(' ');

    if (!path) {
      stdout.write('zsh: parse error near `\\n\'');
      return;
    }

    var file = File.open(path);

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

    var _stdout = new Stream();
    _stdout.on('data', function(data) {
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
      FS.writeFS();
      _next();
    };
  }

  CommandManager.exec(command, args, stdin, stdout, stderr, next);
};

CommandManager.exec = function (cmd, args, stdin, stdout, stderr, next) {
  if (this.aliases[cmd]) {
    var line = (this.aliases[cmd] + ' ' + args).trim().split(' ');
    return this.exec(line.shift(), line.join(' '), stdin, stdout, stderr, next);
  }

  var fn;
  if (typeof this.commands[cmd] === 'function') {
    fn = this.commands[cmd];
  } else if ((fn = load(cmd))) {
  } else {
    stderr.write('zsh: command not found: ' + cmd);
    next();
    return;
  }

  try {
    args = ArgsParser.parse(args);
    fn.call(undefined, args, stdin, stdout, stderr, next);
  } catch (err) {
    stderr.write(err.stack);
    next();
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

CommandManager.unalias = function (cmd) {
  delete this.aliases[cmd];
};

CommandManager.get = function(cmd) {
  return this.commands[cmd];
};

module.exports = CommandManager;

},{"./args-parser":"3ed2tT","./file":"bMs+/F","./fs":"dDj8kd","./stream":16}],"zsh.js/lib/command-manager":[function(require,module,exports){
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
      return JSON.stringify(a) || [a]+'';
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
  "mtime": "2014-03-02T12:31:10.000Z",
  "ctime": "2014-03-02T12:31:10.000Z",
  "content": {
    "Users": {
      "mtime": "2014-05-03T23:21:09.000Z",
      "ctime": "2014-05-03T23:21:09.000Z",
      "content": {
        "guest": {
          "mtime": "2014-07-11T21:50:34.000Z",
          "ctime": "2014-07-11T21:50:34.000Z",
          "content": {
            ".vimrc": {
              "mtime": "2014-05-03T23:21:09.000Z",
              "ctime": "2014-05-03T23:21:09.000Z",
              "content": "",
              "type": "f"
            },
            ".zshrc": {
              "mtime": "2014-05-03T23:21:09.000Z",
              "ctime": "2014-05-03T23:21:09.000Z",
              "content": "",
              "type": "f"
            },
            "about.md": {
              "mtime": "2014-07-11T21:50:34.000Z",
              "ctime": "2014-07-11T21:50:34.000Z",
              "content": "# tadeuzagallo.com\n\n* About me\n  I'm a Full Stack Developer, JS Passionate, Ruby Fan, C++ Something, Game Development Enthusiast,\n  Always willing to contribute to open source projects and trying to learn some more math.\n\n* About this website\n  I wanted more than just show my work, I wanted to show my work environment.\n  Since I do some mobile development as well  I also use (sadly) some IDEs, but always trying\n  to do as much as I can on this terminal, so I made a very similar copy (at least visually)\n  of it so people could get to see what I do and how I (usually) do.\n\n* Commands\n  If you want to know more about me, there are a few commands:\n    * about  (currently running)\n    * contact \n    * resume\n    * projects\n\n  If you need some help about the terminal, or want to know what functionalities are currrently implemented, type `help` any time.\n\nHope you have as much fun as I had doing it :)\n\nTadeu Zagallo\n      \n",
              "type": "f"
            },
            "contact.md": {
              "mtime": "2014-05-03T23:21:09.000Z",
              "ctime": "2014-05-03T23:21:09.000Z",
              "content": "# All my contacts, feel free to reach me at any of these\n\n* <a href=\"mailto:tadeuzagallo@gmail.com\" alt=\"Email\">[Email](mailto:tadeuzagallo@gmail.com)</a>\n* <a href=\"https://github.com/tadeuzagallo\" alt=\"GitHub\" target=\"_blank\">[GitHub](https://github.com/tadeuzagallo)</a>\n* <a href=\"https://twitter.com/tadeuzagallo\" alt=\"Twitter\" target=\"_blank\">[Twitter](https://twitter.com/tadeuzagallo)</a>\n* <a href=\"https://facebook.com/tadeuzagallo\" alt=\"Facebook\" target=\"_blank\">[Facebook](https://facebook.com/tadeuzagallo)</a>\n* <a href=\"https://plus.google.com/+TadeuZagallo\" alt=\"Google +\" target=\"_blank\">[Google +](https://plus.google.com/+TadeuZagallo)</a>\n* <a href=\"http://www.linkedin.com/profile/view?id=160177159\" alt=\"Linkedin\" target=\"_blank\">[Linkedin](http://www.linkedin.com/profile/view?id=160177159)</a>\n* <a href=\"skype://tadeuzagallo\" alt=\"Linkedin\">[Skype](skype://tadeuzagallo)</a>\n",
              "type": "f"
            },
            "projects.md": {
              "mtime": "2014-12-27T02:45:05.000Z",
              "ctime": "2014-12-27T02:45:05.000Z",
              "content": "For now you can have a look at this one! :)\n(That's what I'm doing)\n",
              "type": "f"
            },
            "readme.md": {
              "mtime": "2014-05-03T23:21:09.000Z",
              "ctime": "2014-05-03T23:21:09.000Z",
              "content": "foo bar baz\n",
              "type": "f"
            },
            "resume.md": {
              "mtime": "2014-05-03T23:21:09.000Z",
              "ctime": "2014-05-03T23:21:09.000Z",
              "content": "# Tadeu Zagallo da Silva\n---\n\n## Profile\n--- \n  I am passionate for all kinds of development, love to learn new languages and paradigms, always ready for a good challenge.\n  I also like Math, Game development and when possible contribute to open source projects.\n\n## General Information\n---\n  * Email: tadeuzagallo@gmail.com\n  * Phone: +55 32 8863 3684\n  * Skype: tadeuzagallo\n  * Github: github.com/tadeuzagallo\n  * Location: Juiz de Fora/MG, Brazil\n\n## Educational Background\n---\n\n  * Web Development at Instituto Vianna Junior, 2010\n  * General English at The Carlyle Institute, 2011\n\n# Work Experience\n---\n\n  * <i>*iOS Developer*</i> at <i>*Qranio*</i> from <i>*December, 2013*</i> and <i>*currently employed*</i>\n    - Qranio is a startup that grew inside the company I work (eMiolo.com) and I was invited to lead the iOS development team\n      on a completely rewriten version of the app\n\n  * <i>*Web and Mobile Developer*</i> at <i>*Bonuz*</i> from <i>*February, 2013*</i> and <i>*currently employed*</i>\n    - I started developing the iOS app as a freelancer, after the app was published I was invited to maintain the Ruby on Rails\n      api and work on the Android version of the app\n\n  * <i>*Web and Mobile Developer*</i> at <i>*eMiolo.com*</i> from <i>*April, 2013*</i> and <i>*currently employed*</i>\n    - The company just worked with PHP, so I joined with the intention of bringing new technologies. Worked with Python, Ruby, iOS,\n      Android and HTML5 applications\n\n  * <i>*iOS Developer*</i> at <i>*ProDoctor Software Ltda.*</i> from <i>*July, 2012*</i> until <i>*October, 2012*</i>\n    - Briefly worked with the iOS team on the development of their first mobile version of their main product, a medical software\n\n  * <i>*Web Developer*</i> at <i>*Ato Interativo*</i> from <i>*February, 2012*</i> until <i>*July, 2012*</i>\n    - Most of the work was with PHP and MySQL, also working with JavaScript on the client side. Worked with MSSQL\n      and Oracle databases as well\n\n  * <i>*Web Developer*</i> at <i>*Maria Fumaça Criações*</i> from <i>*October, 2010*</i> until <i>*June, 2011*</i>\n    - I worked mostly with PHP and MySQL, also making the front end with HTML and CSS and most animations in JavaScript,\n      although I also worked with a few in AS3. Briefly worked with MongoDB\n\n## Additional Information\n---\n\n* Experience under Linux and OS X environment\n* Student Exchange: 6 months of residence in Ireland\n\n## Languages\n---\n\n* Portuguese – Native Speaker\n* English – Fluent Level\n* Spanish – Intermediate Level\n\n## Programming languages (ordered by knowledge)\n---\n\n* JavaScript\n* Objective­C\n* C/C++\n* Ruby on Rails\n* NodeJS\n* PHP\n* Java\n* Python\n\n## Additional skills\n---\n\n* HTML5/CSS3\n* MVC\n* Design Patterns\n* TDD/BDD\n* Git\n* Analysis and Design of Algorithms\n",
              "type": "f"
            }
          },
          "type": "d"
        }
      },
      "type": "d"
    },
    "tmp": {
      "mtime": "2014-03-02T12:31:10.000Z",
      "ctime": "2014-03-02T12:31:10.000Z",
      "content": {},
      "type": "d"
    },
    "usr": {
      "mtime": "2014-03-02T12:31:10.000Z",
      "ctime": "2014-03-02T12:31:10.000Z",
      "content": {
        "bin": {
          "mtime": "2015-01-12T02:35:55.000Z",
          "ctime": "2015-01-12T02:35:55.000Z",
          "content": {
            "alias.js": {
              "mtime": "2015-01-12T02:30:18.000Z",
              "ctime": "2015-01-12T02:30:18.000Z",
              "content": "'use strict';\n\nreturn function (args, stdin, stdout, stderr, next) {\n  var buffer = '';\n  if (args.arguments.length) {\n    var key = args.arguments.shift();\n    var index;\n    if (~(index = key.indexOf('='))) {\n      var command;\n\n      if (args.arguments.length && index === key.length - 1) {\n        command = args.arguments.join(' ');\n      } else {\n        command = key.substr(index+1);\n      }\n\n      key = key.substr(0, index);\n\n      if (command) {\n        ZSH.commandManager.alias(key, command);\n      }\n    }\n  } else {\n    var aliases = ZSH.commandManager.alias();\n\n    for (var i in aliases) {\n      buffer += i + '=\\'' + aliases[i] + '\\'\\n';\n    }\n  }\n\n  stdout.write(buffer);\n  next();\n};\n",
              "type": "f"
            },
            "cat.js": {
              "mtime": "2015-01-12T02:30:23.000Z",
              "ctime": "2015-01-12T02:30:23.000Z",
              "content": "'use strict';\n\nreturn function (args, stdin, stdout, stderr, next) {\n  args.arguments.forEach(function (path) {\n    var file = ZSH.file.open(path);\n\n    if (!file.exists()) {\n      stderr.write(ZSH.fs.notFound('cat', path));\n    } else if (file.isDir()) {\n      stderr.write(ZSH.fs.error('cat', path, 'Is a directory'));\n    } else {\n      stdout.write(file.read());\n    }\n  });\n\n  next();\n};\n",
              "type": "f"
            },
            "cd.js": {
              "mtime": "2015-01-12T02:31:16.000Z",
              "ctime": "2015-01-12T02:31:16.000Z",
              "content": "'use strict';\n\nreturn function (args, stdin, stdout, stderr, next) {\n  var path = args.arguments[0] || '~';\n  var dir = ZSH.file.open(path);\n\n  if (!dir.exists()) {\n    stderr.write(ZSH.fs.notFound('cd', path));\n  } else if (dir.isFile()) {\n    stderr.write(ZSH.fs.error('cd', path, 'Is a file'));\n  } else {\n    ZSH.fs.currentPath = dir.path;\n    ZSH.fs.currentDir = dir.self();\n  }\n\n  ZSH.fs.writeFS();\n  next();\n};\n",
              "type": "f"
            },
            "echo.js": {
              "mtime": "2015-01-12T02:31:36.000Z",
              "ctime": "2015-01-12T02:31:36.000Z",
              "content": "'use strict';\n\nreturn function (args, stdin, stdout, stderr, next) {\n  try {\n    stdout.write(ZSH.argsParser.parseStrings(args.raw).join(' '));\n  } catch (err) {\n    stderr.write('zsh: ' + err.message);\n  }\n  \n  next();\n};\n",
              "type": "f"
            },
            "help.js": {
              "mtime": "2015-01-12T02:31:58.000Z",
              "ctime": "2015-01-12T02:31:58.000Z",
              "content": "'use strict';\n\nreturn function (args, stdin, stdout, stderr, next) {\n  stdout.write('commands:');\n  stdout.write(Object.keys(ZSH.commandManager.commands).join(' '));\n\n  stdout.write('\\n');\n\n  stdout.write('aliases:');\n  stdout.write(Object.keys(ZSH.commandManager.aliases).map(function (key)  {\n    return key + '=\"' + ZSH.commandManager.aliases[key] + '\"';\n  }).join(' '));\n\n  next();\n};\n",
              "type": "f"
            },
            "less.js": {
              "mtime": "2015-01-12T02:21:09.000Z",
              "ctime": "2015-01-12T02:21:09.000Z",
              "content": "",
              "type": "f"
            },
            "ls.js": {
              "mtime": "2015-01-12T02:32:20.000Z",
              "ctime": "2015-01-12T02:32:20.000Z",
              "content": "'use strict';\n\nreturn function (args, stdin, stdout, stderr, next) {\n  if (!args.arguments.length) {\n    args.arguments.push('.');\n  }\n\n  args.arguments.forEach(function (arg) {\n    var dir = ZSH.file.open(arg);\n\n    if (!dir.exists()) {\n      stderr.write(ZSH.fs.notFound('ls', arg));\n    } else if (dir.isFile()) {\n      stderr.write(ZSH.fs.error('ls', arg, 'Is a file'));\n    } else {\n      var files = Object.keys(dir.read());\n\n      if (!args.options.a) {\n        files = files.filter(function (file) {\n          return file[0] !== '.';\n        });\n      }\n\n      if (args.arguments.length > 1) {\n        stdout.write(arg + ':');\n      }\n\n      if (args.options.l) {\n        files = files.map(function (name) {\n          var file = dir.open(name);\n          var type = file.isDir() ? 'd' : '-';\n          var perms = type + 'rw-r--r--';\n\n          return perms + ' guest guest ' + file.length() + ' ' + file.mtime() + ' ' + name;\n        });\n      }\n\n      stdout.write(files.join(args.options.l ? '\\n' : ' '));\n    }\n  });\n\n  next();\n};\n",
              "type": "f"
            },
            "mkdir.js": {
              "mtime": "2015-01-12T02:32:29.000Z",
              "ctime": "2015-01-12T02:32:29.000Z",
              "content": "'use strict';\n\nreturn function (args, stdin, stdout, stderr, next) {\n  args.arguments.forEach(function (path) {\n    var file = ZSH.file.open(path);\n\n    if (!file.parentExists()) {\n      stderr.write(ZSH.fs.notFound('mkdir', path));\n    } else if (!file.isValid()) {\n      stderr.write(ZSH.fs.error('mkdir', path, 'Not a directory'));\n    } else if (file.exists()) {\n      stderr.write(ZSH.fs.error('mkdir', path, 'File exists'));\n    } else {\n      file.createFolder();\n    }\n  });\n\n  ZSH.fs.writeFS();\n  next();\n};\n",
              "type": "f"
            },
            "mv.js": {
              "mtime": "2015-01-12T02:33:10.000Z",
              "ctime": "2015-01-12T02:33:10.000Z",
              "content": "'use strict';\n\nreturn function (args, stdin, stdout, stderr, next) {\n  var targetPath = args.arguments.pop();\n  var sourcePaths = args.arguments;\n  var target = ZSH.file.open(targetPath);\n\n  if (!targetPath ||\n      !sourcePaths.length ||\n        (sourcePaths.length > 1 &&\n         (!target.exists() || target.isFile())\n        )\n     ) {\n    stderr.write('usage: mv source target\\n \\t mv source ... directory');\n  } else if (!target.parentExists()) {\n      stderr.write(ZSH.fs.notFound('mv', target.dirname));\n  } else {\n    var backup = target.self();\n    var success = sourcePaths.reduce(function (success, sourcePath) {\n      if (success) {\n        var source = ZSH.file.open(sourcePath);\n\n        if (!source.exists()) {\n          stderr.write(ZSH.fs.notFound('mv', sourcePaths[0]));\n        } else if (source.isDir() && target.isFile()) {\n          stderr.write(ZSH.fs.error('mv', 'rename ' + sourcePaths[0] + ' to ' + targetPath, 'Not a directory'));\n        } else {\n          if (!target.isFile()) {\n            target.read()[source.filename] = source.self();\n          } else {\n            target.write(source.read(), false, true);\n          }\n\n          source.delete();\n          return true;\n        }\n      }\n\n      return false;\n    }, true);\n\n    if (success) {\n      ZSH.fs.writeFS();\n    } else {\n      target.dir[target.filename] = backup;\n    }\n  }\n\n  next();\n};\n",
              "type": "f"
            },
            "pwd.js": {
              "mtime": "2015-01-12T02:33:28.000Z",
              "ctime": "2015-01-12T02:33:28.000Z",
              "content": "'use strict';\n\nreturn function (args, stdin, stdout, stderr, next) {\n  var _pwd = ZSH.fs.currentPath;\n\n  if (stdout) {\n    stdout.write(_pwd);\n    next();\n  } else {\n    return _pwd;\n  }\n};\n",
              "type": "f"
            },
            "rm.js": {
              "mtime": "2015-01-12T02:33:56.000Z",
              "ctime": "2015-01-12T02:33:56.000Z",
              "content": "'use strict';\n\nreturn function (args, stdin, stdout, stderr, next) {\n  args.arguments.forEach(function (arg) {\n    var file = ZSH.file.open(arg);\n\n    if (!file.exists()) {\n      stderr.write(ZSH.fs.notFound('rm', arg));\n    } else if (!file.isValid()) {\n      stderr.write(ZSH.fs.error('rm', arg, 'Not a directory'));\n    } else if (file.isDir()) {\n      stderr.write(ZSH.fs.error('rm', arg, 'is a directory'));\n    } else {\n      file.delete();\n    }\n  });\n\n  ZSH.fs.writeFS();\n  next();\n};\n",
              "type": "f"
            },
            "rmdir.js": {
              "mtime": "2015-01-12T02:34:25.000Z",
              "ctime": "2015-01-12T02:34:25.000Z",
              "content": "'use strict';\n\nreturn function (args, stdin, stdout, stderr, next) {\n  args.arguments.forEach(function (arg) {\n    var file = ZSH.file.open(arg);\n\n    if (!file.parentExists() || !file.exists()) {\n      stderr.write(ZSH.fs.notFound('rmdir', arg));\n    } else if (!file.isDir()) {\n      stderr.write(ZSH.fs.error('rmdir', arg, 'Not a directory'));\n    } else {\n      file.delete();\n    }\n  });\n\n  ZSH.fs.writeFS();\n  next();\n};\n",
              "type": "f"
            },
            "source.js": {
              "mtime": "2015-01-12T02:34:56.000Z",
              "ctime": "2015-01-12T02:34:56.000Z",
              "content": "// jshint evil: true\n'use strict';\n\nreturn function (args, stdin, stdout, stderr, next) {\n  if (args.arguments.length) {\n    var file = ZSH.file.open(args.arguments[0]);\n    if (!file.exists()) {\n      stderr.write('source: no such file or directory: ' + file.path);\n    } else {\n      try {\n        var console = new ZSH.Console(stdout, stderr); // jshint ignore: line\n        var result = JSON.stringify(eval(file.read()));\n        stdout.write('<- ' + result);\n      } catch (err) {\n        stderr.write(err.stack);\n      }\n    }\n  } else {\n    stderr.write('source: not enough arguments');\n  }\n\n  next();\n};\n",
              "type": "f"
            },
            "touch.js": {
              "mtime": "2015-01-12T02:35:38.000Z",
              "ctime": "2015-01-12T02:35:38.000Z",
              "content": "'use strict';\n\nreturn function (args, stdin, stdout, stderr, next) {\n  args.arguments.forEach(function (path) {\n    var file = ZSH.file.open(path);\n\n    if (!file.parentExists()) {\n      stderr.write(ZSH.fs.notFound('touch', path));\n    } else if (!file.isValid()){\n      stderr.write(ZSH.fs.error('touch', path, 'Not a directory'));\n    } else {\n      file.write('', true, true);\n    }\n  });\n\n  ZSH.fs.writeFS();\n  next();\n};\n",
              "type": "f"
            },
            "unalias.js": {
              "mtime": "2015-01-12T02:35:55.000Z",
              "ctime": "2015-01-12T02:35:55.000Z",
              "content": "'use strict';\n\nreturn function (args, stdin, stdout, stderr, next) {\n  var cmd = args.arguments[0];\n\n  if (cmd) {\n    ZSH.commandManager.unalias(cmd);\n  }\n\n  next();\n};\n",
              "type": "f"
            },
            "vim.js": {
              "mtime": "2014-12-25T02:19:58.000Z",
              "ctime": "2014-12-25T02:19:58.000Z",
              "content": "",
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

var FS = require('./fs');

var File = (function () {
  function File(path) {
    path = FS.translatePath(path);
    this.path = path;

    path = path.split('/');

    this.filename = path.pop();
    this.dirname = path.join('/') || '/';
    this.dir = FS.open(this.dirname);
  }

  File.open = function (path) {
    return new File(path);
  };

  File.getTimestamp = function () {
    return new Date().toISOString();
  };

  File.prototype.parentExists = function () {
    return this.dir !== undefined;
  };

  File.prototype.isValid = function () {
    return typeof this.dir === 'object' && this.dir.type === 'd';
  };

  File.prototype.exists = function () {
    return this.isValid() && (!this.filename || typeof this.dir.content[this.filename] !== 'undefined');
  };

  File.prototype.isFile = function () {
    return this.exists() && this.filename && this.dir.content[this.filename].type === 'f';
  };

  File.prototype.isDir = function () {
    return this.exists() && (!this.filename || this.dir.content[this.filename].type === 'd');
  };

  File.prototype.delete = function () {
    if (this.exists()) {
      delete this.dir.content[this.filename];
      FS.writeFS();
    }
  };

  File.prototype.clear = function () {
    this.write('', false, true);
  };

  File.prototype.write = function (content, append, force) {
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
      FS.writeFS();
    }
  };

  File.prototype.read = function () {
    return this.filename ? this.dir.content[this.filename].content : this.dir.content;
  };

  var _create = function (type, content) {
    return function (timestamp) {
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

      FS.writeFS();
    };
  };

  File.prototype.createFolder = _create('d', {});
  File.prototype.createFile = _create('f', '');

  File.prototype.self = function () {
    return this.filename ? this.dir : this.dir.content[this.filename];
  };

  File.prototype.open = function (file) {
    return File.open(this.path + '/' + file);
  };

  File.prototype.length = function () {
    var content = this.read();

    if (this.isFile()) {
      return content.length;
    } else if (this.isDir()) {
      return Object.keys(content).length;
    } else {
      return 0;
    }
  };

  var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  File.prototype.mtime = function () {
    var t = new Date(this.self().mtime);

    var dayAndMonth =  months[t.getMonth()] + ' ' + t.getDay();
    if (Date.now() - t.getTime() > 6 * 30 * 24 * 60* 60 * 1000) {
      return dayAndMonth + ' ' + t.getFullYear();
    } else {
      return dayAndMonth + ' ' + t.getHours() + ':' + t.getMinutes();
    }
  };

  return File;
})();

module.exports = File;

},{"./fs":"dDj8kd"}],"zsh.js/lib/fs":[function(require,module,exports){
module.exports=require('dDj8kd');
},{}],"dDj8kd":[function(require,module,exports){
// jshint bitwise: false
'use strict';

var LocalStorage = require('./local-storage');

var FS = {};
var FILE_SYSTEM_KEY = 'file_system';

FS.writeFS = function () {
  LocalStorage.setItem(FILE_SYSTEM_KEY, JSON.stringify(FS.root));
};


FS.root = JSON.parse(LocalStorage.getItem(FILE_SYSTEM_KEY));
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

  while(~(index = path.indexOf('..'))) {
    path.splice(index-1, 2);
  }

  while(~(index = path.indexOf('.'))) {
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

FS.realpath = function(path) {
  path = FS.translatePath(path);

  return FS.exists(path) ? path : null;
};


FS.open = function (path) {
  if (path[0] !== '/') {
    path = FS.translatePath(path);
  }

  path = path.substr(1).split('/').filter(String);

  var cwd = FS.root;
  while(path.length && cwd.content) {
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

module.exports = FS;

},{"./file-system.json":8,"./local-storage":14}],13:[function(require,module,exports){
'use strict';

module.exports = function(container, scroll) {
  window.onresize = scroll;

  container.querySelector('.full-screen').onclick = function (e) {
    e.preventDefault();

    if (!document.fullscreenElement &&
        !document.mozFullScreenElement &&
          !document.webkitFullscreenElement &&
            !document.msFullscreenElement ) {
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

module.exports = typeof localStorage === 'undefined' ?
  {
    setItem: function() {},
    getItem: function() { return null; }
  }
:
  localStorage;

},{}],15:[function(require,module,exports){
module.exports=require(1)
},{"./command-manager":"8EyLTk","./fs":"dDj8kd","./local-storage":14}],16:[function(require,module,exports){
'use strict';

function Stream() {
  this._callbacks = {};
}

Stream.prototype.on = function (event, callback) {
  if (!this._callbacks[event]) {
    this._callbacks[event] = [];
  }

  this._callbacks[event].push(callback);
};

Stream.prototype.write = function (data) {
  this.emmit('data', data);
};

Stream.prototype.emmit = function (event, data) {
  var callbacks = this._callbacks[event];

  if (callbacks) {
    callbacks.forEach(function (callback) {
      callback(data);
    });
  }
};

module.exports = Stream;

},{}],"zsh.js":[function(require,module,exports){
module.exports=require('F2/ljt');
},{}],"F2/ljt":[function(require,module,exports){
(function (global){
'use strict';

var CommandManager = require('./command-manager');
var REPL = require('./REPL');
var Stream = require('./stream');
var bindFullScreen = require('./full-screen');
var FS = require('./fs');

var ZSH = {
  argsParser: require('./args-parser'),
  commandManager: require('./command-manager'),
  Console: require('./console'),
  file: require('./file'),
  fs: require('./fs'),
  localStorage: require('./local-storage'),
  repl: require('./repl'),
  stream: require('./stream')
};

var pwd = function () {
  return FS.currentPath.replace(FS.home, '~');
};

ZSH.$PS1 = function () {
  return '<span class="who">guest</span> ' +
    'on ' +
    '<span class="where">' + pwd() + '</span> '+
    '<span class="branch">±master</span>&gt;';
};

ZSH.prompt = function () {
  var row = document.createElement('div');

  var span = document.createElement('span');
  span.className = 'ps1';
  span.innerHTML = ZSH.$PS1();


  var code = document.createElement('span');
  code.className = 'code';

  row.appendChild(span);
  row.appendChild(code);

  ZSH.container.appendChild(row);

  REPL.use(code, ZSH);

  ZSH.status(pwd());

  ZSH.scroll();

  row.appendChild(ZSH.input);

  ZSH.input.focus();
};

ZSH.status = function(text) {
  if (this.statusbar) {
    this.statusbar.innerText = text;
  }
};

ZSH.init = function (container, statusbar) {
  this.rootContainer = this.container = container;
  this.statusbar = statusbar;
  this.initializeInput();
  this.prompt();
  bindFullScreen(this.container.parentElement, this.scroll);
};

ZSH.initializeInput = function () {
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
};

ZSH.create = function (container) {
  if (typeof container === 'string') {
    container = document.getElementById(container);
  }

  container.innerHTML =
    '<div class="terminal">' +
      '<div class="bar">' +
        '<div class="buttons">' +
          '<a class="close" href="#"></a>' +
          '<a class="minimize" href="#"></a>' +
          '<a class="maximize" href="#"></a>' +
        '</div>' +
        '<div class="title">' +
        '</div>' +
        '<a class="full-screen" href="#"></a>' +
      '</div>' +
      '<div class="content">' +
      '</div>' +
      '<div class="status-bar">' +
      '</div>' +
    '</div>';

  this.init(container.querySelector('.content'),
            container.querySelector('.status-bar'));
};

ZSH.update = function () {
  var codes = this.container.getElementsByClassName('code');

  if (!codes.length) {
    this.prompt();
  } else {
    REPL.use(codes[codes.length - 1], ZSH);
  }
};

function output (_output, _class) {
  var out = document.createElement('div');
  out.className = 'code ' + [_class];
  out.innerHTML = _output;

  ZSH.container.appendChild(out);
  ZSH.scroll();
}

ZSH.stdout = new Stream();
ZSH.stdout.on('data', function (data) {
  output(data.toString(), 'stdout');
});

ZSH.stderr = new Stream();
ZSH.stderr.on('data', function (data) {
  output(data.toString(), 'stderr');
});

ZSH.scroll = function () {
  setTimeout(function () {
    ZSH.rootContainer.scrollTop = ZSH.rootContainer.scrollHeight;
  }, 0);
};

ZSH.clear = function () {
  ZSH.container.innerHTML = '';
  ZSH.prompt();
};

CommandManager.register('clear', ZSH.clear);

(typeof require === 'undefined' ? window : global).ZSH = ZSH;
module.exports = ZSH;

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./REPL":1,"./args-parser":"3ed2tT","./command-manager":"8EyLTk","./console":"CjB+4o","./file":"bMs+/F","./fs":"dDj8kd","./full-screen":13,"./local-storage":14,"./repl":15,"./stream":16}]},{},["F2/ljt"])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy90YWRldS93d3cvanMvenNoX2pzL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy90YWRldS93d3cvanMvenNoX2pzL2xpYi9SRVBMLmpzIiwiL1VzZXJzL3RhZGV1L3d3dy9qcy96c2hfanMvbGliL2FyZ3MtcGFyc2VyLmpzIiwiL1VzZXJzL3RhZGV1L3d3dy9qcy96c2hfanMvbGliL2NvbW1hbmQtbWFuYWdlci5qcyIsIi9Vc2Vycy90YWRldS93d3cvanMvenNoX2pzL2xpYi9jb25zb2xlLmpzIiwiL1VzZXJzL3RhZGV1L3d3dy9qcy96c2hfanMvbGliL2ZpbGUtc3lzdGVtLmpzb24iLCIvVXNlcnMvdGFkZXUvd3d3L2pzL3pzaF9qcy9saWIvZmlsZS5qcyIsIi9Vc2Vycy90YWRldS93d3cvanMvenNoX2pzL2xpYi9mcy5qcyIsIi9Vc2Vycy90YWRldS93d3cvanMvenNoX2pzL2xpYi9mdWxsLXNjcmVlbi5qcyIsIi9Vc2Vycy90YWRldS93d3cvanMvenNoX2pzL2xpYi9sb2NhbC1zdG9yYWdlLmpzIiwiL1VzZXJzL3RhZGV1L3d3dy9qcy96c2hfanMvbGliL3N0cmVhbS5qcyIsIi9Vc2Vycy90YWRldS93d3cvanMvenNoX2pzL2xpYi96c2guanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ2pVQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUM3SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDbExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQy9JQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdktBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8vIGpzaGludCBiaXR3aXNlOiBmYWxzZVxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgQ29tbWFuZE1hbmFnZXIgPSByZXF1aXJlKCcuL2NvbW1hbmQtbWFuYWdlcicpO1xudmFyIExvY2FsU3RvcmFnZSA9IHJlcXVpcmUoJy4vbG9jYWwtc3RvcmFnZScpO1xudmFyIEZTID0gcmVxdWlyZSgnLi9mcycpO1xuXG52YXIgUkVQTF9NT0RFX0RFRkFVTFQgPSAxO1xuXG4vKiBUT0RPOiBJbXBsZW1lbnQgVkkgYmluZGluZ3NcbiAqIHZhciBSRVBMX01PREVfVkkgPSAxO1xuICogdmFyIEVTQyA9IDI3O1xuICovXG5cbnZhciBMRUZUID0gMzc7XG52YXIgVVAgPSAzODtcbnZhciBSSUdIVCA9IDM5O1xudmFyIERPV04gPSA0MDtcblxudmFyIFRBQiA9IDk7XG52YXIgRU5URVIgPSAxMztcbnZhciBCQUNLU1BBQ0UgPSA4O1xudmFyIFNQQUNFID0gMzI7XG5cbnZhciBISVNUT1JZX1NUT1JBR0VfS0VZID0gJ1RFUk1JTkFMX0hJU1RPUlknO1xudmFyIEhJU1RPUllfU0laRSA9IDEwMDtcbnZhciBISVNUT1JZX1NFUEFSQVRPUiA9ICclJUhJU1RPUllfU0VQQVJBVE9SJSUnO1xuXG52YXIgUkVQTCA9IHdpbmRvdy5SRVBMID0ge1xuICBtb2RlOiBSRVBMX01PREVfREVGQVVMVCxcbiAgaW5wdXQ6ICcnLFxuICBpbmRleDogMCxcbiAgbGlzdGVuZXJzOiB7fSxcbiAgbGFzdEtleTogbnVsbCxcbn07XG5cblJFUEwuX2hpc3RvcnkgPSAoW0xvY2FsU3RvcmFnZS5nZXRJdGVtKEhJU1RPUllfU1RPUkFHRV9LRVkpXSsnJykuc3BsaXQoSElTVE9SWV9TRVBBUkFUT1IpLmZpbHRlcihTdHJpbmcpO1xuUkVQTC5oaXN0b3J5ID0gUkVQTC5faGlzdG9yeS5zbGljZSgwKSB8fCBbXTtcblJFUEwuaGlzdG9yeUluZGV4ID0gUkVQTC5oaXN0b3J5Lmxlbmd0aDtcblxuUkVQTC5vbiA9IGZ1bmN0aW9uKGV2ZW50LCBjYWxsYmFjaykge1xuICAoKHRoaXMubGlzdGVuZXJzW2V2ZW50XSA9IHRoaXMubGlzdGVuZXJzW2V2ZW50XSB8fCBbXSkpLnB1c2goY2FsbGJhY2spO1xufTtcblxuUkVQTC5jYXJldCA9IChmdW5jdGlvbiAoKSB7XG4gIHZhciBjYXJldCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgY2FyZXQuY2xhc3NOYW1lID0gJ2NhcmV0JztcblxuICByZXR1cm4gY2FyZXQ7XG59KCkpO1xuXG5SRVBMLnVzZSA9IGZ1bmN0aW9uIChzcGFuLCB6c2gpIHtcbiAgaWYgKHRoaXMuc3Bhbikge1xuICAgIHRoaXMucmVtb3ZlQ2FyZXQoKTtcbiAgfVxuXG4gIHRoaXMuc3BhbiA9IHNwYW47XG4gIHRoaXMuenNoID0genNoO1xuXG4gIHdpbmRvdy5vbmtleWRvd24gPSB0aGlzLnBhcnNlO1xuXG4gIHRoaXMud3JpdGUoKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cblJFUEwucGFyc2UgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgaWYgKGV2ZW50Lm1ldGFLZXkpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gIHN3aXRjaCAoZXZlbnQua2V5Q29kZSkge1xuICAgIGNhc2UgTEVGVDpcbiAgICAgIGNhc2UgUklHSFQ6XG4gICAgICBSRVBMLm1vdmVDYXJldChldmVudC5rZXlDb2RlKTtcbiAgICBicmVhaztcbiAgICBjYXNlIFVQOlxuICAgICAgY2FzZSBET1dOOlxuICAgICAgUkVQTC5uYXZpZ2F0ZUhpc3RvcnkoZXZlbnQua2V5Q29kZSk7XG4gICAgYnJlYWs7XG4gICAgY2FzZSBUQUI6XG4gICAgICBSRVBMLmF1dG9jb21wbGV0ZSgpO1xuICAgIGJyZWFrO1xuICAgIGNhc2UgRU5URVI6XG4gICAgICBSRVBMLnN1Ym1pdCgpO1xuICAgIGJyZWFrO1xuICAgIGNhc2UgQkFDS1NQQUNFOlxuICAgICAgUkVQTC5iYWNrc3BhY2UoKTtcbiAgICBicmVhaztcbiAgICBkZWZhdWx0OlxuICAgICAgaWYgKGV2ZW50LmN0cmxLZXkpIHtcbiAgICAgICAgUkVQTC5hY3Rpb24oZXZlbnQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgUkVQTC51cGRhdGUoZXZlbnQpO1xuICAgICAgfVxuICB9XG59O1xuXG5SRVBMLm1vdmVDYXJldCA9IGZ1bmN0aW9uIChkaXJlY3Rpb24pIHtcbiAgaWYgKGRpcmVjdGlvbiA9PT0gTEVGVCkge1xuICAgIHRoaXMuaW5kZXggPSBNYXRoLm1heCh0aGlzLmluZGV4IC0gMSwgMCk7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5pbmRleCA9IE1hdGgubWluKHRoaXMuaW5kZXggKyAxLCB0aGlzLmlucHV0Lmxlbmd0aCArIDEpO1xuICB9XG4gIHRoaXMud3JpdGUoKTtcbn07XG5cblJFUEwuYXV0b2NvbXBsZXRlID0gZnVuY3Rpb24gKCkge1xuICB2YXIgb3B0aW9ucztcbiAgdmFyIHBhdGggPSBmYWxzZTtcblxuICBpZiAodGhpcy5jb21tYW5kKCkgPT09IHRoaXMuaW5wdXQpIHtcbiAgICBvcHRpb25zID0gQ29tbWFuZE1hbmFnZXIuYXV0b2NvbXBsZXRlKHRoaXMuY29tbWFuZCgpKTtcbiAgfSBlbHNlIHtcbiAgICBwYXRoID0gdGhpcy5pbnB1dC5zcGxpdCgnICcpLnBvcCgpO1xuICAgIG9wdGlvbnMgPSBGUy5hdXRvY29tcGxldGUocGF0aCk7XG4gIH1cblxuICBpZiAob3B0aW9ucy5sZW5ndGggPT09IDEpIHtcbiAgICBpZiAocGF0aCAhPT0gZmFsc2UpIHtcbiAgICAgIHBhdGggPSBwYXRoLnNwbGl0KCcvJyk7XG4gICAgICBwYXRoLnBvcCgpO1xuICAgICAgcGF0aC5wdXNoKCcnKTtcblxuICAgICAgdGhpcy5pbnB1dCA9IHRoaXMuaW5wdXQucmVwbGFjZSgvIFteIF0qJC8sICcgJyArIHBhdGguam9pbignLycpICsgb3B0aW9ucy5zaGlmdCgpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5pbnB1dCA9IG9wdGlvbnMuc2hpZnQoKSArICcgJztcbiAgICB9XG5cbiAgICB0aGlzLmluZGV4ID0gdGhpcy5pbnB1dC5sZW5ndGg7XG4gICAgdGhpcy53cml0ZSgpO1xuICB9IGVsc2UgaWYgKG9wdGlvbnMubGVuZ3RoKXtcbiAgICB0aGlzLnpzaC5zdGRvdXQud3JpdGUob3B0aW9ucy5qb2luKCcgJykpO1xuICAgIHRoaXMuenNoLnByb21wdCgpO1xuICB9XG59O1xuXG5SRVBMLm5hdmlnYXRlSGlzdG9yeSA9IGZ1bmN0aW9uIChkaXJlY3Rpb24pIHtcbiAgaWYgKGRpcmVjdGlvbiA9PT0gVVApIHtcbiAgICB0aGlzLmhpc3RvcnlJbmRleCA9IE1hdGgubWF4KHRoaXMuaGlzdG9yeUluZGV4IC0gMSwgMCk7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5oaXN0b3J5SW5kZXggPSBNYXRoLm1pbih0aGlzLmhpc3RvcnlJbmRleCArIDEsIHRoaXMuaGlzdG9yeS5sZW5ndGggLSAxKTtcbiAgfVxuXG4gIHRoaXMuaW5wdXQgPSB0aGlzLmhpc3RvcnlbdGhpcy5oaXN0b3J5SW5kZXhdIHx8ICcnO1xuICB0aGlzLmluZGV4ID0gdGhpcy5pbnB1dC5sZW5ndGg7XG4gIHRoaXMud3JpdGUoKTtcbn07XG5cblJFUEwuc3VibWl0ID0gZnVuY3Rpb24gKHByZXZlbnRXcml0ZSkge1xuICB0aGlzLmluZGV4ID0gdGhpcy5pbnB1dC5sZW5ndGg7XG5cbiAgaWYgKCFwcmV2ZW50V3JpdGUpIHtcbiAgICB0aGlzLndyaXRlKCk7XG4gIH1cblxuICB2YXIgaW5wdXQgPSB0aGlzLmlucHV0LnRyaW0oKTtcblxuICBpZiAoaW5wdXQgJiYgaW5wdXQgIT09IHRoaXMuX2hpc3RvcnlbdGhpcy5faGlzdG9yeS5sZW5ndGggLSAxXSkge1xuICAgIHRoaXMuX2hpc3RvcnlbdGhpcy5faGlzdG9yeS5sZW5ndGhdID0gaW5wdXQ7XG4gICAgTG9jYWxTdG9yYWdlLnNldEl0ZW0oSElTVE9SWV9TVE9SQUdFX0tFWSwgdGhpcy5faGlzdG9yeS5zbGljZSgtSElTVE9SWV9TSVpFKS5qb2luKEhJU1RPUllfU0VQQVJBVE9SKSk7XG4gIH1cblxuICB0aGlzLmhpc3RvcnkgPSB0aGlzLl9oaXN0b3J5LnNsaWNlKDApO1xuICB0aGlzLmhpc3RvcnlJbmRleCA9IHRoaXMuaGlzdG9yeS5sZW5ndGg7XG5cbiAgdGhpcy5jbGVhcigpO1xuXG4gIGlmIChpbnB1dCkge1xuICAgIENvbW1hbmRNYW5hZ2VyLnBhcnNlKGlucHV0LFxuICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuenNoLnN0ZGluLFxuICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuenNoLnN0ZG91dCxcbiAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnpzaC5zdGRlcnIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy56c2gucHJvbXB0KTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLnpzaC5wcm9tcHQoKTtcbiAgfVxufTtcblxuUkVQTC50cmlnZ2VyID0gZnVuY3Rpb24oZXZ0LCBtc2cpIHtcbiAgdmFyIGNhbGxiYWNrcyA9IHRoaXMubGlzdGVuZXJzW2V2dF0gfHwgW107XG5cbiAgY2FsbGJhY2tzLmZvckVhY2goZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgY2FsbGJhY2sobXNnKTtcbiAgfSk7XG59O1xuXG5SRVBMLnJlbW92ZUNhcmV0ID0gZnVuY3Rpb24gKCkge1xuICB2YXIgY2FyZXQgPSB0aGlzLnNwYW4uZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSgnY2FyZXQnKTtcblxuICBpZiAoY2FyZXQgJiYgY2FyZXRbMF0pIHtcbiAgICBjYXJldFswXS5yZW1vdmUoKTtcbiAgfVxufTtcblxuUkVQTC5jbGVhciA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5pbnB1dCA9ICcnO1xuICB0aGlzLmluZGV4ID0gMDtcbn07XG5cblJFUEwuYmFja3NwYWNlID0gZnVuY3Rpb24gKCkge1xuICBpZiAodGhpcy5pbmRleCA+IDApIHtcbiAgICB0aGlzLmlucHV0ID0gdGhpcy5pbnB1dC5zdWJzdHIoMCwgdGhpcy5pbmRleCAtIDEpICsgdGhpcy5pbnB1dC5zdWJzdHIodGhpcy5pbmRleCk7XG4gICAgdGhpcy5pbmRleC0tO1xuICAgIHRoaXMud3JpdGUoKTtcbiAgfVxufTtcblxuUkVQTC5hY3R1YWxDaGFyQ29kZSA9IGZ1bmN0aW9uIChldmVudCkge1xuICB2YXIgb3B0aW9ucztcbiAgdmFyIGNvZGUgPSBldmVudC5rZXlDb2RlO1xuXG4gIGNvZGUgPSB7XG4gICAgMTczOiAxODlcbiAgfVtjb2RlXSB8fCBjb2RlO1xuXG4gIGlmIChjb2RlID49IDY1ICYmIGNvZGUgPD0gOTApIHtcbiAgICBpZiAoIWV2ZW50LnNoaWZ0S2V5KSB7XG4gICAgICBjb2RlICs9IDMyO1xuICAgIH1cbiAgfSBlbHNlIGlmIChjb2RlID49IDQ4ICYmIGNvZGUgPD0gNTcpIHtcbiAgICBpZiAoZXZlbnQuc2hpZnRLZXkpIHtcbiAgICAgIGNvZGUgPSAnKSFAIyQlXiYqKCcuY2hhckNvZGVBdChjb2RlIC0gNDgpO1xuICAgIH1cbiAgfSBlbHNlIGlmIChjb2RlID49IDE4NiAmJiBjb2RlIDw9IDE5Mil7XG4gICAgb3B0aW9ucyA9ICc7PSwtLi9gOis8Xz4/fic7XG5cbiAgICBjb2RlIC09IDE4NjtcblxuICAgIGlmIChldmVudC5zaGlmdEtleSkge1xuICAgICAgY29kZSArPSBvcHRpb25zLmxlbmd0aCAvIDI7XG4gICAgfVxuXG4gICAgY29kZSA9IG9wdGlvbnMuY2hhckNvZGVBdChjb2RlKTtcbiAgfSBlbHNlIGlmIChjb2RlID49IDIxOSAmJiBjb2RlIDw9IDIyMikge1xuICAgIG9wdGlvbnMgPSAnW1xcXFxdXFwne3x9XCInO1xuICAgIGNvZGUgLT0gMjE5O1xuXG4gICAgaWYgKGV2ZW50LnNoaWZ0S2V5KSB7XG4gICAgICBjb2RlICs9IG9wdGlvbnMubGVuZ3RoIC8gMjtcbiAgICB9XG5cbiAgICBjb2RlID0gb3B0aW9ucy5jaGFyQ29kZUF0KGNvZGUpO1xuICB9IGVsc2UgaWYgKGNvZGUgIT09IFNQQUNFKSB7XG4gICAgY29kZSA9IC0xO1xuICB9XG5cbiAgcmV0dXJuIGNvZGU7XG59O1xuXG5SRVBMLmFjdGlvbiA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gIGlmIChTdHJpbmcuZnJvbUNoYXJDb2RlKGV2ZW50LmtleUNvZGUpID09PSAnQycpIHtcbiAgICB0aGlzLmluZGV4ID0gdGhpcy5pbnB1dC5sZW5ndGg7XG4gICAgdGhpcy53cml0ZSgpO1xuICAgIHRoaXMuaW5wdXQgPSAnJztcbiAgICB0aGlzLnN1Ym1pdCh0cnVlKTtcbiAgfVxufTtcblxuUkVQTC51cGRhdGUgPSBmdW5jdGlvbihldmVudCkge1xuICB2YXIgY29kZSA9IHRoaXMuYWN0dWFsQ2hhckNvZGUoZXZlbnQpO1xuXG4gIGlmICghfmNvZGUpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICB2YXIgY2hhciA9IFN0cmluZy5mcm9tQ2hhckNvZGUoY29kZSk7XG5cbiAgdGhpcy5pbnB1dCA9IHRoaXMuaW5wdXQuc3Vic3RyKDAsIHRoaXMuaW5kZXgpICsgY2hhciArIHRoaXMuaW5wdXQuc3Vic3RyKHRoaXMuaW5kZXgpO1xuICB0aGlzLmluZGV4Kys7XG4gIHRoaXMud3JpdGUoKTtcbn07XG5cblJFUEwuY29tbWFuZCA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKHRoaXMuaW5wdXQgIT09IHRoaXMuX19pbnB1dENvbW1hbmQpIHtcbiAgICB0aGlzLl9faW5wdXRDb21tYW5kID0gdGhpcy5pbnB1dDtcbiAgICB0aGlzLl9fY29tbWFuZCA9IHRoaXMuaW5wdXQuc3BsaXQoJyAnKS5zaGlmdCgpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXMuX19jb21tYW5kO1xufTtcblxuUkVQTC5jb21tYW5kQXJnc1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKHRoaXMuaW5wdXQgIT09IHRoaXMuX19pbnB1dENBcmdzKSB7XG4gICAgdGhpcy5fX2lucHV0Q0FyZ3MgPSB0aGlzLmlucHV0O1xuICAgIHRoaXMuX19jYXJncyA9IHRoaXMuaW5wdXQuc3Vic3RyKHRoaXMuY29tbWFuZCgpLmxlbmd0aCk7XG4gIH1cblxuICByZXR1cm4gdGhpcy5fX2NhcmdzO1xufTtcblxuUkVQTC53cml0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5oaXN0b3J5W3RoaXMuaGlzdG9yeUluZGV4XSA9IHRoaXMuaW5wdXQ7XG4gIHRoaXMuY2FyZXQuaW5uZXJIVE1MID0gdGhpcy5pbnB1dFt0aGlzLmluZGV4XSB8fCAnJztcblxuICB2YXIgc3BhbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgdmFyIGNvbW1hbmQgPSB0aGlzLmNvbW1hbmQoKTtcbiAgdmFyIGlucHV0ID0gdGhpcy5jb21tYW5kQXJnc1N0cmluZygpO1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgdmFyIHB1dENhcmV0ID0gZnVuY3Rpb24gKHN0ciwgaW5kZXgpIHtcbiAgICBzZWxmLmNhcmV0LmlubmVyVGV4dCA9IHN0cltpbmRleF0gfHwgJyAnO1xuICAgIHJldHVybiBzdHIuc3Vic3RyKDAsIGluZGV4KSArIHNlbGYuY2FyZXQub3V0ZXJIVE1MICsgc3RyLnN1YnN0cihpbmRleCArIDEpO1xuICB9O1xuXG4gIHNwYW4uY2xhc3NOYW1lID0gQ29tbWFuZE1hbmFnZXIuaXNWYWxpZChjb21tYW5kKSA/ICd2YWxpZCcgOiAnaW52YWxpZCc7XG5cbiAgaWYgKHRoaXMuaW5kZXggPCBjb21tYW5kLmxlbmd0aCkge1xuICAgIGNvbW1hbmQgPSBwdXRDYXJldChjb21tYW5kLCB0aGlzLmluZGV4KTtcbiAgfSBlbHNlIHtcbiAgICBpbnB1dCA9IHB1dENhcmV0KGlucHV0LCB0aGlzLmluZGV4IC0gY29tbWFuZC5sZW5ndGgpO1xuICB9XG5cbiAgc3Bhbi5pbm5lckhUTUwgPSBjb21tYW5kO1xuXG4gIHRoaXMuc3Bhbi5pbm5lckhUTUwgPSBzcGFuLm91dGVySFRNTCArIGlucHV0O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBSRVBMO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQXJnc1BhcnNlciA9IHt9O1xuXG5BcmdzUGFyc2VyLnBhcnNlU3RyaW5ncyA9IGZ1bmN0aW9uKHJhd1N0cmluZykge1xuICB2YXIgX2FyZ3MgPSBbXTtcbiAgdmFyIHdvcmQgPSAnJztcbiAgdmFyIHN0cmluZyA9IGZhbHNlO1xuICB2YXIgaSwgbDtcblxuICBmb3IgKGkgPSAwLCBsID0gcmF3U3RyaW5nLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIHZhciBjaGFyID0gcmF3U3RyaW5nW2ldO1xuICAgIGlmIChjaGFyID09PSAnXCInIHx8IGNoYXIgPT09ICdcXCcnKSB7XG4gICAgICBpZiAoc3RyaW5nKSB7XG4gICAgICAgIGlmIChjaGFyID09PSBzdHJpbmcpIHtcbiAgICAgICAgICBpZiAocmF3U3RyaW5nW2ktMV0gPT09ICdcXFxcJykge1xuICAgICAgICAgICAgd29yZCA9IHdvcmQuc2xpY2UoMCwgLTEpICsgY2hhcjtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgX2FyZ3MucHVzaCh3b3JkKTtcbiAgICAgICAgICAgIHdvcmQgPSAnJztcbiAgICAgICAgICAgIHN0cmluZyA9IG51bGw7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHdvcmQgKz0gY2hhcjtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3RyaW5nID0gY2hhcjtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGNoYXIgPT09ICcgJyAmJiAhc3RyaW5nKSB7XG4gICAgICBfYXJncy5wdXNoKHdvcmQpO1xuICAgICAgd29yZCA9ICcnO1xuICAgIH0gZWxzZSB7XG4gICAgICB3b3JkICs9IGNoYXI7XG4gICAgfVxuICB9XG5cbiAgaWYgKHN0cmluZykge1xuICAgIHRocm93IG5ldyBFcnJvcigndW50ZXJtaW5hdGVkIHN0cmluZycpO1xuICB9IGVsc2UgaWYgKHdvcmQpIHtcbiAgICBfYXJncy5wdXNoKHdvcmQpO1xuICB9XG5cbiAgcmV0dXJuIF9hcmdzO1xufTtcblxuQXJnc1BhcnNlci5wYXJzZSA9IGZ1bmN0aW9uIChhcmdzKSB7XG4gIGFyZ3MgPSAoW2FyZ3NdICsgJycpLnRyaW0oKTtcblxuICB2YXIgb3V0ID0gIHtcbiAgICBhcmd1bWVudHM6IFtdLFxuICAgIG9wdGlvbnM6IHt9LFxuICAgIHJhdzogYXJnc1xuICB9O1xuXG4gIGFyZ3MgPSBBcmdzUGFyc2VyLnBhcnNlU3RyaW5ncyhhcmdzKTtcblxuICBmdW5jdGlvbiBhZGRPcHRpb24ob3B0aW9uLCB2YWx1ZSkge1xuICAgIG91dC5vcHRpb25zW29wdGlvbl0gPSB0eXBlb2YodmFsdWUpID09PSAnc3RyaW5nJyA/IHZhbHVlIDogdHJ1ZTtcbiAgfVxuXG4gIGZvciAodmFyIGkgPSAwLCBsID0gYXJncy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICB2YXIgYXJnID0gYXJnc1tpXTtcblxuICAgIGlmICghYXJnKSAge1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgaWYgKGFyZy5zdWJzdHIoMCwgMikgPT09ICctLScpIHtcbiAgICAgIHZhciBuZXh0ID0gYXJnc1tpKzFdO1xuICAgICAgaWYgKG5leHQgJiYgbmV4dFswXSAhPT0gJy0nKSB7XG4gICAgICAgIGFkZE9wdGlvbihhcmcuc3Vic3RyKDIpLCBuZXh0KTtcbiAgICAgICAgaSsrO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYWRkT3B0aW9uKGFyZy5zdWJzdHIoMikpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoYXJnWzBdID09PSAnLScpIHtcbiAgICAgIFtdLmZvckVhY2guY2FsbChhcmcuc3Vic3RyKDEpLCBhZGRPcHRpb24pO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXQuYXJndW1lbnRzLnB1c2goYXJnKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gb3V0O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBBcmdzUGFyc2VyO1xuIiwiLy8ganNoaW50IGV2aWw6IHRydWUsIGJpdHdpc2U6IGZhbHNlXG4ndXNlIHN0cmljdCc7XG5cbnZhciBBcmdzUGFyc2VyID0gcmVxdWlyZSgnLi9hcmdzLXBhcnNlcicpO1xudmFyIEZTID0gcmVxdWlyZSgnLi9mcycpO1xudmFyIEZpbGUgPSByZXF1aXJlKCcuL2ZpbGUnKTtcbnZhciBTdHJlYW0gPSByZXF1aXJlKCcuL3N0cmVhbScpO1xuXG52YXIgcGF0aCA9IEZpbGUub3BlbignL3Vzci9iaW4nKTtcbnZhciBsb2FkID0gZnVuY3Rpb24gKGNtZCkge1xuICB2YXIgc291cmNlID0gcGF0aC5vcGVuKGNtZCArICcuanMnKTtcbiAgdmFyIGZuO1xuICBpZiAoIXNvdXJjZS5pc0ZpbGUoKSkge1xuICAgIGZuID0gZmFsc2U7XG4gIH0gZWxzZSB7XG4gICAgZm4gPSBldmFsKCcoZnVuY3Rpb24gKCkgeyAnICsgc291cmNlLnJlYWQoKSArICd9KScpKCk7XG4gIH1cbiAgcmV0dXJuIGZuO1xufTtcblxudmFyIENvbW1hbmRNYW5hZ2VyID0ge1xuICBjb21tYW5kczoge30sXG4gIGFsaWFzZXM6IHt9LFxufTtcblxuQ29tbWFuZE1hbmFnZXIuaXNWYWxpZCA9IGZ1bmN0aW9uIChjbWQpIHtcbiAgcmV0dXJuICEhKHRoaXMuY29tbWFuZHNbY21kXSB8fCB0aGlzLmFsaWFzZXNbY21kXSB8fCBsb2FkKGNtZCkpO1xufTtcblxuQ29tbWFuZE1hbmFnZXIuYXV0b2NvbXBsZXRlID0gZnVuY3Rpb24gKGNtZCkge1xuICB2YXIgbWF0Y2hlcyA9IFtdO1xuICBjbWQgPSBjbWQudG9Mb3dlckNhc2UoKTtcblxuICAoT2JqZWN0LmtleXModGhpcy5jb21tYW5kcykuY29uY2F0KE9iamVjdC5rZXlzKHRoaXMuYWxpYXNlcykpKS5mb3JFYWNoKGZ1bmN0aW9uIChjb21tYW5kKSB7XG4gICAgaWYgKGNvbW1hbmQuc3Vic3RyKDAsIGNtZC5sZW5ndGgpLnRvTG93ZXJDYXNlKCkgPT09IGNtZCkge1xuICAgICAgbWF0Y2hlcy5wdXNoKGNvbW1hbmQpO1xuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIG1hdGNoZXM7XG59O1xuQ29tbWFuZE1hbmFnZXIucGFyc2UgPSBmdW5jdGlvbiAoY21kLCBzdGRpbiwgc3Rkb3V0LCBzdGRlcnIsIG5leHQpIHtcbiAgaWYgKH5jbWQuaW5kZXhPZignfCcpKSB7XG4gICAgY21kID0gY21kLnNwbGl0KCd8Jyk7XG4gICAgY21kLmZvckVhY2goQ29tbWFuZE1hbmFnZXIucGFyc2UpO1xuICB9XG5cbiAgY21kID0gY21kLnNwbGl0KCcgJyk7XG4gIHZhciBjb21tYW5kID0gY21kLnNoaWZ0KCk7XG4gIHZhciBhcmdzID0gY21kLmpvaW4oJyAnKTtcblxuICB2YXIgaW5kZXg7XG5cbiAgaWYgKH4oaW5kZXggPSBhcmdzLmluZGV4T2YoJz4nKSkpIHtcbiAgICB2YXIgcHJldiA9IGFyZ3NbaW5kZXgtMV07XG4gICAgdmFyIGFwcGVuZCA9IGFyZ3NbaW5kZXgrMV0gPT09ICc+JztcbiAgICB2YXIgaW5pdCA9IGluZGV4O1xuXG4gICAgaWYgKH4oWycxJywnMicsJyYnXSkuaW5kZXhPZihwcmV2KSkge1xuICAgICAgaW5pdC0tO1xuICAgIH1cblxuICAgIHZhciBfYXJncyA9IGFyZ3Muc3Vic3RyKDAsIGluaXQpO1xuICAgIGFyZ3MgPSBhcmdzLnN1YnN0cihpbmRleCthcHBlbmQrMSkuc3BsaXQoJyAnKS5maWx0ZXIoU3RyaW5nKTtcbiAgICB2YXIgcGF0aCA9IGFyZ3Muc2hpZnQoKTtcbiAgICBhcmdzID0gX2FyZ3MgKyBhcmdzLmpvaW4oJyAnKTtcblxuICAgIGlmICghcGF0aCkge1xuICAgICAgc3Rkb3V0LndyaXRlKCd6c2g6IHBhcnNlIGVycm9yIG5lYXIgYFxcXFxuXFwnJyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIGZpbGUgPSBGaWxlLm9wZW4ocGF0aCk7XG5cbiAgICBpZiAoIWZpbGUucGFyZW50RXhpc3RzKCkpIHtcbiAgICAgIHN0ZG91dC53cml0ZSgnenNoOiBubyBzdWNoIGZpbGUgb3IgZGlyZWN0b3J5OiAnICsgZmlsZS5wYXRoKTtcbiAgICAgIHJldHVybjtcbiAgICB9IGVsc2UgaWYgKCFmaWxlLmlzVmFsaWQoKSkge1xuICAgICAgc3Rkb3V0LndyaXRlKCd6c2g6IG5vdCBhIGRpcmVjdG9yeTogJyArIGZpbGUucGF0aCk7XG4gICAgICByZXR1cm47XG4gICAgfSBlbHNlIGlmIChmaWxlLmlzRGlyKCkpIHtcbiAgICAgIHN0ZG91dC53cml0ZSgnenNoOiBpcyBhIGRpcmVjdG9yeTogJyArIGZpbGUucGF0aCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKCFhcHBlbmQpIHtcbiAgICAgIGZpbGUuY2xlYXIoKTtcbiAgICB9XG5cbiAgICB2YXIgX3N0ZG91dCA9IG5ldyBTdHJlYW0oKTtcbiAgICBfc3Rkb3V0Lm9uKCdkYXRhJywgZnVuY3Rpb24oZGF0YSkge1xuICAgICAgZmlsZS53cml0ZShkYXRhICsgJ1xcbicsIHRydWUsIHRydWUpO1xuICAgIH0pO1xuXG4gICAgaWYgKHByZXYgIT09ICcyJykge1xuICAgICAgc3Rkb3V0ID0gX3N0ZG91dDtcbiAgICB9XG5cbiAgICBpZiAocHJldiA9PT0gJzInIHx8IHByZXYgPT09ICcmJykge1xuICAgICAgc3RkZXJyID0gX3N0ZG91dDtcbiAgICB9XG5cbiAgICB2YXIgX25leHQgPSBuZXh0O1xuICAgIG5leHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICBGUy53cml0ZUZTKCk7XG4gICAgICBfbmV4dCgpO1xuICAgIH07XG4gIH1cblxuICBDb21tYW5kTWFuYWdlci5leGVjKGNvbW1hbmQsIGFyZ3MsIHN0ZGluLCBzdGRvdXQsIHN0ZGVyciwgbmV4dCk7XG59O1xuXG5Db21tYW5kTWFuYWdlci5leGVjID0gZnVuY3Rpb24gKGNtZCwgYXJncywgc3RkaW4sIHN0ZG91dCwgc3RkZXJyLCBuZXh0KSB7XG4gIGlmICh0aGlzLmFsaWFzZXNbY21kXSkge1xuICAgIHZhciBsaW5lID0gKHRoaXMuYWxpYXNlc1tjbWRdICsgJyAnICsgYXJncykudHJpbSgpLnNwbGl0KCcgJyk7XG4gICAgcmV0dXJuIHRoaXMuZXhlYyhsaW5lLnNoaWZ0KCksIGxpbmUuam9pbignICcpLCBzdGRpbiwgc3Rkb3V0LCBzdGRlcnIsIG5leHQpO1xuICB9XG5cbiAgdmFyIGZuO1xuICBpZiAodHlwZW9mIHRoaXMuY29tbWFuZHNbY21kXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIGZuID0gdGhpcy5jb21tYW5kc1tjbWRdO1xuICB9IGVsc2UgaWYgKChmbiA9IGxvYWQoY21kKSkpIHtcbiAgfSBlbHNlIHtcbiAgICBzdGRlcnIud3JpdGUoJ3pzaDogY29tbWFuZCBub3QgZm91bmQ6ICcgKyBjbWQpO1xuICAgIG5leHQoKTtcbiAgICByZXR1cm47XG4gIH1cblxuICB0cnkge1xuICAgIGFyZ3MgPSBBcmdzUGFyc2VyLnBhcnNlKGFyZ3MpO1xuICAgIGZuLmNhbGwodW5kZWZpbmVkLCBhcmdzLCBzdGRpbiwgc3Rkb3V0LCBzdGRlcnIsIG5leHQpO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICBzdGRlcnIud3JpdGUoZXJyLnN0YWNrKTtcbiAgICBuZXh0KCk7XG4gIH1cbn07XG5cbkNvbW1hbmRNYW5hZ2VyLnJlZ2lzdGVyID0gZnVuY3Rpb24gKGNtZCwgZm4pIHtcbiAgdGhpcy5jb21tYW5kc1tjbWRdID0gZm47XG59O1xuXG5Db21tYW5kTWFuYWdlci5hbGlhcyA9IGZ1bmN0aW9uIChjbWQsIG9yaWdpbmFsKSB7XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIHRoaXMuYWxpYXNlcztcbiAgfVxuICB0aGlzLmFsaWFzZXNbY21kXSA9IG9yaWdpbmFsO1xufTtcblxuQ29tbWFuZE1hbmFnZXIudW5hbGlhcyA9IGZ1bmN0aW9uIChjbWQpIHtcbiAgZGVsZXRlIHRoaXMuYWxpYXNlc1tjbWRdO1xufTtcblxuQ29tbWFuZE1hbmFnZXIuZ2V0ID0gZnVuY3Rpb24oY21kKSB7XG4gIHJldHVybiB0aGlzLmNvbW1hbmRzW2NtZF07XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbW1hbmRNYW5hZ2VyO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgenNoID0gcmVxdWlyZSgnLi96c2gnKTtcblxudmFyIENvbnNvbGUgPSAoZnVuY3Rpb24gKCkge1xuICBmdW5jdGlvbiBDb25zb2xlKHN0ZG91dCwgc3RkZXJyKSB7XG4gICAgdGhpcy5zdGRvdXQgPSBzdGRvdXQ7XG4gICAgdGhpcy5zdGRlcnIgPSBzdGRlcnI7XG4gICAgdGhpcy5leHRlcm5hbCA9IHR5cGVvZiBjb25zb2xlID09PSAndW5kZWZpbmVkJyA/IHt9IDogd2luZG93LmNvbnNvbGU7XG4gIH1cblxuICBmdW5jdGlvbiBzdHJpbmdpZnkoYXJncykge1xuICAgIHJldHVybiBbXS5tYXAuY2FsbChhcmdzLCBmdW5jdGlvbiAoYSkge1xuICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KGEpIHx8IFthXSsnJztcbiAgICB9KS5qb2luKCcgJyk7XG4gIH1cblxuICBDb25zb2xlLnByb3RvdHlwZS5sb2cgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5zdGRvdXQud3JpdGUoc3RyaW5naWZ5KGFyZ3VtZW50cykpO1xuICB9O1xuXG4gIENvbnNvbGUucHJvdG90eXBlLmVycm9yID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuc3RkZXJyLndyaXRlKHN0cmluZ2lmeShhcmd1bWVudHMpKTtcbiAgfTtcblxuICBDb25zb2xlLnByb3RvdHlwZS5jbGVhciA9IGZ1bmN0aW9uICgpIHtcbiAgICB6c2guY2xlYXIoKTtcbiAgfTtcblxuICByZXR1cm4gQ29uc29sZTtcbn0pKCk7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBDb25zb2xlO1xuIiwibW9kdWxlLmV4cG9ydHM9e1xuICBcIm10aW1lXCI6IFwiMjAxNC0wMy0wMlQxMjozMToxMC4wMDBaXCIsXG4gIFwiY3RpbWVcIjogXCIyMDE0LTAzLTAyVDEyOjMxOjEwLjAwMFpcIixcbiAgXCJjb250ZW50XCI6IHtcbiAgICBcIlVzZXJzXCI6IHtcbiAgICAgIFwibXRpbWVcIjogXCIyMDE0LTA1LTAzVDIzOjIxOjA5LjAwMFpcIixcbiAgICAgIFwiY3RpbWVcIjogXCIyMDE0LTA1LTAzVDIzOjIxOjA5LjAwMFpcIixcbiAgICAgIFwiY29udGVudFwiOiB7XG4gICAgICAgIFwiZ3Vlc3RcIjoge1xuICAgICAgICAgIFwibXRpbWVcIjogXCIyMDE0LTA3LTExVDIxOjUwOjM0LjAwMFpcIixcbiAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNC0wNy0xMVQyMTo1MDozNC4wMDBaXCIsXG4gICAgICAgICAgXCJjb250ZW50XCI6IHtcbiAgICAgICAgICAgIFwiLnZpbXJjXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTQtMDUtMDNUMjM6MjE6MDkuMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNC0wNS0wM1QyMzoyMTowOS4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcIlwiLFxuICAgICAgICAgICAgICBcInR5cGVcIjogXCJmXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcIi56c2hyY1wiOiB7XG4gICAgICAgICAgICAgIFwibXRpbWVcIjogXCIyMDE0LTA1LTAzVDIzOjIxOjA5LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjdGltZVwiOiBcIjIwMTQtMDUtMDNUMjM6MjE6MDkuMDAwWlwiLFxuICAgICAgICAgICAgICBcImNvbnRlbnRcIjogXCJcIixcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiZlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJhYm91dC5tZFwiOiB7XG4gICAgICAgICAgICAgIFwibXRpbWVcIjogXCIyMDE0LTA3LTExVDIxOjUwOjM0LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjdGltZVwiOiBcIjIwMTQtMDctMTFUMjE6NTA6MzQuMDAwWlwiLFxuICAgICAgICAgICAgICBcImNvbnRlbnRcIjogXCIjIHRhZGV1emFnYWxsby5jb21cXG5cXG4qIEFib3V0IG1lXFxuICBJJ20gYSBGdWxsIFN0YWNrIERldmVsb3BlciwgSlMgUGFzc2lvbmF0ZSwgUnVieSBGYW4sIEMrKyBTb21ldGhpbmcsIEdhbWUgRGV2ZWxvcG1lbnQgRW50aHVzaWFzdCxcXG4gIEFsd2F5cyB3aWxsaW5nIHRvIGNvbnRyaWJ1dGUgdG8gb3BlbiBzb3VyY2UgcHJvamVjdHMgYW5kIHRyeWluZyB0byBsZWFybiBzb21lIG1vcmUgbWF0aC5cXG5cXG4qIEFib3V0IHRoaXMgd2Vic2l0ZVxcbiAgSSB3YW50ZWQgbW9yZSB0aGFuIGp1c3Qgc2hvdyBteSB3b3JrLCBJIHdhbnRlZCB0byBzaG93IG15IHdvcmsgZW52aXJvbm1lbnQuXFxuICBTaW5jZSBJIGRvIHNvbWUgbW9iaWxlIGRldmVsb3BtZW50IGFzIHdlbGwgIEkgYWxzbyB1c2UgKHNhZGx5KSBzb21lIElERXMsIGJ1dCBhbHdheXMgdHJ5aW5nXFxuICB0byBkbyBhcyBtdWNoIGFzIEkgY2FuIG9uIHRoaXMgdGVybWluYWwsIHNvIEkgbWFkZSBhIHZlcnkgc2ltaWxhciBjb3B5IChhdCBsZWFzdCB2aXN1YWxseSlcXG4gIG9mIGl0IHNvIHBlb3BsZSBjb3VsZCBnZXQgdG8gc2VlIHdoYXQgSSBkbyBhbmQgaG93IEkgKHVzdWFsbHkpIGRvLlxcblxcbiogQ29tbWFuZHNcXG4gIElmIHlvdSB3YW50IHRvIGtub3cgbW9yZSBhYm91dCBtZSwgdGhlcmUgYXJlIGEgZmV3IGNvbW1hbmRzOlxcbiAgICAqIGFib3V0ICAoY3VycmVudGx5IHJ1bm5pbmcpXFxuICAgICogY29udGFjdCBcXG4gICAgKiByZXN1bWVcXG4gICAgKiBwcm9qZWN0c1xcblxcbiAgSWYgeW91IG5lZWQgc29tZSBoZWxwIGFib3V0IHRoZSB0ZXJtaW5hbCwgb3Igd2FudCB0byBrbm93IHdoYXQgZnVuY3Rpb25hbGl0aWVzIGFyZSBjdXJycmVudGx5IGltcGxlbWVudGVkLCB0eXBlIGBoZWxwYCBhbnkgdGltZS5cXG5cXG5Ib3BlIHlvdSBoYXZlIGFzIG11Y2ggZnVuIGFzIEkgaGFkIGRvaW5nIGl0IDopXFxuXFxuVGFkZXUgWmFnYWxsb1xcbiAgICAgIFxcblwiLFxuICAgICAgICAgICAgICBcInR5cGVcIjogXCJmXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImNvbnRhY3QubWRcIjoge1xuICAgICAgICAgICAgICBcIm10aW1lXCI6IFwiMjAxNC0wNS0wM1QyMzoyMTowOS4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY3RpbWVcIjogXCIyMDE0LTA1LTAzVDIzOjIxOjA5LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjb250ZW50XCI6IFwiIyBBbGwgbXkgY29udGFjdHMsIGZlZWwgZnJlZSB0byByZWFjaCBtZSBhdCBhbnkgb2YgdGhlc2VcXG5cXG4qIDxhIGhyZWY9XFxcIm1haWx0bzp0YWRldXphZ2FsbG9AZ21haWwuY29tXFxcIiBhbHQ9XFxcIkVtYWlsXFxcIj5bRW1haWxdKG1haWx0bzp0YWRldXphZ2FsbG9AZ21haWwuY29tKTwvYT5cXG4qIDxhIGhyZWY9XFxcImh0dHBzOi8vZ2l0aHViLmNvbS90YWRldXphZ2FsbG9cXFwiIGFsdD1cXFwiR2l0SHViXFxcIiB0YXJnZXQ9XFxcIl9ibGFua1xcXCI+W0dpdEh1Yl0oaHR0cHM6Ly9naXRodWIuY29tL3RhZGV1emFnYWxsbyk8L2E+XFxuKiA8YSBocmVmPVxcXCJodHRwczovL3R3aXR0ZXIuY29tL3RhZGV1emFnYWxsb1xcXCIgYWx0PVxcXCJUd2l0dGVyXFxcIiB0YXJnZXQ9XFxcIl9ibGFua1xcXCI+W1R3aXR0ZXJdKGh0dHBzOi8vdHdpdHRlci5jb20vdGFkZXV6YWdhbGxvKTwvYT5cXG4qIDxhIGhyZWY9XFxcImh0dHBzOi8vZmFjZWJvb2suY29tL3RhZGV1emFnYWxsb1xcXCIgYWx0PVxcXCJGYWNlYm9va1xcXCIgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiPltGYWNlYm9va10oaHR0cHM6Ly9mYWNlYm9vay5jb20vdGFkZXV6YWdhbGxvKTwvYT5cXG4qIDxhIGhyZWY9XFxcImh0dHBzOi8vcGx1cy5nb29nbGUuY29tLytUYWRldVphZ2FsbG9cXFwiIGFsdD1cXFwiR29vZ2xlICtcXFwiIHRhcmdldD1cXFwiX2JsYW5rXFxcIj5bR29vZ2xlICtdKGh0dHBzOi8vcGx1cy5nb29nbGUuY29tLytUYWRldVphZ2FsbG8pPC9hPlxcbiogPGEgaHJlZj1cXFwiaHR0cDovL3d3dy5saW5rZWRpbi5jb20vcHJvZmlsZS92aWV3P2lkPTE2MDE3NzE1OVxcXCIgYWx0PVxcXCJMaW5rZWRpblxcXCIgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiPltMaW5rZWRpbl0oaHR0cDovL3d3dy5saW5rZWRpbi5jb20vcHJvZmlsZS92aWV3P2lkPTE2MDE3NzE1OSk8L2E+XFxuKiA8YSBocmVmPVxcXCJza3lwZTovL3RhZGV1emFnYWxsb1xcXCIgYWx0PVxcXCJMaW5rZWRpblxcXCI+W1NreXBlXShza3lwZTovL3RhZGV1emFnYWxsbyk8L2E+XFxuXCIsXG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImZcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwicHJvamVjdHMubWRcIjoge1xuICAgICAgICAgICAgICBcIm10aW1lXCI6IFwiMjAxNC0xMi0yN1QwMjo0NTowNS4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY3RpbWVcIjogXCIyMDE0LTEyLTI3VDAyOjQ1OjA1LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjb250ZW50XCI6IFwiRm9yIG5vdyB5b3UgY2FuIGhhdmUgYSBsb29rIGF0IHRoaXMgb25lISA6KVxcbihUaGF0J3Mgd2hhdCBJJ20gZG9pbmcpXFxuXCIsXG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImZcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwicmVhZG1lLm1kXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTQtMDUtMDNUMjM6MjE6MDkuMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNC0wNS0wM1QyMzoyMTowOS4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcImZvbyBiYXIgYmF6XFxuXCIsXG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImZcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwicmVzdW1lLm1kXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTQtMDUtMDNUMjM6MjE6MDkuMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNC0wNS0wM1QyMzoyMTowOS4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcIiMgVGFkZXUgWmFnYWxsbyBkYSBTaWx2YVxcbi0tLVxcblxcbiMjIFByb2ZpbGVcXG4tLS0gXFxuICBJIGFtIHBhc3Npb25hdGUgZm9yIGFsbCBraW5kcyBvZiBkZXZlbG9wbWVudCwgbG92ZSB0byBsZWFybiBuZXcgbGFuZ3VhZ2VzIGFuZCBwYXJhZGlnbXMsIGFsd2F5cyByZWFkeSBmb3IgYSBnb29kIGNoYWxsZW5nZS5cXG4gIEkgYWxzbyBsaWtlIE1hdGgsIEdhbWUgZGV2ZWxvcG1lbnQgYW5kIHdoZW4gcG9zc2libGUgY29udHJpYnV0ZSB0byBvcGVuIHNvdXJjZSBwcm9qZWN0cy5cXG5cXG4jIyBHZW5lcmFsIEluZm9ybWF0aW9uXFxuLS0tXFxuICAqIEVtYWlsOiB0YWRldXphZ2FsbG9AZ21haWwuY29tXFxuICAqIFBob25lOiArNTUgMzIgODg2MyAzNjg0XFxuICAqIFNreXBlOiB0YWRldXphZ2FsbG9cXG4gICogR2l0aHViOiBnaXRodWIuY29tL3RhZGV1emFnYWxsb1xcbiAgKiBMb2NhdGlvbjogSnVpeiBkZSBGb3JhL01HLCBCcmF6aWxcXG5cXG4jIyBFZHVjYXRpb25hbCBCYWNrZ3JvdW5kXFxuLS0tXFxuXFxuICAqIFdlYiBEZXZlbG9wbWVudCBhdCBJbnN0aXR1dG8gVmlhbm5hIEp1bmlvciwgMjAxMFxcbiAgKiBHZW5lcmFsIEVuZ2xpc2ggYXQgVGhlIENhcmx5bGUgSW5zdGl0dXRlLCAyMDExXFxuXFxuIyBXb3JrIEV4cGVyaWVuY2VcXG4tLS1cXG5cXG4gICogPGk+KmlPUyBEZXZlbG9wZXIqPC9pPiBhdCA8aT4qUXJhbmlvKjwvaT4gZnJvbSA8aT4qRGVjZW1iZXIsIDIwMTMqPC9pPiBhbmQgPGk+KmN1cnJlbnRseSBlbXBsb3llZCo8L2k+XFxuICAgIC0gUXJhbmlvIGlzIGEgc3RhcnR1cCB0aGF0IGdyZXcgaW5zaWRlIHRoZSBjb21wYW55IEkgd29yayAoZU1pb2xvLmNvbSkgYW5kIEkgd2FzIGludml0ZWQgdG8gbGVhZCB0aGUgaU9TIGRldmVsb3BtZW50IHRlYW1cXG4gICAgICBvbiBhIGNvbXBsZXRlbHkgcmV3cml0ZW4gdmVyc2lvbiBvZiB0aGUgYXBwXFxuXFxuICAqIDxpPipXZWIgYW5kIE1vYmlsZSBEZXZlbG9wZXIqPC9pPiBhdCA8aT4qQm9udXoqPC9pPiBmcm9tIDxpPipGZWJydWFyeSwgMjAxMyo8L2k+IGFuZCA8aT4qY3VycmVudGx5IGVtcGxveWVkKjwvaT5cXG4gICAgLSBJIHN0YXJ0ZWQgZGV2ZWxvcGluZyB0aGUgaU9TIGFwcCBhcyBhIGZyZWVsYW5jZXIsIGFmdGVyIHRoZSBhcHAgd2FzIHB1Ymxpc2hlZCBJIHdhcyBpbnZpdGVkIHRvIG1haW50YWluIHRoZSBSdWJ5IG9uIFJhaWxzXFxuICAgICAgYXBpIGFuZCB3b3JrIG9uIHRoZSBBbmRyb2lkIHZlcnNpb24gb2YgdGhlIGFwcFxcblxcbiAgKiA8aT4qV2ViIGFuZCBNb2JpbGUgRGV2ZWxvcGVyKjwvaT4gYXQgPGk+KmVNaW9sby5jb20qPC9pPiBmcm9tIDxpPipBcHJpbCwgMjAxMyo8L2k+IGFuZCA8aT4qY3VycmVudGx5IGVtcGxveWVkKjwvaT5cXG4gICAgLSBUaGUgY29tcGFueSBqdXN0IHdvcmtlZCB3aXRoIFBIUCwgc28gSSBqb2luZWQgd2l0aCB0aGUgaW50ZW50aW9uIG9mIGJyaW5naW5nIG5ldyB0ZWNobm9sb2dpZXMuIFdvcmtlZCB3aXRoIFB5dGhvbiwgUnVieSwgaU9TLFxcbiAgICAgIEFuZHJvaWQgYW5kIEhUTUw1IGFwcGxpY2F0aW9uc1xcblxcbiAgKiA8aT4qaU9TIERldmVsb3Blcio8L2k+IGF0IDxpPipQcm9Eb2N0b3IgU29mdHdhcmUgTHRkYS4qPC9pPiBmcm9tIDxpPipKdWx5LCAyMDEyKjwvaT4gdW50aWwgPGk+Kk9jdG9iZXIsIDIwMTIqPC9pPlxcbiAgICAtIEJyaWVmbHkgd29ya2VkIHdpdGggdGhlIGlPUyB0ZWFtIG9uIHRoZSBkZXZlbG9wbWVudCBvZiB0aGVpciBmaXJzdCBtb2JpbGUgdmVyc2lvbiBvZiB0aGVpciBtYWluIHByb2R1Y3QsIGEgbWVkaWNhbCBzb2Z0d2FyZVxcblxcbiAgKiA8aT4qV2ViIERldmVsb3Blcio8L2k+IGF0IDxpPipBdG8gSW50ZXJhdGl2byo8L2k+IGZyb20gPGk+KkZlYnJ1YXJ5LCAyMDEyKjwvaT4gdW50aWwgPGk+Kkp1bHksIDIwMTIqPC9pPlxcbiAgICAtIE1vc3Qgb2YgdGhlIHdvcmsgd2FzIHdpdGggUEhQIGFuZCBNeVNRTCwgYWxzbyB3b3JraW5nIHdpdGggSmF2YVNjcmlwdCBvbiB0aGUgY2xpZW50IHNpZGUuIFdvcmtlZCB3aXRoIE1TU1FMXFxuICAgICAgYW5kIE9yYWNsZSBkYXRhYmFzZXMgYXMgd2VsbFxcblxcbiAgKiA8aT4qV2ViIERldmVsb3Blcio8L2k+IGF0IDxpPipNYXJpYSBGdW1hY8ynYSBDcmlhY8ynb8yDZXMqPC9pPiBmcm9tIDxpPipPY3RvYmVyLCAyMDEwKjwvaT4gdW50aWwgPGk+Kkp1bmUsIDIwMTEqPC9pPlxcbiAgICAtIEkgd29ya2VkIG1vc3RseSB3aXRoIFBIUCBhbmQgTXlTUUwsIGFsc28gbWFraW5nIHRoZSBmcm9udCBlbmQgd2l0aCBIVE1MIGFuZCBDU1MgYW5kIG1vc3QgYW5pbWF0aW9ucyBpbiBKYXZhU2NyaXB0LFxcbiAgICAgIGFsdGhvdWdoIEkgYWxzbyB3b3JrZWQgd2l0aCBhIGZldyBpbiBBUzMuIEJyaWVmbHkgd29ya2VkIHdpdGggTW9uZ29EQlxcblxcbiMjIEFkZGl0aW9uYWwgSW5mb3JtYXRpb25cXG4tLS1cXG5cXG4qIEV4cGVyaWVuY2UgdW5kZXIgTGludXggYW5kIE9TIFggZW52aXJvbm1lbnRcXG4qIFN0dWRlbnQgRXhjaGFuZ2U6IDYgbW9udGhzIG9mIHJlc2lkZW5jZSBpbiBJcmVsYW5kXFxuXFxuIyMgTGFuZ3VhZ2VzXFxuLS0tXFxuXFxuKiBQb3J0dWd1ZXNlIOKAkyBOYXRpdmUgU3BlYWtlclxcbiogRW5nbGlzaCDigJMgRmx1ZW50IExldmVsXFxuKiBTcGFuaXNoIOKAkyBJbnRlcm1lZGlhdGUgTGV2ZWxcXG5cXG4jIyBQcm9ncmFtbWluZyBsYW5ndWFnZXMgKG9yZGVyZWQgYnkga25vd2xlZGdlKVxcbi0tLVxcblxcbiogSmF2YVNjcmlwdFxcbiogT2JqZWN0aXZlwq1DXFxuKiBDL0MrK1xcbiogUnVieSBvbiBSYWlsc1xcbiogTm9kZUpTXFxuKiBQSFBcXG4qIEphdmFcXG4qIFB5dGhvblxcblxcbiMjIEFkZGl0aW9uYWwgc2tpbGxzXFxuLS0tXFxuXFxuKiBIVE1MNS9DU1MzXFxuKiBNVkNcXG4qIERlc2lnbiBQYXR0ZXJuc1xcbiogVEREL0JERFxcbiogR2l0XFxuKiBBbmFseXNpcyBhbmQgRGVzaWduIG9mIEFsZ29yaXRobXNcXG5cIixcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiZlwiXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInR5cGVcIjogXCJkXCJcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIFwidHlwZVwiOiBcImRcIlxuICAgIH0sXG4gICAgXCJ0bXBcIjoge1xuICAgICAgXCJtdGltZVwiOiBcIjIwMTQtMDMtMDJUMTI6MzE6MTAuMDAwWlwiLFxuICAgICAgXCJjdGltZVwiOiBcIjIwMTQtMDMtMDJUMTI6MzE6MTAuMDAwWlwiLFxuICAgICAgXCJjb250ZW50XCI6IHt9LFxuICAgICAgXCJ0eXBlXCI6IFwiZFwiXG4gICAgfSxcbiAgICBcInVzclwiOiB7XG4gICAgICBcIm10aW1lXCI6IFwiMjAxNC0wMy0wMlQxMjozMToxMC4wMDBaXCIsXG4gICAgICBcImN0aW1lXCI6IFwiMjAxNC0wMy0wMlQxMjozMToxMC4wMDBaXCIsXG4gICAgICBcImNvbnRlbnRcIjoge1xuICAgICAgICBcImJpblwiOiB7XG4gICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTUtMDEtMTJUMDI6MzU6NTUuMDAwWlwiLFxuICAgICAgICAgIFwiY3RpbWVcIjogXCIyMDE1LTAxLTEyVDAyOjM1OjU1LjAwMFpcIixcbiAgICAgICAgICBcImNvbnRlbnRcIjoge1xuICAgICAgICAgICAgXCJhbGlhcy5qc1wiOiB7XG4gICAgICAgICAgICAgIFwibXRpbWVcIjogXCIyMDE1LTAxLTEyVDAyOjMwOjE4LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjdGltZVwiOiBcIjIwMTUtMDEtMTJUMDI6MzA6MTguMDAwWlwiLFxuICAgICAgICAgICAgICBcImNvbnRlbnRcIjogXCIndXNlIHN0cmljdCc7XFxuXFxucmV0dXJuIGZ1bmN0aW9uIChhcmdzLCBzdGRpbiwgc3Rkb3V0LCBzdGRlcnIsIG5leHQpIHtcXG4gIHZhciBidWZmZXIgPSAnJztcXG4gIGlmIChhcmdzLmFyZ3VtZW50cy5sZW5ndGgpIHtcXG4gICAgdmFyIGtleSA9IGFyZ3MuYXJndW1lbnRzLnNoaWZ0KCk7XFxuICAgIHZhciBpbmRleDtcXG4gICAgaWYgKH4oaW5kZXggPSBrZXkuaW5kZXhPZignPScpKSkge1xcbiAgICAgIHZhciBjb21tYW5kO1xcblxcbiAgICAgIGlmIChhcmdzLmFyZ3VtZW50cy5sZW5ndGggJiYgaW5kZXggPT09IGtleS5sZW5ndGggLSAxKSB7XFxuICAgICAgICBjb21tYW5kID0gYXJncy5hcmd1bWVudHMuam9pbignICcpO1xcbiAgICAgIH0gZWxzZSB7XFxuICAgICAgICBjb21tYW5kID0ga2V5LnN1YnN0cihpbmRleCsxKTtcXG4gICAgICB9XFxuXFxuICAgICAga2V5ID0ga2V5LnN1YnN0cigwLCBpbmRleCk7XFxuXFxuICAgICAgaWYgKGNvbW1hbmQpIHtcXG4gICAgICAgIFpTSC5jb21tYW5kTWFuYWdlci5hbGlhcyhrZXksIGNvbW1hbmQpO1xcbiAgICAgIH1cXG4gICAgfVxcbiAgfSBlbHNlIHtcXG4gICAgdmFyIGFsaWFzZXMgPSBaU0guY29tbWFuZE1hbmFnZXIuYWxpYXMoKTtcXG5cXG4gICAgZm9yICh2YXIgaSBpbiBhbGlhc2VzKSB7XFxuICAgICAgYnVmZmVyICs9IGkgKyAnPVxcXFwnJyArIGFsaWFzZXNbaV0gKyAnXFxcXCdcXFxcbic7XFxuICAgIH1cXG4gIH1cXG5cXG4gIHN0ZG91dC53cml0ZShidWZmZXIpO1xcbiAgbmV4dCgpO1xcbn07XFxuXCIsXG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImZcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiY2F0LmpzXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTUtMDEtMTJUMDI6MzA6MjMuMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNS0wMS0xMlQwMjozMDoyMy4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcIid1c2Ugc3RyaWN0JztcXG5cXG5yZXR1cm4gZnVuY3Rpb24gKGFyZ3MsIHN0ZGluLCBzdGRvdXQsIHN0ZGVyciwgbmV4dCkge1xcbiAgYXJncy5hcmd1bWVudHMuZm9yRWFjaChmdW5jdGlvbiAocGF0aCkge1xcbiAgICB2YXIgZmlsZSA9IFpTSC5maWxlLm9wZW4ocGF0aCk7XFxuXFxuICAgIGlmICghZmlsZS5leGlzdHMoKSkge1xcbiAgICAgIHN0ZGVyci53cml0ZShaU0guZnMubm90Rm91bmQoJ2NhdCcsIHBhdGgpKTtcXG4gICAgfSBlbHNlIGlmIChmaWxlLmlzRGlyKCkpIHtcXG4gICAgICBzdGRlcnIud3JpdGUoWlNILmZzLmVycm9yKCdjYXQnLCBwYXRoLCAnSXMgYSBkaXJlY3RvcnknKSk7XFxuICAgIH0gZWxzZSB7XFxuICAgICAgc3Rkb3V0LndyaXRlKGZpbGUucmVhZCgpKTtcXG4gICAgfVxcbiAgfSk7XFxuXFxuICBuZXh0KCk7XFxufTtcXG5cIixcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiZlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJjZC5qc1wiOiB7XG4gICAgICAgICAgICAgIFwibXRpbWVcIjogXCIyMDE1LTAxLTEyVDAyOjMxOjE2LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjdGltZVwiOiBcIjIwMTUtMDEtMTJUMDI6MzE6MTYuMDAwWlwiLFxuICAgICAgICAgICAgICBcImNvbnRlbnRcIjogXCIndXNlIHN0cmljdCc7XFxuXFxucmV0dXJuIGZ1bmN0aW9uIChhcmdzLCBzdGRpbiwgc3Rkb3V0LCBzdGRlcnIsIG5leHQpIHtcXG4gIHZhciBwYXRoID0gYXJncy5hcmd1bWVudHNbMF0gfHwgJ34nO1xcbiAgdmFyIGRpciA9IFpTSC5maWxlLm9wZW4ocGF0aCk7XFxuXFxuICBpZiAoIWRpci5leGlzdHMoKSkge1xcbiAgICBzdGRlcnIud3JpdGUoWlNILmZzLm5vdEZvdW5kKCdjZCcsIHBhdGgpKTtcXG4gIH0gZWxzZSBpZiAoZGlyLmlzRmlsZSgpKSB7XFxuICAgIHN0ZGVyci53cml0ZShaU0guZnMuZXJyb3IoJ2NkJywgcGF0aCwgJ0lzIGEgZmlsZScpKTtcXG4gIH0gZWxzZSB7XFxuICAgIFpTSC5mcy5jdXJyZW50UGF0aCA9IGRpci5wYXRoO1xcbiAgICBaU0guZnMuY3VycmVudERpciA9IGRpci5zZWxmKCk7XFxuICB9XFxuXFxuICBaU0guZnMud3JpdGVGUygpO1xcbiAgbmV4dCgpO1xcbn07XFxuXCIsXG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImZcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiZWNoby5qc1wiOiB7XG4gICAgICAgICAgICAgIFwibXRpbWVcIjogXCIyMDE1LTAxLTEyVDAyOjMxOjM2LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjdGltZVwiOiBcIjIwMTUtMDEtMTJUMDI6MzE6MzYuMDAwWlwiLFxuICAgICAgICAgICAgICBcImNvbnRlbnRcIjogXCIndXNlIHN0cmljdCc7XFxuXFxucmV0dXJuIGZ1bmN0aW9uIChhcmdzLCBzdGRpbiwgc3Rkb3V0LCBzdGRlcnIsIG5leHQpIHtcXG4gIHRyeSB7XFxuICAgIHN0ZG91dC53cml0ZShaU0guYXJnc1BhcnNlci5wYXJzZVN0cmluZ3MoYXJncy5yYXcpLmpvaW4oJyAnKSk7XFxuICB9IGNhdGNoIChlcnIpIHtcXG4gICAgc3RkZXJyLndyaXRlKCd6c2g6ICcgKyBlcnIubWVzc2FnZSk7XFxuICB9XFxuICBcXG4gIG5leHQoKTtcXG59O1xcblwiLFxuICAgICAgICAgICAgICBcInR5cGVcIjogXCJmXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImhlbHAuanNcIjoge1xuICAgICAgICAgICAgICBcIm10aW1lXCI6IFwiMjAxNS0wMS0xMlQwMjozMTo1OC4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY3RpbWVcIjogXCIyMDE1LTAxLTEyVDAyOjMxOjU4LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjb250ZW50XCI6IFwiJ3VzZSBzdHJpY3QnO1xcblxcbnJldHVybiBmdW5jdGlvbiAoYXJncywgc3RkaW4sIHN0ZG91dCwgc3RkZXJyLCBuZXh0KSB7XFxuICBzdGRvdXQud3JpdGUoJ2NvbW1hbmRzOicpO1xcbiAgc3Rkb3V0LndyaXRlKE9iamVjdC5rZXlzKFpTSC5jb21tYW5kTWFuYWdlci5jb21tYW5kcykuam9pbignICcpKTtcXG5cXG4gIHN0ZG91dC53cml0ZSgnXFxcXG4nKTtcXG5cXG4gIHN0ZG91dC53cml0ZSgnYWxpYXNlczonKTtcXG4gIHN0ZG91dC53cml0ZShPYmplY3Qua2V5cyhaU0guY29tbWFuZE1hbmFnZXIuYWxpYXNlcykubWFwKGZ1bmN0aW9uIChrZXkpICB7XFxuICAgIHJldHVybiBrZXkgKyAnPVxcXCInICsgWlNILmNvbW1hbmRNYW5hZ2VyLmFsaWFzZXNba2V5XSArICdcXFwiJztcXG4gIH0pLmpvaW4oJyAnKSk7XFxuXFxuICBuZXh0KCk7XFxufTtcXG5cIixcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiZlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJsZXNzLmpzXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTUtMDEtMTJUMDI6MjE6MDkuMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNS0wMS0xMlQwMjoyMTowOS4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcIlwiLFxuICAgICAgICAgICAgICBcInR5cGVcIjogXCJmXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImxzLmpzXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTUtMDEtMTJUMDI6MzI6MjAuMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNS0wMS0xMlQwMjozMjoyMC4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcIid1c2Ugc3RyaWN0JztcXG5cXG5yZXR1cm4gZnVuY3Rpb24gKGFyZ3MsIHN0ZGluLCBzdGRvdXQsIHN0ZGVyciwgbmV4dCkge1xcbiAgaWYgKCFhcmdzLmFyZ3VtZW50cy5sZW5ndGgpIHtcXG4gICAgYXJncy5hcmd1bWVudHMucHVzaCgnLicpO1xcbiAgfVxcblxcbiAgYXJncy5hcmd1bWVudHMuZm9yRWFjaChmdW5jdGlvbiAoYXJnKSB7XFxuICAgIHZhciBkaXIgPSBaU0guZmlsZS5vcGVuKGFyZyk7XFxuXFxuICAgIGlmICghZGlyLmV4aXN0cygpKSB7XFxuICAgICAgc3RkZXJyLndyaXRlKFpTSC5mcy5ub3RGb3VuZCgnbHMnLCBhcmcpKTtcXG4gICAgfSBlbHNlIGlmIChkaXIuaXNGaWxlKCkpIHtcXG4gICAgICBzdGRlcnIud3JpdGUoWlNILmZzLmVycm9yKCdscycsIGFyZywgJ0lzIGEgZmlsZScpKTtcXG4gICAgfSBlbHNlIHtcXG4gICAgICB2YXIgZmlsZXMgPSBPYmplY3Qua2V5cyhkaXIucmVhZCgpKTtcXG5cXG4gICAgICBpZiAoIWFyZ3Mub3B0aW9ucy5hKSB7XFxuICAgICAgICBmaWxlcyA9IGZpbGVzLmZpbHRlcihmdW5jdGlvbiAoZmlsZSkge1xcbiAgICAgICAgICByZXR1cm4gZmlsZVswXSAhPT0gJy4nO1xcbiAgICAgICAgfSk7XFxuICAgICAgfVxcblxcbiAgICAgIGlmIChhcmdzLmFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XFxuICAgICAgICBzdGRvdXQud3JpdGUoYXJnICsgJzonKTtcXG4gICAgICB9XFxuXFxuICAgICAgaWYgKGFyZ3Mub3B0aW9ucy5sKSB7XFxuICAgICAgICBmaWxlcyA9IGZpbGVzLm1hcChmdW5jdGlvbiAobmFtZSkge1xcbiAgICAgICAgICB2YXIgZmlsZSA9IGRpci5vcGVuKG5hbWUpO1xcbiAgICAgICAgICB2YXIgdHlwZSA9IGZpbGUuaXNEaXIoKSA/ICdkJyA6ICctJztcXG4gICAgICAgICAgdmFyIHBlcm1zID0gdHlwZSArICdydy1yLS1yLS0nO1xcblxcbiAgICAgICAgICByZXR1cm4gcGVybXMgKyAnIGd1ZXN0IGd1ZXN0ICcgKyBmaWxlLmxlbmd0aCgpICsgJyAnICsgZmlsZS5tdGltZSgpICsgJyAnICsgbmFtZTtcXG4gICAgICAgIH0pO1xcbiAgICAgIH1cXG5cXG4gICAgICBzdGRvdXQud3JpdGUoZmlsZXMuam9pbihhcmdzLm9wdGlvbnMubCA/ICdcXFxcbicgOiAnICcpKTtcXG4gICAgfVxcbiAgfSk7XFxuXFxuICBuZXh0KCk7XFxufTtcXG5cIixcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiZlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJta2Rpci5qc1wiOiB7XG4gICAgICAgICAgICAgIFwibXRpbWVcIjogXCIyMDE1LTAxLTEyVDAyOjMyOjI5LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjdGltZVwiOiBcIjIwMTUtMDEtMTJUMDI6MzI6MjkuMDAwWlwiLFxuICAgICAgICAgICAgICBcImNvbnRlbnRcIjogXCIndXNlIHN0cmljdCc7XFxuXFxucmV0dXJuIGZ1bmN0aW9uIChhcmdzLCBzdGRpbiwgc3Rkb3V0LCBzdGRlcnIsIG5leHQpIHtcXG4gIGFyZ3MuYXJndW1lbnRzLmZvckVhY2goZnVuY3Rpb24gKHBhdGgpIHtcXG4gICAgdmFyIGZpbGUgPSBaU0guZmlsZS5vcGVuKHBhdGgpO1xcblxcbiAgICBpZiAoIWZpbGUucGFyZW50RXhpc3RzKCkpIHtcXG4gICAgICBzdGRlcnIud3JpdGUoWlNILmZzLm5vdEZvdW5kKCdta2RpcicsIHBhdGgpKTtcXG4gICAgfSBlbHNlIGlmICghZmlsZS5pc1ZhbGlkKCkpIHtcXG4gICAgICBzdGRlcnIud3JpdGUoWlNILmZzLmVycm9yKCdta2RpcicsIHBhdGgsICdOb3QgYSBkaXJlY3RvcnknKSk7XFxuICAgIH0gZWxzZSBpZiAoZmlsZS5leGlzdHMoKSkge1xcbiAgICAgIHN0ZGVyci53cml0ZShaU0guZnMuZXJyb3IoJ21rZGlyJywgcGF0aCwgJ0ZpbGUgZXhpc3RzJykpO1xcbiAgICB9IGVsc2Uge1xcbiAgICAgIGZpbGUuY3JlYXRlRm9sZGVyKCk7XFxuICAgIH1cXG4gIH0pO1xcblxcbiAgWlNILmZzLndyaXRlRlMoKTtcXG4gIG5leHQoKTtcXG59O1xcblwiLFxuICAgICAgICAgICAgICBcInR5cGVcIjogXCJmXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcIm12LmpzXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTUtMDEtMTJUMDI6MzM6MTAuMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNS0wMS0xMlQwMjozMzoxMC4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcIid1c2Ugc3RyaWN0JztcXG5cXG5yZXR1cm4gZnVuY3Rpb24gKGFyZ3MsIHN0ZGluLCBzdGRvdXQsIHN0ZGVyciwgbmV4dCkge1xcbiAgdmFyIHRhcmdldFBhdGggPSBhcmdzLmFyZ3VtZW50cy5wb3AoKTtcXG4gIHZhciBzb3VyY2VQYXRocyA9IGFyZ3MuYXJndW1lbnRzO1xcbiAgdmFyIHRhcmdldCA9IFpTSC5maWxlLm9wZW4odGFyZ2V0UGF0aCk7XFxuXFxuICBpZiAoIXRhcmdldFBhdGggfHxcXG4gICAgICAhc291cmNlUGF0aHMubGVuZ3RoIHx8XFxuICAgICAgICAoc291cmNlUGF0aHMubGVuZ3RoID4gMSAmJlxcbiAgICAgICAgICghdGFyZ2V0LmV4aXN0cygpIHx8IHRhcmdldC5pc0ZpbGUoKSlcXG4gICAgICAgIClcXG4gICAgICkge1xcbiAgICBzdGRlcnIud3JpdGUoJ3VzYWdlOiBtdiBzb3VyY2UgdGFyZ2V0XFxcXG4gXFxcXHQgbXYgc291cmNlIC4uLiBkaXJlY3RvcnknKTtcXG4gIH0gZWxzZSBpZiAoIXRhcmdldC5wYXJlbnRFeGlzdHMoKSkge1xcbiAgICAgIHN0ZGVyci53cml0ZShaU0guZnMubm90Rm91bmQoJ212JywgdGFyZ2V0LmRpcm5hbWUpKTtcXG4gIH0gZWxzZSB7XFxuICAgIHZhciBiYWNrdXAgPSB0YXJnZXQuc2VsZigpO1xcbiAgICB2YXIgc3VjY2VzcyA9IHNvdXJjZVBhdGhzLnJlZHVjZShmdW5jdGlvbiAoc3VjY2Vzcywgc291cmNlUGF0aCkge1xcbiAgICAgIGlmIChzdWNjZXNzKSB7XFxuICAgICAgICB2YXIgc291cmNlID0gWlNILmZpbGUub3Blbihzb3VyY2VQYXRoKTtcXG5cXG4gICAgICAgIGlmICghc291cmNlLmV4aXN0cygpKSB7XFxuICAgICAgICAgIHN0ZGVyci53cml0ZShaU0guZnMubm90Rm91bmQoJ212Jywgc291cmNlUGF0aHNbMF0pKTtcXG4gICAgICAgIH0gZWxzZSBpZiAoc291cmNlLmlzRGlyKCkgJiYgdGFyZ2V0LmlzRmlsZSgpKSB7XFxuICAgICAgICAgIHN0ZGVyci53cml0ZShaU0guZnMuZXJyb3IoJ212JywgJ3JlbmFtZSAnICsgc291cmNlUGF0aHNbMF0gKyAnIHRvICcgKyB0YXJnZXRQYXRoLCAnTm90IGEgZGlyZWN0b3J5JykpO1xcbiAgICAgICAgfSBlbHNlIHtcXG4gICAgICAgICAgaWYgKCF0YXJnZXQuaXNGaWxlKCkpIHtcXG4gICAgICAgICAgICB0YXJnZXQucmVhZCgpW3NvdXJjZS5maWxlbmFtZV0gPSBzb3VyY2Uuc2VsZigpO1xcbiAgICAgICAgICB9IGVsc2Uge1xcbiAgICAgICAgICAgIHRhcmdldC53cml0ZShzb3VyY2UucmVhZCgpLCBmYWxzZSwgdHJ1ZSk7XFxuICAgICAgICAgIH1cXG5cXG4gICAgICAgICAgc291cmNlLmRlbGV0ZSgpO1xcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcXG4gICAgICAgIH1cXG4gICAgICB9XFxuXFxuICAgICAgcmV0dXJuIGZhbHNlO1xcbiAgICB9LCB0cnVlKTtcXG5cXG4gICAgaWYgKHN1Y2Nlc3MpIHtcXG4gICAgICBaU0guZnMud3JpdGVGUygpO1xcbiAgICB9IGVsc2Uge1xcbiAgICAgIHRhcmdldC5kaXJbdGFyZ2V0LmZpbGVuYW1lXSA9IGJhY2t1cDtcXG4gICAgfVxcbiAgfVxcblxcbiAgbmV4dCgpO1xcbn07XFxuXCIsXG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImZcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwicHdkLmpzXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTUtMDEtMTJUMDI6MzM6MjguMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNS0wMS0xMlQwMjozMzoyOC4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcIid1c2Ugc3RyaWN0JztcXG5cXG5yZXR1cm4gZnVuY3Rpb24gKGFyZ3MsIHN0ZGluLCBzdGRvdXQsIHN0ZGVyciwgbmV4dCkge1xcbiAgdmFyIF9wd2QgPSBaU0guZnMuY3VycmVudFBhdGg7XFxuXFxuICBpZiAoc3Rkb3V0KSB7XFxuICAgIHN0ZG91dC53cml0ZShfcHdkKTtcXG4gICAgbmV4dCgpO1xcbiAgfSBlbHNlIHtcXG4gICAgcmV0dXJuIF9wd2Q7XFxuICB9XFxufTtcXG5cIixcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiZlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJybS5qc1wiOiB7XG4gICAgICAgICAgICAgIFwibXRpbWVcIjogXCIyMDE1LTAxLTEyVDAyOjMzOjU2LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjdGltZVwiOiBcIjIwMTUtMDEtMTJUMDI6MzM6NTYuMDAwWlwiLFxuICAgICAgICAgICAgICBcImNvbnRlbnRcIjogXCIndXNlIHN0cmljdCc7XFxuXFxucmV0dXJuIGZ1bmN0aW9uIChhcmdzLCBzdGRpbiwgc3Rkb3V0LCBzdGRlcnIsIG5leHQpIHtcXG4gIGFyZ3MuYXJndW1lbnRzLmZvckVhY2goZnVuY3Rpb24gKGFyZykge1xcbiAgICB2YXIgZmlsZSA9IFpTSC5maWxlLm9wZW4oYXJnKTtcXG5cXG4gICAgaWYgKCFmaWxlLmV4aXN0cygpKSB7XFxuICAgICAgc3RkZXJyLndyaXRlKFpTSC5mcy5ub3RGb3VuZCgncm0nLCBhcmcpKTtcXG4gICAgfSBlbHNlIGlmICghZmlsZS5pc1ZhbGlkKCkpIHtcXG4gICAgICBzdGRlcnIud3JpdGUoWlNILmZzLmVycm9yKCdybScsIGFyZywgJ05vdCBhIGRpcmVjdG9yeScpKTtcXG4gICAgfSBlbHNlIGlmIChmaWxlLmlzRGlyKCkpIHtcXG4gICAgICBzdGRlcnIud3JpdGUoWlNILmZzLmVycm9yKCdybScsIGFyZywgJ2lzIGEgZGlyZWN0b3J5JykpO1xcbiAgICB9IGVsc2Uge1xcbiAgICAgIGZpbGUuZGVsZXRlKCk7XFxuICAgIH1cXG4gIH0pO1xcblxcbiAgWlNILmZzLndyaXRlRlMoKTtcXG4gIG5leHQoKTtcXG59O1xcblwiLFxuICAgICAgICAgICAgICBcInR5cGVcIjogXCJmXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcInJtZGlyLmpzXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTUtMDEtMTJUMDI6MzQ6MjUuMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNS0wMS0xMlQwMjozNDoyNS4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcIid1c2Ugc3RyaWN0JztcXG5cXG5yZXR1cm4gZnVuY3Rpb24gKGFyZ3MsIHN0ZGluLCBzdGRvdXQsIHN0ZGVyciwgbmV4dCkge1xcbiAgYXJncy5hcmd1bWVudHMuZm9yRWFjaChmdW5jdGlvbiAoYXJnKSB7XFxuICAgIHZhciBmaWxlID0gWlNILmZpbGUub3BlbihhcmcpO1xcblxcbiAgICBpZiAoIWZpbGUucGFyZW50RXhpc3RzKCkgfHwgIWZpbGUuZXhpc3RzKCkpIHtcXG4gICAgICBzdGRlcnIud3JpdGUoWlNILmZzLm5vdEZvdW5kKCdybWRpcicsIGFyZykpO1xcbiAgICB9IGVsc2UgaWYgKCFmaWxlLmlzRGlyKCkpIHtcXG4gICAgICBzdGRlcnIud3JpdGUoWlNILmZzLmVycm9yKCdybWRpcicsIGFyZywgJ05vdCBhIGRpcmVjdG9yeScpKTtcXG4gICAgfSBlbHNlIHtcXG4gICAgICBmaWxlLmRlbGV0ZSgpO1xcbiAgICB9XFxuICB9KTtcXG5cXG4gIFpTSC5mcy53cml0ZUZTKCk7XFxuICBuZXh0KCk7XFxufTtcXG5cIixcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiZlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJzb3VyY2UuanNcIjoge1xuICAgICAgICAgICAgICBcIm10aW1lXCI6IFwiMjAxNS0wMS0xMlQwMjozNDo1Ni4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY3RpbWVcIjogXCIyMDE1LTAxLTEyVDAyOjM0OjU2LjAwMFpcIixcbiAgICAgICAgICAgICAgXCJjb250ZW50XCI6IFwiLy8ganNoaW50IGV2aWw6IHRydWVcXG4ndXNlIHN0cmljdCc7XFxuXFxucmV0dXJuIGZ1bmN0aW9uIChhcmdzLCBzdGRpbiwgc3Rkb3V0LCBzdGRlcnIsIG5leHQpIHtcXG4gIGlmIChhcmdzLmFyZ3VtZW50cy5sZW5ndGgpIHtcXG4gICAgdmFyIGZpbGUgPSBaU0guZmlsZS5vcGVuKGFyZ3MuYXJndW1lbnRzWzBdKTtcXG4gICAgaWYgKCFmaWxlLmV4aXN0cygpKSB7XFxuICAgICAgc3RkZXJyLndyaXRlKCdzb3VyY2U6IG5vIHN1Y2ggZmlsZSBvciBkaXJlY3Rvcnk6ICcgKyBmaWxlLnBhdGgpO1xcbiAgICB9IGVsc2Uge1xcbiAgICAgIHRyeSB7XFxuICAgICAgICB2YXIgY29uc29sZSA9IG5ldyBaU0guQ29uc29sZShzdGRvdXQsIHN0ZGVycik7IC8vIGpzaGludCBpZ25vcmU6IGxpbmVcXG4gICAgICAgIHZhciByZXN1bHQgPSBKU09OLnN0cmluZ2lmeShldmFsKGZpbGUucmVhZCgpKSk7XFxuICAgICAgICBzdGRvdXQud3JpdGUoJzwtICcgKyByZXN1bHQpO1xcbiAgICAgIH0gY2F0Y2ggKGVycikge1xcbiAgICAgICAgc3RkZXJyLndyaXRlKGVyci5zdGFjayk7XFxuICAgICAgfVxcbiAgICB9XFxuICB9IGVsc2Uge1xcbiAgICBzdGRlcnIud3JpdGUoJ3NvdXJjZTogbm90IGVub3VnaCBhcmd1bWVudHMnKTtcXG4gIH1cXG5cXG4gIG5leHQoKTtcXG59O1xcblwiLFxuICAgICAgICAgICAgICBcInR5cGVcIjogXCJmXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcInRvdWNoLmpzXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTUtMDEtMTJUMDI6MzU6MzguMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNS0wMS0xMlQwMjozNTozOC4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcIid1c2Ugc3RyaWN0JztcXG5cXG5yZXR1cm4gZnVuY3Rpb24gKGFyZ3MsIHN0ZGluLCBzdGRvdXQsIHN0ZGVyciwgbmV4dCkge1xcbiAgYXJncy5hcmd1bWVudHMuZm9yRWFjaChmdW5jdGlvbiAocGF0aCkge1xcbiAgICB2YXIgZmlsZSA9IFpTSC5maWxlLm9wZW4ocGF0aCk7XFxuXFxuICAgIGlmICghZmlsZS5wYXJlbnRFeGlzdHMoKSkge1xcbiAgICAgIHN0ZGVyci53cml0ZShaU0guZnMubm90Rm91bmQoJ3RvdWNoJywgcGF0aCkpO1xcbiAgICB9IGVsc2UgaWYgKCFmaWxlLmlzVmFsaWQoKSl7XFxuICAgICAgc3RkZXJyLndyaXRlKFpTSC5mcy5lcnJvcigndG91Y2gnLCBwYXRoLCAnTm90IGEgZGlyZWN0b3J5JykpO1xcbiAgICB9IGVsc2Uge1xcbiAgICAgIGZpbGUud3JpdGUoJycsIHRydWUsIHRydWUpO1xcbiAgICB9XFxuICB9KTtcXG5cXG4gIFpTSC5mcy53cml0ZUZTKCk7XFxuICBuZXh0KCk7XFxufTtcXG5cIixcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiZlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJ1bmFsaWFzLmpzXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTUtMDEtMTJUMDI6MzU6NTUuMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNS0wMS0xMlQwMjozNTo1NS4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcIid1c2Ugc3RyaWN0JztcXG5cXG5yZXR1cm4gZnVuY3Rpb24gKGFyZ3MsIHN0ZGluLCBzdGRvdXQsIHN0ZGVyciwgbmV4dCkge1xcbiAgdmFyIGNtZCA9IGFyZ3MuYXJndW1lbnRzWzBdO1xcblxcbiAgaWYgKGNtZCkge1xcbiAgICBaU0guY29tbWFuZE1hbmFnZXIudW5hbGlhcyhjbWQpO1xcbiAgfVxcblxcbiAgbmV4dCgpO1xcbn07XFxuXCIsXG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImZcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwidmltLmpzXCI6IHtcbiAgICAgICAgICAgICAgXCJtdGltZVwiOiBcIjIwMTQtMTItMjVUMDI6MTk6NTguMDAwWlwiLFxuICAgICAgICAgICAgICBcImN0aW1lXCI6IFwiMjAxNC0xMi0yNVQwMjoxOTo1OC4wMDBaXCIsXG4gICAgICAgICAgICAgIFwiY29udGVudFwiOiBcIlwiLFxuICAgICAgICAgICAgICBcInR5cGVcIjogXCJmXCJcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIFwidHlwZVwiOiBcImRcIlxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgXCJ0eXBlXCI6IFwiZFwiXG4gICAgfVxuICB9LFxuICBcInR5cGVcIjogXCJkXCJcbn0iLCIndXNlIHN0cmljdCc7XG5cbnZhciBGUyA9IHJlcXVpcmUoJy4vZnMnKTtcblxudmFyIEZpbGUgPSAoZnVuY3Rpb24gKCkge1xuICBmdW5jdGlvbiBGaWxlKHBhdGgpIHtcbiAgICBwYXRoID0gRlMudHJhbnNsYXRlUGF0aChwYXRoKTtcbiAgICB0aGlzLnBhdGggPSBwYXRoO1xuXG4gICAgcGF0aCA9IHBhdGguc3BsaXQoJy8nKTtcblxuICAgIHRoaXMuZmlsZW5hbWUgPSBwYXRoLnBvcCgpO1xuICAgIHRoaXMuZGlybmFtZSA9IHBhdGguam9pbignLycpIHx8ICcvJztcbiAgICB0aGlzLmRpciA9IEZTLm9wZW4odGhpcy5kaXJuYW1lKTtcbiAgfVxuXG4gIEZpbGUub3BlbiA9IGZ1bmN0aW9uIChwYXRoKSB7XG4gICAgcmV0dXJuIG5ldyBGaWxlKHBhdGgpO1xuICB9O1xuXG4gIEZpbGUuZ2V0VGltZXN0YW1wID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gIH07XG5cbiAgRmlsZS5wcm90b3R5cGUucGFyZW50RXhpc3RzID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLmRpciAhPT0gdW5kZWZpbmVkO1xuICB9O1xuXG4gIEZpbGUucHJvdG90eXBlLmlzVmFsaWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHR5cGVvZiB0aGlzLmRpciA9PT0gJ29iamVjdCcgJiYgdGhpcy5kaXIudHlwZSA9PT0gJ2QnO1xuICB9O1xuXG4gIEZpbGUucHJvdG90eXBlLmV4aXN0cyA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5pc1ZhbGlkKCkgJiYgKCF0aGlzLmZpbGVuYW1lIHx8IHR5cGVvZiB0aGlzLmRpci5jb250ZW50W3RoaXMuZmlsZW5hbWVdICE9PSAndW5kZWZpbmVkJyk7XG4gIH07XG5cbiAgRmlsZS5wcm90b3R5cGUuaXNGaWxlID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLmV4aXN0cygpICYmIHRoaXMuZmlsZW5hbWUgJiYgdGhpcy5kaXIuY29udGVudFt0aGlzLmZpbGVuYW1lXS50eXBlID09PSAnZic7XG4gIH07XG5cbiAgRmlsZS5wcm90b3R5cGUuaXNEaXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuZXhpc3RzKCkgJiYgKCF0aGlzLmZpbGVuYW1lIHx8IHRoaXMuZGlyLmNvbnRlbnRbdGhpcy5maWxlbmFtZV0udHlwZSA9PT0gJ2QnKTtcbiAgfTtcblxuICBGaWxlLnByb3RvdHlwZS5kZWxldGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuZXhpc3RzKCkpIHtcbiAgICAgIGRlbGV0ZSB0aGlzLmRpci5jb250ZW50W3RoaXMuZmlsZW5hbWVdO1xuICAgICAgRlMud3JpdGVGUygpO1xuICAgIH1cbiAgfTtcblxuICBGaWxlLnByb3RvdHlwZS5jbGVhciA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLndyaXRlKCcnLCBmYWxzZSwgdHJ1ZSk7XG4gIH07XG5cbiAgRmlsZS5wcm90b3R5cGUud3JpdGUgPSBmdW5jdGlvbiAoY29udGVudCwgYXBwZW5kLCBmb3JjZSkge1xuICAgIHZhciB0aW1lID0gRmlsZS5nZXRUaW1lc3RhbXAoKTtcblxuICAgIGlmICghdGhpcy5leGlzdHMoKSkge1xuICAgICAgaWYgKGZvcmNlICYmIHRoaXMuaXNWYWxpZCgpKSB7XG4gICAgICAgIHRoaXMuY3JlYXRlRmlsZSh0aW1lKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBmaWxlOiAnICsgdGhpcy5wYXRoKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKCF0aGlzLmlzRmlsZSgpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCB3cml0ZSB0byBkaXJlY3Rvcnk6ICVzJywgdGhpcy5wYXRoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIF9jb250ZW50ID0gJyc7XG4gICAgICBpZiAoYXBwZW5kKSB7XG4gICAgICAgIF9jb250ZW50ICs9IHRoaXMucmVhZCgpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLmRpci5tdGltZSA9IHRpbWU7XG4gICAgICB0aGlzLmRpci5jb250ZW50W3RoaXMuZmlsZW5hbWVdLm10aW1lID0gdGltZTtcbiAgICAgIHRoaXMuZGlyLmNvbnRlbnRbdGhpcy5maWxlbmFtZV0uY29udGVudCA9IF9jb250ZW50ICsgY29udGVudDtcbiAgICAgIEZTLndyaXRlRlMoKTtcbiAgICB9XG4gIH07XG5cbiAgRmlsZS5wcm90b3R5cGUucmVhZCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5maWxlbmFtZSA/IHRoaXMuZGlyLmNvbnRlbnRbdGhpcy5maWxlbmFtZV0uY29udGVudCA6IHRoaXMuZGlyLmNvbnRlbnQ7XG4gIH07XG5cbiAgdmFyIF9jcmVhdGUgPSBmdW5jdGlvbiAodHlwZSwgY29udGVudCkge1xuICAgIHJldHVybiBmdW5jdGlvbiAodGltZXN0YW1wKSB7XG4gICAgICBpZiAodGhpcy5leGlzdHMoKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZpbGUgJXMgYWxyZWFkeSBleGlzdHMnLCB0aGlzLnBhdGgpO1xuICAgICAgfVxuXG4gICAgICBpZiAoIXRpbWVzdGFtcCkge1xuICAgICAgICB0aW1lc3RhbXAgPSBGaWxlLmdldFRpbWVzdGFtcCgpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLmRpci5jb250ZW50W3RoaXMuZmlsZW5hbWVdID0ge1xuICAgICAgICBjdGltZTogdGltZXN0YW1wLFxuICAgICAgICBtdGltZTogdGltZXN0YW1wLFxuICAgICAgICBjb250ZW50OiBjb250ZW50LFxuICAgICAgICB0eXBlOiB0eXBlXG4gICAgICB9O1xuXG4gICAgICBGUy53cml0ZUZTKCk7XG4gICAgfTtcbiAgfTtcblxuICBGaWxlLnByb3RvdHlwZS5jcmVhdGVGb2xkZXIgPSBfY3JlYXRlKCdkJywge30pO1xuICBGaWxlLnByb3RvdHlwZS5jcmVhdGVGaWxlID0gX2NyZWF0ZSgnZicsICcnKTtcblxuICBGaWxlLnByb3RvdHlwZS5zZWxmID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLmZpbGVuYW1lID8gdGhpcy5kaXIgOiB0aGlzLmRpci5jb250ZW50W3RoaXMuZmlsZW5hbWVdO1xuICB9O1xuXG4gIEZpbGUucHJvdG90eXBlLm9wZW4gPSBmdW5jdGlvbiAoZmlsZSkge1xuICAgIHJldHVybiBGaWxlLm9wZW4odGhpcy5wYXRoICsgJy8nICsgZmlsZSk7XG4gIH07XG5cbiAgRmlsZS5wcm90b3R5cGUubGVuZ3RoID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBjb250ZW50ID0gdGhpcy5yZWFkKCk7XG5cbiAgICBpZiAodGhpcy5pc0ZpbGUoKSkge1xuICAgICAgcmV0dXJuIGNvbnRlbnQubGVuZ3RoO1xuICAgIH0gZWxzZSBpZiAodGhpcy5pc0RpcigpKSB7XG4gICAgICByZXR1cm4gT2JqZWN0LmtleXMoY29udGVudCkubGVuZ3RoO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gMDtcbiAgICB9XG4gIH07XG5cbiAgdmFyIG1vbnRocyA9IFsnSmFuJywgJ0ZlYicsICdNYXInLCAnQXByJywgJ01heScsICdKdW4nLCAnSnVsJywgJ0F1ZycsICdTZXAnLCAnT2N0JywgJ05vdicsICdEZWMnXTtcbiAgRmlsZS5wcm90b3R5cGUubXRpbWUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHQgPSBuZXcgRGF0ZSh0aGlzLnNlbGYoKS5tdGltZSk7XG5cbiAgICB2YXIgZGF5QW5kTW9udGggPSAgbW9udGhzW3QuZ2V0TW9udGgoKV0gKyAnICcgKyB0LmdldERheSgpO1xuICAgIGlmIChEYXRlLm5vdygpIC0gdC5nZXRUaW1lKCkgPiA2ICogMzAgKiAyNCAqIDYwKiA2MCAqIDEwMDApIHtcbiAgICAgIHJldHVybiBkYXlBbmRNb250aCArICcgJyArIHQuZ2V0RnVsbFllYXIoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGRheUFuZE1vbnRoICsgJyAnICsgdC5nZXRIb3VycygpICsgJzonICsgdC5nZXRNaW51dGVzKCk7XG4gICAgfVxuICB9O1xuXG4gIHJldHVybiBGaWxlO1xufSkoKTtcblxubW9kdWxlLmV4cG9ydHMgPSBGaWxlO1xuIiwiLy8ganNoaW50IGJpdHdpc2U6IGZhbHNlXG4ndXNlIHN0cmljdCc7XG5cbnZhciBMb2NhbFN0b3JhZ2UgPSByZXF1aXJlKCcuL2xvY2FsLXN0b3JhZ2UnKTtcblxudmFyIEZTID0ge307XG52YXIgRklMRV9TWVNURU1fS0VZID0gJ2ZpbGVfc3lzdGVtJztcblxuRlMud3JpdGVGUyA9IGZ1bmN0aW9uICgpIHtcbiAgTG9jYWxTdG9yYWdlLnNldEl0ZW0oRklMRV9TWVNURU1fS0VZLCBKU09OLnN0cmluZ2lmeShGUy5yb290KSk7XG59O1xuXG5cbkZTLnJvb3QgPSBKU09OLnBhcnNlKExvY2FsU3RvcmFnZS5nZXRJdGVtKEZJTEVfU1lTVEVNX0tFWSkpO1xudmFyIGZpbGVTeXN0ZW0gPSByZXF1aXJlKCcuL2ZpbGUtc3lzdGVtLmpzb24nKTtcbnZhciBjb3B5ID0gZnVuY3Rpb24gY29weShvbGQsIG5uZXcpIHtcbiAgZm9yICh2YXIga2V5IGluIG5uZXcpIHtcbiAgICBvbGRba2V5XSA9IG5uZXdba2V5XTtcbiAgfVxufTtcblxuaWYgKCFGUy5yb290IHx8ICFGUy5yb290LmNvbnRlbnQpIHtcbiAgRlMucm9vdCA9IGZpbGVTeXN0ZW07XG59IGVsc2Uge1xuICB2YXIgdGltZSA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcblxuICAoZnVuY3Rpb24gcmVhZGRpcihvbGQsIG5uZXcpIHtcbiAgICBpZiAodHlwZW9mIG9sZC5jb250ZW50ICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgZm9yICh2YXIga2V5IGluIG5uZXcuY29udGVudCkge1xuICAgICAgICB2YXIgbiA9IG5uZXcuY29udGVudFtrZXldO1xuICAgICAgICB2YXIgbyA9IG9sZC5jb250ZW50W2tleV07XG5cbiAgICAgICAgaWYgKCFvLmNvbnRlbnQpIHtcbiAgICAgICAgICBvID0ge1xuICAgICAgICAgICAgY3RpbWU6IHRpbWUsXG4gICAgICAgICAgICBtdGltZTogdGltZSxcbiAgICAgICAgICAgIGNvbnRlbnQ6IG8uY29udGVudCxcbiAgICAgICAgICAgIHR5cGU6IHR5cGVvZiBvID09PSAnc3RyaW5nJyA/ICdmJyA6ICdkJ1xuICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoby50eXBlID09PSAnZicgJiYgby5tdGltZSA9PT0gby5jdGltZSkge1xuICAgICAgICAgIGNvcHkobywgbik7XG4gICAgICAgIH0gZWxzZSBpZiAoby50eXBlID09PSAnZCcpIHtcbiAgICAgICAgICByZWFkZGlyKG8sIG4pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9KShGUy5yb290LCBmaWxlU3lzdGVtKTtcblxuICBGUy53cml0ZUZTKCk7XG59XG5cbkZTLmN1cnJlbnRQYXRoID0gRlMuaG9tZSA9ICcvVXNlcnMvZ3Vlc3QnO1xuRlMuY3VycmVudERpciA9IEZTLnJvb3QuY29udGVudC5Vc2Vycy5jb250ZW50Lmd1ZXN0O1xuXG5GUy5kaXJuYW1lID0gZnVuY3Rpb24gKHBhdGgpIHtcbiAgcmV0dXJuIHBhdGguc3BsaXQoJy8nKS5zbGljZSgwLCAtMSkuam9pbignLycpO1xufTtcblxuRlMuYmFzZW5hbWUgPSBmdW5jdGlvbiAocGF0aCkge1xuICByZXR1cm4gcGF0aC5zcGxpdCgnLycpLnBvcCgpO1xufTtcblxuRlMudHJhbnNsYXRlUGF0aCA9IGZ1bmN0aW9uIChwYXRoKSB7XG4gIHZhciBpbmRleDtcblxuICBwYXRoID0gcGF0aC5yZXBsYWNlKCd+JywgRlMuaG9tZSk7XG5cbiAgaWYgKHBhdGhbMF0gIT09ICcvJykge1xuICAgIHBhdGggPSAoRlMuY3VycmVudFBhdGggIT09ICcvJyA/IEZTLmN1cnJlbnRQYXRoICsgJy8nIDogJy8nKSArIHBhdGg7XG4gIH1cblxuICBwYXRoID0gcGF0aC5zcGxpdCgnLycpO1xuXG4gIHdoaWxlKH4oaW5kZXggPSBwYXRoLmluZGV4T2YoJy4uJykpKSB7XG4gICAgcGF0aC5zcGxpY2UoaW5kZXgtMSwgMik7XG4gIH1cblxuICB3aGlsZSh+KGluZGV4ID0gcGF0aC5pbmRleE9mKCcuJykpKSB7XG4gICAgcGF0aC5zcGxpY2UoaW5kZXgsIDEpO1xuICB9XG5cbiAgaWYgKHBhdGhbMF0gPT09ICcuJykge1xuICAgIHBhdGguc2hpZnQoKTtcbiAgfVxuXG4gIGlmIChwYXRoLmxlbmd0aCA8IDIpIHtcbiAgICBwYXRoID0gWywsXTtcbiAgfVxuXG4gIHJldHVybiBwYXRoLmpvaW4oJy8nKS5yZXBsYWNlKC8oW14vXSspXFwvKyQvLCAnJDEnKTtcbn07XG5cbkZTLnJlYWxwYXRoID0gZnVuY3Rpb24ocGF0aCkge1xuICBwYXRoID0gRlMudHJhbnNsYXRlUGF0aChwYXRoKTtcblxuICByZXR1cm4gRlMuZXhpc3RzKHBhdGgpID8gcGF0aCA6IG51bGw7XG59O1xuXG5cbkZTLm9wZW4gPSBmdW5jdGlvbiAocGF0aCkge1xuICBpZiAocGF0aFswXSAhPT0gJy8nKSB7XG4gICAgcGF0aCA9IEZTLnRyYW5zbGF0ZVBhdGgocGF0aCk7XG4gIH1cblxuICBwYXRoID0gcGF0aC5zdWJzdHIoMSkuc3BsaXQoJy8nKS5maWx0ZXIoU3RyaW5nKTtcblxuICB2YXIgY3dkID0gRlMucm9vdDtcbiAgd2hpbGUocGF0aC5sZW5ndGggJiYgY3dkLmNvbnRlbnQpIHtcbiAgICBjd2QgPSBjd2QuY29udGVudFtwYXRoLnNoaWZ0KCldO1xuICB9XG5cbiAgcmV0dXJuIGN3ZDtcbn07XG5cbkZTLmV4aXN0cyA9IGZ1bmN0aW9uIChwYXRoKSB7XG4gIHJldHVybiAhIUZTLm9wZW4ocGF0aCk7XG59O1xuXG5GUy5lcnJvciA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIFtdLmpvaW4uY2FsbChhcmd1bWVudHMsICc6ICcpO1xufTtcblxuRlMubm90Rm91bmQgPSBmdW5jdGlvbiAoY21kLCBhcmcpIHtcbiAgcmV0dXJuIEZTLmVycm9yKGNtZCwgYXJnLCAnTm8gc3VjaCBmaWxlIG9yIGRpcmVjdG9yeScpO1xufTtcblxuRlMuYXV0b2NvbXBsZXRlID0gZnVuY3Rpb24gKF9wYXRoKSB7XG4gIHZhciBwYXRoID0gdGhpcy50cmFuc2xhdGVQYXRoKF9wYXRoKTtcbiAgdmFyIG9wdGlvbnMgPSBbXTtcblxuICBpZiAoX3BhdGguc2xpY2UoLTEpID09PSAnLycpIHtcbiAgICBwYXRoICs9ICcvJztcbiAgfVxuXG4gIGlmIChwYXRoICE9PSB1bmRlZmluZWQpIHtcbiAgICB2YXIgZmlsZW5hbWUgPSBfcGF0aC5zcGxpdCgnLycpLnBvcCgpO1xuICAgIHZhciBvcGVuUGF0aCA9IGZpbGVuYW1lLmxlbmd0aCA+IDEgPyBwYXRoLnNsaWNlKDAsIC0xKSA6IHBhdGg7XG4gICAgdmFyIGRpciA9IEZTLm9wZW4ob3BlblBhdGgpO1xuICAgIHZhciBmaWxlTmFtZSA9ICcnO1xuICAgIHZhciBwYXJlbnRQYXRoID0gcGF0aDtcblxuICAgIGlmICghZGlyKSB7XG4gICAgICBwYXRoID0gcGF0aC5zcGxpdCgnLycpO1xuICAgICAgZmlsZU5hbWUgPSBwYXRoLnBvcCgpLnRvTG93ZXJDYXNlKCk7XG4gICAgICBwYXJlbnRQYXRoID0gcGF0aC5qb2luKCcvJykgfHwgJy8nO1xuICAgICAgZGlyID0gRlMub3BlbihwYXJlbnRQYXRoKTtcbiAgICB9XG5cbiAgICBpZiAoZGlyICYmIHR5cGVvZiBkaXIuY29udGVudCA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGZvciAodmFyIGtleSBpbiBkaXIuY29udGVudCkge1xuICAgICAgICBpZiAoa2V5LnN1YnN0cigwLCBmaWxlTmFtZS5sZW5ndGgpLnRvTG93ZXJDYXNlKCkgPT09IGZpbGVOYW1lKSB7XG4gICAgICAgICAgaWYgKHR5cGVvZiBkaXIuY29udGVudFtrZXldLmNvbnRlbnQgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICBrZXkgKz0gJy8nO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIG9wdGlvbnMucHVzaChrZXkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG9wdGlvbnM7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEZTO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGNvbnRhaW5lciwgc2Nyb2xsKSB7XG4gIHdpbmRvdy5vbnJlc2l6ZSA9IHNjcm9sbDtcblxuICBjb250YWluZXIucXVlcnlTZWxlY3RvcignLmZ1bGwtc2NyZWVuJykub25jbGljayA9IGZ1bmN0aW9uIChlKSB7XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgaWYgKCFkb2N1bWVudC5mdWxsc2NyZWVuRWxlbWVudCAmJlxuICAgICAgICAhZG9jdW1lbnQubW96RnVsbFNjcmVlbkVsZW1lbnQgJiZcbiAgICAgICAgICAhZG9jdW1lbnQud2Via2l0RnVsbHNjcmVlbkVsZW1lbnQgJiZcbiAgICAgICAgICAgICFkb2N1bWVudC5tc0Z1bGxzY3JlZW5FbGVtZW50ICkge1xuICAgICAgaWYgKGNvbnRhaW5lci5yZXF1ZXN0RnVsbHNjcmVlbikge1xuICAgICAgICBjb250YWluZXIucmVxdWVzdEZ1bGxzY3JlZW4oKTtcbiAgICAgIH0gZWxzZSBpZiAoY29udGFpbmVyLm1zUmVxdWVzdEZ1bGxzY3JlZW4pIHtcbiAgICAgICAgY29udGFpbmVyLm1zUmVxdWVzdEZ1bGxzY3JlZW4oKTtcbiAgICAgIH0gZWxzZSBpZiAoY29udGFpbmVyLm1velJlcXVlc3RGdWxsU2NyZWVuKSB7XG4gICAgICAgIGNvbnRhaW5lci5tb3pSZXF1ZXN0RnVsbFNjcmVlbigpO1xuICAgICAgfSBlbHNlIGlmIChjb250YWluZXIud2Via2l0UmVxdWVzdEZ1bGxzY3JlZW4pIHtcbiAgICAgICAgY29udGFpbmVyLndlYmtpdFJlcXVlc3RGdWxsc2NyZWVuKEVsZW1lbnQuQUxMT1dfS0VZQk9BUkRfSU5QVVQpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoZG9jdW1lbnQuZXhpdEZ1bGxzY3JlZW4pIHtcbiAgICAgICAgZG9jdW1lbnQuZXhpdEZ1bGxzY3JlZW4oKTtcbiAgICAgIH0gZWxzZSBpZiAoZG9jdW1lbnQubXNFeGl0RnVsbHNjcmVlbikge1xuICAgICAgICBkb2N1bWVudC5tc0V4aXRGdWxsc2NyZWVuKCk7XG4gICAgICB9IGVsc2UgaWYgKGRvY3VtZW50Lm1vekNhbmNlbEZ1bGxTY3JlZW4pIHtcbiAgICAgICAgZG9jdW1lbnQubW96Q2FuY2VsRnVsbFNjcmVlbigpO1xuICAgICAgfSBlbHNlIGlmIChkb2N1bWVudC53ZWJraXRFeGl0RnVsbHNjcmVlbikge1xuICAgICAgICBkb2N1bWVudC53ZWJraXRFeGl0RnVsbHNjcmVlbigpO1xuICAgICAgfVxuICAgIH1cbiAgfTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gdHlwZW9mIGxvY2FsU3RvcmFnZSA9PT0gJ3VuZGVmaW5lZCcgP1xuICB7XG4gICAgc2V0SXRlbTogZnVuY3Rpb24oKSB7fSxcbiAgICBnZXRJdGVtOiBmdW5jdGlvbigpIHsgcmV0dXJuIG51bGw7IH1cbiAgfVxuOlxuICBsb2NhbFN0b3JhZ2U7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIFN0cmVhbSgpIHtcbiAgdGhpcy5fY2FsbGJhY2tzID0ge307XG59XG5cblN0cmVhbS5wcm90b3R5cGUub24gPSBmdW5jdGlvbiAoZXZlbnQsIGNhbGxiYWNrKSB7XG4gIGlmICghdGhpcy5fY2FsbGJhY2tzW2V2ZW50XSkge1xuICAgIHRoaXMuX2NhbGxiYWNrc1tldmVudF0gPSBbXTtcbiAgfVxuXG4gIHRoaXMuX2NhbGxiYWNrc1tldmVudF0ucHVzaChjYWxsYmFjayk7XG59O1xuXG5TdHJlYW0ucHJvdG90eXBlLndyaXRlID0gZnVuY3Rpb24gKGRhdGEpIHtcbiAgdGhpcy5lbW1pdCgnZGF0YScsIGRhdGEpO1xufTtcblxuU3RyZWFtLnByb3RvdHlwZS5lbW1pdCA9IGZ1bmN0aW9uIChldmVudCwgZGF0YSkge1xuICB2YXIgY2FsbGJhY2tzID0gdGhpcy5fY2FsbGJhY2tzW2V2ZW50XTtcblxuICBpZiAoY2FsbGJhY2tzKSB7XG4gICAgY2FsbGJhY2tzLmZvckVhY2goZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgICBjYWxsYmFjayhkYXRhKTtcbiAgICB9KTtcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBTdHJlYW07XG4iLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG4ndXNlIHN0cmljdCc7XG5cbnZhciBDb21tYW5kTWFuYWdlciA9IHJlcXVpcmUoJy4vY29tbWFuZC1tYW5hZ2VyJyk7XG52YXIgUkVQTCA9IHJlcXVpcmUoJy4vUkVQTCcpO1xudmFyIFN0cmVhbSA9IHJlcXVpcmUoJy4vc3RyZWFtJyk7XG52YXIgYmluZEZ1bGxTY3JlZW4gPSByZXF1aXJlKCcuL2Z1bGwtc2NyZWVuJyk7XG52YXIgRlMgPSByZXF1aXJlKCcuL2ZzJyk7XG5cbnZhciBaU0ggPSB7XG4gIGFyZ3NQYXJzZXI6IHJlcXVpcmUoJy4vYXJncy1wYXJzZXInKSxcbiAgY29tbWFuZE1hbmFnZXI6IHJlcXVpcmUoJy4vY29tbWFuZC1tYW5hZ2VyJyksXG4gIENvbnNvbGU6IHJlcXVpcmUoJy4vY29uc29sZScpLFxuICBmaWxlOiByZXF1aXJlKCcuL2ZpbGUnKSxcbiAgZnM6IHJlcXVpcmUoJy4vZnMnKSxcbiAgbG9jYWxTdG9yYWdlOiByZXF1aXJlKCcuL2xvY2FsLXN0b3JhZ2UnKSxcbiAgcmVwbDogcmVxdWlyZSgnLi9yZXBsJyksXG4gIHN0cmVhbTogcmVxdWlyZSgnLi9zdHJlYW0nKVxufTtcblxudmFyIHB3ZCA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIEZTLmN1cnJlbnRQYXRoLnJlcGxhY2UoRlMuaG9tZSwgJ34nKTtcbn07XG5cblpTSC4kUFMxID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gJzxzcGFuIGNsYXNzPVwid2hvXCI+Z3Vlc3Q8L3NwYW4+ICcgK1xuICAgICdvbiAnICtcbiAgICAnPHNwYW4gY2xhc3M9XCJ3aGVyZVwiPicgKyBwd2QoKSArICc8L3NwYW4+ICcrXG4gICAgJzxzcGFuIGNsYXNzPVwiYnJhbmNoXCI+wrFtYXN0ZXI8L3NwYW4+Jmd0Oyc7XG59O1xuXG5aU0gucHJvbXB0ID0gZnVuY3Rpb24gKCkge1xuICB2YXIgcm93ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cbiAgdmFyIHNwYW4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gIHNwYW4uY2xhc3NOYW1lID0gJ3BzMSc7XG4gIHNwYW4uaW5uZXJIVE1MID0gWlNILiRQUzEoKTtcblxuXG4gIHZhciBjb2RlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICBjb2RlLmNsYXNzTmFtZSA9ICdjb2RlJztcblxuICByb3cuYXBwZW5kQ2hpbGQoc3Bhbik7XG4gIHJvdy5hcHBlbmRDaGlsZChjb2RlKTtcblxuICBaU0guY29udGFpbmVyLmFwcGVuZENoaWxkKHJvdyk7XG5cbiAgUkVQTC51c2UoY29kZSwgWlNIKTtcblxuICBaU0guc3RhdHVzKHB3ZCgpKTtcblxuICBaU0guc2Nyb2xsKCk7XG5cbiAgcm93LmFwcGVuZENoaWxkKFpTSC5pbnB1dCk7XG5cbiAgWlNILmlucHV0LmZvY3VzKCk7XG59O1xuXG5aU0guc3RhdHVzID0gZnVuY3Rpb24odGV4dCkge1xuICBpZiAodGhpcy5zdGF0dXNiYXIpIHtcbiAgICB0aGlzLnN0YXR1c2Jhci5pbm5lclRleHQgPSB0ZXh0O1xuICB9XG59O1xuXG5aU0guaW5pdCA9IGZ1bmN0aW9uIChjb250YWluZXIsIHN0YXR1c2Jhcikge1xuICB0aGlzLnJvb3RDb250YWluZXIgPSB0aGlzLmNvbnRhaW5lciA9IGNvbnRhaW5lcjtcbiAgdGhpcy5zdGF0dXNiYXIgPSBzdGF0dXNiYXI7XG4gIHRoaXMuaW5pdGlhbGl6ZUlucHV0KCk7XG4gIHRoaXMucHJvbXB0KCk7XG4gIGJpbmRGdWxsU2NyZWVuKHRoaXMuY29udGFpbmVyLnBhcmVudEVsZW1lbnQsIHRoaXMuc2Nyb2xsKTtcbn07XG5cblpTSC5pbml0aWFsaXplSW5wdXQgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBpbnB1dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lucHV0Jyk7XG4gIGlucHV0LmNsYXNzTmFtZSA9ICdmYWtlLWlucHV0JztcbiAgdGhpcy5yb290Q29udGFpbmVyLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgaWYgKGlucHV0ID09PSBkb2N1bWVudC5hY3RpdmVFbGVtZW50KSB7XG4gICAgICBpbnB1dC5ibHVyKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlucHV0LmZvY3VzKCk7XG4gICAgfVxuICB9KTtcblxuICB0aGlzLmlucHV0ID0gaW5wdXQ7XG59O1xuXG5aU0guY3JlYXRlID0gZnVuY3Rpb24gKGNvbnRhaW5lcikge1xuICBpZiAodHlwZW9mIGNvbnRhaW5lciA9PT0gJ3N0cmluZycpIHtcbiAgICBjb250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChjb250YWluZXIpO1xuICB9XG5cbiAgY29udGFpbmVyLmlubmVySFRNTCA9XG4gICAgJzxkaXYgY2xhc3M9XCJ0ZXJtaW5hbFwiPicgK1xuICAgICAgJzxkaXYgY2xhc3M9XCJiYXJcIj4nICtcbiAgICAgICAgJzxkaXYgY2xhc3M9XCJidXR0b25zXCI+JyArXG4gICAgICAgICAgJzxhIGNsYXNzPVwiY2xvc2VcIiBocmVmPVwiI1wiPjwvYT4nICtcbiAgICAgICAgICAnPGEgY2xhc3M9XCJtaW5pbWl6ZVwiIGhyZWY9XCIjXCI+PC9hPicgK1xuICAgICAgICAgICc8YSBjbGFzcz1cIm1heGltaXplXCIgaHJlZj1cIiNcIj48L2E+JyArXG4gICAgICAgICc8L2Rpdj4nICtcbiAgICAgICAgJzxkaXYgY2xhc3M9XCJ0aXRsZVwiPicgK1xuICAgICAgICAnPC9kaXY+JyArXG4gICAgICAgICc8YSBjbGFzcz1cImZ1bGwtc2NyZWVuXCIgaHJlZj1cIiNcIj48L2E+JyArXG4gICAgICAnPC9kaXY+JyArXG4gICAgICAnPGRpdiBjbGFzcz1cImNvbnRlbnRcIj4nICtcbiAgICAgICc8L2Rpdj4nICtcbiAgICAgICc8ZGl2IGNsYXNzPVwic3RhdHVzLWJhclwiPicgK1xuICAgICAgJzwvZGl2PicgK1xuICAgICc8L2Rpdj4nO1xuXG4gIHRoaXMuaW5pdChjb250YWluZXIucXVlcnlTZWxlY3RvcignLmNvbnRlbnQnKSxcbiAgICAgICAgICAgIGNvbnRhaW5lci5xdWVyeVNlbGVjdG9yKCcuc3RhdHVzLWJhcicpKTtcbn07XG5cblpTSC51cGRhdGUgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBjb2RlcyA9IHRoaXMuY29udGFpbmVyLmdldEVsZW1lbnRzQnlDbGFzc05hbWUoJ2NvZGUnKTtcblxuICBpZiAoIWNvZGVzLmxlbmd0aCkge1xuICAgIHRoaXMucHJvbXB0KCk7XG4gIH0gZWxzZSB7XG4gICAgUkVQTC51c2UoY29kZXNbY29kZXMubGVuZ3RoIC0gMV0sIFpTSCk7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIG91dHB1dCAoX291dHB1dCwgX2NsYXNzKSB7XG4gIHZhciBvdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgb3V0LmNsYXNzTmFtZSA9ICdjb2RlICcgKyBbX2NsYXNzXTtcbiAgb3V0LmlubmVySFRNTCA9IF9vdXRwdXQ7XG5cbiAgWlNILmNvbnRhaW5lci5hcHBlbmRDaGlsZChvdXQpO1xuICBaU0guc2Nyb2xsKCk7XG59XG5cblpTSC5zdGRvdXQgPSBuZXcgU3RyZWFtKCk7XG5aU0guc3Rkb3V0Lm9uKCdkYXRhJywgZnVuY3Rpb24gKGRhdGEpIHtcbiAgb3V0cHV0KGRhdGEudG9TdHJpbmcoKSwgJ3N0ZG91dCcpO1xufSk7XG5cblpTSC5zdGRlcnIgPSBuZXcgU3RyZWFtKCk7XG5aU0guc3RkZXJyLm9uKCdkYXRhJywgZnVuY3Rpb24gKGRhdGEpIHtcbiAgb3V0cHV0KGRhdGEudG9TdHJpbmcoKSwgJ3N0ZGVycicpO1xufSk7XG5cblpTSC5zY3JvbGwgPSBmdW5jdGlvbiAoKSB7XG4gIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgIFpTSC5yb290Q29udGFpbmVyLnNjcm9sbFRvcCA9IFpTSC5yb290Q29udGFpbmVyLnNjcm9sbEhlaWdodDtcbiAgfSwgMCk7XG59O1xuXG5aU0guY2xlYXIgPSBmdW5jdGlvbiAoKSB7XG4gIFpTSC5jb250YWluZXIuaW5uZXJIVE1MID0gJyc7XG4gIFpTSC5wcm9tcHQoKTtcbn07XG5cbkNvbW1hbmRNYW5hZ2VyLnJlZ2lzdGVyKCdjbGVhcicsIFpTSC5jbGVhcik7XG5cbih0eXBlb2YgcmVxdWlyZSA9PT0gJ3VuZGVmaW5lZCcgPyB3aW5kb3cgOiBnbG9iYWwpLlpTSCA9IFpTSDtcbm1vZHVsZS5leHBvcnRzID0gWlNIO1xuXG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSJdfQ==
