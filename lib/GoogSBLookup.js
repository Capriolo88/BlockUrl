/**
 * Created by Capriolo on 21/02/2015.
 */

const appkey = 'AIzaSyAV-kEA97xxaHyO46_Z-fIg22iR85oXgyA';
const client = 'prova';
const lookupUrl = 'https://sb-ssl.google.com/safebrowsing/api/lookup?client=' + client +
    '&key=' + appkey +
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