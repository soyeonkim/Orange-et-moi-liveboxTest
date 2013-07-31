var VisualGaugeView = Backbone.View.extend({

	resteMode: true,

	animationInterval: 1000,
	animationFormat: 'swing',

	initialize: function() {
		this.template = Handlebars.compile($('#gaugetemplate').html());
		this.template2x1 = Handlebars.compile($('#gaugetemplate2x1').html());
		this.template2x2 = Handlebars.compile($('#gaugetemplate2x2').html());
		
		var savedResteMode = localStorage["OEM.suivoconsomodel.restemode"];
		if(savedResteMode==0) {
			 console.log("resteMode false");
			this.resteMode = false;
		} else {
			// all other cases default to true
			console.log("resteMode true");
			this.resteMode = true;
		}

		if(this.options.restemode!==undefined) {
			this.resteMode = this.options.restemode;
		}
	},

	render: function(eventName) {
		var data = this.model.toJSON();

		this.$el.html(this.template(data));
		var that = this;
		
		var credit3 = '0';
		var credit2 = '0';

		if(data.gauge[0].credit[3]) credit3 = data.gauge[0].credit[3].part;
		if(data.gauge[0].credit[2]) credit2 = data.gauge[0].credit[2].part;
		console.log ("data ||"+ JSON.stringify(data));
		// animate the bar to the target value
		var targetValue = this.resteMode ? credit3 : credit2;
		console.log("credit:"+  this.resteMode+"/value:"+credit3+"/value:"+credit2+"|"+targetValue);
		targetValue = 339 * targetValue / 100;
		targetValue = Math.round(targetValue) + "px";
		this.$el.find('.gauge').animate({
			width: targetValue
		}, this.animationInterval, this.animationFormat);
	},

	setView: function(view) {
		if (view == "2x1") this.template = this.template2x1;
		if (view == "2x2") this.template = this.template2x2;
	}
});
