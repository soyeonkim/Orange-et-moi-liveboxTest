var OEM = OEM || {};
OEM.LOG = true;
OEM.WIFIBLOCK = false;

OEM.app = {
	dialog: undefined,
	updateStarted: false,

	start: function() {
		var that = this;

		this.models = {
			init: new InitModel(),
			suiviconso: new SuiviConsoModel(),
			gauges: []
		};

		this.views = {
		/*	test: new Test({ }),
			inittest: new InitTestView({
										model: that.models.init }), */
			widget175x175: new WidgetView175x175({
											el: '#widget175x175view',
											template: '#widget175x175template' }),

			widget354x175: new WidgetView354x175({
											el: '#widget354x175view',
											template: '#widget354x175template',
											model: that.models.suiviconso }),
											
			widget354x354: new WidgetView354x354({
											el: '#widget354x354view',
											template: '#widget354x354template',
											model: that.models.suiviconso }),

			gauges: []
		};

		this.router = new AppRouter(this);
		Backbone.history.start();
		//@TODO - make sure that init does not cache if an error occured or
		// needs a mandatory (or optional) update and bills errors too
		this.bindInitEvents();

		var loadCacheCallback = function () {
			that.startLiveRequests(true);
		}
		
		this.loadCache(loadCacheCallback);
	},

	bindInitEvents: function() {
		// set the callback for switching gauge model
		// @TODO should this be in suivi conso view?
		this.models.suiviconso.setGaugeCallback(this, OEM.app.setGaugeModels);
		
	},

	loadCache: function(callback) {
		// load the cached init if we can, this fires access settings if we need to
		if(OEM.LOG) console.log("Attempting to load cached models...");
		this.models.init.loadCachedModel();
		this.models.suiviconso.loadCachedModel(callback);
	},

	startLiveRequests: function(startup) {
		var suiviSuccess = function() {
			if(OEM.LOG) console.log("Suivi request completed successfully");
			var updatedDate = new Date();
			localStorage["widget.lastUpdate"] = updatedDate.toUTCString();

			if(OEM.LOG) console.log("Showing suivi view...");

			// re-render needed after view has been amended
			that.router.showWidget();
		};

		var suiviError = function() {
			// TODO 
//			// suivi failed
//			that.router.showTopNotification(false);
//			// display error to inform user needs a 3g conn, quit app if no cache
//			that.router.showConnectionError("réseau mobile Orange non détecté", "#connectionerrdialogtemplate", !cacheDisplayed);
		};

		var initSuccess = function() {
			if(OEM.LOG) console.log("Init completed successfully");
			// store the time we did the request
			
			that.updateStarted = false;
			// init worked, check access flags and then do suiviconso
			if(that.models.init.valid) {
				if(OEM.LOG) console.log("Init completed successfully and valid");
		
				that.models.init.set("online", true);

				if(that.models.init.get("access")["suiviconso"] === "1") {
					that.startSuiviRequest(suiviSuccess, suiviError);
				} else {
					// TODO : handle errors
//					that.router.showTopNotification(false);
//					if(!cacheDisplayed) {
//						// we need to display an error message here as there no cache suivi
//						that.router.showConnectionError("service actuellement indisponible", "#accessblockdialogtemplate", true);
//					}
				}

			} else {
				if(OEM.LOG) console.log("Init completed but not valid");
//				that.router.showTopNotification(false);
//				// display error to inform user needs a 3g conn, quit app if no cache
//				that.router.showConnectionError("réseau mobile Orange non détecté", "#connectionerrdialogtemplate", !cacheDisplayed);
			}
		};

		var initError = function() {
			if(OEM.LOG) console.log("Init request failed");
//			that.router.showTopNotification(false);
			that.updateStarted = false;
			// init failed, check for cached init then do suivi or error
			// display error to inform user needs a 3g conn, quit app if no cache
//			that.router.showConnectionError("réseau mobile Orange non détecté", "#connectionerrdialogtemplate", !cacheDisplayed);
		};

		///////////////////////////////////////////////////////////////////////////
						// CALLBACK DEFININIONS END
		///////////////////////////////////////////////////////////////////////////


		// on application start the splash screen is displayed
		// 1 - if there is no cached info, start the load of init followed by suivi conso
		//		load then remove splash
		// 2 - if there is cached info, show after 1sec and remove splash
		var that = this;
		var cacheDisplayed = false;
		if(this.updateStarted) return; // block if already started
		if(that.models.suiviconso.cacheLoaded || that.models.suiviconso.fetchLoaded) {
			if(OEM.LOG) console.log("Showing cached suivi");
			// a cache is available
			var onReady = function() {
				if(startup) {
					that.router.showWidget();
				}

				cacheDisplayed = true;

				// start an init request after a sec so it doesn't happen too fast
				// Check first if we can make the request
				var connect = false;
				var nextUpdateTime = localStorage.getItem('widget.nextUpdateTime');
				if (OEM.LOG) console.log ("nextUpdateTime: "+nextUpdateTime);
				if ((nextUpdateTime) &&(nextUpdateTime !== "Invalid Date")) {
				//if (nextUpdateTime !== "Invalid Date") {
					var now = new Date ();

					// Check if now is within a minute from nextUpdateTime;
					nextUpdateTime = new Date(nextUpdateTime);
					nextUpdateTime.setMinutes(nextUpdateTime.getMinutes()-1);
					if (now >= nextUpdateTime) {
						nextUpdateTime.setMinutes(nextUpdateTime.getMinutes()+2);

						if (now <= nextUpdateTime) {
							// fine!
							connect = true;
						}
					}
				} else {
					connect = true;
				}
				
				if (connect) {
					var startInit = function() {
						that.startInitRequest(initSuccess, initError);
					};
					
					setTimeout(startInit, 1000);
				}
			};

			// give at least 1sec to show splash screen
			setTimeout(onReady, 1500);
			that.updateStarted = true;
		} else {
			// a cache is not available
			that.updateStarted = true;
			that.startInitRequest(initSuccess, initError);
		}
	},

	startInitRequest: function(success, error) {
		if(OEM.LOG) console.log("Starting live init request...");
		this.models.init.fetch({success: success, error: error});
	},

	startSuiviRequest: function(success, error) {
		if(OEM.LOG) console.log("Starting live suivi request...");
		this.models.suiviconso.url = this.models.suiviconso.originalUrl;
		// make the actual request
		this.models.suiviconso.fetch({success: success, error: error});
	},

	setGaugeModels: function(gauges) {
		var that = this;
		this.models.gauges = gauges;
		this.views.gauges = [];
		for(var index in this.models.gauges) {
			var gauge = this.models.gauges[index];
			if(gauge.get('displayGauge') === "1") {				
				var visualGauge = new VisualGaugeView({model: gauge, restemode: this.resteMode});
				console.log('VisualGaugeView:'+gauge);
				this.views.gauges.push(visualGauge);
			} else {
				console.log('BasicGaugeView');
				var basicGauge = new BasicGaugeView({model: gauge});
				this.views.gauges.push(basicGauge);
			}
			
		}
	}
};

$(document).ready(function(){
//	$('body').off('.data-api');

	// tell the shared code that this is the widget
	OEM.platform.isWidget = true;	
	// init the platform variables
	OEM.platform.init( function() {
		if(OEM.LOG) console.log("Init complete.");
		OEM.app.start();
	});
	
});
