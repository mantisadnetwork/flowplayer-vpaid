'use strict';

var html5Client = require('vpaid-html5-client/js/VPAIDHTML5Client.js');
var flashClient = require('vpaid-flash-client/js/VPAIDFLASHClient.js');

module.exports = {
	attach: function (config) {
		var played = false;
		var timeout = config.timeout || 5000;
		var vpaidUnit = undefined;
		var loaded = false;
		var cancel = false;
		var vpaidDetected = false;
		var vpaidStarted = false;
		var videoPlayed = false;

		var vpaidContainer = document.createElement('div');
		vpaidContainer.className = 'vpaid';
		vpaidContainer.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:0;visibility:none;overflow:hidden;z-index:4999;display:flex;align-items:center;justify-content:center;';
		vpaidContainer.innerHTML = '<video id="vpaid-video">Loading, please wait..</video>';
		var vpaidSkipAd = document.createElement('div');
		vpaidSkipAd.className = 'vpaid_counter';
		vpaidSkipAd.style.cssText = 'position:absolute;top:50%;left:75%;width:26%;height:0;visibility:none;overflow:hidden;z-index:4999;display:flex;align-items:center;justify-content:center;cursor:pointer;border:white;';
		var vpaidRemainingTime = document.createElement('div');
		vpaidRemainingTime.className = 'vpaid_remainingTime';
		vpaidRemainingTime.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:10%;visibility:none;overflow:hidden;z-index:4999;display:flex;align-items:center;justify-content:center;';
		var vpaidPlayButton = document.createElement('div');
		vpaidPlayButton.className = 'vpaid_play_button';
		vpaidPlayButton.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:50%;visibility:none;overflow:hidden;z-index:4999;display:flex;align-items:center;justify-content:center;';
		config.container.appendChild(vpaidContainer);
		config.container.appendChild(vpaidSkipAd);
		config.container.appendChild(vpaidRemainingTime);
		config.container.appendChild(vpaidPlayButton);

		var onError = function (err) {
			if (console && console.error && err) {
				console.error(err);
			}

			return playVideo();
		};

		var hideVpaid = function () {
			vpaidContainer.style.visibility = 'none';
			vpaidContainer.style.height = '100%';
			vpaidSkipAd.style.visibility = 'none';
			vpaidSkipAd.style.height = '10%';
			vpaidRemainingTime.style.visibility = 'none';
			vpaidRemainingTime.style.height = '100%';
		};

		var showVpaid = function () {
			vpaidContainer.style.visibility = 'visible';
			vpaidContainer.style.height = '100%';
			vpaidContainer.style.background = 'black';
			vpaidRemainingTime.style.visibility = 'visible';
			vpaidRemainingTime.style.height = '10%';
		};
		var showVpaidSkipAd = function () {
			vpaidSkipAd.style.visibility = 'visible';
			vpaidSkipAd.style.height = '12%';
			vpaidSkipAd.style.background = 'black';
			vpaidSkipAd.innerHTML = '<div id="vpaid-skip"  style="color: white;font-size: 17px;"><strong>Pomiń</strong></div>'
		}
		var playVideo = function () {
			if (videoPlayed) {
				return;
			}

			videoPlayed = true;

			try {
				config.container.removeChild(vpaidContainer);
				config.container.removeChild(vpaidSkipAd);
				config.container.removeChild(vpaidRemainingTime);
			} catch (ex) {

			}

			config.player.trigger('vpaid_end');
			config.player.play();
		};

		var onUnit = function (unitConfig, event, autoplay) {
			return function (err, unit) {
				if (err) {
					return onError(err);
				}
				vpaidUnit = unit;

				var lastVolume = null;
				var cancel = false;

				var vastVpaidMap = {
					AdVideoStart: 'start',
					AdVideoFirstQuartile: 'firstQuartile',
					AdVideoMidpoint: 'midpoint',
					AdVideoThirdQuartile: 'thirdQuartile',
					AdUserAcceptInvitation: 'acceptInvitation',
					AdUserMinimize: 'collapse',
					AdUserClose: 'close',
					AdPaused: 'pause',
					AdPlaying: 'resume',
					AdStopped: function () {
						cancel = true;
						playVideo();
					},
					AdLoaded: function () {
						loaded = true;
						config.player.trigger('vpaid_loaded');

						if (autoplay) {
							startVpaid();
						} else {
							// need to ensure user can click play button player
							hideVpaid();
						}
					},
					AdStarted: function () {
						vpaidStarted = true;
						unitConfig.tracker.load();
						config.player.trigger('vpaid_start');

						unit.getAdVolume(function (err, val) {
							// TODO: handle error
							lastVolume = val;
						});
					},
					AdVideoComplete: function () {
						unitConfig.tracker.complete();
						playVideo();
					},
					AdSkipped: function () {
						unitConfig.tracker.skip();
						playVideo();
					},
					AdImpression: function () {
						// TODO: tracker.load needs to load impression and creativeView sep
					},
					AdVolumeChange: function () {
						// TODO: is value passed in?
						unit.getAdVolume(function (err, val) {
							// TODO: handle error
							if (val == 0 && lastVolume > 0) {
								unitConfig.tracker.setMuted(true);
							} else if (val > 0 && lastVolume == 0) {
								unitConfig.tracker.setMuted(false);
							}
						});
					},
					AdClickThru: function () {
						// TODO: tracker needs to implement (ClickTracking is a VAST element under<VideoClicks>)
					},
					AdError: function (error) {
						cancel = true;
						unitConfig.tracker.errorWithCode(901);

						playVideo();
					}
				};

				function stackTrace() {
					var err = new Error();
					return err.stack;
				}

				//unit.subscribe('AdLoaded', vastVpaidMap.onStart);

				Object.keys(vastVpaidMap).forEach(function (key) {
					return unit[event](key, function () {
						if (cancel) {
							return;
						}

						var val = vastVpaidMap[key];

						if (typeof val == 'string') {
							return unitConfig.tracker.track(val);
						}

						val(arguments);
					});
				});
				vpaidSkipAd.addEventListener('click', function () {
					unit.skipAd();
				});
				unit.handshakeVersion('2.0', function onHandShake(err) {
					if (err) {
						return onError(err);
					}

					config.player.trigger('vpaid_init');
					showVpaid();
					unit.initAd(unitConfig.width, unitConfig.height, 'normal', -1, {AdParameters: unitConfig.parameters}, {});

					setTimeout(function () {
						if (!loaded) {
							cancel = true;
							onError('Timed out waiting for VPAID ad to load.');
						}
					}, timeout);

				});

			}
		};

		config.player.on('vpaid_js', function (e, conf, autoPlay) {
			vpaidDetected = true;
			autoPlay = true;

			if (null !== conf) {
				document.getElementById("vpaid-video").width = conf.width;
				document.getElementById("vpaid-video").height = conf.height;
			}

			var client = new html5Client(vpaidContainer, document.getElementById("vpaid-video"), {extraOptions: {zIndex: 4999}});
			client.loadAdUnit(conf.src, onUnit(conf, 'subscribe', autoPlay));
		});

		config.player.on('vpaid_swf', function (e, flashConfig, autoPlay) {

			if (!config.swfVpaid) {
				throw new Error('You must define a url for config.swfVpaid');
			}

			vpaidDetected = true;

			var buildFlashClient = function () {
				var fc = new flashClient(vpaidContainer, function (err) {
					if (err) {
						return onError(err);
					}

					fc.loadAdUnit(flashConfig.src, onUnit(flashConfig, 'on', autoPlay));
				}, {
					data: config.swfVpaid,
					width: flashConfig.width || vpaidContainer.offsetWidth,
					height: flashConfig.height || vpaidContainer.offsetHeight
				});
			};

			if (window.swfobject) {
				return buildFlashClient();
			}

			if (!config.swfObject) {
				throw new Error('You must define config.swfObject or include it on the page');
			}

			var head = document.getElementsByTagName('head')[0];

			var script = document.createElement("script");
			script.type = "text/javascript";
			script.async = true;
			script.src = config.swfObject;

			var done = false;

			script.onload = script.onreadystatechange = function () {
				if (!done && (!this.readyState || this.readyState == "loaded" || this.readyState == "complete")) {
					done = true;

					buildFlashClient();

					// Handle memory leak in IE
					script.onload = script.onreadystatechange = null;
					head.removeChild(script);
				}
			};

			head.appendChild(script);
		});

		var startVpaid = function () {
			if (!vpaidDetected || played || cancel) {
				return;
			}
			showVpaid();
			played = true;
			config.player.stop();
			var getUnit = function (callback) {
				if (vpaidUnit && loaded) {
					return callback(vpaidUnit);
				}

				var checkClient = setInterval(function () {
					if (vpaidUnit && loaded) {
						return callback(vpaidUnit);
					}
				}, 100);

				setTimeout(function () {
					if (!vpaidUnit || !loaded)
					{
						clearInterval(checkClient);

						callback();
					}
				}, timeout);
			};

			getUnit(function (unit) {
				if (!unit) {
					return playVideo();
				}

				unit.startAd();
				// in case ad does not start

				setTimeout(function () {
					if (!vpaidStarted) {
						playVideo();
					}
				}, timeout);

			});
		};

		config.player.on('resume', function() {
			startVpaid();
		});

		var vpaidTime = document.getElementById('vpaid-video');
		var vpaidPromise = document.getElementById('vpaid-video');

		const playPromise = vpaidPromise.play();
		console.log(playPromise);
		if (playPromise !== null) {
			startVpaid();

			playPromise.catch(() => {
				vpaidPlayButton.style.visibility = 'visible';
				vpaidPlayButton.style.height = '50%';
				vpaidPlayButton.innerHTML = '<div  style="color: white;font-size: 17px;"><strong>mute</strong></div>'
				vpaidPlayButton.addEventListener('click',function ()
				{

					vpaidPromise.play();

				}) })
		}

		vpaidTime.ontimeupdate = function () {
			var vpaidTimeRemaining = Math.round(vpaidTime.duration - vpaidTime.currentTime);
			if (isNaN(vpaidTimeRemaining)) {
				vpaidRemainingTime.innerHTML = '';

			} else {
				vpaidRemainingTime.innerHTML = '<div style="color: white;font-size: 16px;">Reklama skończy się za  : ' + vpaidTimeRemaining + '</div>'

			}
			var vpaidCurrentTime = vpaidTime.currentTime;
			if (vpaidCurrentTime >= 15) {
				showVpaidSkipAd();

			}
		};
	}
};
