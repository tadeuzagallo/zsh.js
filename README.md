# zsh.js #

An _almost_ functional zsh terminal in any div

## Instalation ##

You can install via npm

```sh
$ npm install zsh.js
```

or via bower

```sh
$ bower install zsh.js
```

## Basic Usage ##

Include the script and style

```html
<link href="path/to/zsh.min.css" rel="stylesheet" />
<script src="path/to/zsh.js"></script>
```

A global variable `ZSH` will be available, but require is also available - ~~if you
want to add a custom command or rack around~~ 

```js
var ZSH = require('zsh.js');
var FileSystem = require('zsh.js/lib/fs');
var CommandManager = require('zsh.js/lib/command-manager');
```

And initialize it, passing an a `div` `id` to `ZSH.create`

```js
ZSH.create('container');
```

### Web Component

You can also include `zsh` as a web component:

```html
<link rel="import" href="path/to/zsh.js/zsh-terminal.html"/>

<zsh-terminal></zsh-terminal>
```

An [example](https://github.com/tadeuzagallo/zsh.js/blob/master/example/web-component.html) is also available

## Features

~~Right now you can use the follow shell functions:~~

To check the current implemented programs just run `ls /usr/bin` or check the contents of [lib/fs/usr/bin](https://github.com/tadeuzagallo/zsh.js/tree/master/lib/fs/usr/bin)

And the functionalities

* Autocomplete for commands
* Syntax Highlight
* Commands History

The other executable commands are just to show stuff about me... (since it was made for my personal website)

What I intend to implement next:

* `less`
* ~~auto completion for paths~~
* ~~add support to pipe commands~~ Better command parsing
* ~~add the binds for tmux, some functionality is built but not accessible~~
* copy and paste
* ~~C-c to clear line~~
* `vim`
* ~~`mkdir`~~
* add help for methods

## Contributing

__Updated__

Executable files are now stored inside the actual file system folder and can be viewed within the terminal.
The path is not customizable yet, so all the commands are in `src/lib/fs/usr/bin/*.js`

_Notice that_: It is still possible to add commands through the CommandManager, but they are not automatically required, but could work if you are writing a plugin (example: [tadeuzagallo.com/src/js/site-helpers.js](https://github.com/tadeuzagallo/tadeuzagallo.com/blob/master/src/js/site-helpers.js))

~~Any .js file put inside `src/js/lib/commands` will automatically added on build, so feel free to add any
program and drop it there.~~

The most complex program so far is [mv.js](https://github.com/tadeuzagallo/zsh.js/blob/master/lib/fs/usr/bin/mv.js)... Check it out to if you want to implement a custom command.

If you need help just get in touch!

## Contact

You can:

* Follow [@tadeuzagallo](https://twitter.com/tadeuzagallo) on Twitter
* Mail me at tadeuzagallo@gmail.com
* Open an issue

Any feedback or help is appreciated! :)

## License
Terminal.js is available under MIT licence. See the LICENCE file for more info.
