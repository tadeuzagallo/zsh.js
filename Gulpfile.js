var _ = require('lodash');
var express = require('express');
var fs = require('fs');
var gulp = require('gulp');
var lr = require('tiny-lr');
var path = require('path');

var browserify = require('gulp-browserify');
var concat = require('gulp-concat');
var gulpif = require('gulp-if');
var gzip = require('gulp-gzip');
var haml = require('gulp-haml');
var imagemin = require('gulp-imagemin');
var jshint = require('gulp-jshint');
var mocha = require('gulp-mocha');
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
var production = config.env === 'production';

function exec(cmd) {
  var child = require('child_process').spawn('bash', ['-c', cmd]);

  child.stderr.on('data', function(data) {
    console.log('stderr:' + data);
  });

  child.stdout.on('data', function(data) {
    console.log(data.toString());
  });
}

gulp.task('clean', function() {
  exec('rm -rf out');
  exec('rm src/js/lib/fs/usr/bin/*');
});

gulp.task('lr-server', function () {
  server.listen(config.lrport, function (err) {
    if (err) {
      console.log(err);
    }
  });
});

gulp.task('commands', function () {
  if (production) {
    gulp.run('clean', _commands);
  } else {
    _commands();
  }

  function _commands() {
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
  }
});

gulp.task('file-system', function () {
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
});

gulp.task('jshint', function() {
  gulp.src(['Gulpfile.js', 'spec/**/*.js', 'src/js/**/*.js'])
  .pipe(jshint())
  .pipe(jshint.reporter('jshint-stylish'));
});

gulp.task('js', ['jshint', 'commands', 'file-system'], function () {
  var src = config.site ? 'src/js/site.js' : 'src/js/main.js';

  gulp.src(src)
  .pipe(browserify({ debug: !production }))
  .pipe(concat('all.js'))
  .pipe(gulpif(production, uglify()))
  .pipe(gulp.dest('out/js'))
  .pipe(gulpif(production, gzip()))
  .pipe(gulpif(production, gulp.dest('out/js')))
  .pipe(refresh(server));
});

gulp.task('css', function () {
  gulp.src('src/css/**/*.styl')
  .pipe(stylus({ set: production ? ['compress'] : [] }))
  .pipe(concat('all.css'))
  .pipe(gulp.dest('out/css'))
  .pipe(gulpif(production, gzip()))
  .pipe(gulp.dest('out/css'))
  .pipe(refresh(server));
});

gulp.task('images', function () {
  gulp.src('src/images/**')
  .pipe(gulpif(production, imagemin()))
  .pipe(gulp.dest('out/images'))
  .pipe(refresh(server));
});

gulp.task('html', function () {
  gulp.src('src/**/*.haml')
  .pipe(haml({ optimize: production }))
  .pipe(gulp.dest('out'))
  .pipe(gulpif(production, gzip()))
  .pipe(gulp.dest('out'))
  .pipe(refresh(server));
});

gulp.task('start-server', function() {
  express()
  .use(express.static(path.resolve("./out")))
  .use(express.directory(path.resolve("./out")))
  .listen(config.port, function() {
    console.log("Listening on ", config.port);
  });
});


gulp.task('spec', ['js'], function () {
  gulp.src('spec/**/*-spec.js')
  .pipe(mocha());
});

gulp.task('build', ['js', 'css', 'images', 'html']);

gulp.task('server', ['build', 'lr-server', 'start-server'], function () {
  gulp.watch(['src/js/**/*.js', 'src/js/lib/fs/**'], function () {
    gulp.run('js');
  });

  gulp.watch('src/css/**/*.styl', function () {
    gulp.run('css');
  });

  gulp.watch('src/images/**', function () {
    gulp.run('images');
  });

  gulp.watch('src/**/*.haml', function () {
    gulp.run('html');
  });
});

gulp.task('spec-live', ['spec'], function(){
  gulp.watch('src/js/**/*.js', function () {
    gulp.run('js', 'spec');
  });

  gulp.watch('spec/**/*.js', function(){
    gulp.run('spec');
  });
});

gulp.task('deploy', function () {
  config.site = true;
  production = true;
  config.env = 'production';

  gulp.run('build');

  setTimeout(function() {
    fs.writeFileSync('out/CNAME', 'tadeuzagallo.com');
    exec('cd out && git init && git add -A . && git c -m "deploy" && git push --force git@github.com:tadeuzagallo/tadeuzagallo.github.io.git master');
  }, 10000);
});
