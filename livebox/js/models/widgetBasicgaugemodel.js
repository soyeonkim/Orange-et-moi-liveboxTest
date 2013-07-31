var OEM = OEM || {};

OEM.widgetBasicGaugeModel= {

	url: '',

	initialize: function(bundleGauge) {		
	//	var textParts = this.get("text");
		var textParts = bundleGauge.text
		var newText = this.buildTextParts(textParts);

		// -=IMPORTANT=-
		// this causes a change to the original structure
		// text parts are now indexed under their type
		//this.set("text", newText);
	},

	buildTextParts: function(message) {
		var result = {};

		if(message && message[0].part) {
			result["parts"] = {};
			// loop through all the text parts and create an object that uses the part type as a property
			for(var ii=0; ii<message[0].part.length; ++ii) {
				var part = message[0].part[ii];
				var textPart = part.text ;
				result.parts[part.type] = textPart;
			}
		}

		return result;
	},

	// empty
	fetch: function(options) {
	},

	// empty
	parse: function(response) {
	}

}
