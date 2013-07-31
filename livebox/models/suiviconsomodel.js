var OEM = OEM || {};
OEM.suiviConsoModel = {

	url: undefined,
	originalUrl: undefined,

	cacheLoaded: false,
	fetchLoaded: false,
	valid: false,
	// message: false,
	tariffInfo: false,
	cacheDate: null,
	optionOn: false,

	initialize: function() {
		this.url = OEM.platform.urlPrefixSuivi();
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

	setGaugeCallback: function(gaugeContext, gaugeFunction) {
		this.gaugeContext = gaugeContext;
		this.gaugeFunction = gaugeFunction;
	},




	// set the datatype to xml
	fetch: function(options) {
		if(OEM.LOG) console.log("SuiviConsoModel fetch");
		if(!options) (options = {});
		options.beforeSend = OEM.platform.addRequestHeaders;
		options.complete = OEM.platform.getResponseHeaders;
		options.dataType="xml";
		Backbone.Model.prototype.fetch.call(this, options);
		//if(OEM.LOG) console.log("SuiviConsoModel fetch end");

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
					this.set("customMessage", message.status[0].message[0].text);
					this.trigger("suiviconso:customquiterror", this);
				}
				return message;
			}
		} else {
			if(OEM.LOG) console.log("suivi status message missing - message not valid");
			return message;
		}

		if(this.gaugeContext && this.gaugeFunction) {
			console.log("this.gaugeContext :"+ (this.gaugeContext.toSource()) );
			console.log("this.gaugeFunction :"+this.gaugeFunction);
			var gauges = this.buildGaugeModels(message);
			if(alreadyJson !== true) {
				var others = this.buildOptions(message);
				message.others = others;
			}
			if(OEM.LOG) console.log("gaugeContext"+ JSON.stringify(gauges));
			this.gaugeFunction.call(this.gaugeContext, gauges);
		}

		// process the over tag and rebuild content to be more suitable for display
		if(!alreadyJson && message.over) {
			var over = this.buildHorsForfait(message);

			// replace the original over tag with the new one
			message.over = over;
		}

		// add a flag to indicate if options are available
		message.optionOn = this.optionOn;

		// add a flag to indicate if extra tariff info is available
		message.tariffInfo = this.tariffInfo;
		if(this.fetchLoaded || !OEM.platform.isWidget) this.serialize(message);

		if(OEM.LOG) console.log('SuiviConsoModel.fetch got response', message);

		var imsi = '';
		var plan = '';
		try {
			imsi = message.customer[0].custMsisdn[0].text;
			plan = message.bundles[0].bundle[0].title[0].text;
		//	if(OEM.LOG) console.log('imsi'+ imsi);
		//	if(OEM.LOG) console.log('plan'+ plan);
		}
		catch(err) {
			if(OEM.LOG) console.log("didn't have imsi or plan", err);
		}
		this.trigger("suiviconso:planDetails", {planName: plan, planImsi: imsi});


		return message;
	},

	addZero: function(number, length) {
		if(!length) length=2; // default to 2 characters
		var str = '' + number;
		while (str.length < length) {
			str = '0' + str;
		}

		return str;
	},

	buildOptions: function(message) {
		var result = {};
		var subPart = false;
		// loop through the sets of others
		// there are generally 1 - 2 with
		// type 1 === mes services et options
		// type 2 === grerer mes options
		if(message.others && message.others[0] && message.others[0].set) {
			for(var ii = 0; ii < message.others[0].set.length; ++ii) {
				var set = message.others[0].set[ii];
				if(!set) continue;
				if(!set.text) continue;
				var newSet = {type: set.type, date: set.date, text: []};
				// loop through the texts in this other
				for(var jj = 0; jj < set.text.length; ++jj) {
					var containsParts = false;
					var text = set.text[jj];
					var newText = {part: {}};
					if(text && text.part[0]) {
						for(var kk = 0; kk < text.part.length; ++kk) {
							var part = text.part[kk];
							newText.part[part.type] = part;
							containsParts = true;

							// if there is a text part 5, then there is extra tariff info
							if(part.type==='5') {
								this.tariffInfo = true;
							}
						}
					}
					if(containsParts) newSet.text.push(newText);
				}
				if(result[newSet.type] === undefined) {
					result[newSet.type] = [newSet];
				} else {
					var multiSet = [result[newSet.type][0], newSet];
					result[newSet.type] = multiSet;
				}
			}
		}

		return result;
	},

	// this instantiates a series of new gauge models from the base model
	buildGaugeModels: function(message) {
		if(OEM.LOG) console.log("buildGaugeModels"+ JSON.stringify(message));
		var gauges = [];
		if(message.bundles === undefined || message.bundles.length !== 1) return gauges;
		for(var index=0; index < message.bundles[0].bundle.length; ++index) {

			var gauge;
			if(message.bundles[0].bundle[index].displayGauge === '1') {
				console.log("VisualGaugeModel:"+message.bundles[0].bundle[index]);
				//gauge = new VisualGaugeModel(message.bundles[0].bundle[index]);
			} else {
				console.log("BasicGaugeModel:"+message.bundles[0].bundle[index]);
				//gauge = new BasicGaugeModel(message.bundles[0].bundle[index]);
				if(index===0 && message.customer[0].msisdnValidityDate) {
					// for the first gauge only, the last element should be the MSISDN validity date
					//gauge.set("msisdnValidityDate", message.customer[0].msisdnValidityDate[0].text);
					console.log("msisdnValidityDate:"+message.customer[0].msisdnValidityDate[0].text);
				}
			}

			// if the bundle has the additional info tag, then there is extra tariff info
			if(message.bundles[0].bundle[index].additionalInfo) {
				this.tariffInfo = true;
			}

			gauges.push(gauge);
		}
	return gauges;
	},

	buildHorsForfait: function(message) {
		var content = message.over[0];
		var over = {};
		over["date"] = content.date;
		over["globalOverPrice"] = content.globalOverPrice;
		var categoryCount = 0;
		if(content && content.categoriesOver[0] && content.categoriesOver[0].categoryOver) {
			categoryCount = content.categoriesOver[0].categoryOver.length;
		}
		over["categoryCount"] = categoryCount;

		for(var ii=0; ii<categoryCount; ++ii) {
			var category = content.categoriesOver[0].categoryOver[ii];
			if(category && category.type) {
				if(category.type==="M_4") {
					over["mobile"] = category;
					// now modify the string to display strings
					// go through all the overFrom tags
					var overFromCount = 0;
					if(category.overFrom) {
						overFromCount = category.overFrom.length;
					}

					for(var jj=0; jj<overFromCount; ++jj) {
						var overFromTypeCount = 0;
						if(category.overFrom[jj].overFromType) {
							overFromTypeCount = category.overFrom[jj].overFromType.length;
						}

						for(var kk=0; kk<overFromTypeCount; ++kk) {
							switch(category.overFrom[jj].overFromType[kk].id) {
							case "N01":
							case "R01": {
								// convert quanity value from seconds to string xh yymin zzs
								var value = category.overFrom[jj].overFromType[kk].quantity[0].text; // value in seconds
								var sec = value % 60;
								var min = Math.floor(value/60);
								var hour = Math.floor(min/60);
								min = min % 60;
								var timeStr = hour + "h " + this.addZero(min) + "min " + this.addZero(sec) + "s";
								category.overFrom[jj].overFromType[kk].quantity[0].text = timeStr;
							} break;
							case "N05": 
							case "R03": {
								// convert quanity value from kilobytes to megabytes
								var megaByteStr = (category.overFrom[jj].overFromType[kk].quantity[0].text/1000).toFixed(1) + " Mo";
								megaByteStr = megaByteStr.replace(".", ",");
								category.overFrom[jj].overFromType[kk].quantity[0].text = megaByteStr;
							} break;
							default:
								break;
							}
						}
					}
				} else if(category.type==="VCM_2") {
					over["voip"] = category;
				}
			}
		}

		return over;
	},

	clearCache: function() {
		localStorage["OEM.suivoconsomodel"] = "";
		localStorage["OEM.suivoconsomodel.date"] = "";

		// need to delay this call this as we need to ensure the event is triggered
		// after the suivi has finished processing
		var that = this;
		setTimeout(function() {
			that.trigger("suiviconso:cachecleared");
		}, 0);
	},

	serialize: function(model) {
		if (OEM.LOG) console.log ("serialize");
		var data = JSON.stringify(model);
		localStorage["OEM.suivoconsomodel"] = data;
		
		var initSessionDate = OEM.app.models.init.get('session')[0].sessiontime[0].text;
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
		OEM.platform.savePreferenceKey("suivoconsomodel",data);
		OEM.platform.savePreferenceKey("suivoconsomodel.date",date.toString());

		//OEM.platform.saveToFile(data, initSessionDate);
	},

	unserialize: function(callback) {
		if (OEM.platform.isWidget) {
		//	OEM.platform.readFromFile(callback);
			OEM.platform.readPreferenceKey("suivoconsomodel",callback);
		//	OEM.platform.readPreferenceKey("suivoconsomodel_test",callback);
		} else {
			var result = {data: localStorage["OEM.suivoconsomodel"], date:  localStorage["OEM.suivoconsomodel.date"]};
	        callback(result);
		}
	}
}
