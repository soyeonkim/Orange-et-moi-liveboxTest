var OEM = OEM || {};
OEM.widgetPlatform = {
	supportedPlatforms: ["tizen", "iphone", "ipad", "desktopwebkit", "android", "bb10"],
	platform: undefined,									//used
	hosted: true,												//used
	isWidget: false,									//used
	mUserMsisdn: "mUserMsisdn:33677236335",			//used
	fakeNumber: undefined,					//used
	backEndOptionSuffix: "OTIZEN",			//used
	deviceUserAgent: undefined,
	deviceName: "HTML5",							//used
	deviceVendor: "HTML5",						//used
	forceUpdate: false,								//used		// force the next update immediately in case its less than 1min
	applicationVersion: "1.1.3",
	applicationBuild: " RC4.14",
	screenRes: "null",								//used
	osUrlParam: "samsung_tizen",					//used
	//mode: "dev",	
	mode: "prod",										//used
	//mode: "qualif",

	init: function(success) {
		var that = this;
		var callback = function() {
			that.doInit();
			success();
		};

		that.insertPlatformLibs(callback);
	},

	resume: function() {
		// time that data is considered expired in ms
		var contentLifespan = 60000;
		var currentDate = new Date();
		var lastUpdate = new Date(localStorage["OEM.lastUpdate"]);

		if( ((lastUpdate.valueOf()+contentLifespan) < currentDate.valueOf()) || OEM.platform.forceUpdate) {
			if(OEM.LOG) console.log("Content expired, refreshing...");
			OEM.app.refreshRequests();
			OEM.platform.forceUpdate = false;
		} else {
			if(OEM.LOG) console.log("Content still valid, no need to refresh.");
		}
	},

	tizenConnectionChange: function(info) {
		if( info.networkType == "2G" ||
				info.networkType == "2.5G"||
				info.networkType == "3G" ||
				info.networkType == "4G") {
			if(OEM.LOG) console.log("Connection change to 3G, refreshing contents...");
			OEM.widgetPlatform.forceUpdate = true; // force the next update immediately in case its less than 1min
		} else {
			if(OEM.LOG) console.log("Connection change NOT 3G");
			OEM.widgetPlatform.wifiAction();
		}
	},

	// TODO clarify what the ideal action is when wifi is on in v1
	// currently just display a dialog then quit
	// perhaps only do this if there is no suivi cache?
	// can set init offline to false if we have cache and if not we quit as before
	wifiAction: function() {
		var cacheLoaded = OEM.app && OEM.app.models && (OEM.app.models.suiviconso.cacheLoaded || OEM.app.models.suiviconso.fetchLoaded);
		if(cacheLoaded) {
			console.log("OEM.app.models.init.set (online, false)");
			 //OEM.app.models.init.set("online", false);
		} else {
			alert("désactivez le Wi-Fi sur votre téléphone, puis relancez l'application.");
			console.log("OEM.platform.quitApp();");
			//OEM.platform.quitApp();
		}
	},

	doInit: function() {
		var that = this;

		if(OEM.LOG) console.log("Platform init...");

		// 33681777109 owned french sim
		// 33676472171 otv sim 1
		// this.fakeNumber = "33677454452";
		// this.fakeNumber = "33608516687";
		// this.fakeNumber = "33786963476";
		//this.fakeNumber = "0786990545"; // number used to test Hors Forfait
		//this.fakeNumber = "33637583040" // number for enterprise
		//this.fakeNumber = "33681777109";
		//this.fakeNumber = "33680621609";
		//this.fakeNumber = "33618601027"; // number for testing 201 init response
		that.fakeNumber = "33648734870";
		//this.fakeNumber = "0689903203"; // suivi return status 5
		// that.fakeNumber = "0633201779";
		that.mUserMsisdn = "mUserMsisdn:" + that.fakeNumber;
		that.screenRes = screen.availWidth + "x" + screen.availHeight;
		if(OEM.LOG) console.log("MSISDN:"+ that.mUserMsisdn);
		
		if(typeof window.tizen === 'object') {
			
			that.platform = "tizen";		 
			screen.lockOrientation("portrait-primary");
			that.setTizenBackendUA();
			that.backEndOptionSuffix = "OTIZEN";
			that.osUrlParam = "samsung_tizen";
			that.hosted = false;
			
			
			tizen.systeminfo.addPropertyValueChangeListener("NETWORK", function(info) {
				OEM.widgetPlatform.tizenConnectionChange(info);
			});
		} 
		else {
			
			that.screenRes ="720x1280";
			that.platform = "tizen";		 
			that.backEndOptionSuffix = "OTIZEN";
			that.osUrlParam = "samsung_tizen";
			that.hosted = false;
			
			var userAgentPrefix = "WelcomeOrange_";
			var capabilities ={};
			capabilities.platformName="Tizen";
			capabilities.platformVersion = "2.1.1";
			OEM.widgetPlatform.deviceVendor="samsung";
			OEM.widgetPlatform.deviceName ="GT-I8805";
			var backendUA = userAgentPrefix + capabilities.platformName + "_" + OEM.widgetPlatform.applicationVersion + "_" + OEM.widgetPlatform.deviceVendor + "_" + OEM.widgetPlatform.deviceName + "_" + capabilities.platformVersion;

			if(OEM.LOG) console.log("Tizen User-Agent: " + backendUA);
			OEM.widgetPlatform.deviceUserAgent = backendUA;

			
		}
		
		if(OEM.LOG) console.log("Platform: " + that.platform);
		return that.platform;
	},

	insertPlatformLibs: function(success) {
		var that = this;
		if(window.location.href.indexOf("file:")===0 || window.location.href.indexOf("local:")===0) {
			  if(typeof window.tizen === 'object') {
				var onSimReady = function(sim) {
					OEM.widgetPlatform.handleClientId(sim.msin);
					success();
				};

				var onSimError = function() {
					OEM.widgetPlatform.handleClientId(undefined);
					success();
				};

 				var getImsi = function() {
					tizen.systeminfo.getPropertyValue("SIM", onSimReady, onSimError);
				};

				var onBuildReady = function(build) {
					OEM.widgetPlatform.deviceName 	= build.model;
					OEM.widgetPlatform.deviceVendor 	= build.manufacturer;
					getImsi();
				};
				var onBuildError = function() {
					getImsi();
				};

				tizen.systeminfo.getPropertyValue("BUILD", onBuildReady, onBuildError);
			} else {
				success();
			}
		} else {
			success();
		}
	},

	handleClientId: function(id) {
		var previousId = localStorage["OEM.clientid"];
		if(!id) {
			// always clear cache if we cannot detect an id
			if(OEM.widgetPlatform.mode !== "dev") {
				localStorage.clear();
			}
			if(OEM.LOG) console.log("Can't detect Client Id (IMSI), cleared cache.");
		} else {
			if(previousId !== id) {
				localStorage.clear();
				if(OEM.LOG) console.log("Client Id (IMSI) changed, cleared cache.");
				localStorage["OEM.clientid"] = id;
			}
		}

		if(OEM.LOG) console.log("IMSI: old:"+ previousId+ "  new:"+ id);
	},

	setTizenBackendUA: function() {
		var that = this;
		// first set the UA to the incomplete prefix, more detail will be added
		// if get device info works - WelcomeOrange_BlackBerry_1.1_RIM_10.0
		//tizen.application.setUserAgent(that.userAgentPrefix);
		// the deviceName was set in the insertPlatformLibs as it is async
		var userAgentPrefix = "WelcomeOrange_";
		var capabilities = tizen.systeminfo.getCapabilities();
		var backendUA = userAgentPrefix + capabilities.platformName + "_" + OEM.widgetPlatform.applicationVersion + "_" + OEM.widgetPlatform.deviceVendor + "_" + OEM.widgetPlatform.deviceName + "_" + capabilities.platformVersion;

		if(OEM.LOG) console.log("Tizen User-Agent: " + backendUA);
		OEM.widgetPlatform.deviceUserAgent = backendUA;

		// also set the standard User-agent header too
		tizen.application.setUserAgent(backendUA);
	},


	urlPrefixInit: function() {
		if(OEM.LOG) console.log("platform.hosted: "+ this.hosted);
		var url = "";
		var relativeUrl = "/v1-3/init?appVer=" + OEM.widgetPlatform.applicationVersion + "&os=" + OEM.widgetPlatform.osUrlParam + "&appName=WELCOME&screenResolution=" + OEM.widgetPlatform.screenRes + "&screenDensity=null&screenSize=null&deviceName=" + OEM.widgetPlatform.deviceName;
		if(this.hosted) {
			url = "/proxy/qualifweb-orrm.aw.atosorigin.com:17060" + relativeUrl;
		} else {
			switch(this.mode) {
			case "dev":
				url = "http://qualifweb-orrm.aw.atosorigin.com:17060" + relativeUrl; // development
				break;
			case "qualif":
				url = "http://qlf-ampfr.orange.fr/rp/welcome" + relativeUrl; // qualification
				break;
			case "prod":
				url = "http://ampfr.orange.fr/rp/welcome" + relativeUrl; // production
				break;
			default:
				break;
			}
		}

		return url;
	},
	
	urlPrefixSuivi: function() {
		if(OEM.LOG) console.log("urlPrefixSuivi: "+ this.mode);
		var url = "";
		var relativeUrl = "/ws/suiviconso/omoi?appName=WELCOME&appVer=" + OEM.widgetPlatform.applicationVersion + "&hfdetail=true";
		if(this.hosted) {
			url = "/proxy/qualifweb-orrm.aw.atosorigin.com:16000" + relativeUrl;
		} else {
			switch(this.mode) {
			case "dev":
				url = "http://qualifweb-orrm.aw.atosorigin.com:16000" + relativeUrl; // development
				break;
			case "qualif":
				url = "http://qlf-ampfr.orange.fr/rp/hm" + relativeUrl; // qualification
				break;
			case "prod":
				url = "http://ampfr.orange.fr/rp/hm" + relativeUrl; // production
				break;
			default:
				break;
			}
		}

		return url;
	},

	// we have not working dev or qualif server for this, use prod at all times(!)
	urlPrefixFactures: function() {
		var relativeUrl = "/rp/welcome/v1-2/mobileBillListDetails?appVer=" + OEM.widgetPlatform.applicationVersion + "&appName=WELCOME";
		if(this.hosted) {
			url = "/app/dummydata/bills/Bills0EuroBillOK.xml";
		} else {
			if(this.mode==="prod") {
				url = "http://ampfr.orange.fr" + relativeUrl; // production
			} else if(this.mode==="qualif") {
				url = "http://qlf-ampfr.orange.fr" + relativeUrl; // qualification
			} else {
				url = "app/dummydata/bills/Bills0EuroBillOK.xml";
			}
		}
		return url;
	},

	addRequestHeaders: function(xhr) {
		// this is a callback from XHR, ie this = XHR
		if(OEM.widgetPlatform.mode!=="prod") xhr.setRequestHeader("wap-network-info", OEM.widgetPlatform.mUserMsisdn);
			xhr.setRequestHeader("X_AMP_AID", "WELCOME");
			xhr.setRequestHeader("X_AMP_MID", "12345");
			if(OEM.LOG) console.log("X_AMP_MID", "12345");
		if(OEM.widgetPlatform.deviceUserAgent) {
			xhr.setRequestHeader("X_AMP_UA", OEM.widgetPlatform.deviceUserAgent);
			if(OEM.LOG) console.log("X_AMP_UA");
		}

		if(OEM.widgetPlatform.platform==="tizen" && OEM.widgetPlatform.isWidget) {
			xhr.setRequestHeader("X_AMP_AUTO_UPDATE_AUTHORIZED", "TIZEN");
			if(OEM.LOG) console.log("X_AMP_AUTO_UPDATE_AUTHORIZED", "TIZEN");
		}
	},

	getResponseHeaders: function(xhr) {
		if(xhr && xhr.status>199 && xhr.status<300 && OEM.widgetPlatform.platform==="tizen" && OEM.widgetPlatform.isWidget) {
			if (OEM.LOG) console.log ("header X_AMP_AUTO_UPDATE_TIME_SLOT: "+xhr.getResponseHeader('X_AMP_AUTO_UPDATE_TIME_SLOT'));
			if (OEM.LOG) console.log ("header Retry-After: "+xhr.getResponseHeader('Retry-After'));

			// Store update time slot and retry-after if present
			localStorage['widget.X_AMP_AUTO_UPDATE_TIME_SLOT'] = xhr.getResponseHeader('X_AMP_AUTO_UPDATE_TIME_SLOT');
			localStorage['widget.Retry-After'] = xhr.getResponseHeader('Retry-After');

			if(OEM.widget.tizen) OEM.widget.tizen.computeNextUpdateTime();
		}
	},
	
	savePreferenceKey: function(key, data) {
		if(OEM.widgetPlatform.platform==="tizen" && OEM.widget.tizen) {
			if (OEM.LOG) console.log ("saverPreferenceKey:");
		//	OEM.widget.tizen.setPreferenceKey(key,data);
		}
	},
	readPreferenceKey: function(key, success) {
		if(OEM.widgetPlatform.platform==="tizen" && OEM.widgetPlatform.isWidget && OEM.widget.tizen) {
			if (OEM.LOG) console.log ("readPreferenceKey");
		//	OEM.widget.tizen.getPreferenceKey(key,success);
			success();
		}
		else {
			success();
		}
	},
 

	updateApp: function(url) {
		if(OEM.LOG) console.log("Update application", url);
		var successCB = function() {
			if(OEM.LOG) console.log("application update launch service succeed");
			// give it a second then close the app (just in case and its visually better)
			setTimeout(function() {
				OEM.platform.quitApp();
			}, 1000);
		};

		var errorCB = function(e) {
			if(OEM.LOG) console.log("application update launch service failed. " + e.message);
		};
		
		if(this.platform==="tizen") {
			// @TODO - update app
			var service = new tizen.ApplicationControl( "http://tizen.org/appcontrol/operation/view", url, null);
			tizen.application.launchAppControl( service, null, successCB, errorCB);
		} else if(this.platform==="bb10") {
			blackberry.invoke.invoke({
				target: "sys.browser",
				uri: url
			}, successCB, errorCB);
		} else if((this.platform==="android" || this.platform==="iphone") && !this.hosted) {
			navigator.app.loadUrl(url, { openExternal:true } ); 
		} else {
			window.open(url, "_blank");
		}
	},

	quitApp: function() {
		if(this.mode!=="dev") {
			// only allow quiting the application when not in dev mode
			if(OEM.LOG) console.log("Quit application");
			if(this.platform==="tizen") {
				tizen.application.getCurrentApplication().exit();
			} else if(this.platform==="bb10") {
				blackberry.app.exit();
			} else if((this.platform==="android" || this.platform==="iphone") && !this.hosted) {
				navigator.app.exitApp();
			} else {
				window.close();
			}
		}
	}

	// more platform specific functions here
}
