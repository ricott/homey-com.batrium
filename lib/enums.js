'use strict';

exports.decodeOpMode = function (numType) {
    switch (numType) {
        case 0: return 'Simulator'; break;
        case 1: return 'Idle'; break;
        case 2: return 'Discharging'; break;
        case 3: return 'SoC Empty'; break;
        case 4: return 'Charging'; break;
        case 5: return 'Full'; break;
        case 6: return 'Timeout'; break;
        case 7: return 'Critical Pending'; break;
        case 8: return 'Critical Offline'; break;
        case 9: return 'Mqtt Offline'; break;
        case 10: return 'Auth Setup'; break;
        case 10: return 'Shunt Timeout'; break;
        default: return `UNKNOWN (${numType})`; break;
    }
}

exports.decodePowerRateState = function (numType) {
    switch (numType) {
        case 0: return 'Off'; break;
        case 2: return 'Limited Power'; break;
        case 4: return 'Normal Power'; break;
        default: return `UNKNOWN (${numType})`; break;
    }
}
