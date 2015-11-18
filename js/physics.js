/*global console, averageOf */

// ------------------------------------------------------
// setting up car physics
// ------------------------------------------------------

var M = 368, // Vehicle mass - kg
    p = 1.225, // Air density - kgm^-3
    C_r = 0.03, // Coefficient of rolling resistance - -
    f_M = 1.03, // Mass factor - -
    A = 1.5, // Effective cross-sectional area - m^2
    C_D = 0.3, // Aerodynamic drag coefficient - -
    u_s = 1.5, // Static coefficient of friction - -
    g = 9.81, // gravity - m/s^2
    rearWeightDistribution = 0.6, // 60% rear and 40% front weight distribution
    // limits
    MAX_PROPULSIVE_POWER = 80, // kW
    MAX_LATERAL_FORCE = u_s * M * g, // max allowable lateral force - N
    MAX_LONGITUDINAL_FORCE = u_s * (MAX_LATERAL_FORCE * rearWeightDistribution), // N
    MAX_ACCELERATION = MAX_LONGITUDINAL_FORCE / (M * f_M), // max allowable acceleration - m/s^2
    MIN_VELOCITY = 0, // this makes sure the velocity at a point is not so slow it will take ages
    
    
    // setting the index of x and y in the vectors i.e. [X, Y]
    X = 0,
    Y = 1;

// ======================================================












// ------------------------------------------------------
// physics functions
// ------------------------------------------------------

function calcTime(initialVelocity, finalVelocity, acceleration) {
    'use strict';

    return (finalVelocity - initialVelocity) / acceleration;
}

function calcDistanceBetweenPoints(startPoint, endPoint) {
    'use strict';

    var dx,
        dy;

    dx = startPoint[X] - endPoint[X];
    dy = startPoint[Y] - endPoint[Y];

    return Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
}

function slopeBetweenPoints(startPoint, endPoint) {
    'use strict';

    return (startPoint[Y] - endPoint[Y]) / (startPoint[X] - endPoint[X]);
}

function calcRadiusOfCurvature(startPoint, midpoint, endPoint) {
    'use strict';

    if (startPoint === undefined || midpoint === undefined || endPoint === undefined) {
        console.log('startPoint: ' + startPoint);
        console.log('midpoint: ' + midpoint);
        console.log('endPoint: ' + endPoint);
    }

    var m1 = slopeBetweenPoints(startPoint, midpoint),
        m2 = slopeBetweenPoints(midpoint, endPoint),
        averageSlope = averageOf(m1, m2),
        changeOfSlope = m2 - m1,
        dxOfMidpoints = averageOf(midpoint[X], endPoint[X]) - averageOf(startPoint[X], midpoint[X]),
        slopeOfSlope = changeOfSlope / dxOfMidpoints,
        radiusOfCurvature = Math.pow((1 + Math.pow(averageSlope, 2)), (3 / 2)) / Math.abs(slopeOfSlope);

    return radiusOfCurvature;
}

function calcPropulsivePower(velocity, acceleration) {
    'use strict';

    return ((M * g * C_r * velocity) + (0.5 * p * A * C_D * Math.pow(velocity, 3)) + (f_M * M * acceleration * velocity)) / 1000; // dividing by 1000 is to get it from watts to kilowatts
}

function calcLateralForce(velocity, r) {
    'use strict';

    return (M * Math.pow(velocity, 2)) / r;
}

function calcVelocityAtPoint(initialVelocity, acceleration, initialPosition, finalPosition) {
    'use strict';

    return Math.sqrt(Math.pow(initialVelocity, 2) + (2 * acceleration * calcDistanceBetweenPoints(initialPosition, finalPosition)));
}

// ======================================================