/*global console, getRandomNr, getRandomInt, calcVelocityAtPoint, getNext, calcTime, track, MAX_ACCELERATION, MAX_PROPULSIVE_POWER, MAX_LATERAL_FORCE, MIN_VELOCITY, calcPropulsivePower, calcLateralForce */

(function () {
    'use strict';

    // ------------------------------------------------------
    // Global vaiables (for this self executing function)
    // ------------------------------------------------------
    var GA = {},



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



    // GA settings
    GA.EXPORT_DATA = true;
    GA.START_WITH_TOP_POPULATION = false;
    GA.POPULATION_SIZE = 250;
    GA.MAX_GENERATIONS = 10000;
    GA.TOURNAMENT_SIZE = Math.floor(GA.POPULATION_SIZE * 0.8); // % of the population size
    GA.POPULATION_TO_REPLACE = Math.floor(GA.POPULATION_SIZE * 0.8); // % of the population size to replace with offspring (from crossovers of two tournament selected individuals)
    GA.TOP_FITTEST_INDIVIDUALS_TO_KEEP = 5; // these guys don't get mutated at all
    GA.SEARCH_SPACE_MIN = -MAX_ACCELERATION;
    GA.SEARCH_SPACE_MAX = MAX_ACCELERATION;
    GA.CROSSOVER_PROBABILITY = 0.95; // they should pretty much always crossover, if they don't crossover, the fittest individual is chosen
    GA.DECREASE_MUTATION_PROBABILITY_WITH_FITNESS = false; // false makes it always mutate all individuals except the GA.TOP_FITTEST_INDIVIDUALS_TO_KEEP
    GA.FOCUSED_MUTATION_COUNT = 8; // the number of points on the track which should have the FOCUSED_MUTATION_PROBABILITY of being mutated
    GA.FOCUSED_MUTATION_PROBABILITY = 0.5; // the probability that any point in an individual may be mutated
    GA.STANDARD_MUTATION_PROBABILITY = 0.005; // the probability that any point in an individual may be mutated



    // GA info
    GA.fittestIndividualOfPreviousGeneration = undefined;
    GA.fittestIndividualOfCurrentGeneration = undefined;
    GA.generation = 0;



    // stats
    GA.stats = {
        hallOfFame: [], // these are the fittest individuals from each generation
        fittestOfGeneration: [] // an array of the fittest individuals of each generation
    };

    // ======================================================









    // ------------------------------------------------------
    // Race track GA specific functions
    // ------------------------------------------------------

    function checkPropulsivePower(propulsivePower) {
        return propulsivePower <= MAX_PROPULSIVE_POWER;
    }

    function checkLateralForce(lateralForce) {
        return lateralForce <= MAX_LATERAL_FORCE;
    }

    function checkAcceleration(acceleration) {
        return (acceleration <= MAX_ACCELERATION) && (acceleration >= -MAX_ACCELERATION);
    }

    function checkVolocity(velocity, acceleration) {
        return velocity >= MIN_VELOCITY;
    }

    // passChecks returns true or false based on if they pass all the tests
    GA.passChecks = function (individual, position, track) {
        var acceleration = individual.accelerations[position],
            velocity = individual.velocities[position],
            radius = track.radii[position],
            passedPropulsivePowerLimit = checkPropulsivePower(calcPropulsivePower(velocity, acceleration)),
            passedLateralForceLimit = checkLateralForce(calcLateralForce(velocity, radius)),
            passedAccelerationLimit = checkAcceleration(acceleration),
            passedVelocityLimit = checkVolocity(velocity);

        if (passedPropulsivePowerLimit && passedLateralForceLimit && passedAccelerationLimit && passedVelocityLimit) {
            return true;
        } else {
            // update cause of death
            individual.causeOfDeath.exceededPropulsivePowerLimit = !passedPropulsivePowerLimit;
            individual.causeOfDeath.exceededLateralForceLimit = !passedLateralForceLimit;
            individual.causeOfDeath.exceededAccelerationLimit = !passedAccelerationLimit;
            individual.causeOfDeath.exceededVelocityLimit = !passedVelocityLimit;

            return false;
        }
    };

    // returns the position (i.e. index) the individual died
    GA.getFarthestPosition = function (individual) {
        var i;

        for (i = 0; i < individual.accelerations.length; i = i + 1) {
            if (!GA.passChecks(individual, i, track)) {
                if ((i - 1) < 0) {
                    return 0;
                } else {
                    return i - 1;
                }
            }
        }

        // else the individual must have completed the course (and is in the highest index)
        return individual.times.length - 1;
    };

    // higher fitness is better
    function evaluateFitness(individual) {
        var fitness,
            farthestPosition = GA.getFarthestPosition(individual),
            maxAllowedTime = 10000;

        // the further an individual gets the better
        fitness = farthestPosition * maxAllowedTime;

        // if they complete the lap, then the faster they complete the lap the better
        // the reason we don't care about lap time before they have completed the lap 
        // is because then they will essentially be competing to crash the fastest
        if (farthestPosition >= (track.points.length - 1)) {
            fitness = fitness - individual.times[farthestPosition];
        }

        return fitness;
    }

    // requires track.points and individual.accelerations
    function getVelocities(individual) {
        var i,
            velocities = [];

        velocities.push(individual.initialVelocity);

        for (i = 0; i < track.points.length - 1; i = i + 1) {
            velocities.push(calcVelocityAtPoint(velocities[i], individual.accelerations[i], track.points[i], track.points[getNext(track.points, i, 1)]));
        }

        return velocities;
    }

    // requires individual.velocities and individual.accelerations
    function getTimes(individual) {
        var i,
            sumOfTime = 0,
            times = [sumOfTime];

        for (i = 0; i < individual.velocities.length - 1; i = i + 1) {
            sumOfTime = sumOfTime + calcTime(individual.velocities[i], individual.velocities[getNext(individual.velocities, i, 1)], individual.accelerations[i]);

            times.push(sumOfTime);
        }

        return times;
    }

    // this updates the velocities and times
    // as well as resetting the initialVelocity, position, alive and completedLap vars
    // this is used when the accelerations have been updated using the GA
    function updateIndividual(individual) {
        individual = {
            accelerations: individual.accelerations, // keep accelerations
            initialVelocity: 0,
            velocities: [0], // velocity at each point on the track
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
            mutations: individual.mutations || 0, // keep count of the mutations
            fitness: Number.MAX_VALUE
        };

        // calculate velocities
        individual.velocities = getVelocities(individual, track);

        // calculate times
        individual.times = getTimes(individual);

        // update farthestPosition
        individual.farthestPosition = GA.getFarthestPosition(individual);

        // calculate fitness
        individual.fitness = evaluateFitness(individual);

        return individual;
    }

    GA.generateRandomIndividual = function (min, max) {
        var individual = {
                accelerations: [], // array containing accelerations at each point on the track
                initialVelocity: 0, // this is the starting velocity
                velocities: [0], // array containing velocity at each point on the track
                times: [], // time taken to get to each point on the track
                position: 0, // array index in track.points - property for drawing
                farthestPosition: 0, // essentially the position of their death
                alive: true, // indicates dead or alive - property for drawing
                causeOfDeath: { // if the individual has died, what was their cause of death
                    exceededPropulsivePowerLimit: false,
                    exceededLateralForceLimit: false,
                    exceededAccelerationLimit: false,
                    exceededVelocityLimit: false
                },
                completedLap: false, // has the individual completed the lap - property for drawing
                mutations: 0, // count of the mutations undergone
                fitness: Number.MAX_VALUE // individuals fitness
            },
            i;

        // setup random accelerations
        for (i = 0; i < track.points.length; i = i + 1) {
            individual.accelerations.push(getRandomNr(min, max));
        }

        // update velocities, times and fitness
        individual = updateIndividual(individual, track);

        return individual;
    };

    // generate initial population - random population satisfying problem
    // a populaton consists of indivituals, where each individual is a candidate solution to the problem
    GA.generateRandomPopulation = function (size, min, max) {
        var population = [],
            i;

        for (i = 0; i < size; i = i + 1) {
            population.push(GA.generateRandomIndividual(min, max, track));
        }

        return population;
    };

    GA.exportSummarisedData = function (population) {
        var i,
            j,
            exportedArray = [],
            currentIndividual,
            min,
            max,
            sum,
            average,
            newExport = {
                "Max Acceleration": 0,
                "Min Acceleration": 0,
                "Average Acceleration": 0,
                "Max Velocity": 0,
                "Min Velocity": 0,
                "Average Velocity": 0,

                "Farthest Point": 0,
                "Time to Farthest Point": 0,
                "Completed Lap": false,
                "CoD Exceeded Power": false,
                "CoD Exceeded Lateral Force": false,
                "CoD Exceeded Velocity": false,
                "Fitness": 0,
                "Generation": 0
            };

        for (i = 0; i < population.length; i = i + 1) {
            currentIndividual = population[i];

            newExport = {};
            
            newExport.Generation = currentIndividual.generation;

            // calculating acceleration details
            min = Number.MAX_VALUE;
            max = Number.MIN_VALUE;
            sum = 0;
            for (j = 0; j < currentIndividual.accelerations.length; j = j + 1) {
                if (currentIndividual.accelerations[j]) {
                    min = Math.min(min, currentIndividual.accelerations[j]);
                    max = Math.max(max, currentIndividual.accelerations[j]);
                    sum = sum + currentIndividual.accelerations[j];
                }
            }
            average = sum / currentIndividual.accelerations.length;
            newExport["Max Acceleration"] = max;
            newExport["Min Acceleration"] = min;
            newExport["Average Acceleration"] = average;

            // calculating velocity details
            min = Number.MAX_VALUE;
            max = Number.MIN_VALUE;
            sum = 0;
            for (j = 0; j < currentIndividual.velocities.length; j = j + 1) {
                if (currentIndividual.velocities[j]) {
                    min = Math.min(min, currentIndividual.velocities[j]);
                    max = Math.max(max, currentIndividual.velocities[j]);
                    sum = sum + currentIndividual.velocities[j];
                }
            }
            average = sum / currentIndividual.velocities.length;
            newExport["Max Velocity"] = max;
            newExport["Min Velocity"] = min;
            newExport["Average Velocity"] = average;

            newExport["Farthest Point"] = currentIndividual.farthestPosition;
            newExport["Time to Farthest Point"] = currentIndividual.times[newExport["Farthest Point"]];
            newExport["Completed Lap"] = newExport["Farthest Point"] >= (track.points.length - 1) ? true : false;
            newExport["CoD Exceeded Power"] = currentIndividual.causeOfDeath.exceededPropulsivePowerLimit;
            newExport["CoD Exceeded Lateral Force"] = currentIndividual.causeOfDeath.exceededLateralForceLimit;
            newExport["CoD Exceeded Velocity"] = currentIndividual.causeOfDeath.exceededVelocityLimit;
            newExport.Fitness = currentIndividual.fitness;

            exportedArray.push(newExport);
        }

        return exportedArray;
    };
    
    GA.exportPopulation = function (population) {
        var maxDecimals = 4,
            i,
            j,
            currentIndividual,
            exportedPopulation = JSON.parse(JSON.stringify(population));
        
        for (i = 0; i < exportedPopulation.length; i = i + 1) {
            currentIndividual = exportedPopulation[i];
            
            // shorten values
            for (j = 0; j < currentIndividual.accelerations.length; j = j + 1) {
                currentIndividual.accelerations[j] = Number(currentIndividual.accelerations[j]).toFixed(maxDecimals);
                currentIndividual.velocities[j] = Number(currentIndividual.accelerations[j]).toFixed(maxDecimals);
                currentIndividual.times[j] = Number(currentIndividual.accelerations[j]).toFixed(maxDecimals);
            }
            
        }
        
        return exportedPopulation;
    };

    // ======================================================









    // ------------------------------------------------------
    // Genetic Algorithm functions
    // ------------------------------------------------------

    GA.resetGeneticAlgorithm = function () {

        GA.TOURNAMENT_SIZE = Math.floor(GA.POPULATION_SIZE * 0.8); // % of the population size
        GA.POPULATION_TO_REPLACE = Math.floor(GA.POPULATION_SIZE * 0.8); // % of the population size to replace with offspring (from crossovers of two tournament selected individuals)

        GA.fittestIndividualOfPreviousGeneration = undefined;
        GA.generation = 0;
        GA.stats.hallOfFame = [];
    };

    GA.clone = function (object) {
        return JSON.parse(JSON.stringify(object));
    };

    GA.sortByFitness = function (population) {

        function comparator(a, b) {
            return b.fitness - a.fitness;
        }

        // sort according to fitness (1 is fitter than 0 etc.)
        population.sort(comparator);

        return population;
    };



    // fitness function - produces next generation of states (should return better states)
    // gives a score to each state
    // probability of being chosen is based on your fitness score
    GA.evaluatePopulationFitness = function (population) {

        var i;

        // go through all the individuals in the population and append a fitness score to them
        for (i = 0; i < population.length; i = i + 1) {
            population[i].fitness = evaluateFitness(population[i]);
        }

        // return population of individuals, where each individual has fitness appended, i.e. population[0].fitness = "fitness score";
        return population;
    };


    GA.getFittestIndividual = function (population) {
        var fittestIndividual = population[0],
            i;

        // we can start at 1 because by default we assume population[0] is the fittest individual
        for (i = 1; i < population.length; i = i + 1) {
            if (population[i].fitness > fittestIndividual.fitness) {
                fittestIndividual = population[i];
            }
        }

        return fittestIndividual;
    };


    // selection - two pairs are selected at random to reproduce
    // selected based on their fitness score (survival of the fittest)
    // one may be selected more than once and others not at all
    // tournamentSize must be <= population size/length
    GA.selection = function (population, tournamentSize, populationCountToReplace) {

        if (tournamentSize > population.length) {
            console.log('error: tournamentSize must be <= population size');
            return;
        }

        if (populationCountToReplace > population.length) {
            console.log('error: populationCountToReplace must be <= population size');
            return;
        }

        // this returns an individual
        function runTournamentSelection(tournamentPopulation, tournamentSize) {
            var selectedPopulation,
                i;

            // select tournamentSize individuals from tournamentPopulation
            selectedPopulation = [];
            for (i = 0; i < tournamentSize; i = i + 1) {
                // select random individual from tournamentPopulation (individuals can be selected more than once)
                selectedPopulation.push(tournamentPopulation[getRandomInt(0, tournamentPopulation.length - 1)]);
            }

            // return fittest of the tournament for crossover
            return GA.getFittestIndividual(selectedPopulation);
        }

        var tournamentPopulation, // this is the previous generation
            parent1,
            parent2,
            newIndividual,
            replaceFrom = Math.max(population.length - populationCountToReplace, GA.TOP_FITTEST_INDIVIDUALS_TO_KEEP),
            i;

        // sort according to fitness
        population = GA.sortByFitness(population);
        tournamentPopulation = GA.clone(population);

        // replace the last populationCountToReplace individuals
        for (i = (population.length - populationCountToReplace); i < population.length; i = i + 1) {
            parent1 = runTournamentSelection(tournamentPopulation, tournamentSize);
            parent2 = runTournamentSelection(tournamentPopulation, tournamentSize);
            newIndividual = GA.crossover(parent1, parent2, GA.CROSSOVER_PROBABILITY);
            population[i] = newIndividual; // replace the i-th individual
        }

        return population;
    };


    // crossover (primary advantage of GA's) - crossover point is chosen at random from within the bitstring
    // "superior" individuals should have more opportunities to reproduce, to ensure more genetic material from the best individuals
    // offspring are created by exchanges between parents at crossover point
    // it's a good idea to make crossovers large in the beginning but smaller in future generations
    // this is an example of a sexual crossover (i.e. two parents)
    GA.crossover = function (parent1, parent2, crossoverProbability) {
        // One-point crossover
        // essentially swapping 
        // a = [8,9,8,9,8,9,8,9,8]
        // b = [3,2,3,2,3,2,3,2,3]
        // if crossover point is char 5 then
        // a = [8,9,8,9,3,2,3,2,3]
        // b = [3,2,3,2,8,9,8,9,8]

        var parentsLength = parent1.length,
            crossoverPoint = getRandomInt(0, parentsLength),
            chooseParent = getRandomInt(0, 1),
            offspring = {};

        if (getRandomNr(0, 1) <= crossoverProbability) {
            if (chooseParent === 0) {
                offspring.accelerations = parent1.accelerations.slice(0, crossoverPoint).concat(parent2.accelerations.slice(crossoverPoint, parentsLength));
            } else {
                offspring.accelerations = parent2.accelerations.slice(0, crossoverPoint).concat(parent1.accelerations.slice(crossoverPoint, parentsLength));
            }
        } else {
            // if no crossover must be done, choose the fittest of the parents
            if (parent1.fitness > parent2.fitness) {
                offspring.accelerations = parent1.accelerations.slice(0, parent1.length);
            } else {
                offspring.accelerations = parent2.accelerations.slice(0, parent2.length);
            }
        }

        // update offsprings 
        offspring = updateIndividual(offspring);

        return offspring;
    };


    // uniform mutation
    // min and max are the searchSpaceMin and the searchSpaceMax
    GA.mutate = function (individual, mutationProbability) {

        var i,
            mutatedIndividual = {};

        // copy the mutated individual so it doesn't get overwritten
        mutatedIndividual.accelerations = individual.accelerations.slice(0, individual.accelerations.length);

        // mutate
        for (i = 0; i < individual.accelerations.length; i = i + 1) {

            // check which mutation probability to use, standard or focused
            if ((i <= individual.farthestPosition) && (Math.abs(i - individual.farthestPosition) < GA.FOCUSED_MUTATION_COUNT) && (i !== (individual.accelerations.length - 1))) {
                mutationProbability = GA.FOCUSED_MUTATION_PROBABILITY;
            } else {
                mutationProbability = GA.STANDARD_MUTATION_PROBABILITY;
            }

            // mutate with a certain mutation probability
            if (getRandomNr(0, 1) <= mutationProbability) {
                mutatedIndividual.accelerations[i] = getRandomNr(GA.SEARCH_SPACE_MIN, GA.SEARCH_SPACE_MAX);
            }
        }

        // update mutatedIndividual
        mutatedIndividual = updateIndividual(mutatedIndividual);

        return mutatedIndividual;
    };


    // mutation - each location in a bitstring can be subject to mutation with a small random probability
    // individuals with lower fitness should have more chance of being mutated
    // fitness must be calculated before mutation
    // min and max are the searchSpaceMin and the searchSpaceMax
    GA.mutatePopulation = function (population, mutationProbability) {

        var i,
            probabilityOfMutation;

        population = GA.sortByFitness(population);

        // probability of being mutated decreases with fitness
        // go through all the individuals and check if they get selected for mutation
        for (i = GA.TOP_FITTEST_INDIVIDUALS_TO_KEEP; i < population.length - 1; i = i + 1) {

            if (GA.DECREASE_MUTATION_PROBABILITY_WITH_FITNESS) {
                // probability of mutating this individual
                probabilityOfMutation = i / population.length;
            } else {
                probabilityOfMutation = 1;
            }

            if (getRandomNr(0, 1) <= probabilityOfMutation) {
                population[i] = GA.mutate(population[i], mutationProbability);
            }
        }

        return population;
    };

    // ======================================================









    // ------------------------------------------------------
    // Run the actual generations
    // ------------------------------------------------------

    GA.getNextGeneration = function (population) {

        if (GA.generation <= GA.MAX_GENERATIONS) {

            GA.fittestIndividualOfPreviousGeneration = GA.getFittestIndividual(population);
            GA.fittestIndividualOfPreviousGeneration.generation = GA.generation;
            GA.stats.fittestOfGeneration.push(GA.fittestIndividualOfPreviousGeneration);

            // if there are no individuals in the hall of fame, select a random individual
            if (GA.stats.hallOfFame.length === 0) {
                GA.fittestIndividualOfPreviousGeneration.generation = GA.generation;
                GA.stats.hallOfFame.push(GA.fittestIndividualOfPreviousGeneration);
            }

            // select individuals (crossover is done here) - create a new population
            population = GA.selection(population, GA.TOURNAMENT_SIZE, GA.POPULATION_TO_REPLACE);

            // mutation
            population = GA.mutatePopulation(population, GA.STANDARD_MUTATION_PROBABILITY, GA.SEARCH_SPACE_MIN, GA.SEARCH_SPACE_MAX);

            // advance new generation
            GA.generation = GA.generation + 1;

            // get the fittest individual of the current generation
            GA.fittestIndividualOfCurrentGeneration = GA.getFittestIndividual(population);

            // check if this is the fittest individual ever
            if (GA.fittestIndividualOfCurrentGeneration.fitness > GA.stats.hallOfFame[GA.stats.hallOfFame.length - 1].fitness) {
                GA.fittestIndividualOfCurrentGeneration.generation = GA.generation;
                GA.stats.hallOfFame.push(GA.clone(GA.fittestIndividualOfCurrentGeneration));
            }

        }

        return population;
    };






    // Attatch the GA object to the window
    window.GA = GA;

}());