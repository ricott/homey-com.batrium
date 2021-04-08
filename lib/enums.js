'use strict';

const Enum = require('enum');

exports.decodeBatteryStatus = function (numType) {
    if (batteryStatus.get(numType)) {
        return batteryStatus.get(numType).key;
    } else {
        return `UNKNOWN (${numType})`
    }
}

exports.getBatteryStatuses = function () {
    let statuses = [];
    batteryStatus.enums.forEach(function (status) {
        statuses.push({
            name: status.key
        });
    });
    return statuses;
}

const batteryStatus = new Enum({
    'Simulator': 0,
    'Idle': 1,
    'Discharging': 2,
    'SoC Empty': 3,
    'Charging': 4,
    'Full': 5,
    'Timeout': 6,
    'Critical Pending': 7,
    'Critical Offline': 8,
    'Mqtt Offline': 9,
    'Auth Setup': 10,
    'Shunt Timeout': 11
});

exports.decodePowerRateState = function (numType) {
    if (powerRateState.get(numType)) {
        return powerRateState.get(numType).key;
    } else {
        return `UNKNOWN (${numType})`
    }
}

const powerRateState = new Enum({
    'Off': 0,
    'Limited Power': 2,
    'Normal Power': 4
});
