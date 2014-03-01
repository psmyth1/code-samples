define(['jquery','utils/base'],function($,utils_base){
	var self = {
		id:'popup_core',
		core:{},
		components:{
			items:{},			
		},
		handlers:{
			pre_init:function(data){
				console.log(data.id,'pre_init',data);
			},
			post_init:function(data){
				console.log(data.id,'post_init',data);
			}
		},
		init:function() {
			if('pre_init' in self.handlers){
				self.handlers.pre_init(self);
			}
			
			$('#unpair-viewer').on('click',self.unpairViewer);
			$('#pair-viewer').on('click',self.pairViewer);
			
			chrome.runtime.sendMessage({action: "getViewer",data:{}}, function(viewer) {
				self.refresh(viewer);
				self.post_init();
			});
		},
		post_init:function(){
			if('post_init' in self.handlers){
				self.handlers.post_init(self);
			}			
		},
		refresh:function(viewer){
			console.log("popup",viewer);
			if(viewer.id == null){
				$('.no-viewer').show();
				$('.viewer').hide();
			}else{
				$('.no-viewer').hide();
				$('.viewer').show();
				$('#cur-viewer-name').text(viewer.name);
			}
		},
		pairViewer:function(){
			viewer_name = $("#pair-viewer-name").val();
			if(viewer_name != ""){
				chrome.runtime.sendMessage({action: "pairViewer",data:{name:viewer_name}}, function(viewer) {
					self.refresh(viewer);
				});
			}
		},
		unpairViewer:function(){
			chrome.runtime.sendMessage({action: "unpairViewer",data:{}}, function(viewer) {
				self.refresh(viewer);
			});
		}
	};
	return self;
});