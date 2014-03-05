require('./commands')

REPL = require('./REPL')
FS = require('./fs')
CommandManager = require('./command-manager')
stream = require('stream')
bindFullScreen = require('./full-screen')
pwd = require('./commands/pwd')

(if typeof window is 'undefined' then GLOBAL else window).Terminal = {}

Terminal.$PS1 = ->
  return '<span class="who">guest</span> ' +
    'on ' +
    '<span class="where">' + pwd(true) + '</span> '+
    '<span class="branch">±master</span>&gt;'

Terminal.prompt = ->
  row = document.createElement('div')

  span = document.createElement('span')
  span.className = 'ps1'
  span.innerHTML = this.$PS1()


  code = document.createElement('span')
  code.className = 'code'

  row.appendChild(span)
  row.appendChild(code)

  this.container.appendChild(row)

  REPL.use(code)

  this.status(pwd(true))

  this.scroll()

Terminal.status = (text) ->
  this.statusbar.innerText = text if this.statusbar

Terminal.init = (container, statusbar) ->
  this.rootContainer = this.container = container
  this.statusbar = statusbar
  this.prompt()
  bindFullScreen(this.container.parentElement)

Terminal.create = (container) ->
  container = document.getElementById(container) if typeof container is 'string'

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
    '</div>'

  this.init(container.querySelector('.content'),
            container.querySelector('.status-bar'))

Terminal.update = ->
  codes = this.container.getElementsByClassName('code')

  if codes.length
    REPL.use(codes[codes.length - 1])
  else
    this.prompt()

Terminal.stdout = new stream.PassThrough()
Terminal.stdout.on 'data', (data)->
  output(data.toString(), 'stdout')

Terminal.stderr = new stream.PassThrough()
Terminal.stderr.on 'data', (data)->
  output(data.toString(), 'stderr')

output = (_output, _class) ->
  out = document.createElement('div')
  out.className = 'code ' + [_class]
  out.innerHTML = _output

  Terminal.container.appendChild(out)
  Terminal.scroll()

Terminal.scroll = ->
  setTimeout ->
    Terminal.rootContainer.scrollTop = Terminal.rootContainer.scrollHeight
  , 0

Terminal.clear = ->
  Terminal.container.innerHTML = ''
  Terminal.prompt()

CommandManager.register('clear', Terminal.clear)

module.exports = Terminal
