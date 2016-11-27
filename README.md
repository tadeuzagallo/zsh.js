# zsh.js #

An _almost functional_ zsh terminal in any div

## Instalation ##

You can install via npm

```sh
$ npm install zsh.js
```

## Basic Usage ##

Include the script and style:

```html
<link href="path/to/zsh.min.css" rel="stylesheet" />
<script src="path/to/zsh.js"></script>
```

You can either access it though a global variable `ZSH` or via a client side
require:

```js
var ZSH = require('zsh.js');
var FileSystem = require('zsh.js/lib/fs');
var CommandManager = require('zsh.js/lib/command-manager');
```

In order to display the terminal, call `ZSH.create` with the target div's ID:

```js
ZSH.create('container');
```

### Web Component

You can also include `zsh.js` as a web component:

```html
<link rel="import" href="path/to/zsh.js/zsh-terminal.html"/>

<zsh-terminal></zsh-terminal>
```

An [example](https://github.com/tadeuzagallo/zsh.js/blob/master/example/web-component.html) is also available

## Features

The commands, such as `cd` and `mv`, are written in javascript and hosted at `/usr/bin`. You can `ls` directory to see which commands are currently implemented, `cat` a command to see its implementation, check the contents of [lib/fs/usr/bin](https://github.com/tadeuzagallo/zsh.js/tree/master/lib/fs/usr/bin) or simply run `help`, which will show you all the aliases and commands available.

Some other functionalities include:

* Autocomplete for commands
* Syntax Highlight
* Commands History

## Contributing

Executable files are stored inside the actual file system folder and can be viewed within the terminal.
The path is not customizable yet, so all the commands are in `src/lib/fs/usr/bin/*.js`

_Notice that_: It is still possible to add commands through the CommandManager, but they are not automatically required, but could work if you are writing a plugin (example: [tadeuzagallo.com/src/js/site-helpers.js](https://github.com/tadeuzagallo/tadeuzagallo.com/blob/master/src/js/site-helpers.js))

The most complex command so far is [mv.js](https://github.com/tadeuzagallo/zsh.js/blob/master/lib/fs/usr/bin/mv.js), check it out if you want to implement a custom command.

## License
Terminal.js is available under MIT licence. See the LICENCE file for more info.
