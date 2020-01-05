var request = require('request');
var fs = require('fs');
var parseString = require('xml2js').parseString;
var NodeHelper = require('node_helper');

var ptHelper = require('./pt_helper.js');
var stopsJSON = require('./stops.json');

var stopInfo;
var config;

module.exports = NodeHelper.create({

	start: function() {
		console.log('Starting PasadenaTransit node helper');
	},

	getStopIDFromStopCode: function(stopCode) {
		return Number(stopsJSON[stopCode].stop_id);
	},

	getStopNameFromStopCode: function(stopCode) {
		return stopsJSON[stopCode].stop_name;
	},

	getRequestObj: function(stopID) {
		var url = 'https://rt.pasadenatransit.net/rtt/public/Utility/File.aspx?ContentType=SQLXML&Name=RoutePositionETForMap2&PlatformTag';
		var propertiesObject = {
			ContentType: 'SQLXML',
			Name: 'RoutePositionETForMap2',
			PlatformTag: stopID
		};
		return {url:url, qs: propertiesObject};
	},

	getDeparturesByStopCode: function(stopCode) {
		// get ETA from a single StopID
		console.log(stopCode);
		return new Promise((resolve, reject) => {
			console.log(stopCode);
			stopID = this.getStopIDFromStopCode(stopCode);
			request(this.getRequestObj(stopID), function(err, response, body) {
				console.log('after request' + stopCode);
				if (!err && response.statusCode == 200) {
					xmlRaw = body;
					// uncomment below to test local xml
					// xmlTest = '<RoutePositionETFM> <Content Expires="2020-01-03T18:01:31-08:00"/> ';
					// xmlTest += '<Route RouteNo="10" Name="Old Pasadena - PCC - Allen Station"> <Destination Name="Allen Gold Line Station">';
					// xmlTest += '<Trip ETA="10' + stopCode + '" TripID="1297" RouteTag="33" RP="0.15732"/> <Trip ETA="16" ';
					// xmlTest += 'TripID="1132" RouteTag="33" RouteTag0="13" RP0="0.92746"/> <Trip ETA="36" TripID="18" RouteTag="33" ';
					// xmlTest += 'X="-13148312" Y="-4049151"> </Trip> </Destination> </Route> </RoutePositionETFM> ';
					// xmlRaw = xmlTest;
					parseString(xmlRaw, (err, result) => {
						var parsed = result;
						departures = [];
						if(parsed.RoutePositionETFM.Route) {
							parsed.RoutePositionETFM.Route.forEach((route) => {
								route.Destination[0].Trip.forEach((trip) => {
									// add new departure time to the departure array
									departures.push({
										'routeNo': route.$.RouteNo,
										'routeName': route.Destination[0].$.Name,
										'ETA': Number(trip.$.ETA)
									});
								});
							});
						} else {
							console.log('No arrival');
						}
					});

					ptHelper.sortETA(departures);
					console.log(departures);
					resolve(departures);
				} else {
					console.log(err);
					reject([]);
				}
			});
		});
	},

	getAllDeparturesByStopCode: function(stopCode) {
		var self = this;
		// get ETA from a given StopID AND the stop across the street
		this.getDeparturesByStopCode(stopCode)
			.then((departures) => {
				console.log('after then' + stopCode);
				this.sendSocketNotification('DEPARTURES', {
					stop_code: stopCode,
					stop_name: this.getStopNameFromStopCode(stopCode),
					departures: departures,
				});
			})
			.catch((err) => {
				console.log(err);
			});
		// if (stopInfo.similar_stop) {
		// 	var similarStopDepartures = this.getDeparturesByStopID(stopInfo.similar_stop);
		// 	departures = departures.concat(similarStopDepartures);
		// 	ptHelper.sortETA(departures);
		// }
	},

	socketNotificationReceived: function(notification, payload) {
		var self = this;
		console.log('Notification: ' + notification + ' Payload: ' + payload);
		config = payload.config;
		if(notification === 'GET_DEPARTURE') {
			this.getAllDeparturesByStopCode(payload.config.stopCode);
		}
	}
});
