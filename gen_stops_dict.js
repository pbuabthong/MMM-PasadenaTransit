// Convert stops.txt from PasadenaTransit GTFS feed to json format.
// The 'stop code' can be looked up at http://rt.pasadenatransit.net/rtt/public/
// The resulting json contains stop_id, stop_name, similar_stop (the stop across st on the same intersection)
// Example:
// {'9911': {
//   stop_id: 117,
//   stop_name: 'Del Mar Blvd & Lake Ave',
//   similar_stop: 116
// }
var csvjson = require('csvjson');
var fs = require('fs');

var data = fs.readFileSync('stops.txt', { encoding: 'utf8'});

stopsJson = csvjson.toObject(data, {delimiter: ',', quote: '\"'});

// get a stop id of the stop at the same intersection but opposite direction
var getSimilarStop = (stopId, stopName) => {
	var similarStop = stopsJson.filter((stop) => {
		return (stop.stop_id != stopId) && (stop.stop_name == stopName);
	});

	if (similarStop[0]) {
		return similarStop[0].stop_id;
	}
};

stopsDict = {};
stopsJson.forEach((stop) => {
	stopsDict[stop.stop_code]={
		'stop_id': stop.stop_id,
		'stop_code': stop.stop_code,
		'stop_name': stop.stop_name,
		'similar_stop': getSimilarStop(stop.stop_id, stop.stop_name)
	};
});

fs.writeFileSync('stops.json', JSON.stringify(stopsDict));
