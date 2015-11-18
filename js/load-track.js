/*global getNext, calcRadiusOfCurvature, calcDistanceBetweenPoints, track */

// ------------------------------------------------------
// Setting up the track
// 1. Getting and drawing the GPS data for the track.points
// 2. Populating the track.points
// 3. Populating the track.distances
// 4. Populating the track.radii
// ------------------------------------------------------

// setting a global variable for the path/race track
var RADII_SMOOTHING_COUNT = 1, // this is used in calculateRadii to smooth the data (Warning: if SMOOTHING_COUNT is too high, all the track.radii will converge)
    RADII_CALC_POINT_SPACING = 3, // this is used in calculateRadii, and is the space (actually index count) between the 3 points
    // limits
    MIN_RADIUS_OF_CURVATURE = 1.5,
    MAX_RADIUS_OF_CURVATURE = Number.MAX_VALUE;

if (!window.track) {
    window.track = {
        points: []
    };
}


function readStringFromFile(filePath) {
    'use strict';

    var request = new XMLHttpRequest();

    request.open("GET", filePath, false);
    request.send(null);

    return request.responseText;
}


function dataToGPSArray(dataString, ignoreXlines) {
    'use strict';

    var arrayOfLines = dataString.split("\n"),
        gpsArray = [],
        currentIndex,
        currentLine,
        i;

    for (i = 0; i < arrayOfLines.length; i = i + 1) {
        currentLine = arrayOfLines[i];

        currentIndex = 0;
        // while at the beginning of the line
        while (currentIndex === 0) {
            currentIndex = currentLine.indexOf(" ");

            if (currentIndex === 0) {
                // take away leading space
                currentLine = currentLine.slice(1);
            }
        }

        if (currentIndex === -1) {
            break;
        }

        // add a point
        gpsArray.push([Number(currentLine.slice(0, currentIndex)), -Number(currentLine.slice(currentIndex + 1))]);
    }

    // Note: we are also ignoring the last value since it is a duplicate of the first coordinate
    return gpsArray.slice(ignoreXlines, gpsArray.length - 1);
}

function calculateRadii(points) {
    'use strict';

    var i,
        j,
        startPos,
        midPos,
        endPos,
        radiusOfCurvature,
        arrayOfRadii = [],
        arrayOfSmoothedRadii = [];

    for (i = 0; i < points.length; i = i + 1) {
        startPos = getNext(points, i, -RADII_CALC_POINT_SPACING);
        midPos = i;
        endPos = getNext(points, midPos, RADII_CALC_POINT_SPACING);

        radiusOfCurvature = calcRadiusOfCurvature(points[startPos], points[midPos], points[endPos]);

        if (radiusOfCurvature < MIN_RADIUS_OF_CURVATURE) {
            radiusOfCurvature = MIN_RADIUS_OF_CURVATURE;
        }

        if (radiusOfCurvature > MAX_RADIUS_OF_CURVATURE) {
            radiusOfCurvature = MAX_RADIUS_OF_CURVATURE;
        }

        arrayOfRadii.push(radiusOfCurvature);
    }

    // cleaning the data (to get rid of the NaN's and Infinity's)
    for (i = 0; i < arrayOfRadii.length; i = i + 1) {
        if (isNaN(arrayOfRadii[i]) || arrayOfRadii[i] === Infinity) {
            arrayOfRadii[i] = (arrayOfRadii[getNext(arrayOfRadii, i, -1)] + arrayOfRadii[getNext(arrayOfRadii, i, 1)]) / 2;
        }
    }

    // smoothing by repeatedly averaging the values 
    for (j = 0; j < RADII_SMOOTHING_COUNT; j = j + 1) {
        arrayOfSmoothedRadii = [];

        for (i = 0; i < arrayOfRadii.length; i = i + 1) {
            arrayOfSmoothedRadii.push((arrayOfRadii[getNext(arrayOfRadii, i, -1)] + arrayOfRadii[getNext(arrayOfRadii, i, 1)]) / 2);
        }

        arrayOfRadii = arrayOfSmoothedRadii;
    }

    return arrayOfRadii;
}

// Note: the track.points must be set up
function getTrackDistances(track) {
    'use strict';

    var i,
        sum = 0,
        distances = [];

    distances.push(sum);

    for (i = 0; i < track.points.length - 1; i = i + 1) {
        sum = sum + calcDistanceBetweenPoints(track.points[i], track.points[i + 1]);
        distances.push(sum);
    }

    return distances;
}

// get the track.points from the "ideal line.dat" file
//track.points = dataToGPSArray(readStringFromFile("data/ideal line.dat"), 1);
// we are now loading the track in track-points.js

// set the track.distances
track.distances = getTrackDistances(track);

// set the track.radii
track.radii = calculateRadii(track.points);

// ======================================================