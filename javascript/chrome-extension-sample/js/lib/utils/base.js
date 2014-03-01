define(['jquery','./props'],function($,util_props){
	var utils = {
		merge_objs:function(obj1,obj2){
			return $.extend(obj1,obj2);
		},
		sendMessage:function(path,opts){
			options = utils.merge_objs({
				"handler":null,
				"params":null,
			}, opts);
			xhr = new XMLHttpRequest();
			xhr.onreadystatechange = function(){
				if(this.readyState == this.DONE){
					if(options.handler){
						options.handler(this);
					}
				}
			};
			xhr.open('POST', util_props.app_root + path, true);
			xhr.setRequestHeader("content-type", "application/x-www-form-urlencoded");
			xhr.send($.param(options.params));
			console.log('INIT - END');
		},
		clone_obj:function(obj){
			copy = $.extend({},obj);			
			return copy;			
		}		
	};
	console.log('utils_base',utils);
	return utils;
});
