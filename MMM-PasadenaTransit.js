// Magic Mirror
// Module: MMM-PasadenaTransit
// 
// By Pai Buabthong https://github.com/pbuabthong
// MIT Licensed.
// 

Module.register('MMM-PasadenaTransit', {

	defaults: { // Start with the information needed for a single stop
		updateInterval : 30000, // 30 seconds
	},

	start: function() {
		Log.info('Starting module: ' + this.name);

		var self = this;

		this.getDepartureInfo();
		// Schedule update timer.
		setInterval(() => {
			self.getDepartureInfo();
		}, this.config.updateInterval);
	},

	getStyles: function () {
		return ['MMM-PasadenaTransit.css'];
	},

	// Override dom generator.
	getDom: function() {
		var wrapper = document.createElement('div');

		if (!this.info) {
			wrapper.innerHTML = 'LOADING...';
			wrapper.className = 'dimmed light small';
			return wrapper;
		}

		if (this.info.departures.length > 0) {
			console.log('no arrivale');
			var table = document.createElement('table');
			table.className = 'small';

			var departures = this.info.departures;
			departures.forEach((departure) => {
				var row = document.createElement('tr');
				table.appendChild(row);

				var routeNo = document.createElement('td');
				routeNo.className = 'route_no';
				routeNo.innerHTML = departure.routeNo;
				row.appendChild(routeNo);

				var routeName = document.createElement('td');
				routeName.className = 'route_name';
				routeName.innerHTML = departure.routeName;
				row.appendChild(routeName);

				var ETA= document.createElement('td');
				ETA.className = 'eta';
				ETA.innerHTML = departure.ETA;
				row.appendChild(ETA);
			});
			return table;
		} else {
			wrapper.innerHTML = 'No departures';
			wrapper.className = 'dimmed light small';
			return wrapper;
		}
	},

	// Override get header function
	getHeader: function() {
		if (this.info) {
			console.log(this.info.stop_name);
			return this.info.stop_name;
		}
		return 'Departure Times';
	},

	// Override notification handler.
	socketNotificationReceived: function(notification, payload) {
		if (notification === 'DEPARTURES') {
			if (payload.stop_code == this.config.stopCode) {
				this.info = payload;
				this.updateDom();
			}
		}
	},

	getDepartureInfo: function() {
		Log.info('Requesting departure info');

		this.sendSocketNotification('GET_DEPARTURE', {
			config: this.config
		});
	}
});
