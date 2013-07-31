var WidgetView354x175 = Backbone.View.extend({

	initialize: function() {
		this.template = Handlebars.compile($('#widget354x175template').html());
	},

	render: function(eventName) {
		var that = this;
		var data = this.model.toJSON();
		if(OEM.LOG) console.log("WidgetView354x175.render", data);
		if(!data || !data.status) return true;
		
		// TODO other errors

		this.$el.html(this.template(data));

		this.visualGaugeCount = 0;

		var idx = localStorage.getItem ("gauge_idx");
		if (idx===null) {
			idx = 0;
		}

		var gaugeView = OEM.app.views.gauges[idx];
			
		// count the visual gauges as we only want display the toggle reste button
		// if there are any actual visual gauges
		gaugeView.setView ("2x1");
		gaugeView.render();
		$('#gaugebindingpoint2x1').html("");
		$('#gaugebindingpoint2x1').append(gaugeView.$el);

		idx++;
		idx = idx % OEM.app.views.gauges.length;
		if (idx === OEM.app.views.gauges.length) idx=0;
		
		localStorage.setItem("gauge_idx", idx);
		
		return this;
	}
});