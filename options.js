var async = document.getElementById("async");
var keys = ['async'];
async.addEventListener("click",click_);


chrome.storage.local.get(keys,function(items){
	if(items.async == null || items.async == undefined){
		//se è il primo avvio dell'estensione default è asincrono
		//chrome.extension.getBackgroundPage().async = false;
		async.checked = true;
		chrome.storage.local.set({'async': true});
	} else {
		chrome.extension.getBackgroundPage().async = items.async;
		async.checked = items.async;
	}
	console.log('options '+items.async);
});





function click_() { //v2.0
	
	chrome.storage.local.set({'async': async.checked});
	
}