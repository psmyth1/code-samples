define(['jquery','utils/base','./base'],function($,utils_base,main_obj){
	var builder = {
		components:{},
		build:function(opts){
			options = utils_base.merge_objs({
				core:{}
			},opts);
			main_obj.core = opts.core;
			for(c_type in builder.components){
				main_obj.core.components.items[c_type] = builder.components[c_type].build({
					core:main_obj.core
				});
			}			
			return main_obj;
		}
	};
	return builder;
});