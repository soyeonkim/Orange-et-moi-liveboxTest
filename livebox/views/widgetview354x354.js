var WidgetView354x354 = Backbone.View.extend({

	initialize: function() {
		this.template = Handlebars.compile($('#widget354x354template').html());
	},

	render: function(eventName) {
		var that = this;
		var data = this.model.toJSON();
		if(OEM.LOG) console.log("WidgetView354x354.render", data);
		if(!data || !data.status) return true;
		
		// TODO other errors

		this.$el.html(this.template(data));

		var idx = localStorage.getItem ("gauge_idx");
		if (idx===null) {
			idx = 0;
		}

		var gaugeView = OEM.app.views.gauges[idx];
			
		// count the visual gauges as we only want display the toggle reste button
		// if there are any actual visual gauges
		gaugeView.setView ("2x2");
		gaugeView.render();
		$('#gaugebindingpoint2x2').html("");
		$('#gaugebindingpoint2x2').append(gaugeView.$el);
		//console.log("gaugebindingpoint2x2 /"+gaugeView.$el);

		idx++;
		idx = idx % OEM.app.views.gauges.length;
		if (idx === OEM.app.views.gauges.length) idx=0;

		localStorage.setItem("gauge_idx", idx);
		
		return this;
	}
});