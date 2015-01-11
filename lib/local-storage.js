'use strict';

module.exports = typeof localStorage === 'undefined' ?
  {
    setItem: function() {},
    getItem: function() { return null; }
  }
:
  localStorage;
