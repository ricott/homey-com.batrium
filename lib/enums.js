'use strict';

exports.decodeOpMode = function (numType) {
    switch (numType) {
        case 0: return 'Timeout'; break;
        case 1: return 'Idle'; break;
        case 2: return 'Charging'; break;
        case 3: return 'Discharging'; break;
        case 4: return 'Full'; break;
        case 5: return 'Empty'; break;
        case 6: return 'Simulator'; break;
        case 7: return 'CriticalPending'; break;
        case 8: return 'CriticalOffline'; break;
        case 9: return 'MqttOffline'; break;
        case 10: return 'AuthSetup'; break;
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
