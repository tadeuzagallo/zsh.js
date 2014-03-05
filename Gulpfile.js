var _ = require('lodash');
var express = require('express');
var fs = require('fs');
var gulp = require('gulp');
var lr = require('tiny-lr');
var path = require('path');
var sequence = require('run-sequence');

var browserify = require('gulp-browserify');
var concat = require('gulp-concat');
var exec = require('gulp-exec');
var gulpif = require('gulp-if');
var gzip = require('gulp-gzip');
var haml = require('gulp-haml');
var imagemin = require('gulp-imagemin');
var jshint = require('gulp-jshint');
var mocha = require('gulp-mocha');
var plumber = require('gulp-plumber');
var refresh = require('gulp-livereload');
var rename = require('gulp-rename');
var uglify = require('gulp-uglify');
var stylus = require('gulp-stylus');

var server = lr();
var config = _.extend({
  port: 8080,
  lrport: 35729,
  env: 'development'
}, gulp.env);
console.log(config);
var production = config.env === 'production' || config._.indexOf('deploy') !== -1;

gulp.task('compile-resume', function () {
  return gulp
    .src('src/resume.md')
    .pipe(plumber())
    .pipe(exec('./md2resume html <%= file.path %> out/'));
});

gulp.task('resume', ['compile-resume'], function () {
  return gulp
    .src('out/resume.html')
    .pipe(gulpif(production, gzip()))
    .pipe(gulp.dest('out'));
});


gulp.task('jshint', function () {
  return gulp.src(['Gulpfile.js', 'spec/**/*.js', 'src/js/**/*.js'])
    .pipe(plumber())
    .pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'));
});

gulp.task('clean', function () {
  return gulp.src(['out', 'src/js/lib/fs/usr/bin/*'])
    .pipe(plumber())
    .pipe(exec('rm -r <%= file.path %>'));
});

gulp.task('commands', function (cb) {
  var commands = fs.readdirSync('src/js/lib/commands')
    .filter(function (f) {
      return f[0] != '.' && f.substr(-3) == '.js';
    }).map(function (f) {
      if (production) {
        exec('ln -fh ' + __dirname + '/src/js/lib/commands/' + f + ' src/js/lib/fs/usr/bin/' + f.slice(0, -3));
      }

      return 'require("' + './commands/' + f + '");';
    });

  fs.writeFileSync('src/js/lib/commands.js', commands.join('\n'));

  cb(null);
});

gulp.task('file-system', function (cb) {
  var _fs = {};
  var _ignore = [
    '\\.DS_Store',
    '.*\\.swp'
  ];
  var root = 'src/js/lib/fs';

  (function readdir(path, container) {
    var files = fs.readdirSync(path);

    files.forEach(function (file) {
      for (var i = 0, l = _ignore.length; i < l; i++) {
        if (file.match(new RegExp('^' + _ignore[i] + '$'))) {
          return;
        }
      }

      var stat = fs.statSync(path + '/' + file);

      if (stat.isDirectory()) {
        var f = {};
        readdir(path + '/' + file, f);
        container[file] = f;
      } else {
        container[file] = fs.readFileSync(path + '/' + file).toString();
      }
    });
  })(root, _fs);

  fs.writeFileSync('src/js/lib/file-system.json', JSON.stringify(_fs, null, 2));

  cb(null);
});

gulp.task('js', ['jshint', 'commands', 'file-system'], function () {
  return gulp.src('src/js/main.js')
    .pipe(plumber())
    .pipe(browserify({ debug: !production }))
    .pipe(concat('all.js'))
    .pipe(gulpif(production, uglify()))
    .pipe(gulp.dest('out/js'))
    .pipe(gulpif(production, gzip()))
    .pipe(gulpif(production, gulp.dest('out/js')))
    .pipe(refresh(server));
});

gulp.task('css', function () {
  return gulp.src('src/css/**/*.styl')
    .pipe(plumber())
    .pipe(stylus({ set: production ? ['compress'] : [] }))
    .pipe(concat('all.css'))
    .pipe(gulp.dest('out/css'))
    .pipe(gulpif(production, gzip()))
    .pipe(gulp.dest('out/css'))
    .pipe(refresh(server));
});

gulp.task('images', function () {
  return gulp.src('src/images/**')
    .pipe(plumber())
    .pipe(gulpif(production, imagemin()))
    .pipe(gulp.dest('out/images'))
    .pipe(refresh(server));
});

gulp.task('html', function () {
  return gulp.src('src/**/*.haml')
    .pipe(plumber())
    .pipe(haml({ optimize: production }))
    .pipe(gulp.dest('out'))
    .pipe(gulpif(production, gzip()))
    .pipe(gulp.dest('out'))
    .pipe(refresh(server));
});

gulp.task('build', function (cb) {
  sequence('clean',
           ['js', 'css', 'images', 'html', 'resume'],
           cb);
});

gulp.task('lr-server', function (cb) {
  server.listen(config.lrport, function (err) {
    if (err) {
      console.log(err);
    }
  });

  cb(null);
});

gulp.task('start-server', ['build', 'lr-server'], function (cb) {
  express()
    .use(express.static(path.resolve("./out")))
    .use(express.directory(path.resolve("./out")))
    .listen(config.port, function () {
      console.log("Listening on port %s...", config.port);
    });

  cb(null);
});

gulp.task('watch', ['start-server'], function (cb) {
  gulp.watch('src/js/**/*.js', function () {
    gulp.start('js');
  });

  gulp.watch('src/css/**/*.styl', function () {
    gulp.start('css');
  });

  gulp.watch('src/images/**', function () {
    gulp.start('images');
  });

  gulp.watch('src/**/*.haml', function () {
    gulp.start('html');
  });

  cb(null);
});

gulp.task('server', ['watch']);

gulp.task('spec', ['js'], function () {
  gulp
    .src('spec/**/*-spec.js')
    .pipe(mocha());
});

gulp.task('spec-live', ['spec'], function () {
  gulp.watch('src/js/**/*.js', ['js', 'spec']);
  gulp.watch('spec/**/*.js', ['spec']);
});

gulp.task('create-cname', ['build'], function (cb) {
  fs.writeFileSync('out/CNAME', 'tadeuzagallo.com');
  cb(null);
});

gulp.task('deploy', ['create-cname'], function () {
  return gulp.src('out')
    .pipe(exec('cd <%= file.path %> && git init && git add -A . && git c -m "deploy" && git push --force git@github.com:tadeuzagallo/tadeuzagallo.github.io.git master'));
});
