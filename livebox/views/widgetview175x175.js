var WidgetView175x175 = Backbone.View.extend({

	initialize: function() {
		this.template = Handlebars.compile($('#widget175x175template').html());
	},

	render: function(eventName) {
		var that = this;
		var data = this.model.toJSON();
		if(OEM.LOG) console.log("WidgetView175x175.render", data);
		if(!data || !data.status) return true;

		// TODO errors

		this.$el.html(this.template(data));

		this.visualGaugeCount = 0;

		// Check with gauge to show
		var idx = localStorage.getItem ("gauge_idx");
		if (idx===null) {
			idx = 0;
		}

		var gaugeView = OEM.app.views.gauges[idx];
			
		// count the visual gauges as we only want display the toggle reste button
		// if there are any actual visual gauges
		gaugeView.render();
		$('#gaugebindingpoint').html("");
		$('#gaugebindingpoint').append(gaugeView.$el);

		idx = (idx+1) % OEM.app.views.gauges.length;
		if (idx == OEM.app.views.gauges.length-1) idx=0;
		
		localStorage.setItem("gauge_idx", idx);
		
		return this;
	}
});