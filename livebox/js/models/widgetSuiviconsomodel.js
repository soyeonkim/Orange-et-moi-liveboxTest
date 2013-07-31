var OEM = OEM || {};
OEM.widgetSuiviConsoModel = {

	url: undefined,
	originalUrl: undefined,

	cacheLoaded: false,
	fetchLoaded: false,
	valid: false,
	// message: false,
	tariffInfo: false,
	cacheDate: null,
	optionOn: false,
	
	gaugeInfo:[],

	initialize: function() {
		console.log("initial");
		this.url = OEM.widgetPlatform.urlPrefixSuivi();
		this.originalUrl = this.url;
		console.log("initialize SuiviConsoModel");
	},

	// informs us of stuff being on or off in initmodel
	accessRightsChanged: function(accessUpdate) {
		console.log("accessRightsChanged SuiviConsoModel");
		if(accessUpdate['mesoptions'] === "1") {
			//console.log("options on");
			this.optionOn = true;
		} else {
			//console.log("options off");
			//@TODO - this should hide the options tab
			this.optionOn = false;
		}

	},

	// generally called right after the model is instantianed
	// the cached model will be shown right away and then we will do a fetch
	loadCachedModel: function(callback) {
		console.log("loadCachedModel SuiviConsoModel");
		var that = this;
		var loadFuncCallback = function (cached) {
			if (OEM.LOG) console.log ("checking cache");
			if(cached && cached.data && cached.data.length && cached.data.length > 10) {
				if (OEM.LOG) console.log ("cached");
				cached.data = JSON.parse(cached.data);				
				that.set(that.parse(cached.data, null, true));				
				that.cacheDate = new Date(cached.date);				
				that.setFormattedCacheDate(that.cacheDate);
				that.change();
				that.cacheLoaded = true;
				if (OEM.LOG) console.log ("using the cache");
			} else {
				if (OEM.LOG) console.log ("not using the cache");
			}

			if (callback) {
				callback();
			}
		};

		that.unserialize(loadFuncCallback);
	},

	addZero: function(number, length) {
		if(!length) length=2; // default to 2 characters
		var str = '' + number;
		while (str.length < length) {
			str = '0' + str;
		}
		
		return str;
	},

	setFormattedCacheDate: function(date) {
		if(date === null) return;
		this.formattedCacheDate = this.addZero(date.getDate()) + "/" +
									(this.addZero(date.getMonth()+1)) + "/" +
									this.addZero(date.getFullYear()) + " à " +
									this.addZero(date.getHours()) + "h"+
									this.addZero(date.getMinutes());
	},

 
	// set the datatype to xml
	fetch: function(successCallback, errorCallback) {
		if(OEM.LOG) console.log("SuiviConsoModel fetch");
		var fetchurl =  this.url;	
		var that = this;
		$.ajax({
			url: fetchurl,
			type: "GET",
			dataType:"xml",
			beforeSend:function(jqXHR){			
				OEM.widgetPlatform.addRequestHeaders(jqXHR)
			},
			
			success:function( data, textStatus, jqXHR ) {
				if(OEM.LOG) console.log("textStatus: "+textStatus);
				if(OEM.LOG) console.log("data: "+data);
				if(OEM.LOG) console.log("jqXHR: "+jqXHR);
				//this.parse(data,jqXHR,undefined);
				that.parse(data,jqXHR,false);
				
				successCallback();
			},
			error:function( jqXHR, textStatus, errorMessage )  {
				if(OEM.LOG) console.log("error: "+jqXHR.error);
				errorCallback();
			}
		
		});
		

	},

	parse: function(response, xhr, alreadyJson) {

		if(OEM.LOG) console.log('SuiviConsoModel parse');

		var message;
		// true state is the result of a fetch
		// so we convert the xml to json
		if(!alreadyJson || alreadyJson !== true) {
			message = $.xml2json(response, true);
			

		// false state is the result of a load from localstorage
		// the data is already json and does not need to be loaded
		} else {
			message = response;
		}
		if(message.status !== undefined &&
					message.status[0].code !== undefined) {
			var status = message.status[0].code[0].text;
			if(OEM.LOG) console.log("Status Code:" + status);
			// core use case everything is ok
			if(status === "0") {
				this.valid = true;
				if(!alreadyJson || alreadyJson !== true) {
					console.log("fetchLoaded = true");
					this.fetchLoaded = true;
				}
				this.tariffInfo = false; // reset the flag to indicate if tariff info is available
				console.log("this.tariffInfo = false;");
			//	this.clear(); // clean out what is currently stored
			// something wrong, upgrade(8) or error(5)
			// payload is not valid so we want to display error inline
			} else if(status === "8" || status === "2") {
				this.displayMessage = true;
				if(status === "8") {
					this.clearCache();
					// for status code 8 we still want to cache the message
					this.fetchLoaded = true;
				} else {
					// status===2
					return message;
				}
			} else if(status === "5") {
				if(!this.cacheLoaded && !this.fetchLoaded) {
				//	this.set("customMessage", message.status[0].message[0].text);
				//	this.trigger("suiviconso:customquiterror", this);
				}
				return message;
			}
		} else {
			if(OEM.LOG) console.log("suivi status message missing - message not valid");
			return message;
		}

		///////////////////////////////////////////////////////////////////////////////////////////////////
		
		//if(this.gaugeContext && this.gaugeFunction) {
		//	console.log("this.gaugeContext :"+this.gaugeContext );
		//	console.log("this.gaugeFunction :"+this.gaugeFunction);
			
	//	var gauges = this.buildGaugeModels(message);
		
		this.gaugeInfo= this.buildGaugeModels(message);
		//	if(alreadyJson !== true) {
		//		var others = this.buildOptions(message);
		//		message.others = others;
		//	}
		//	this.gaugeFunction.call(this.gaugeContext, gauges);
	//	}
		//////////////////////////////////////////////////////////////////////////////////////////////////////
		// process the over tag and rebuild content to be more suitable for display
	//	if(!alreadyJson && message.over) {
	//		var over = this.buildHorsForfait(message);

			// replace the original over tag with the new one
	//		message.over = over;
	//	}

 
		if(this.fetchLoaded || !OEM.platform.isWidget) this.serialize(message);

		if(OEM.LOG) console.log('SuiviConsoModel.fetch got response', message);

		var imsi = '';
		var plan = '';
		try {
			imsi = message.customer[0].custMsisdn[0].text;
			plan = message.bundles[0].bundle[0].title[0].text;
			if(OEM.LOG) console.log('imsi'+ imsi);
			if(OEM.LOG) console.log('plan'+ plan);
		}
		catch(err) {
			if(OEM.LOG) console.log("didn't have imsi or plan", err);
		}
		//this.trigger("suiviconso:planDetails", {planName: plan, planImsi: imsi});


		return message;
	},
 
	// this instantiates a series of new gauge models from the base model
	buildGaugeModels: function(message) {
	//	if(OEM.LOG) console.log("buildGaugeModels"+ JSON.stringify(message));
		var gauges = [];
		if(message.bundles === undefined || message.bundles.length !== 1) return gauges;

		for(var index=0; index < message.bundles[0].bundle.length; ++index) {
			var gauge;
			if(message.bundles[0].bundle[index].displayGauge === '1') {
				console.log("VisualGaugeModel:"+JSON.stringify(message.bundles[0].bundle[index]));
				if (message.bundles[0].bundle[index].id === '1' ){		//Nominal case: post paid, CMO, Sosh
					gauge = OEM.widgetVisualGaugeModel.extractGaugeNormal(message.bundles[0].bundle[index]);
					console.log("Normal:"+JSON.stringify(gauge));
					gauges = gauge;
					return gauges;
				}
				else {							
					if(message.customer[0].custOfferType[0].text=='postpaid'){ //unlimited post paid case
						gauge = OEM.widgetVisualGaugeModel.extreactGaugeUnlimited(message.bundles[0].bundle[index]);
						console.log("unlimited:"+JSON.stringify(gauge));
						gauges = gauge;
						return gauges;
					} 
				}	
				
			}
			else {
				if(message.customer[0].custOfferType[0].text=='prepaid'){		//unlimited post paid case
					gauge = OEM.widgetVisualGaugeModel.extracGaugePrepaid (message.bundles[0].bundle[index]);
					console.log("prepaid:"+JSON.stringify(gauge));
					gauges = gauge;
					return gauges;
					 
				}
				else if(message.customer[0].custOfferType[0].text=='enterprise'){	//other cases
					//gauges = gauge;
					return gauges;
				}
				else if(message.customer[0].custOfferType[0].text=='postpaid') {	//other cases
					if(message.bundles[0].bundle.length == 1) {
						
					}
				}
 
			}
 
		
		}
		return gauges;
	},

	 

	clearCache: function() {
		localStorage["OEM.suivoconsomodel"] = "";
		localStorage["OEM.suivoconsomodel.date"] = "";

		// need to delay this call this as we need to ensure the event is triggered
		// after the suivi has finished processing
		var that = this;
		//setTimeout(function() {
		//	that.trigger("suiviconso:cachecleared");
		//}, 0);
	},

	serialize: function(model) {
		if (OEM.LOG) console.log ("serialize");
		var data = JSON.stringify(model);
		localStorage["OEM.suivoconsomodel"] = data;

		if(localStorage["OEM.initmodel"]){
			var initModel = JSON.parse(localStorage["OEM.initmodel"]);
		}
		
		if(initModel){
		var initSessionDate = initModel.session[0].sessiontime[0].text;
		console.log("initSessionDate :" +initSessionDate);
		var date = new Date(initSessionDate);
		if( isNaN(date.valueOf()) ) {
			// the date string from the server was not accepted
			if( initSessionDate.length===19 ) {
				// we have the right length the format yyyy-mm-dd hh:mm:ss
				// which is what we expect from the server
				date.setFullYear(initSessionDate.substr(0,4));
				date.setMonth(initSessionDate.substr(5,2)-1);
				date.setDate(initSessionDate.substr(8,2));
				date.setHours(initSessionDate.substr(11,2));
				date.setMinutes(initSessionDate.substr(14,2));
				date.setSeconds(initSessionDate.substr(17,2));
			} else {
				// if all else fails just use the local time of client
				if(OEM.LOG) console.log("Got date from client");
				date = new Date();
			}
		}
		
		localStorage["OEM.suivoconsomodel.date"] = date;		
		this.setFormattedCacheDate(date);
		}
	//	OEM.platform.savePreferenceKey("suivoconsomodel",data);
	//	OEM.platform.savePreferenceKey("suivoconsomodel.date",date.toString());

		//OEM.platform.saveToFile(data, initSessionDate);
	},

	unserialize: function(callback) {
		if(localStorage["OEM.suivoconsomodel"] !== undefined ) {
			var result = {data: localStorage["OEM.suivoconsomodel"], date:  localStorage["OEM.suivoconsomodel.date"]};
	        callback(result);
		}
		else {
			OEM.widgetPlatform.readPreferenceKey("suivoconsomodel", callback);
		}
		/*
		if (OEM.platform.isWidget) {
		//	OEM.platform.readFromFile(callback);
			OEM.platform.readPreferenceKey("suivoconsomodel", callback);
		//	OEM.platform.readPreferenceKey("suivoconsomodel_test",callback);
		} else {
			var result = {data: localStorage["OEM.suivoconsomodel"], date:  localStorage["OEM.suivoconsomodel.date"]};
	        callback(result);
		}
		*/	
	}
}
