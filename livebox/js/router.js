// Mapping urls into views and actions
var AppRouter = Backbone.Router.extend({
	splash: undefined,

	initialize: function(app) {
		this.app = app;

		// bind the back button
		var that = this;
	},

	routes: {
		"": "showWidget",
	},

	getParameters: function () {
		var searchString = window.location.search.substring(1), params = searchString.split("&"), info = {};
		
		if (OEM.LOG) console.log ("Search string: "+window.location.search.substring(1));

		for (var i=0; i < params.length; i++) {
			var val = params[i].split("=");
			info[unescape(val[0])] = unescape(val[1]);
		}
		
		return info;
	},

	showWidget: function() {
		var gInfo = this.getParameters();
		
		//if (OEM.LOG) console.log ("load type: " + gInfo.type);
		if(gInfo.type == undefined)  {
			gInfo.width=354;
			gInfo.height=354;
		}
		var widget = "widget"+gInfo.width+"x"+gInfo.height;
		var view = widget+"view";

		if (OEM.LOG) console.log ("Setting view: "+view);
		
		this.setView(view);
		this.app.views[widget].render();
	},

	showConnectionError: function(title, template, quit) {
		// TODO : errors
//		var that = this;
//		that.dialog = new DialogView();
//		that.dialog.on("dialog:close", function(msg) {
//			delete that.dialog;
//			that.dialog = null;
//
//			if(quit) OEM.platform.quitApp();
//		});
//
//		var dialogtemplate = quit ? "#quitdialogtemplate" : "#suividialogtemplate";
//		that.dialog.show(title, dialogtemplate, template);
	},

	hideAll: function() {
		$("#widget175x175view").hide();
		$("#widget354x175view").hide();
		$("#widget354x354view").hide();
	},

	setView: function(viewID) {
		this.hideAll();
		//if(OEM.LOG) console.log("AppRouter.setView: " + viewID);
		$("#" + viewID).show();
	}
});
