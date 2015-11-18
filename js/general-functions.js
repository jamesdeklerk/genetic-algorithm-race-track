/*global console */

// ------------------------------------------------------
// General functions
// ------------------------------------------------------

function getRandomNr(min, max) {
    'use strict';

    return Math.random() * (max - min) + min;
}

function getRandomInt(min, max) {
    'use strict';

    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function averageOf(a, b) {
    'use strict';

    return (a + b) * 0.5;
}

// Note: if step is negative, it steps backwards
function getNext(array, currentPosition, step) {
    'use strict';

    // if the step size is undefined, assume it is 1
    if (step === undefined) {
        step = 1;
    }

    currentPosition = (currentPosition + step) % array.length;

    if (currentPosition < 0) {
        // step from back
        currentPosition = array.length + currentPosition;
    }

    return currentPosition;
}

function msTokmH(ms) {
    'use strict';

    return (ms * 3600) / 1000;
}

// ======================================================