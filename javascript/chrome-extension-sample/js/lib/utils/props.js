define(function(){
	var props = {
		app_root:'http://localhost:8080',
		core:{},
		socket:{},
		channel:{},
		viewer:{
			id:null,
			name:null
		},
		profile:{
			viewers:{},
			prefs:{
				'tab_v_window':'win',
				'keep_minimized':false,
				'warning_msg':true				
			}
		},
		load:function(){
			console.log("loadSettings");
			chrome.storage.local.get("chrome-rc-settings",function(items){
				console.log("local","chrome-rc-settings",items);
			});
			chrome.storage.sync.get("chrome-rc-settings",function(items){
				console.log("global","chrome-rc-settings",items);
			});
			props.loadGlobalSettings(function(){
				props.loadLocalSettings(function(){
					chrome.storage.onChanged.addListener(function(changes, namespace) {
				        for (key in changes) {
				          var storageChange = changes[key];
				          console.log('Storage key "%s" in namespace "%s" changed. ' +
				                      'Old value was "%s", new value is "%s".',
				                      key,
				                      namespace,
				                      storageChange.oldValue,
				                      storageChange.newValue);
				        }
					});
					props.post_load();
				});
			});
		},
		post_load:function(){},
		loadGlobalSettings:function(post_handler){
			chrome.storage.sync.get("chrome-rc-settings",function(items){
				if('chrome-rc-settings' in items){
					props.profile = items['chrome-rc-settings'].profile;
					post_handler();
				}else{
					props.saveGlobalSettings(function(){
						post_handler();
					});				
				}
				console.log("loadGlobal",items,props);
			});
		},
		saveGlobalSettings:function(post_handler){
			console.log('saveGlobalSettings');
			chrome.storage.sync.set({"chrome-rc-settings":{"profile":props.profile}},function(){
				post_handler();
			});			
		},
		loadLocalSettings:function(post_handler){
			chrome.storage.local.get("chrome-rc-settings",function(items){
				if('chrome-rc-settings' in items){
					props.viewer = items['chrome-rc-settings'].viewer;
				}
				post_handler();
				console.log("loadLocal",items,props);
			});
		},
		saveLocalSettings:function(post_handler){
			console.log('saveLocalSettings');
			chrome.storage.local.set({"chrome-rc-settings":{"viewer":props.viewer}},function(){
				post_handler();
			});			
		},
		uuid:function(){
			function S4(){
			   return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
			}
			return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
		}
	};
	return props;
});
