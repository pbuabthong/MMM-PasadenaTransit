var request = require('request');
var fs = require('fs');
var parseString = require('xml2js').parseString;

var predicateBy = (prop) => {
	return (a,b) => {
		if (a[prop] > b[prop]){
			return 1;
		} else if(a[prop] < b[prop]){
			return -1;
		}
		return 0;
	};
};

var sortETA = function(departures) {
	departures.sort(predicateBy('ETA'));
};

module.exports = {
	sortETA
};
