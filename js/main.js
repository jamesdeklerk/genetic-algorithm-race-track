/*global console, tasks, getNext, averageOf, getRandomNr, MAX_ACCELERATION, RADII_CALC_POINT_SPACING, track, GA, msTokmH, calcPropulsivePower, requestAnimationFrame */

(function () {
    'use strict';

    // ------------------------------------------------------
    // Global vaiables (for this self executing function)
    // ------------------------------------------------------

    var SIMULATION_SPEED = 5, // simulation settings (2 = 2 x reality)



        generationStartTime,
        generationPopulation,



        // drawing settings
        // transform parameters (to get the visualization/simulation to display correctly on the canvas)
        SCALE = 5, // Note: the scale transform is applied first 
        SHIFT_X = 275,
        SHIFT_Y = 50,
        // background
        BACKGROUND_COLOR = '#424242',
        // track
        TRACK_COLOR = '#BDBDBD',
        TRACK_WIDTH = 24,
        STARTING_LINE_COLOR = '#9E9E9E', // #bf0000
        STARTING_LINE_WIDTH = 24,
        STARTING_LINE_HEIGHT = 50,
        // individual
        INDIVIDUALS_RADIUS = 10,
        DRAW_START_POINT = false,
        START_POINT_COLOR = '#212121',
        DRAW_MIDPOINT = true, // this is the actual position of the car (i.e. individual)
        MIDPOINT_COLOR = '#008000',
        DRAW_END_POINT = false,
        END_POINT_COLOR = '#212121',
        DRAW_RADIUS_OF_CURVATURE = false,
        RADIUS_OF_CURVATURE_COLOR = "rgba(211, 211, 211, 0.5)",
        FITTEST_INDIVIDUAL_OF_PREVIOUS_GENERATION_COLOR = '#004eff',
        COMPLETED_LAP_COLOR = '#00b700',
        // dead labels
        EXCEEDED_PROPULSIVE_POWER_LIMIT_COLOR = '#2f2f2f',
        EXCEEDED_LATERAL_FORCE_LIMIT_COLOR = '#ede400',
        EXCEEDED_ACCELERATION_LIMIT_COLOR = '#1e00c1', // this should never happen because we create the acceleration limits
        EXCEEDED_VELOCITY_LIMIT_COLOR = '#c10000', // this means they either didn't make it to the next point, or they went in reverse
        // dom elements
        DOM_ELEMENTS = {
            // canvases
            TRACK_CANVAS: document.getElementById("trackCanvas"),
            TRACK_CONTEXT: document.getElementById("trackCanvas").getContext("2d"),
            CANVAS: document.getElementById("canvas"),
            CONTEXT: document.getElementById("canvas").getContext("2d"),
            // simulation details
            SIMULATION_SPEED: document.getElementById("simulationSpeed"),
            SIMULATION_TRACK_DISTANCE: document.getElementById("simulationTrackDistance"),
            // latest generations details
            LATEST_GENERATIONS_DETAILS_GENERATION: document.getElementById("generation"),
            LATEST_GENERATIONS_DETAILS_MAX_GENERATIONS: document.getElementById("maxGenerations"),
            LATEST_GENERATIONS_DETAILS_POPULATION_SIZE: document.getElementById("populationSize"),
            LATEST_GENERATIONS_DETAILS_KEEP_TOP: document.getElementById("keepTop"),
            LATEST_GENERATIONS_DETAILS_CROSSOVER_PROBABILITY: document.getElementById("crossoverProbability"),
            LATEST_GENERATIONS_DETAILS_STANDARD_MUTATION_PROBABILITY: document.getElementById("standardMutationProbability"),
            LATEST_GENERATIONS_DETAILS_FOCUSED_MUTATION_PROBABILITY: document.getElementById("focusedMutationProbability"),
            LATEST_GENERATIONS_DETAILS_EXCEEDED_PROPULSIVE_POWER_LIMIT: document.getElementById("exceededPowerLimit"),
            LATEST_GENERATIONS_DETAILS_EXCEEDED_LATERAL_FORCE_LIMIT: document.getElementById("exceededLateralForceLimit"),
            LATEST_GENERATIONS_DETAILS_EXCEEDED_VELOCITY_LIMIT: document.getElementById("exceededVelocityLimit"),
            LATEST_GENERATIONS_DETAILS_LAP_COMPLETED: document.getElementById("lapCompletedCount"),
            LATEST_GENERATIONS_DETAILS_TIME_ELAPSED: document.getElementById("timeElapsed"),
            // hall of fame
            HALL_OF_FAME: document.getElementById("hallOfFame"),
            // legend
            LEGEND_ALIVE_COLOR: document.getElementById("aliveColor"),
            LEGEND_FITTEST_INDIVIDUAL_OF_PREVIOUS_GENERATION_COLOR: document.getElementById("previousBestColor"),
            LEGEND_EXCEEDED_PROPULSIVE_POWER_LIMIT_COLOR: document.getElementById("powerLimitColor"),
            LEGEND_EXCEEDED_LATERAL_FORCE_LIMIT_COLOR: document.getElementById("lateralForceLimitColor"),
            LEGEND_EXCEEDED_VELOCITY_LIMIT_COLOR: document.getElementById("velocityLimitColor"),
            // previous bests details
            PREVIOUS_BESTS_DETAILS_SPEED: document.getElementById("previousBestsSpeed"),
            PREVIOUS_BESTS_DETAILS_POWER: document.getElementById("previousBestsPower"),
            PREVIOUS_BESTS_DETAILS_ACCELERATION: document.getElementById("previousBestsAcceleration"),
            PREVIOUS_BESTS_DETAILS_DISTANCE: document.getElementById("previousBestsDistance"),
            PREVIOUS_BESTS_DETAILS_TIME: document.getElementById("previousBestsTime"),
            // run button
            RUN_BUTTON: document.getElementById("runButton")
        },
        // canvas settings
        CANVAS_WIDTH = 650,
        CANVAS_HEIGHT = 800,



        // setting the index of x and y in the vectors i.e. [X, Y]
        X = 0,
        Y = 1,



        // example of an individual
        exampleIndividual = {
            accelerations: [], // acceleration at each point on the track
            initialVelocity: 0,
            velocities: [], // velocity at each point on the track
            times: [], // time taken to get to each point on the track
            position: 0, // property for drawing, array index in track.points
            farthestPosition: 0,
            alive: true, // property for drawing
            causeOfDeath: {
                exceededPropulsivePowerLimit: false,
                exceededLateralForceLimit: false,
                exceededAccelerationLimit: false,
                exceededVelocityLimit: false
            },
            completedLap: false, // property for drawing
            mutations: 0,
            fitness: Number.MAX_VALUE
        };

    // ======================================================









    // ------------------------------------------------------
    // setup canvas
    // ------------------------------------------------------

    // canvas for the track
    DOM_ELEMENTS.TRACK_CANVAS.width = CANVAS_WIDTH;
    DOM_ELEMENTS.TRACK_CANVAS.height = CANVAS_HEIGHT;
    DOM_ELEMENTS.TRACK_CONTEXT.fillStyle = BACKGROUND_COLOR;
    DOM_ELEMENTS.TRACK_CONTEXT.rect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    DOM_ELEMENTS.TRACK_CONTEXT.fill();

    // canvas for individuals
    DOM_ELEMENTS.CANVAS.width = CANVAS_WIDTH;
    DOM_ELEMENTS.CANVAS.height = CANVAS_HEIGHT;

    // ======================================================









    // ------------------------------------------------------
    // Individuals and population functions
    // ------------------------------------------------------

    function getCurrentPositionGivenTime(individual, time) {

        var i;

        if (!individual.alive || individual.completedLap) {
            console.log('this individual is dead (or finished), you shouldn\'t be checking the current position');
        }

        for (i = 0; i < individual.times.length; i = i + 1) {
            // check if current positions time is greater than or equal to the time given (the actual current time)
            if (individual.times[i] >= time || individual.times[i] === undefined || isNaN(individual.times[i]) || individual.times[i] === Infinity) {
                if (i > individual.farthestPosition) {
                    return individual.farthestPosition;
                } else {
                    return i;
                }
            }
        }

        return individual.farthestPosition;
    }

    // this checks if all the individuals are dead, completed the lap or have been in the same spot of too long
    function allIndividualsAreDeadOrComplete(population) {
        var i;

        for (i = 0; i < population.length; i = i + 1) {

            if (population[i].alive && !population[i].completedLap) {
                return false;
            }
        }

        return true;
    }

    function getLargestTime(population) {
        var largestTime = 0,
            i;

        for (i = 0; i < population.length; i = i + 1) {
            largestTime = Math.max(population[i].times[population[i].farthestPosition], largestTime);
        }

        return largestTime;
    }

    // ======================================================









    // ------------------------------------------------------
    // Failure conditions (these return true if the check passes)
    // ------------------------------------------------------



    // ======================================================









    // ------------------------------------------------------
    // Setting the Genetic Algoritm
    // ------------------------------------------------------

    // search space

    // set the fitness function

    // etc.

    // ======================================================









    // ------------------------------------------------------
    // drawing functions
    // ------------------------------------------------------

    function drawGPSData(gpsArray, color, context, scale, shiftX, shiftY) {
        var i;

        context.strokeStyle = color;
        context.lineWidth = TRACK_WIDTH;
        context.beginPath();
        context.moveTo((gpsArray[0][X] * scale) + shiftX, (gpsArray[0][Y] * scale) + shiftY);
        for (i = 0; i < gpsArray.length; i = i + 1) {
            context.lineTo((gpsArray[i][X] * scale) + shiftX, (gpsArray[i][Y] * scale) + shiftY);
        }
        context.closePath();
        context.stroke();

        // draw start line
        context.fillStyle = STARTING_LINE_COLOR;
        context.fillRect(((gpsArray[0][X] * scale) + shiftX) - (STARTING_LINE_WIDTH / 2), ((gpsArray[0][Y] * scale) + shiftY) - (STARTING_LINE_HEIGHT / 2), STARTING_LINE_WIDTH, STARTING_LINE_HEIGHT);

    }

    function drawIndividual(individual, color) {

        var startPos = getNext(track.points, individual.position, -RADII_CALC_POINT_SPACING),
            midPos = individual.position,
            endPos = getNext(track.points, midPos, RADII_CALC_POINT_SPACING);

        // draw start point
        if (DRAW_START_POINT) {
            DOM_ELEMENTS.CONTEXT.fillStyle = START_POINT_COLOR;
            DOM_ELEMENTS.CONTEXT.beginPath();
            DOM_ELEMENTS.CONTEXT.arc((track.points[startPos][X] * SCALE) + SHIFT_X, (track.points[startPos][Y] * SCALE) + SHIFT_Y, INDIVIDUALS_RADIUS, 0, 2 * Math.PI);
            DOM_ELEMENTS.CONTEXT.fill();
        }

        // draw end point
        if (DRAW_END_POINT) {
            DOM_ELEMENTS.CONTEXT.fillStyle = END_POINT_COLOR;
            DOM_ELEMENTS.CONTEXT.beginPath();
            DOM_ELEMENTS.CONTEXT.arc((track.points[endPos][X] * SCALE) + SHIFT_X, (track.points[endPos][Y] * SCALE) + SHIFT_Y, INDIVIDUALS_RADIUS, 0, 2 * Math.PI);
            DOM_ELEMENTS.CONTEXT.fill();
        }

        // draw midpoint
        if (DRAW_MIDPOINT) {
            if (color) {
                DOM_ELEMENTS.CONTEXT.fillStyle = color;
            } else if (individual.alive) {
                DOM_ELEMENTS.CONTEXT.fillStyle = MIDPOINT_COLOR;
            } else if (individual.causeOfDeath.exceededAccelerationLimit) {
                DOM_ELEMENTS.CONTEXT.fillStyle = EXCEEDED_ACCELERATION_LIMIT_COLOR;
            } else if (individual.causeOfDeath.exceededVelocityLimit) {
                DOM_ELEMENTS.CONTEXT.fillStyle = EXCEEDED_VELOCITY_LIMIT_COLOR;
            } else if (individual.causeOfDeath.exceededLateralForceLimit) {
                DOM_ELEMENTS.CONTEXT.fillStyle = EXCEEDED_LATERAL_FORCE_LIMIT_COLOR;
            } else if (individual.causeOfDeath.exceededPropulsivePowerLimit) {
                DOM_ELEMENTS.CONTEXT.fillStyle = EXCEEDED_PROPULSIVE_POWER_LIMIT_COLOR;
            } else {
                // this means the individual completed the lap
                DOM_ELEMENTS.CONTEXT.fillStyle = MIDPOINT_COLOR;
            }
            DOM_ELEMENTS.CONTEXT.beginPath();
            DOM_ELEMENTS.CONTEXT.arc((track.points[midPos][X] * SCALE) + SHIFT_X, (track.points[midPos][Y] * SCALE) + SHIFT_Y, INDIVIDUALS_RADIUS, 0, 2 * Math.PI);
            DOM_ELEMENTS.CONTEXT.fill();
        }

        // draw radius of curvature
        if (DRAW_RADIUS_OF_CURVATURE) {
            DOM_ELEMENTS.CONTEXT.fillStyle = RADIUS_OF_CURVATURE_COLOR;
            DOM_ELEMENTS.CONTEXT.beginPath();
            DOM_ELEMENTS.CONTEXT.arc((track.points[midPos][X] * SCALE) + SHIFT_X, (track.points[midPos][Y] * SCALE) + SHIFT_Y, track.radii[individual.position], 0, 2 * Math.PI);
            DOM_ELEMENTS.CONTEXT.fill();
        }
    }

    // ======================================================









    // ------------------------------------------------------
    // update DOM (i.e. interface) details
    // ------------------------------------------------------

    function updateLatestGenerationsDetails() {
        var i,
            exceededPower = 0,
            exceededLateralForce = 0,
            exceededVelocity = 0,
            lapCompleted = 0,
            currentIndividual,
            largestTime = getLargestTime(generationPopulation),
            timeElapsed = ((Date.now() - generationStartTime) / 1000) * SIMULATION_SPEED;


        for (i = 0; i < generationPopulation.length; i = i + 1) {
            currentIndividual = generationPopulation[i];

            if (!currentIndividual.alive && !currentIndividual.completedLap) {
                if (currentIndividual.causeOfDeath.exceededVelocityLimit) {
                    exceededVelocity = exceededVelocity + 1;
                } else if (currentIndividual.causeOfDeath.exceededLateralForceLimit) {
                    exceededLateralForce = exceededLateralForce + 1;
                } else if (currentIndividual.causeOfDeath.exceededPropulsivePowerLimit) {
                    exceededPower = exceededPower + 1;
                }
            }

            if (currentIndividual.completedLap) {
                lapCompleted = lapCompleted + 1;
            }
        }

        DOM_ELEMENTS.LATEST_GENERATIONS_DETAILS_GENERATION.innerHTML = GA.generation;
        DOM_ELEMENTS.LATEST_GENERATIONS_DETAILS_EXCEEDED_PROPULSIVE_POWER_LIMIT.innerHTML = exceededPower;
        DOM_ELEMENTS.LATEST_GENERATIONS_DETAILS_EXCEEDED_LATERAL_FORCE_LIMIT.innerHTML = exceededLateralForce;
        DOM_ELEMENTS.LATEST_GENERATIONS_DETAILS_EXCEEDED_VELOCITY_LIMIT.innerHTML = exceededVelocity;
        DOM_ELEMENTS.LATEST_GENERATIONS_DETAILS_LAP_COMPLETED.innerHTML = lapCompleted;

        if (timeElapsed < largestTime) {
            DOM_ELEMENTS.LATEST_GENERATIONS_DETAILS_TIME_ELAPSED.innerHTML = timeElapsed.toFixed(1);
        } else {
            DOM_ELEMENTS.LATEST_GENERATIONS_DETAILS_TIME_ELAPSED.innerHTML = largestTime.toFixed(1);
        }
    }

    function updateHallOfFame() {

        var i,
            currentIndividual,
            hallOfFameContent = '';

        for (i = (GA.stats.hallOfFame.length - 1); i >= 0; i = i - 1) {
            currentIndividual = GA.stats.hallOfFame[i];

            if (currentIndividual.generation < GA.generation) {
                // if they completed the lap, make them the COMPLETED_LAP_COLOR
                if (currentIndividual.farthestPosition >= (track.points.length - 1)) {
                    hallOfFameContent = hallOfFameContent + ("<div style='color: " + COMPLETED_LAP_COLOR + "'>Generation " + currentIndividual.generation + " - Time " + currentIndividual.times[currentIndividual.farthestPosition].toFixed(6) + "s</div>");
                } else {
                    hallOfFameContent = hallOfFameContent + ("<div>Generation " + currentIndividual.generation + " - Time " + currentIndividual.times[currentIndividual.farthestPosition].toFixed(6) + "s</div>");
                }

            }
        }

        DOM_ELEMENTS.HALL_OF_FAME.innerHTML = hallOfFameContent;
    }

    function updatePreviousBestsDetails() {
        var previousBestIndividual = GA.fittestIndividualOfPreviousGeneration,
            timeElapsed = ((Date.now() - generationStartTime) / 1000) * SIMULATION_SPEED;

        if (previousBestIndividual === undefined) {
            DOM_ELEMENTS.PREVIOUS_BESTS_DETAILS_SPEED.innerHTML = '--';
            DOM_ELEMENTS.PREVIOUS_BESTS_DETAILS_POWER.innerHTML = '--';
            DOM_ELEMENTS.PREVIOUS_BESTS_DETAILS_ACCELERATION.innerHTML = '--';
            DOM_ELEMENTS.PREVIOUS_BESTS_DETAILS_DISTANCE.innerHTML = '--';
            DOM_ELEMENTS.PREVIOUS_BESTS_DETAILS_TIME.innerHTML = '--';
        } else {
            if (previousBestIndividual.alive) {
                // set time based on time
                DOM_ELEMENTS.PREVIOUS_BESTS_DETAILS_SPEED.innerHTML = msTokmH(previousBestIndividual.velocities[previousBestIndividual.position]).toFixed(1);
                DOM_ELEMENTS.PREVIOUS_BESTS_DETAILS_POWER.innerHTML = calcPropulsivePower(previousBestIndividual.velocities[previousBestIndividual.position], previousBestIndividual.accelerations[previousBestIndividual.position]).toFixed(1);
                DOM_ELEMENTS.PREVIOUS_BESTS_DETAILS_ACCELERATION.innerHTML = previousBestIndividual.accelerations[previousBestIndividual.position].toFixed(1);
                DOM_ELEMENTS.PREVIOUS_BESTS_DETAILS_DISTANCE.innerHTML = track.distances[previousBestIndividual.position].toFixed(1);
                if (timeElapsed < previousBestIndividual.times[previousBestIndividual.farthestPosition]) {
                    DOM_ELEMENTS.PREVIOUS_BESTS_DETAILS_TIME.innerHTML = timeElapsed.toFixed(1);
                } else {
                    DOM_ELEMENTS.PREVIOUS_BESTS_DETAILS_TIME.innerHTML = previousBestIndividual.times[previousBestIndividual.farthestPosition].toFixed(1);
                }
            } else {
                // set time to furthest position
                DOM_ELEMENTS.PREVIOUS_BESTS_DETAILS_SPEED.innerHTML = msTokmH(previousBestIndividual.velocities[previousBestIndividual.farthestPosition]).toFixed(1);
                DOM_ELEMENTS.PREVIOUS_BESTS_DETAILS_POWER.innerHTML = calcPropulsivePower(previousBestIndividual.velocities[previousBestIndividual.farthestPosition], previousBestIndividual.accelerations[previousBestIndividual.farthestPosition]).toFixed(1);
                DOM_ELEMENTS.PREVIOUS_BESTS_DETAILS_ACCELERATION.innerHTML = previousBestIndividual.accelerations[previousBestIndividual.farthestPosition].toFixed(1);
                DOM_ELEMENTS.PREVIOUS_BESTS_DETAILS_DISTANCE.innerHTML = track.distances[previousBestIndividual.farthestPosition].toFixed(1);
                DOM_ELEMENTS.PREVIOUS_BESTS_DETAILS_TIME.innerHTML = previousBestIndividual.times[previousBestIndividual.farthestPosition].toFixed(1);
            }
        }

    }

    function updateLegend() {
        DOM_ELEMENTS.LEGEND_ALIVE_COLOR.style.backgroundColor = MIDPOINT_COLOR;
        DOM_ELEMENTS.LEGEND_FITTEST_INDIVIDUAL_OF_PREVIOUS_GENERATION_COLOR.style.backgroundColor = FITTEST_INDIVIDUAL_OF_PREVIOUS_GENERATION_COLOR;
        DOM_ELEMENTS.LEGEND_EXCEEDED_PROPULSIVE_POWER_LIMIT_COLOR.style.backgroundColor = EXCEEDED_PROPULSIVE_POWER_LIMIT_COLOR;
        DOM_ELEMENTS.LEGEND_EXCEEDED_LATERAL_FORCE_LIMIT_COLOR.style.backgroundColor = EXCEEDED_LATERAL_FORCE_LIMIT_COLOR;
        DOM_ELEMENTS.LEGEND_EXCEEDED_VELOCITY_LIMIT_COLOR.style.backgroundColor = EXCEEDED_VELOCITY_LIMIT_COLOR;
    }

    function updateInterface(previousBestIndividual) {

        updateLatestGenerationsDetails();

        updatePreviousBestsDetails();

    }

    function initInterface(firstInit) {

        // draw the track
        drawGPSData(track.points, TRACK_COLOR, DOM_ELEMENTS.TRACK_CONTEXT, SCALE, SHIFT_X, SHIFT_Y);

        updateLegend();

        // if there aren't initial DOM values, set them to the defaults
        SIMULATION_SPEED = DOM_ELEMENTS.SIMULATION_SPEED.value || SIMULATION_SPEED;
        GA.MAX_GENERATIONS = DOM_ELEMENTS.LATEST_GENERATIONS_DETAILS_MAX_GENERATIONS.value || GA.MAX_GENERATIONS;
        GA.POPULATION_SIZE = DOM_ELEMENTS.LATEST_GENERATIONS_DETAILS_POPULATION_SIZE.value || GA.POPULATION_SIZE;
        GA.TOP_FITTEST_INDIVIDUALS_TO_KEEP = DOM_ELEMENTS.LATEST_GENERATIONS_DETAILS_KEEP_TOP.value || GA.TOP_FITTEST_INDIVIDUALS_TO_KEEP;
        GA.CROSSOVER_PROBABILITY = DOM_ELEMENTS.LATEST_GENERATIONS_DETAILS_CROSSOVER_PROBABILITY.value || GA.CROSSOVER_PROBABILITY;
        GA.STANDARD_MUTATION_PROBABILITY = DOM_ELEMENTS.LATEST_GENERATIONS_DETAILS_STANDARD_MUTATION_PROBABILITY.value || GA.STANDARD_MUTATION_PROBABILITY;
        GA.FOCUSED_MUTATION_PROBABILITY = DOM_ELEMENTS.LATEST_GENERATIONS_DETAILS_FOCUSED_MUTATION_PROBABILITY.value || GA.FOCUSED_MUTATION_PROBABILITY;

        // convert to numbers
        SIMULATION_SPEED = Number(SIMULATION_SPEED);
        GA.MAX_GENERATIONS = Number(GA.MAX_GENERATIONS);
        GA.POPULATION_SIZE = Number(GA.POPULATION_SIZE);
        GA.TOP_FITTEST_INDIVIDUALS_TO_KEEP = Number(GA.TOP_FITTEST_INDIVIDUALS_TO_KEEP);
        GA.CROSSOVER_PROBABILITY = Number(GA.CROSSOVER_PROBABILITY);
        GA.STANDARD_MUTATION_PROBABILITY = Number(GA.STANDARD_MUTATION_PROBABILITY);
        GA.FOCUSED_MUTATION_PROBABILITY = Number(GA.FOCUSED_MUTATION_PROBABILITY);

        // update the DOM elements
        DOM_ELEMENTS.SIMULATION_SPEED.value = SIMULATION_SPEED;
        DOM_ELEMENTS.SIMULATION_TRACK_DISTANCE.innerHTML = track.distances[track.distances.length - 1].toFixed(1);
        DOM_ELEMENTS.LATEST_GENERATIONS_DETAILS_MAX_GENERATIONS.value = GA.MAX_GENERATIONS;
        DOM_ELEMENTS.LATEST_GENERATIONS_DETAILS_POPULATION_SIZE.value = GA.POPULATION_SIZE;
        DOM_ELEMENTS.LATEST_GENERATIONS_DETAILS_KEEP_TOP.value = GA.TOP_FITTEST_INDIVIDUALS_TO_KEEP;
        DOM_ELEMENTS.LATEST_GENERATIONS_DETAILS_CROSSOVER_PROBABILITY.value = GA.CROSSOVER_PROBABILITY;
        DOM_ELEMENTS.LATEST_GENERATIONS_DETAILS_STANDARD_MUTATION_PROBABILITY.value = GA.STANDARD_MUTATION_PROBABILITY;
        DOM_ELEMENTS.LATEST_GENERATIONS_DETAILS_FOCUSED_MUTATION_PROBABILITY.value = GA.FOCUSED_MUTATION_PROBABILITY;

        DOM_ELEMENTS.HALL_OF_FAME.innerHTML = "";

        if (!firstInit) {
            DOM_ELEMENTS.RUN_BUTTON.innerHTML = "RESTART";
        }

    }

    // ======================================================









    // ------------------------------------------------------
    // Setting up the program for running
    // ------------------------------------------------------

    function resetIndividualForDrawing(individual) {
        individual.position = 0;
        individual.alive = true;
        individual.completedLap = false;

        return individual;
    }

    function renderIndividual(individual, time, color) {

        // make sure the individual is was alive and going the last time we checked
        if (individual.alive && !individual.completedLap) {

            // update the current individuals position (using the time)
            individual.position = getCurrentPositionGivenTime(individual, time);

            // check if they're alive at the new position
            individual.alive = GA.passChecks(individual, individual.position, track) && (individual.position !== individual.farthestPosition);
            // check if they just died
            if (!individual.alive) {
                individual.position = individual.farthestPosition;
            }

            // check they didn't just complete the lap
            individual.completedLap = individual.position >= (track.points.length - 1);
            if (individual.completedLap) {
                individual.position = track.points.length - 1;
            }

        }

        // draw the current individual
        drawIndividual(individual, color);

    }


    function render() {

        var i,
            time = ((Date.now() - generationStartTime) / 1000) * SIMULATION_SPEED;

        updateInterface();

        // if all individuals are dead or finished (i.e. the generation is completed)
        // run next generation
        if (allIndividualsAreDeadOrComplete(generationPopulation)) {
            // update the list of fittest individuals (on the interface)

            // reset hall of fame for drawing
            for (i = 0; i < GA.stats.hallOfFame.length; i = i + 1) {
                GA.stats.hallOfFame[i] = resetIndividualForDrawing(GA.stats.hallOfFame[i]);
            }

            // reset population for drawing
            for (i = 0; i < generationPopulation.length; i = i + 1) {
                generationPopulation[i] = resetIndividualForDrawing(generationPopulation[i]);
            }

            updateHallOfFame();

            // get the next generation
            generationPopulation = GA.getNextGeneration(generationPopulation);
            window.generationPopulation = generationPopulation;

            // we just got a new generation, so reset the start time
            // Note: this must be done after the new generation has been created
            // because creating the new generation can take some time
            generationStartTime = Date.now();

            // request next frame if not on max generation
            if (GA.generation <= GA.MAX_GENERATIONS) {
                requestAnimationFrame(render);
            } else if (GA.EXPORT_DATA) {
                window.open('data:text/json;charset=utf8,' + encodeURIComponent(JSON.stringify(GA.exportSummarisedData(GA.stats.fittestOfGeneration))), '_blank');
                window.focus();
            }
        } else {
            // clear all the cars (i.e. individuals)
            DOM_ELEMENTS.CONTEXT.clearRect(0, 0, DOM_ELEMENTS.CANVAS.width, DOM_ELEMENTS.CANVAS.height);

            // render all individuals in the current generationPopulation
            for (i = 0; i < generationPopulation.length; i = i + 1) {
                renderIndividual(generationPopulation[i], time);
            }

            // render the previous best individual
            if (GA.fittestIndividualOfPreviousGeneration) {
                renderIndividual(GA.fittestIndividualOfPreviousGeneration, time, FITTEST_INDIVIDUAL_OF_PREVIOUS_GENERATION_COLOR);
            }

            // request next frame
            requestAnimationFrame(render);
        }
    }

    function run() {

        // set the static interface values (e.g. max generations, mutation probability etc.)
        initInterface();

        // reset GA (i.e. set the generation = 0 etc.)
        GA.resetGeneticAlgorithm();

        // create a new generationPopulation
        generationPopulation = GA.generateRandomPopulation(GA.POPULATION_SIZE, -MAX_ACCELERATION, MAX_ACCELERATION);
        window.generationPopulation = generationPopulation;

        // reset the current generations start time
        generationStartTime = Date.now();

        // start initial rendering
        requestAnimationFrame(render);

    }
    // ======================================================









    // set the static interface values (e.g. max generations, mutation probability etc.)
    initInterface(true);
    window.run = run;

}());