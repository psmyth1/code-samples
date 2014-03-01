define(['jquery','utils/base','./general/base','goog'],function($,utils_base,general_obj){
	var self = {
		id:'main_handler',
		core:{},
		handlers:{
			pre_init:function(data){
				console.log(data.id,'pre_init',data);
			},
			post_init:function(data){
				console.log(data.id,'post_init',data);
			},
			pre_close:function(data){
				console.log(data.id,'pre_close',data);
			},
			post_close:function(data){
				console.log(data.id,'post_close',data);
			}
			
		},
		init:function(){
			if('pre_init' in self.handlers){
				self.handlers.pre_init(self);
			}
			self.sendMessage('/viewer/pair',{
				handler:self.post_init,
				params:{
					viewer_id:self.core.props.viewer.id,
					viewer_name:self.core.props.viewer.name
				}
			});
		},
		post_init:function(raw_data){
			console.log("raw_data",raw_data);
			data = JSON.parse(raw_data.responseText);
			c_data = utils_base.merge_objs({
				'token':""
			},data);
			console.log('init - channel',c_data);
			self.core.components.channel = new goog.appengine.Channel(c_data['token']);
			self.core.components.socket = self.core.components.channel.open();
			console.log('socket',self.core.components.socket);
			console.log('channel',self.core.components.channel);
			self.core.components.socket.onopen = self.onOpen;
			self.core.components.socket.onclose = self.onClose;
			self.core.components.socket.onerror = self.onError;
			self.core.components.socket.onmessage = self.onReceiveMessage;
			if('post_init' in self.handlers){
				self.handlers.post_init(self);
			}
		},
		close:function(){
			if('pre_close' in self.handlers){
				self.handlers.pre_close(self);
			}
			self.sendMessage('/viewer/unpair',{
				handler:self.post_close
			});
		},
		post_close:function(){
			self.core.components.socket.close();
			self.core.components.socket = {};
			self.core.components.channel = {};
			if('post_close' in self.handlers){
				self.handlers.pre_close(self);
			}
		},
		onOpen:function(){
			console.log("Open");		
		},
		onClose:function(){
			console.log("Close");
		},
		onError:function(err){
			console.log("Error",err);
			self.init();
		},
		onReceiveMessage:function(msg){
			m_opts = JSON.parse(msg.data);
			console.log("Message",m_data);	
			options = utils_base.merge_objs({
				'handled':false,
				'handler':"",
				'action_type':"",
				'action':"",
				'params':{}				
			},m_opts);
			if(options['handler'] in self.core.components.items){
				self.core.components.items[options['handler']].handle(options);
			}else{
				console.log("Invalid Message",options);
			}					
		},
		sendMessage:function(path,opts){			
			options = utils_base.merge_objs({
				"handler":null,
				"params":{
					viewer_id:self.core.props.viewer.id
				}
			},opts);
			utils_base.sendMessage(path,options)
		}
	};
	return self;
});