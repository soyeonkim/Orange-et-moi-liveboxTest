var OEM = OEM || {};
OEM.widgetInitModel = {

	// @todo rewrite the proxy functionality
	url: undefined,
 
	preferenceOverride: "mesnumérospréférés",
	customerOverride: "POSTPAID",
	deviceOverride: "smartphone",

	fetchLoaded: false,
	cacheLoaded: false,
	valid: false,
	upgradeAction: false,
	modelset :{ },
	//access :  { },

	initialize: function() {
		console.log("initial");
		this.url = OEM.widgetPlatform.urlPrefixInit();
	//	this.set("online", false);
 
	},

	// called only if the fetch from the main source has failed
	loadCachedModel: function() {
		if(this.fetchLoaded) return; // pointless if we have the real deal

		var cached = this.unserialize();
		if(cached && cached.data) {
			cached.data = JSON.parse(cached.data);
			//this.set(this.parse(cached.data, null, true));
			cached.data = this.parse(cached.data, null, true);
			this.cacheDate = new Date(cached.date);
			this.change();
			this.cacheLoaded = true;
			if(OEM.LOG) console.log("init trigger ");
			// trigger an access update for the cache loaded version
			//--this.trigger("init:accessUpdate", cached.data.access);
			OEM.widgetSuiviConsoModel.accessRightsChanged(cached.data.access);
		}
	},

	// set the datatype to xml
	fetch: function(successCallback, errorCallback) {
		//if(OEM.LOG) console.log("init fetch");
		if(OEM.LOG) console.log("init fetch, url:"+ this.url);

	    //	if(!options) (options = {});
		//options.beforeSend = OEM.widgetPlatform.addRequestHeaders;
		//options.dataType="xml";
		this.valid = false;
		
		var fetchurl =  this.url;
		//Backbone.Model.prototype.fetch.call(this, options);
		// if(OEM.LOG) console.log("init fetch end");
		
		/*$.ajaxSetup({
			url:this.url,
			type: "GET",
			dataType:"xml",
			beforeSend:function(xhr) {
			OEM.widgetPlatform.addRequestHeaders(xhr);
			},
			success:function( data, status, xhr ) {
				if(OEM.LOG) console.log("textStatus: "+status);
				this.parse(data.xhr);
			},
			error:function( xhr, status, errorMessage )  {
				if(OEM.LOG) console.log("error: "+ xhr.status);
			}
			
		});
		*/
	//	var _ajaxTimeout = 10000;		// 20s
	//	$.ajaxSetup( { timeout: _ajaxTimeout } );
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
		if(OEM.LOG) console.log("init parse called: "+response);
		var that = this;

		var message;
		if(!alreadyJson || alreadyJson !== true) {
			message = $.xml2json(response, true);
			this.fetchLoaded = true;
		// false state is the result of a load from localstorage
		// the data is already json and does not need to be loaded
		} else {
			if(OEM.LOG) console.log("alreadyJson ");
			message = response;
		}

		// chack if the upgrade tag is present and set flag
		if(message.version !== undefined) {
			this.upgradeAction = true;
		}

		if(message.status === undefined ||
				message.status.length < 1 ||
				message.status[0].code === undefined) {
			if(OEM.LOG) console.log("init status message missing - message not valid");
			// we do nothing here just return the data as is and leave
			// valid set to false
			return message;
		}

		// custom error from the server
		if(message.status[0].code[0].text == 205) {
			if(OEM.LOG) console.log("205 ");
			var customMessage = message.status[0].message[0].text;
			if(OEM.LOG) console.log("Custom server error:"+ customMessage);
	//		var model = new Backbone.Model();
	//		model.set("customMessage", customMessage);
	//		this.trigger("init:customquiterror", model);
			return message;
		}

		// check if response is ok
		if((message.status[0].code[0].text >= 200 &&
				message.status[0].code[0].text <= 204) &&
				message.content.length === 1) {
				this.valid = true;
				if(OEM.LOG) console.log("200 ");

			if(alreadyJson !== true) {
				if(OEM.LOG) console.log("200 :!alreadyJson/"+alreadyJson);
				if(message.status[0].code[0].text > 200 && message.status[0].code[0].text < 204) {
					if(this.cacheLoaded) {
						if(OEM.LOG) console.log("Response 201-203 and cached, use previous customer and device types and continue");
						//message.content = this.get("content");
						if(!message.content) message.content = []; // create content if not exist
						if(!message.content[0]) message.content[0] = {}; // create empty content object if not exist
						message.content[0].customerType = this.get("content")[0].customerType;
						message.content[0].deviceType = this.get("content")[0].deviceType;
						message.content[0].customerProfile = this.get("content")[0].customerProfile;
					} else {
						if(OEM.LOG) console.log("Response 201-203 and no cache, response is invalid");
						this.valid = false;
						return message;
					}
				}

				var customerType = message.content[0].customerType[0].text;
				var deviceType = message.content[0].deviceType[0].text;

				// json convertor has thrown away the access ids need to get them back
				// also magic numbers is always disabled we need workaround for this
				// rule is: if the user is on a postpaid contract and has a smartphone
				// turn it on
				// obviously if we are loading this from the cache is has already been done
				var access = {};
				$(response).find('access').find('subitem').each(function (index)
				{
					var id = this.attributes[0].value;
					var accessValue = $(this).contents()[0].data;
					if(id == that.preferenceOverride &&
										customerType == that.customerOverride &&
										deviceType == that.deviceOverride) {
						accessValue = "1";
					}
					if( id == "suiviconso" ) {
						console.log("suiviconso/ accessValue:"+accessValue);
					OEM.app.accessSuiviconso = accessValue;
					}
					access[id] = accessValue;
					
					//console.log("access[id]:"+this.access[id]+"id:"+id+"/ accessValue:"+accessValue);
				});
				message.access = access;

				// we have a valid init and we have done all the processing we need
				// we can save it in the cache
				this.serialize(message);
				console.log("message.access: "+message.access);
				//this.trigger("init:accessUpdate", message.access);
				OEM.widgetSuiviConsoModel.accessRightsChanged(message.access);

				// manage the version update process
				if(message.version) {
					var actionType = message.version[0].actionType[0].text;
					this.modelset.version =message.version;
					//model.set(message.version);
					if(actionType==="1") {
						// mandatory update
						if(OEM.LOG) console.log("Mandatory update detected");
						this.modelset.updateMandatory =true;
					//	model.set("updateMandatory", true);
					//	this.trigger("init:updateMandatory", model);
					} else if(actionType==="2") {
						// optional update
						if(OEM.LOG) console.log("Optional update detected");
						this.modelset.updateOptional= true;
					//	model.set("updateOptional", true);
					//	this.trigger("init:updateOptional", model);
					}
				}
			}
		}

		if(OEM.LOG) console.log('InitModel.fetch got response', message);
		return message;
	},

	serialize: function(model) {
		localStorage["OEM.initmodel"] = JSON.stringify(model);
		console.log("OEM.initmodel:"+localStorage["OEM.initmodel"]);
		var date = new Date();
		localStorage["OEM.initmodel.date"] = date;
		console.log("OEM.initmodel serialize:"+localStorage["OEM.initmodel.date"]);
	},

	unserialize: function() {
	
		if(localStorage["OEM.initmodel"] !== undefined ) {
			var result = {data: localStorage["OEM.initmodel"], date:  localStorage["OEM.initmodel.date"]};
			
			console.log("OEM.initmodel:"+result.data);
			console.log("OEM.initmodel unserialize:"+result.date);
			return result;
		}
		else {
			var result = { data: undefined, date: undefined};
			OEM.widgetPlatform.readPreferenceKey("initmodel",  function(cached){
				if(cached && cached.data){
				
					result.data = cached.data;
					result.date = cached.date;
					console.log("OEM.initmodel:"+result.data);
					console.log("OEM.initmodel unserialize:"+result.date);

				}
			});
		 
			console.log("OEM.initmodel:"+result.data);	
			return result;
			 
			
		}
		
		 
	}
}
