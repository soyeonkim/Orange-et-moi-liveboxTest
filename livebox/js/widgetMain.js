var OEM = OEM || {};
OEM.LOG = true;
OEM.WIFIBLOCK = false;

OEM.app = {
	dialog: undefined,
	updateStarted: false,
	viewMode: false,
	gauges: [],
	accessSuiviconso: '',
	

	getParameters: function () {
		var searchString = window.location.search.substring(1), params = searchString.split("&"), info = {};
		
		if (OEM.LOG) console.log ("Search string: "+window.location.search.substring(1));

		for (var i=0; i < params.length; i++) {
			var val = params[i].split("=");
			info[unescape(val[0])] = unescape(val[1]);
		}
		
		return info;
	},
	showWidget: function() {
		var gInfo = this.getParameters();
		
		//if (OEM.LOG) console.log ("load type: " + gInfo.type);
		if(gInfo.type == undefined)  {
			gInfo.width=354;
			gInfo.height=354;
		}
		var widget = "widget"+gInfo.width+"x"+gInfo.height;
		var view = widget+"view";

		if (OEM.LOG) console.log ("Setting view: "+view);
		this.setView(view);
		OEM.app.viewMode = view;
	},
	hideAll: function() {
		$("#widget175x175view").hide();
		$("#widget354x175view").hide();
		$("#widget354x354view").hide();
	},

	setView: function(viewID) {
		//this.hideAll();
		//if(OEM.LOG) console.log("AppRouter.setView: " + viewID);
		//$("#" + viewID).show();
		$("#" + viewID).removeClass('hidden');
	},
	displayWidget: function(){
		var targetValue = OEM.widgetSuiviConsoModel.gaugeInfo[0].credit;
		var text = OEM.widgetSuiviConsoModel.gaugeInfo[0].title;
	
		
		targetValue = 339 * targetValue / 100;
		$(".gauge").animate({
			width: targetValue
		}, 1000, 'swing');		
		$(".optionName").html(text);
		
	},
	

	loadCache: function(callback) {
		// load the cached init if we can, this fires access settings if we need to
		if(OEM.LOG) console.log("Attempting to load cached models...");
		OEM.widgetInitModel.loadCachedModel();
		OEM.widgetSuiviConsoModel.loadCachedModel(callback);
	},

	startInitRequest: function(success, error) {
		if(OEM.LOG) console.log("Starting live init request...");
		OEM.widgetInitModel.fetch(success, error);
	},
	startSuiviRequest: function(success, error) {
		if(OEM.LOG) console.log("Starting live suivi request...");
		//this.models.suiviconso.url = this.models.suiviconso.originalUrl;
		// make the actual request
		OEM.widgetSuiviConsoModel.fetch(success, error);
	},
	startLiveRequests: function(startup) {
		
		var suiviSuccess = function() {
			if(OEM.LOG) console.log("Suivi request completed successfully");
			var updatedDate = new Date();
			localStorage["widget.lastUpdate"] = updatedDate.toUTCString();

			if(OEM.LOG) console.log("Showing suivi view...");

			// re-render needed after view has been amended
			//that.router.showWidget();
		};

		var suiviError = function() {
			// TODO 
 		};

		var initSuccess = function() {
			if(OEM.LOG) console.log("Init completed successfully");
			// store the time we did the request
			
			that.updateStarted = false;
			// init worked, check access flags and then do suiviconso
			//if(that.models.init.valid) {
			if(OEM.widgetInitModel.valid) {
				if(OEM.LOG) console.log("Init completed successfully and valid");
				//that.models.init.set("online", true);
				if(OEM.app.accessSuiviconso=== "1") {
					console.log("suiviconso/ accessValue: "+OEM.app.accessSuiviconso);
					that.startSuiviRequest(suiviSuccess, suiviError);
				} 
				 
			} else {
				if(OEM.LOG) console.log("Init completed but not valid");
 			}
		};

		var initError = function() {
			if(OEM.LOG) console.log("Init request failed");
 			that.updateStarted = false;
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
		if(OEM.widgetSuiviConsoModel.cacheLoaded || OEM.widgetSuiviConsoModel.fetchLoaded) {
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
	
	
	start: function() {
		var that = this;		
		OEM.widgetInitModel.initialize();						//set urlPrefixInit
		OEM.widgetSuiviConsoModel.initialize();		   //set urlPrefixSuivi
		OEM.app.showWidget();
	//	this.bindInitEvents();								//??
		
		var loadCacheCallback = function () {
			that.startLiveRequests(true);
		}
		
		this.loadCache(loadCacheCallback);
		
	}
 
	
	

};


$(document).ready(function(){
	/*	$('body').off('.data-api');

	// tell the shared code that this is the widget
*/	OEM.widgetPlatform.isWidget = true;
	
	// init the widgetPlatform variables
	OEM.widgetPlatform.init( function() {
		if(OEM.LOG) console.log("Init complete.");
		//	OEM.app.start();
 
	});
	
	
	OEM.app.showWidget();
	var xmlDoc;
    var xmlloaded = false;

    function initLibrary()
    {	/* *  Nominal case * */
        //importXML("js/AMP/Sosh_33650095385.xml");
        //importXML("js/AMP/CMO_33631403678.xml");
        //importXML("js/AMP/Postpaid_Origami_Star_33617890155.xml");
        
        /* * Unlimited post paid * */
        importXML("js/AMP/Postpaid_Origami_Jet_33688319437.xml");
        
        /* * Prepaid * */
        //importXML("js/AMP/Prepaid_33786000026.xml");
        
        /* * Other cases * */
        //importXML("js/AMP/Prepaid_33786000026.xml");
        
    }

    function importXML(xmlfile)
    {
        try
        {
            var xmlhttp = new XMLHttpRequest();
            xmlhttp.open("GET", xmlfile, false);
        }
        catch (Exception)
        {
            var ie = (typeof window.ActiveXObject != 'undefined');

            if (ie)
            {
                xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
                xmlDoc.async = false;
                while(xmlDoc.readyState != 4) {};
                xmlDoc.load(xmlfile);
                readXML();
                xmlloaded = true;
            }
            else
            {
                xmlDoc = document.implementation.createDocument("", "", null);
                xmlDoc.onload = readXML;
                xmlDoc.load(xmlfile);
                xmlloaded = true;
            }
        }

        if (!xmlloaded)
        {
            xmlhttp.setRequestHeader('Content-Type', 'text/xml')
            xmlhttp.send("");
            xmlDoc = xmlhttp.responseXML;
           // readXML();
            OEM.widgetSuiviConsoModel.parse(xmlDoc,xmlhttp, false);
            xmlloaded = true;
            OEM.app.displayWidget();
        }
    }
	
    initLibrary();
	
});
