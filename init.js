'use strict';
var clusterMaster = require('cluster-master');

clusterMaster({
  exec : __dirname + '/node_modules/.bin/st',
  args : ['--dir', './', '-i', 'index.html', '-p', '9355']
});
