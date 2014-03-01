define(['jquery','utils/base','./base'],function($,utils_base,main_obj){
	var builder = {
		components:{},
		build:function(){
			main_obj.core = main_obj;
			for(c_type in builder.components){
				main_obj.components.items[c_type] = builder.components[c_type].build({
					core:main_obj.core
				});
			}
			main_obj.init();			
			return main_obj;
		}
	};
	return builder.build();
});