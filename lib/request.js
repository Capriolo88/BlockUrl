//Google request
const appkey = 'AIzaSyAV-kEA97xxaHyO46_Z-fIg22iR85oXgyA';
const client = 'prova';
const lookupUrl = 'https://sb-ssl.google.com/safebrowsing/api/lookup?client='+client+
				'&key='+appkey+
				'&appver=1.0&pver=3.1';
var lookupGET = lookupUrl+'&url=';

const badSite = ['phishing' , 'malware' , 'phishing,malware'];

const url = 'https://safebrowsing.google.com/safebrowsing/';
const type_request = {
	list : 'list',
	downloads : 'downloads',
	gethash : 'gethash'
};
const info_url = '?client=api'+
				'&key='+appkey+
				'&appver=1.0&pver=3.0';

const urlList = url+type_request.list+info_url;
const urlDownload = url+type_request.downloads+info_url;
const urlHash = url+type_request.gethash+info_url;

function createXMLHttp(handler){
	var xmlhttp = new XMLHttpRequest();
	if(handler)
		xmlhttp.onreadystatechange = handler;
	return xmlhttp;
}

function changeXMLHttpHandler(objHttp,handler){
	objHttp.onreadystatechange = handler;
	return objHttp;
}

//prototype handler
/*function handler(){
	console.log(objHttp.readyState);
			
	if(objHttp.readyState == 4){
		console.log(objHttp.status+' - '+typeof objHttp.response);
		console.log(objHttp.response);
		//alert('res.length: '+res.length+' - '+re.join('<--->'));
	}
}*/

function request(objHttp, url, body, type, async){
	if(async)
		objHttp.responseType = type;

	objHttp.open('POST', url, async);
	objHttp.send(body);

	if(!async)
		return objHttp.response;
	return true;
}

function downloadLists(){

	var objHttp = createXMLHttp();
	var res = request(objHttp,urlList,null,null,false);

	function handler(){

	}


}


function lookup(objHttp, urls){
	var body = '';
	if(typeof urls == 'string'){
		var url = encode(urls);
		objHttp.open('GET',lookupGET+url,false);
		body = null;
	} else {
		var url;
		body += urls.length+'\n';
		for(url of urls){
			body += (url + '\n');
		}
		objHttp.open('POST',lookupUrl,false);
	}
	objHttp.send(body);

	return objHttp.responseText;
}

function isBadSite(res){
	var app;
	for(app of badSite){
		if(res == app)
			return true;
	}
	return false;
}

// Utility
const percEncod = {
  '\!' : '%21',
  '\#' : '%23',
  '\$' : '%24',
  '\&' : '%26',
  '\'' : '%27',
  '\(' : '%28',
  '\)' : '%29',
  '\*' : '%2A',
  '\+' : '%2B',
  '\,' : '%2C',
  '\/' : '%2F',
  '\:' : '%3A',
  '\;' : '%3B',
  '\=' : '%3D',
  '\?' : '%3F',
  '\@' : '%40',
  '\[' : '%5B',
  '\]' : '%5D',
  ' '  : '%20',
  //'\%' : '%25',
  '\-' : '%2D',
  '\.' : '%2E',
  '\<' : '%3C',
  '\>' : '%3E',
  '\\' : '%5C',
  '\^' : '%5E',
  '\_' : '%5F',
  '\`' : '%60',
  '\{' : '%7B',
  '\|' : '%7C',
  '\}' : '%7D',
  '\~' : '%7E'
}

function encode(url){
  var x, key;
  for(key in percEncod){
    x = new RegExp('\\'+key, "g");
    url = url.replace(x, percEncod[key]);
  }
  return url;
}

const okPagesRex = [new RegExp('http(s)?\:\/\/(.)*(\.)?google\.(com)?(it)?\/'),
					new RegExp('http(s)?\:\/\/(.)*(\.)?facebook\.(com)?(it)?\/'),
					new RegExp('http(s)?\:\/\/(.)*(\.)?youtube\.(com)?(it)?\/'),			
					new RegExp('http(s)?\:\/\/(www\.)?hotmail\.(com)?(it)?\/'),
					new RegExp('http(s)?\:\/\/(.)*(\.)?live\.(com)?(it)?\/'),
					new RegExp('http(s)?\:\/\/(.)*(\.)?msn\.(com)?(it)?\/'),
					new RegExp('http(s)?\:\/\/(.)*(\.)?yahoo\.(com)?(it)?\/'),
					new RegExp('chrome\:\/\/')];

function skipLookup(url,whiteList){
	console.log("skipLookup url: "+url);	
	if(url == 'about:blank')
		return true;
	var app;
	for(app of okPagesRex){
		if(app.test(url)){
			console.log("skipLookup busted: "+app.source);
			return true;
		}
	}
	if(!whiteList.isExpired(url)){
		console.log("skipLookup busted in whiteList");
		return true;
	}
	return false;
}