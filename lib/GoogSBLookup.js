/**
 * Created by Capriolo on 21/02/2015.
 */
const client = 'prova';
const lookupUrl = 'https://sb-ssl.google.com/safebrowsing/api/lookup?client=' + client +
    '&key=' + APP_KEY +
    '&appver=1.0&pver=3.1';
const lookupGET = lookupUrl + '&url=';
const badSite = ['phishing', 'malware', 'phishing,malware'];

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
}

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
}