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

	setStopCode: function(stopCode) {
		stopInfo = stopsJSON[stopCode];
		stopInfo.stop_id = Number(stopInfo.stop_id);
		if(stopInfo.similar_stop) {
			stopInfo.similar_stop = Number(stopInfo.similar_stop);
		}
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

	getDeparturesByStopID: function(stopID) {
		// get ETA from a single StopID
		return new Promise((resolve, reject) => {
			departures = [];
			request(this.getRequestObj(stopID), function(err, response, body) {
				if (!err && response.statusCode == 200) {
					xmlRaw = body;
					xmlRaw = '<RoutePositionETFM> <Content Expires="2020-01-03T18:01:31-08:00"/> <Route RouteNo="10" Name="Old Pasadena - PCC - Allen Station"> <Destination Name="Allen Gold Line Station"> <Trip ETA="10' + config.stopCode + '" TripID="1297" RouteTag="33" RP="0.15732"/> <Trip ETA="16" TripID="1132" RouteTag="33" RouteTag0="13" RP0="0.92746"/> <Trip ETA="36" TripID="18" RouteTag="33" X="-13148312" Y="-4049151"> </Trip> </Destination> </Route> </RoutePositionETFM> ';
					parseString(xmlRaw, (err, result) => {
						var parsed = result;
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
					resolve(departures);
				} else {
					console.log(err);
					reject([]);
				}
			});
		});
	},

	getAllDeparturesByStopID: async function(stopID) {
		var self = this;
		// get ETA from a given StopID AND the stop across the street
		try {
			var departures = await this.getDeparturesByStopID(stopID);
			if (stopInfo.similar_stop) {
				var similarStopDepartures = await this.getDeparturesByStopID(stopInfo.similar_stop);
				departures = departures.concat(similarStopDepartures);
				ptHelper.sortETA(departures);
			}
			self.sendSocketNotification('DEPARTURES', {
				stop_name: stopInfo.stop_name,
				departures: departures,
			});
		} catch(err) {
			console.log(err);
		}
	},

	socketNotificationReceived: async function(notification, payload) {
		var self = this;
		console.log('Notification: ' + notification + ' Payload: ' + payload);
		config = payload.config;
		if(notification === 'GET_DEPARTURE') {
			this.setStopCode(payload.config.stopCode);
			this.getAllDeparturesByStopID(stopInfo.stop_id);
		} else if(notification === 'SET_STOP_CODE') {
			this.setStopCode(payload.config.stopCode);
		}
	}
});
