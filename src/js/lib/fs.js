var root = require('./file-system.json');

console.log(root);

var FS = {};

FS.home = '/Users/guest';

FS.currentDir = null;
FS.currentPath = '~';

FS.cd = function () {
};

FS.parse = function (path) {
  var directories = path.split('/');

  //if ()
};

module.exports = FS;
