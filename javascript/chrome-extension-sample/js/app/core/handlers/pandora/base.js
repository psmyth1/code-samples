define(['jquery','utils/base'],function($,utils_base){
	var self = {
		id:'pandora_handler',
		core:{},
		action_types:{},
		handle:function(opts){
			options = utils_base.merge_objs({
				'handled':false,
				'handler':"general",
				'action_type':"",
				'action':"",
				'params':{}				
			},opts);									
		},
		post_handle:function(){
			if(arguments.length > 0){
				cmd = arguments[0];
				ret_data = [];
				if(arguments.length > 1){
					ret_data = arguments.slice(1);
				}
				self.core.channel.sendMessage('/viewer/respond_msg',{
					'params':{
						'cmd':cmd,
						'output':ret_data
					}
				});
			}
		}
	};
	return self;
});