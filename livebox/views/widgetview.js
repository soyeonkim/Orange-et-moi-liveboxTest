var WidgetView = Backbone.View.extend({

	gaugeViews: [],
	resteMode: true,
	visualGaugeCount: 0,

	events: undefined,

	dialog: undefined,

	initialize: function() {
		this.template = Handlebars.compile($('#widget354x175template').html());

		// get the saved reset mode option set by user
		var savedResteMode = localStorage["OEM.suivoconsomodel.restemode"];
		if(savedResteMode==0) {
			this.resteMode = false;
		} else {
			// all other cases default to true
			this.resteMode = true;
		}
	},

	render: function(eventName) {
		console.log ("WiddgetView.render");
		if(OEM.LOG) console.log("WidgetView.render", data);
		var that = this;
		var data = this.model.toJSON();
		if(!data || !data.status) return true;

		// 8 and 2 status have a message that may be displayed inline
		// TODO: widget errors?
		//if (data.status && ((data.status[0].code[0].text === "8") ||
		//	(data.status[0].code[0].text === "2"))) {
		//	this.prepareMessageInline(data);
		//	return true;
		//}
		
		// TODO other errors
		//if (data.status && data.status[0].code[0].text !== "0") {
		//	return this.prepareErrorTemplate(data);
		//}

		this.$el.html(this.template(data));
		$('#gaugebindingpoint').html("");

		this.visualGaugeCount = 0;
		//for(var idx in OEM.app.views.gauges) {
			var gaugeView = OEM.app.views.gauges[1];
			
			// count the visual gauges as we only want display the toggle reste button
			// if there are any actual visual gauges
			if(gaugeView.visual) ++this.visualGaugeCount;
			gaugeView.render();
			$('#gaugebindingpoint').append(gaugeView.$el);
		//}

		return this;
	},

	// some errors result in the display of a message inline on the suiviconso
	prepareMessageInline: function(data) {
		this.$el.html(this.messageTemplate(data));
	},

	prepareErrorTemplate: function(data) {
		return data;
	},

	prepareBasicBundle: function(bundle, index) {
		return "<p />Basic Index " + index;
	},

	prepareVisualBundle: function(bundle, index) {
		return "<p />Visual Index " + index;
	}
});
