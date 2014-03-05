_ = require('lodash')
fs = require('fs')
glob = require('glob')
gulp = require('gulp')
lr = require('tiny-lr')
Path = require('path')

browserify = require('gulp-browserify')
concat = require('gulp-concat')
exec = require('gulp-exec')
gutil = require('gulp-util')
jshint = require('gulp-jshint')
minifyCss = require('gulp-minify-css')
mocha = require('gulp-mocha')
plumber = require('gulp-plumber')
refresh = require('gulp-livereload')
rename = require('gulp-rename')
uglify = require('gulp-uglify')
stylus = require('gulp-stylus')

server = lr()

config = _.extend
  port: 8080
  lrport: 35729
  env: 'development'
, gutil.env

path =
  js:
    bin: 'src/js/fs/usr/bin/*'
    lib:
      all: 'src/js/**/*.js'
      entry: 'src/js/terminal.js'
    fs:
      all: 'src/js/fs/**/*.js'
      entry: 'src/js/file-system.json'
    commands:
      all: 'src/js/commands/**/*.js'
      entry: 'src/js/commands.js'
    spec:
      all: 'spec/js/**/*.js'
  css:
    all: 'src/css/**/*.styl'
  build: 'build/'

production = config.env is 'production'

gulp.task 'jshint', ->
  gulp.src(['Gulpfile.js', path.js.spec.all, path.js.lib.all])
    .pipe(plumber())
    .pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'))

gulp.task 'clean', ->
  gulp.src([path.build, path.js.bin])
    .pipe(plumber())
    .pipe(exec('rm -r <%= file.path %>'))

gulp.task 'commands', ['clean'], (cb)->
  commands = fs.readdirSync('src/js/commands')
    .filter((f) ->
      f[0] != '.' && f.substr(-3) == '.js'
    ).map (f) ->
      exec('ln -fh ' +
        __dirname +
        '/src/js/commands/' +
        f +
        ' src/js/fs/usr/bin/' +
        f.slice(0, -3)) if production

      "require('./commands/#{f}');"

  fs.writeFileSync(path.js.commands.entry, commands.join('\n'))

  cb(null)

gulp.task 'file-system', ['commands'], (cb) ->
  _fs = {}
  _ignore = [
    '\\.DS_Store',
    '.*\\.swp'
  ]
  root = 'src/js/fs'

  readdir = (path, container) ->
    files = fs.readdirSync(path)

    files.forEach (file) ->
      for i in _ignore.length
        return if file.match(new RegExp('^' + _ignore[i] + '$'))

      stat = fs.statSync(path + '/' + file)

      if stat.isDirectory()
        f = {}
        readdir(path + '/' + file, f)
        container[file] = f
      else
        container[file] = fs.readFileSync(path + '/' + file).toString()

  readdir(root, _fs)

  fs.writeFileSync(path.js.fs.entry, JSON.stringify(_fs, null, 2))

  cb(null)

gulp.task 'js', ['jshint', 'file-system'], () ->
  gulp.src(path.js.lib.entry)
    .pipe(plumber())
    .pipe(browserify( debug: !production ))
    .on('prebundle', (bundle)->
      bundle.require('./fs', expose: 'fs')
      bundle.require('./terminal', expose: 'terminal')
      bundle.require('./args-parser', expose: 'args-parser')
      bundle.require('./command-manager', expose: 'command-manager')
      bundle.require('./console', expose: 'console')
      bundle.require('./file', expose: 'file')
      glob.sync(path.js.commands.all).forEach (command)->
        command = Path.basename(command, '.js')
        bundle.require("./commands/#{command}", expose: "commands/#{command}")
    )
    .pipe(gulp.dest(path.build))
    .pipe(rename( suffix: '.min' ))
    .pipe(uglify())
    .pipe(gulp.dest(path.build))
    .pipe(refresh(server))

gulp.task 'css', () ->
  gulp.src(path.css.all)
    .pipe(plumber())
    .pipe(stylus( set: (if production then ['compress'] else []), urlFunc: ['inline-image'] ))
    .pipe(concat('terminal.css'))
    .pipe(gulp.dest(path.build))
    .pipe(rename( suffix: '.min' ))
    .pipe(minifyCss())
    .pipe(gulp.dest(path.build))
    .pipe(refresh(server))

gulp.task 'build', ['js', 'css']

gulp.task 'watch', ['build'], (cb) ->
  server.listen config.lrport, (err) ->
    console.log(err) if err

  gulp.watch(path.css.all, ['css'])
  gulp.watch(path.js.lib.all, ['js'])

  cb(null)

gulp.task 'spec', ['js'], () ->
  gulp
    .src('spec/**/*-spec.js')
    .pipe(mocha())

gulp.task 'spec-live', ['spec'], () ->
  gulp.watch('src/js/**/*.js', ['js', 'spec'])
  gulp.watch('spec/**/*.js', ['spec'])

gulp.task 'default', ['watch']
