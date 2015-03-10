/**
 * Created by Capriolo on 21/02/2015.
 */
'use strict'
const APP_KEY = 'AIzaSyAV-kEA97xxaHyO46_Z-fIg22iR85oXgyA';
const URL = 'https://safebrowsing.google.com/safebrowsing/';
const INFO_URL = '?client=api' +
    '&key=' + APP_KEY +
    '&appver=1.0&pver=3.0';

const URL_LIST = URL + 'list' + INFO_URL;
const URL_DOWNLOAD = URL + 'downloads' + INFO_URL;
const URL_HASH = URL + 'gethash' + INFO_URL;

const backgroundPage = chrome.extension.getBackgroundPage();

const BASE_DELAY = (30 * (Math.random() + 1)) * 60 * 1000;
var DELAY = 60 * 1000;
var ERROR_STATE = 0;

var responseList = null;
var appMalware = null, appPhish = null;

function initAppList(name) {
    if (name == 'phish')
        appPhish = new GoogList((backgroundPage[name]));
    else
        appMalware = new GoogList((backgroundPage[name]));
}

function getAppList(name) {
    if (!name) {
        var ret = [];
        if (appMalware != null)
            ret.push(appMalware);
        if (appPhish != null)
            ret.push(appPhish);
        return ret;
    }
    if (name == 'phish')
        return appPhish;
    else
        return appMalware;
}

function deleteLists(name) {
    switch (name) {
        case 'malware':
            if (appMalware != null) {
                appMalware.deleteAll();
                appMalware = null;
            }
            break;
        case 'phish':
            if (appPhish != null) {
                appPhish.deleteAll();
                appPhish = null;
            }
            break;
        default :
            if (appMalware != null) {
                appMalware.deleteAll();
                appMalware = null;
            }
            if (appPhish != null) {
                appPhish.deleteAll();
                appPhish = null;
            }
            break;
    }
    if (responseList != null) {
        responseList.deleteAll();
        responseList = null;
    }
}

function getError(msg) {
    ERROR_STATE++;
    console.log(msg);
    if (ERROR_STATE == 2)
        DELAY = BASE_DELAY;
    else if (ERROR_STATE > 2)
        DELAY = DELAY * 2;
    else if (ERROR_STATE > 5)
        DELAY = 480 * 60 * 1000;
    return DELAY;
}

function resetError() {
    ERROR_STATE = 0;
    DELAY = 60 * 1000;
}

function createDownloadBody(res) {
    var body = '', aNum, sNum;
    if (res.search('goog-malware-shavar') != -1) {
        body = body + 'goog-malware-shavar' + ';';
        aNum = backgroundPage.malware.getNumbers('add');
        if (aNum) {
            body = body + 'a:' + parseIntArrayToStr(aNum);
        }
        sNum = backgroundPage.malware.getNumbers('sub');
        if (sNum) {
            if (aNum)
                body += ':';
            body = body + 's:' + parseIntArrayToStr(sNum);
        }
        body += '\n';
    }
    if (res.search('googpub-phish-shavar') != -1) {
        body = body + 'googpub-phish-shavar' + ';';
        aNum = backgroundPage.phish.getNumbers('add');
        if (aNum) {
            body = body + 'a:' + parseIntArrayToStr(aNum);
        }
        sNum = backgroundPage.phish.getNumbers('sub');
        if (sNum) {
            if (aNum)
                body += ':';
            body = body + 's:' + parseIntArrayToStr(sNum);
        }
        body += '\n';
    }
    return body;
}

function requestChunks(redirecturls, googlist) {

    console.log(googlist.name + '-' + redirecturls.length);
    if (redirecturls.length > 0) {
        var httpobj = new XMLHttpRequest();
        httpobj.responseType = 'arraybuffer';
        httpobj.open('POST', redirecturls.shift(), true);
        httpobj.onreadystatechange = handler;
        httpobj.send(null);
    }

    function handler() {
        if (httpobj.readyState === 4) {
            if (httpobj.status !== 200) {
                chrome.runtime.sendMessage({'command': 'updatelist', 'status': 'request error', 'name': googlist.name});
                return;
            }
            console.log(redirecturls.length);
            var buffer = httpobj.response;
            if (!googlist.parseBuffer(buffer)) {
                chrome.runtime.sendMessage({'command': 'updatelist', 'status': 'parse error'});
                return;
            }
            if (redirecturls.length > 0) {
                setTimeout(function () {
                    httpobj.open('POST', redirecturls.shift(), true);
                    httpobj.onreadystatechange = handler;
                    httpobj.send(null);
                }, 550);
            } else {
                chrome.runtime.sendMessage({'command': 'updatelist', 'status': 'ok', 'name': googlist.name});
            }
        }
    }
}

function updateList(name, listdata, TTL) {

    var i;
    initAppList(name);
    console.log('1-' + name);

    getAppList(name).setExpiration(TTL);
    console.log('1-' + getAppList(name).expiration);

    for (i = 0; i < listdata.add_del.length; i++) {
        getAppList(name).deleteChunk(listdata.add_del[i], 'add');
    }
    for (i = 0; i < listdata.sub_del.length; i++) {
        getAppList(name).deleteChunk(listdata.sub_del[i], 'sub');
    }
    getAppList(name).fillAppList();

    requestChunks(listdata.redirect_urls, getAppList(name));
}

function downloadLists() {

    var objHttp, res, body;
    objHttp = createXMLHttp();
    res = request(objHttp, URL_LIST, false);
    if (objHttp.status != 200) {
        return getError('list: \n' + objHttp.status);
    }
    body = createDownloadBody(res);
    res = request(objHttp, URL_DOWNLOAD, body, false);
    if (objHttp.status != 200) {
        return getError('download');
    }

    responseList = new ResponseLists();
    if (!responseList.parse(res)) {
        console.log('Error parsing [Add|Sub]_del Header');
        return false;
    }

    if (responseList.reset) {
        //    Gestisci reset
    }

    var l = 0;
    for (var key in responseList.lists) {

        console.log('ahhhhhhhhhhhhhhhhhhhhhhhhhhhhh ' + key);
        var name = key.match(/(malware|phish)/)[0];
        var id = setTimeout(updateList, l * 1000, name, responseList.lists[key], responseList.TTL);

        chrome.runtime.sendMessage({'command': 'timeout', 'id': id, 'name': name});
        l += responseList.lists[key].redirect_urls.length;
    }

    return true;
}