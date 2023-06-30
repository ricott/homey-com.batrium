'use strict';

const Watchmon = require('../lib/batrium.js');

let bb = new Watchmon({ systemId: '7364' });


bb.on('liveDisplay', message => {
    console.log(message);
});

/*
bb.on('HwShuntMetrics', message => {
    console.log(message);
});
*/

