define(['jquery','utils/base','utils/props'],function($,utils_base,util_props){
	var self = {
		id:'background_core',
		core:{},
		props:util_props,
		components:{
			items:{},
			channel:{},
			socket:{}
		},
		handlers:{
			pre_init:function(data){
				console.log(data.id,'pre_init',data);
			},
			post_init:function(data){
				console.log(data.id,'post_init',data);
				chrome.runtime.onMessage.addListener(
					function(request, sender, sendResponse) {
						console.log('onMessage',data);
						if(request.action == "getViewer"){
							sendResponse(data.props.viewer);				
						}
//					else if(request.action == "pairViewer"){
//								main_obj.props.viewer.id = main_obj.props.uuid();
//								main_obj.props.viewer.name = request.data.name;
//								main_obj.components.items.main_handler.init();
//								main_obj.props.saveLocalSettings(function(){});
//								sendResponse(main_obj.props.viewer);
//							}else if(request.action == "unpairViewer"){
//								main_obj.props.viewer = {
//									id:null,
//									name:null
//								};
//								main_obj.components.items.main_handler.close();
//								main_obj.props.saveLocalSettings(function(){});
//								sendResponse(main_obj.props.viewer);
//							}
					}
				);
			}
		},
		init:function(){
			if('pre_init' in self.handlers){
				self.handlers.pre_init(self);
			}				
			self.props.post_load = self.post_init;
			self.props.load();						
		},
		post_init:function(){
			if(self.props.viewer.id != null){
				self.components.items.main_handler.init();
			}
			if('post_init' in self.handlers){
				self.handlers.post_init(self);
			}
		}
	};
	return self;
});