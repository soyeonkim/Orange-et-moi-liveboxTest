var OEM = OEM || {};
OEM.widget = OEM.widget || {};
OEM.widget.tizen = OEM.widget.tizen || {
	
	setPreferenceKey: function(key, modelData){
	//	if (OEM.LOG)console.log ("preferences.setItem "+key + " message: "+modelData);
		window.widget.preferences.setItem(key, modelData);
		
	},
	getPreferenceKey: function(key,callback){
		var result = { data: null, date: null};
		result.data = window.widget.preferences.getItem(key);
		//if (OEM.LOG)console.log ("preferences.getItem "+key + " message: "+result);
		var SessionDate =  window.widget.preferences.getItem(key+".date");	
	 	var date = new Date(SessionDate);
		if( isNaN(date.valueOf()) ) {
			// the date string from the server was not accepted
			if( SessionDate.length===19 ) {
				if(OEM.LOG) console.log("SessionDate.length===19 ");
				// we have the right length the format yyyy-mm-dd hh:mm:ss
				// which is what we expect from the server
				date.setFullYear(SessionDate.substr(0,4));
				date.setMonth(SessionDate.substr(5,2)-1);
				date.setDate(SessionDate.substr(8,2));
				date.setHours(SessionDate.substr(11,2));
				date.setMinutes(SessionDate.substr(14,2));
				date.setSeconds(SessionDate.substr(17,2));
			} else {
				// if all else fails just use the local time of client
				if(OEM.LOG) console.log("Got date from client");
				date = new Date();
			}
		}
		result.date = date;
		callback(result);
	},
	
	
	
	
	dump: function (dir, filename, what) {
		var fileDump;

		if (dir.isFile) {
			// Overwrite it
			fileDump = dir;
		} else {
			fileDump = dir.createFile(filename);
		}

		if (fileDump != null) {
			var openSuccess = function (stream) {
				try {
					stream.write (what);
					stream.close ();
				} catch (err) {
					console.log ("Err: "+err.name + " message: "+err.message);
				}
			};

			fileDump.openStream ("w", openSuccess, function (err) { console.log ("error writing: " + err.message);});
		}
	},

	dumpModel: function(modelData, initSessionDate) {
		var that = this;
		// Store data in the shared path
		var resolveSuccess = function (dir) {
			var foundModel = false;
			var foundModelDate = false;

			var listFilesSuccess = function (files) {
				for (var i=0; i<files.length; i++) {
					if (files[i].isFile && files[i].name == "suiviconsomodel.dump") {
						// TODO: check creation date
						//dir.deleteFile (files[i].fullPath);
						if (OEM.LOG) console.log (files[i].name + " creation date: "+files[i].created);
						if (OEM.LOG) console.log ("suiviconsomodel: "+modelData);
						foundModel = true;
						that.dump (files[i], null, modelData);
					}

					if (files[i].isFile && files[i].name == "suiviconsomodeldate.dump") {
						// TODO: check creationdate
						//dir.deleteFile (files[i].fullPath);
						if (OEM.LOG) console.log (files[i].name + " creation date: "+files[i].created);
						foundModelDate = true;
						that.dump (files[i], null, initSessionDate);
						if (OEM.LOG) console.log ("suiviconsomodeldate: "+initSessionDate);
					}
				}

				if (!foundModel) {
					that.dump (dir, "suiviconsomodel.dump", modelData);
					if (OEM.LOG) console.log ("C:suiviconsomodel: "+modelData);
				}

				if (!foundModelDate) {
					that.dump (dir, "suiviconsomodeldate.dump", initSessionDate);
					if (OEM.LOG) console.log ("C:suiviconsomodeldate: "+initSessionDate);
				}
			};

			dir.listFiles(listFilesSuccess);
		};

		tizen.filesystem.resolve(
			'wgt-private',
			resolveSuccess,
			function (err) { console.log (err.message);},
			"rw"
		);
	},

	computeNextUpdateTime: function() {
		var addDays = function (date, days) {
			return new Date (
					date.getFullYear(),
					date.getMonth(),
					parseInt (date.getDate(), 10) + parseInt(days, 10),
					date.getHours(),
					date.getMinutes(),
					date.getSeconds()
				);
		}

		var computeRandomDate = function (dateMin, min, max) {
			var range = max - min;
			var randomHour = Math.floor((Math.random()*range)+parseInt(min,10));
			var randomMinute = Math.floor((Math.random()*60));
			var randomSecond = Math.floor((Math.random()*60));

			return new Date (dateMin.setHours (randomHour, randomMinute, randomSecond));
		}

		var now = new Date();

		// Compute when next update time is (now + retryAfter)
		var nextUpdateTime = new Date(now.getTime() + parseInt(localStorage['widget.Retry-After'],10)*1000);

		var updateTimeSlot = localStorage['widget.X_AMP_AUTO_UPDATE_TIME_SLOT'].split("-");
		updateTimeSlotMin = updateTimeSlot[0];
		updateTimeSlotMax = updateTimeSlot[1];

		now.setMinutes(0);
		now.setSeconds(0);

		now.setHours(updateTimeSlotMin);
		var updateDateSlotMin = new Date(now);
		localStorage['widget.updateTimeSlotMin'] = updateDateSlotMin;

		now.setHours(updateTimeSlotMax);
		var updateDateSlotMax = new Date(now);
		localStorage['widget.updateTimeSlotMax'] = updateDateSlotMax;

		// Get a random time between min and max slots
		var randomDate = computeRandomDate(updateDateSlotMin, updateTimeSlotMin, updateTimeSlotMax);

		// We just made a request for today, next one has to be tomorrow within the timeslot
		localStorage['widget.nextUpdateTime'] = addDays(randomDate, 1);
		if (OEM.LOG) console.log ("nextUpdateTime around: "+localStorage['widget.nextUpdateTime']);
	},

	retrieveModel: function (callback) {
		var result = { data: null, date: null};
		
		var handleError = function(err) {
			if(OEM.LOG) console.error("Retrieve model from file error:", err);
			callback(result);
		};

		// Store data in the shared path
		var resolveSuccess = function (dir) {
			var modelFileDump;
			var modelFileDateDump;

			var listFilesSuccess = function (files) {
				for (var i=0; i<files.length; i++) {
					if (files[i].isFile && files[i].name === "suiviconsomodel.dump") {
						// TODO: check date
						modelFileDump = files[i];
					}

					if (files[i].isFile && files[i].name === "suiviconsomodeldate.dump") {
						modelFileDateDump = files[i];
					}
				}

				if (modelFileDump !== "undefined") {
					var openSuccess = function (stream) {
						try {
							result.data = stream.read (modelFileDump.fileSize);
							stream.close ();

							if (OEM.LOG) console.log ("read from dump file: "+result.data);
							var openDateSuccess = function (streamDate) {
								try {
									var initSessionDate = streamDate.read (modelFileDateDump.fileSize);
									streamDate.close ();
									if (OEM.LOG) console.log ("read from dump date file: "+initSessionDate);

									var date = new Date(initSessionDate);
									if( isNaN(date.valueOf()) ) {
										// the date string from the server was not accepted
										if( initSessionDate.length===19 ) {
											if(OEM.LOG) console.log("initSessionDate.length===19 ");
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

									result.date = date;
								} catch (err) {
									console.log ("Err: "+err.name + " message: "+err.message);
								}
								
								callback(result);
							}

							modelFileDateDump.openStream ("r", openDateSuccess, handleError);
						} catch (err) {
							console.log ("Err: "+err.name + " message: "+err.message);
							callback(result);
						}
					}

					modelFileDump.openStream ("r", openSuccess, handleError);
				} else
					callback(result);
			};

			dir.listFiles(listFilesSuccess, handleError);
		};

		tizen.filesystem.resolve(
			'wgt-private',
			resolveSuccess,
			handleError,
			"rw"
		);
	}
};