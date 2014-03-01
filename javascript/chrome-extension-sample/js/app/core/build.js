define(['jquery','utils/base','./base','./handlers/build'],function($,utils_base,main_obj,handler_builder){
	var builder = {
		components:{
			main_handler:handler_builder
		},
		build:function(){
			main_obj.core = main_obj;
			for(c_type in builder.components){
				main_obj.components.items[c_type] = builder.components[c_type].build({
					core:main_obj
				});
			}
			main_obj.init();			
			return main_obj;
		}
	};
	return builder.build();
});