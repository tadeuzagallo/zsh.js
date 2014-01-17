# Terminal.js

A web version of my terminal, try it: (tadeuzagallo.com)[http://tadeuzagallo.com]

## Features

Right now you can use the follow shell functions:

* `alias`
* `cat`
* `cd`
* `clear`
* `echo`
* `ls`
* `pwd`

And the functionalities

* Autocomplete for commands
* Syntax Highlight
* Commands History

The other executable commands are just to show stuff about me... (since it was made for my personal website)

What I intend to implement next:

* `less`
* auto completion for paths
* add support to pipe commands
* add the binds for tmux, some functionality is built but not accessible
* copy and paste
* C-c to clear line
* `vim`
* `mkdir`
* add help for methods

## Contributing

Any .js file put inside `src/js/lib/commands` will automatically added on build, so feel free to add any
program and drop it there.
To actually bind the command you should

```js
var CommandManager = require('../command-manager');
CommandManager.register('my-awesome-program', myAwesomeProram);
```

Further doubts you can check the source of any of those commands.

## Contact

You can:

* Follow (@tadeuzagallo)[https://twitter.com/tadeuzagallo] on Twitter
* Mail me at (tadeuzagallo@gmail.com)[mailto:tadeuzagallo@gmail.com]
* Open an issue

Any feedback or help is appreciated! :)

## License
Terminal.js is available under MIT licence. See the LICENCE file for more info.
