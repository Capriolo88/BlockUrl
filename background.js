// JavaScript Document


// Variabili globali
window.activate = null;
window.async = null;
window.map = null;
window.whiteList = null;
window.malware = null;
window.phishing = null;
var deferred = $.Deferred();
var objHttp = createXMLHttp(null);


// Funzioni globali
function load(){
	var keys = ['activate','malware','phishing','async'];
	chrome.storage.local.get(keys, function(items){
		deferred.resolve(keys,items);
	});
	return deferred.promise();
}

function _load(keys,items){
		
	window.activate = items.activate;
	if(!window.activate)
		chrome.browserAction.setIcon({path: "img/icon_off.png"});
	else 
		chrome.browserAction.setIcon({path: "img/icon.png"});

	/*if(!items.map)
		window.map = new PageMap();
	else
		window.map = items.map;

	if(!items.whiteList){
		console.log("new WhiteList()");
		window.whiteList = new WhiteList();
	} else {
		console.log('caricata whiteList');
		window.whiteList = new WhiteList(items.whiteList);
	}*/
	if(!items.malware){
		window.malware = new GoogList();
	} else {
		window.malware = new GoogList(items.malware);
	}

	if(!items.phishing){
		window.phishing = new GoogList();
	} else {
		window.phishing = new GoogList(items.phishing);
	}

	if(items.async == null || items.async == undefined){
		//se è il primo avvio dell'estensione default è asincrono
		//e lo salvo nelle impostazioni
		chrome.storage.local.set({'async': true});
	} else {
		window.async = items.async;
	}
	
}


// Esecuzione
(function(){

	window.map = new PageMap();
	window.whiteList = new WhiteList();
	
	console.log("main: null");
	deferred.done(_load);
	load();
	
	
	
})();


//add event listener
(function(){

	chrome.runtime.onStartup.addListener(function(){
		
		if(window.activate==null){
			console.log("start: null");
			deferred.done(_load);
			load();
		}



	});

	chrome.browserAction.onClicked.addListener(function (tab){
		if(window.activate){
			window.activate=false;
			chrome.browserAction.setIcon({path: "img/icon_off.png"});
		} else {
			window.activate=true;
			chrome.browserAction.setIcon({path: "img/icon.png"});   
		}
		console.log('Extension '+(window.activate ? 'attiva' : 'disattivata'));
		chrome.storage.local.set({'activate': window.activate});
	});

	// evento attivato ad ogni richiesta web (es. script, main_frame, img, ecc...)
	/*chrome.webRequest.onBeforeRequest.addListener(function(details){
		var url = details.url;
		if(url.match(/google.it\//g)=="google.it/" && window.activate){
			var tabId = details.tabId;
			var type = details.type;
			console.log('onBeforeRequest, tabId: '+tabId+' type: '+type+" url: "+url);
		}
	}, {urls: ["<all_urls>"]});*/

	//onBeforeNavigate
	//onCommitted
	chrome.webNavigation.onBeforeNavigate.addListener(function(details) {
		if(!window.activate)
			return;


			

		var url = details.url;
		/*console.log('onCommitted transitionType: '+details.transitionType+
					'\ntransitionQualifiers: '+details.transitionQualifiers);*/

		console.log('onBeforeNavigate url: '+url);
		if(skipLookup(url,window.whiteList))
			return;
		
		if(window.map.isChecked(details.tabId)){
			
			console.log('onBeforeNavigate: isChecked');
		} else {
			var res = lookup(objHttp,url);
			console.log("\'"+url+"\' sito malevolo? "+isBadSite(res));
			
			var tabId = details.tabId;
			window.map.set(tabId,url);
			if(isBadSite(res)){
				//var type = details.type;
				//var time = details.timeStamp;
				console.log('onBeforeNavigate, tabId: '+tabId+" url: "+url);
				//window.map.set(tabId,url);

				chrome.tabs.update(tabId, {url: "attenzione.html"});
			} else {
				window.map.check(tabId,true);
				window.whiteList.set(url);
			}

		}
	});

	// Message utilizzato per sincronizzare task asincroni
	chrome.runtime.onMessage.addListener(function(message,sender,sendResponse){
		
		console.log("ricevuto messaggio: "+message.command);
		var id, url;
		if(message.command == 'getUrl'){
			id = sender.tab.id;
			url = window.map.getUrl(id);
			
			console.log(url);
			sendResponse({url: url});
		} else if(message.command == 'goon'){
			id = sender.tab.id;
			url = window.map.getUrl(id);

			window.map.check(id,true);
			sendResponse({r:'ok'});
		}
	});


	chrome.tabs.onUpdated.addListener(function(tabId,changeInfo,tab){
		if(changeInfo.status == 'complete')
			if(window.map.isChecked(tabId)){
				console.log('onUpdated complete: isChecked');
				window.map.check(tabId,false);
			}
	});


	chrome.tabs.onRemoved.addListener(function(tabId, removeInfo){
		if(window.map.has(tabId)){
			console.log('onRemoved, tabId: '+tabId);
			window.map.delete(tabId);
		}
	});


	chrome.windows.onRemoved.addListener(function(windowId){
		
			//console.log('onRemoved Salvata whiteList');
			//window.whiteList.cleaned = false;
			////chrome.storage.local.remove('whiteList');
			//chrome.storage.local.set({'whiteList' : window.whiteList});

	});

	// Inutile, richieste sempre async
	//chrome.storage.onChanged.addListener(function(changes, areaName){
	//	if(changes.async){
	//		window.async = changes.async.newValue;
	//	}
	//});


})();