//Google request
const appkey = 'AIzaSyAV-kEA97xxaHyO46_Z-fIg22iR85oXgyA';
const client = 'prova';
const lookupUrl = 'https://sb-ssl.google.com/safebrowsing/api/lookup?client=' + client +
    '&key=' + appkey +
    '&appver=1.0&pver=3.1';
const lookupGET = lookupUrl + '&url=';
const badSite = ['phishing', 'malware', 'phishing,malware'];

const url = 'https://safebrowsing.google.com/safebrowsing/';
const info_url = '?client=api' +
    '&key=' + appkey +
    '&appver=1.0&pver=3.0';

const urlList = url + 'list' + info_url;
const urlDownload = url + 'downloads' + info_url;
const urlHash = url + 'gethash' + info_url;

const Window = chrome.extension.getBackgroundPage();

function createXMLHttp(type, handler) {
    var xmlhttp = new XMLHttpRequest();
    if (type && typeof type === 'function')
        handler = type,
            type = null;
    else if (!handler || typeof handler !== 'function')
        handler = null;

    if (handler)
        xmlhttp.onreadystatechange = handler;
    if (type && typeof type === 'string')
        xmlhttp.responseType = type;

    return xmlhttp;
}

function changeXMLHttpHandler(objHttp, handler) {
    if (handler && typeof handler === 'function')
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

function request(objHttp, url, body, async) {
    if (body && typeof body === 'boolean')
        async = body, body = null;
    else if (typeof async === 'null' || typeof async === 'undefined')
        async = true;
    if (typeof body === 'undefined')
        body = null;
    objHttp.open('POST', url, async);
    objHttp.send(body);

    if (!async)
        return objHttp.response;
    return true;
}

function arrayToString(array) {
    var str = '';
    if (array.length == 1) {
        str = str + array[0];
    } else {
        var i = 1, p = array[0], l = 0, app = p;
        while (i < aNum.length) {
            if (array[i] == app + 1) {
                app = array[i];
                l = app;
            } else {
                if (l > p) {
                    if (l - p == 1)
                        str = str + p + ',' + l + ',';
                    else
                        str = str + p + '-' + l + ',';
                    l = 0;
                    p = array[i];
                    app = p;
                } else {
                    str = str + p + ',';
                    p = array[i];
                    app = p;
                }
            }
            i++;
        }
        if (l > p)
            if (l - p == 1)
                str = str + p + ',' + l;
            else
                str = str + p + '-' + l;
        else
            str = str + p;
    }
    return str;
}

function createBody(res) {
    var body = '', aNum, sNum;
    if (res.search('goog-malware-shavar') != -1) {
        body = body + 'goog-malware-shavar' + ';';
        aNum = Window.malware.getNumbers('add');
        if (aNum) {
            body = body + 'a:' + arrayToString(aNum);
        }
        sNum = Window.malware.getNumbers('sub');
        if (sNum) {
            if (aNum)
                body += ':';
            body = body + 's:' + arrayToString(sNum);
        }
        body += '\n';
    }
    if (res.search('googpub-phish-shavar') != -1) {
        body = body + 'googpub-phish-shavar' + ';';
        aNum = Window.phishing.getNumbers('add');
        if (aNum) {
            body = body + 'a:' + arrayToString(aNum);
        }
        sNum = Window.phishing.getNumbers('sub');
        if (sNum) {
            if (aNum)
                body += ':';
            body = body + 's:' + arrayToString(sNum);
        }
        body += '\n';
    }
    return body;
}

function downloadLists() {

    var objHttp = createXMLHttp();
    var res = request(objHttp, urlList, false);
    var body = createBody(res);
    res = request(objHttp, urlDownload, body, false);

    function handler() {

    }
}


function lookup(objHttp, urls) {
    var body = '', url;
    if (typeof urls == 'string') {
        url = encode(urls);
        objHttp.open('GET', lookupGET + url, false);
        body = null;
    } else {
        body += urls.length + '\n';
        //noinspection InfiniteLoopJS
        for (url of urls) {
            body += (url + '\n');
        }
        objHttp.open('POST', lookupUrl, false);
    }
    ;
    objHttp.send(body);

    return objHttp.responseText;
}

function isBadSite(res) {
    var app;
    for (app of badSite) {
        if (res == app)
            return true;
    }
    return false;
};

// Utility
const percEncod = {
    '\!': '%21',
    '\#': '%23',
    '\$': '%24',
    '\&': '%26',
    '\'': '%27',
    '\(': '%28',
    '\)': '%29',
    '\*': '%2A',
    '\+': '%2B',
    '\,': '%2C',
    '\/': '%2F',
    '\:': '%3A',
    '\;': '%3B',
    '\=': '%3D',
    '\?': '%3F',
    '\@': '%40',
    '\[': '%5B',
    '\]': '%5D',
    ' ': '%20',
    //'\%' : '%25',
    '\-': '%2D',
    '\.': '%2E',
    '\<': '%3C',
    '\>': '%3E',
    '\\': '%5C',
    '\^': '%5E',
    '\_': '%5F',
    '\`': '%60',
    '\{': '%7B',
    '\|': '%7C',
    '\}': '%7D',
    '\~': '%7E'
};

function encode(url) {
    var x, key;
    for (key in percEncod) {
        x = new RegExp('\\' + key, "g");
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

function skipLookup(url, whiteList) {
    console.log("skipLookup url: " + url);
    if (url == 'about:blank')
        return true;
    var app;
    for (app of okPagesRex) {
        if (app.test(url)) {
            console.log("skipLookup busted: " + app.source);
            return true;
        }
    }
    whiteList.clean();
    if (!whiteList.isExpired(url)) {
        console.log("skipLookup busted in whiteList");
        return true;
    }
    return false;
};