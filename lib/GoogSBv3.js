/**
 * Created by Capriolo on 21/02/2015.
 */
'use strict'
const url = 'https://safebrowsing.google.com/safebrowsing/';
const info_url = '?client=api' +
    '&key=' + appkey +
    '&appver=1.0&pver=3.0';

const urlList = url + 'list' + info_url;
const urlDownload = url + 'downloads' + info_url;
const urlHash = url + 'gethash' + info_url;

const checkListsRex = /(malware|phish)/;

const backgroundPage = chrome.extension.getBackgroundPage();

const baseDelay = (30 * (Math.random() + 1)) * 60 * 1000;
var delay = 60 * 1000;
var errorState = 0;

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

function deleteLists() {
    if (appMalware != null) {
        appMalware.deleteAll();
        appMalware = null;
    }
    if (appPhish != null) {
        appPhish.deleteAll();
        appPhish = null;
    }
    if (responseList != null) {
        responseList.deleteAll();
        responseList = null;
    }
}

function getError(msg) {
    errorState++;
    console.log(msg);
    if (errorState == 2)
        delay = baseDelay;
    else if (errorState > 2)
        delay = delay * 2;
    else if (errorState > 5)
        delay = 480 * 60 * 1000;
    return delay;
}

function resetError() {
    errorState = 0;
    delay = 60 * 1000;
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

//function parseBuffer(buffer) {
//    var dataView = new DataView(buffer);
//    var dim, data, i = 0, k = 0;
//    var chunks = [];
//    while (i < buffer.byteLength) {
//        dim = dataView.getUint32(i);
//        i += 4;
//        data = buffer.slice(i, i + dim);
//        try {
//            chunks[k] = ChunkData.decode(data);
//        } catch (e) {
//            if (e.decoded) { // Truncated
//                console.log("ci entro?");
//                console.log(e.decoded + '\n\n');
//            }
//            return false;
//        }
//        i += dim;
//        k++;
//    }
//    return chunks;
//}


//function parseChunks(url, list, iter, max) {
//    var deferred = Q.defer();
//
//    var bufferPromise = requestChunk(url, iter);
//    bufferPromise.then(function (response) {
//        var chunks = parseBuffer(response.r);
//        if (typeof chunks === 'boolean') {
//            deferred.reject('parse error');
//        } else {
//            console.log(iter);
//            deferred.resolve({'r': chunks, 'i': iter, 'm': max});
//        }
//
//    }, function (reason) {
//        deferred.reject('request error');
//    });
//
//    return deferred.promise;
//}

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

    //if (name == 'malware') {
    //    appMalware = new GoogList((backgroundPage[name]));
    //    appMalware.setExpiration(TTL);
    //    console.log('1-' + appMalware.expiration);
    //
    //    for (i = 0; i < applist.add_del.length; i++) {
    //        appMalware.deleteChunk(applist.add_del[i], 'add');
    //    }
    //    for (i = 0; i < applist.sub_del.length; i++) {
    //        appMalware.deleteChunk(applist.sub_del[i], 'sub');
    //    }
    //    appMalware.fillAppList();
    //
    //    p(applist.redirect_urls, appMalware);
    //} else {
    //    appPhish = new GoogList((backgroundPage[name]));
    //    appPhish.setExpiration(TTL);
    //    console.log('1-' + appPhish.expiration);
    //
    //    for (i = 0; i < applist.add_del.length; i++) {
    //        appPhish.deleteChunk(applist.add_del[i], 'add');
    //    }
    //    for (i = 0; i < applist.sub_del.length; i++) {
    //        appPhish.deleteChunk(applist.sub_del[i], 'sub');
    //    }
    //    appPhish.fillAppList();
    //
    //    p(applist.redirect_urls, appPhish);
    //}
}

function downloadLists() {

    var objHttp, res, body;
    objHttp = createXMLHttp();
    res = request(objHttp, urlList, false);
    if (objHttp.status != 200) {
        return getError('list: \n' + objHttp.status);
    }
    body = createDownloadBody(res);
    res = request(objHttp, urlDownload, body, false);
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

    var keys = Object.keys(responseList.lists), l = 0;
    for (var i = 0; i < keys.length; i++) {

        console.log('ahhhhhhhhhhhhhhhhhhhhhhhhhhhhh ' + keys[i]);
        var name = keys[i].match(checkListsRex)[0];
        var id = setTimeout(updateList, l * 1000, name, responseList.lists[keys[i]], responseList.TTL);

        chrome.runtime.sendMessage({'command': 'timeout', 'id': id, 'name': name});
        l += responseList.lists[keys[i]].redirect_urls.length;
    }

    return true;
}