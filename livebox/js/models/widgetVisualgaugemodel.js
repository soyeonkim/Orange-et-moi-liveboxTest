var OEM = OEM || {};

OEM.widgetVisualGaugeModel= {

	url: '',
	title: undefined,
	gauges: undefined, // holds all gauges
	currentGauge: undefined, // holds the gague matching the format
	currentFormat: undefined,
	formats: [],
	credit:[],

	extractGaugeNormal: function(bundleGauge){
		var gauges = bundleGauge.gauge;
		var targetValue = gauges[0].credit[2].part;
		var result=[];
		var label='';
		for(var ii = 0; ii < gauges[0].credit.length; ++ii) {	
			if(gauges[0].credit[ii].type ==='4') {
				label=gauges[0].credit[ii].label;
				break;
			}			 
		}
		result.push({title: label, credit: targetValue});
		
		return result;
	},
	extreactGaugeUnlimited: function (bundleGauge){
		var label= bundleGauge.title[0].text;
		var gauges = bundleGauge.gauge;
		var targetValue = gauges[0].credit[2].part;
		var result=[];
		
		result.push({title: label, credit: targetValue});
		
		return result;
	
	},
	extracGaugePrepaid: function(bundleGauge){
		var anyView =false;
		var targetValue ='0';
		var label ='cr&eacutedit &eacutepuis&eacute';
		for(var ii =0; bundleGauge.text.length; ii++){
			var text = bundleGauge.text[ii].part;
			if(text) {
				for (var jj = 0;text.length;jj++ ){
					if(text[jj].text.indexOf("il vous reste") != -1){
						anyView = true; 
						label = 'cr&eacutedit restant';
						targetValue='100';
						break;
					}
					
				}
			}
			if(anyView == true)break;
		}
		var result=[];
		result.push({title: label, credit: targetValue});
		return result;
 
	},
	
	
	
	initialize: function(bundleGauge) {
		// console.log('visual gauge model is starting', this);
		// here we do changing of the gauge
		this.gauges = bundleGauge.gauge;
		this.title = bundleGauge.title;
		this.credit = this.extractGaugeInfo(this.title,this.gauges);
		//this.formats = this.extractFormats(this.gauges);
		//this.setFormat();
		
		//return this.formats ;
		//this.trigger("change");
		console.log("initialize VisualGaugeModel");
	},
	
	
	
	extractGaugeInfo:function(title, gauges)  {
		var targetValue = gauges[0].credit[2].part;
		var result=[];
		for(var ii = 0; ii < gauges[0].credit.length; ++ii) {	
			if(gauges[0].credit[ii].type ==='4')
			 var label=gauges[0].credit[ii].label;
		}
		
		result.push({title: label, credit: targetValue});
	
		targetValue = 339 * targetValue / 100;
		$(".gauge").animate({
			width: targetValue
		}, 1000, 'swing');	
		$("#title").html(text);
		
		
		                   
		return result;
	 
	},
	


	// given a list of gauges, returns a list of formats inside
	extractFormats: function(gauges) {
		// console.log("incomingzz",gauges);
		console.log("extractFormats VisualGaugeModel");
		var result = [];
		var seen = [];
		for(var ii = 0; ii < gauges[0].credit.length; ++ii) {
			var formats = gauges[0].credit[ii];
			for(var jj = 0; jj < formats.format.length; ++jj) {
				var format = formats.format[jj];
				if($.inArray(format.type, seen) > -1) {
				} else {
					seen.push(format.type);
					result.push({type: format.type, label: format.label, active: false});
				}
			}
		}
		return result;
	},
	

	// given a list of gauges returns a list with only the desired format
	// if no format is defined, the first is used
	extractGauge: function(gauges, desiredFormatType) {
		console.log("extractGauge VisualGaugeModel");
		// we cannot do this shortcut as we need to do a little reformatting
		// if(this.formats.length === 1) return gauges;
		var result = [{boundary: gauges[0].boundary, credit: []}];

		// nowloop through credit, for each credit item make a new one with only
		// the right format and push it into result.credit[]
		for(var ii = 0; ii <  gauges[0].credit.length; ++ii) {
			var existingCredit = gauges[0].credit[ii];
			for(var jj = 0; jj < existingCredit.format.length; ++jj) {
				var format = existingCredit.format[jj];
				if(format.type == desiredFormatType) { // note type conversion
					var newCredit = {label: existingCredit.label,
													type: existingCredit.type,
													part: existingCredit.part};
					newCredit.format = [format];
					// -=IMPORTANT=-
					// this causes a change to the original structure
					// credits are now indexed under their type
					result[0].credit[existingCredit.type] = newCredit;
				}
			}
		}
		return result;
	},


	// sets current currentGauge to be as specified and updates the model
	setFormat: function(format) {
		console.log("setFormat VisualGaugeModel");
		if(format === undefined) {
			// if format is undefined this must be first use, try and use the cached setting
			format = this.formats[0].type; // default to first one in case cached one cant be set
			var cachedFomat = localStorage["OEM.suivoconsomodel.format"];
			for(var jj=0; jj<this.formats.length; ++jj) {
				// ensure cached format is valid
				if(this.formats[jj].type===cachedFomat) {
					format = cachedFomat;
					if(OEM.LOG) console.log("Using cached format setting:"+ format);
					break;
				}
			}
		}

		if(format === this.currentFormat) return false;

		this.currentFormat = format;
		this.currentGauge = this.extractGauge(this.gauges, format);
		// if there are multiple formats this turns on and sets up the buttons
		if(this.formats.length > 1) {
			for(var ii = 0; ii < this.formats.length; ++ii) {
				// set the button position
				if(ii===0) {
					this.formats[ii].position = "left";
				} else if(ii===this.formats.length-1) {
					this.formats[ii].position = "right";
				} else {
					this.formats[ii].position = "middle";
				}

				var label = undefined;
				switch(this.formats[ii].type) {
					case "1":
						label = "en temps";
						break;
					case "2":
						label = "en MMS";
						break;
					case "3":
						label = "en SMS";
						break;
					case "4":
						label = "en data";
						break;
					case "5":
						label = "en Euros";
						break;
					case "6":
						label = this.formats[ii].label;
						break
					default:
						break;
				}
				this.formats[ii].label = label;

				if(this.formats[ii].type == format) {
					this.formats[ii].active = true;
				} else {
					this.formats[ii].active = false;
				}
			}
		//	this.set('boutons', this.formats);
		}
		// if there is one or more formats we need to set the current one up
		if(this.formats.length > 0) {
		//this.set('gauge', this.currentGauge);
		this.gauge = this.currentGauge;
		}

		// update local storage to save latest selected format
		localStorage["OEM.suivoconsomodel.format"] = this.currentFormat;
		return true;
	}
}
