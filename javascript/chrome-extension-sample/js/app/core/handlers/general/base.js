define(['jquery','utils/base'],function($,utils_base){
	var self = {
		id:'general_handler',
		core:{},
		handle:function(opts){
			options = utils_base.merge_objs({
				'handled':false,
				'handler':"general",
				'action_type':"",
				'action':"",
				'params':{}				
			},opts);
			console.log('handle - general',options);
			if(options['action_type'] in chrome){
				if(options['action'] in chrome[options['action_type']]){
					if(chrome[options['action_type']][options['action']] instanceof Function){
						console.log("ELIGIBLE ACTION",chrome[options['action_type']][options['action']]);
					}
				}
			}						
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
	console.log('general',self);
	return self;
});