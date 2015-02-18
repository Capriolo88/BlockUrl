var internalurl = null;

chrome.runtime.sendMessage({command: 'getUrl'}, function(response){
	internalurl = response.url;
	document.getElementById("url").innerHTML = response.url;
});

/*document.getElementById("prosegui").addEventListener("click",function(){
	chrome.runtime.sendMessage({command: 'goon'}, function(response){
		chrome.tabs.update({url: internalurl});
	});
});*/
