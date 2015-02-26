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
var delay = 1 * 60 * 1000;
var errorState = 0;

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

function updateList(objHttp, resposeList) {
    var buffer, list, i, key, name;
    var error = false;
    var app = {};
    for (key in resposeList.lists) {
        console.log('1-' + key);
        name = key.match(checkListsRex)[0];
        console.log('1-' + name);
        app[name] = new GoogList((backgroundPage[name]));
        app[name].setExpiration(resposeList.TTL);
        console.log('1-' + app[name].expiration);
    }
    for (key in resposeList.lists) {
        console.log('2-' + key);
        name = key.match(checkListsRex)[0];
        list = resposeList.lists[key];

        for (i = 0; i < list.add_del.length; i++) {
            app[name].deleteChunk(list.add_del[i], 'add');
        }
        for (i = 0; i < list.sub_del.length; i++) {
            app[name].deleteChunk(list.sub_del[i], 'sub');
        }
        app[name].fillAppList();
        for (i = 0; i < list.redirect_urls.length; i++) {
            buffer = request(objHttp, list.redirect_urls[i], false);
            if (objHttp.status != 200) {
                console.log('3- ' + status);
                error = true;
                break;
            }
            if (!app[name].parseBuffer(buffer))
                return null;
        }
        if (error)
            break;
    }
    chrome.storage.local.set(app);
    if (error)
        return false;
    chrome.alarms.create('next', {'when': Date.now() + (resposeList.TTL)});
}

function downloadLists() {

    var objHttp, res, body;
    objHttp = createXMLHttp();
    res = request(objHttp, urlList, false);
    if (objHttp.status != 200) {
        errorState++;
        console.log('list: \n' + objHttp.status);
        if (errorState == 2)
            delay = baseDelay;
        else if (errorState > 2)
            delay = delay * 2;
        else if (errorState > 5)
            delay = 480 * 60 * 1000;
        return delay;
    }
    body = createDownloadBody(res);
    res = request(objHttp, urlDownload, body, false);
    if (objHttp.status != 200) {
        errorState++;
        console.log('download');
        if (errorState == 2)
            delay = baseDelay;
        else if (errorState > 2)
            delay = delay * 2;
        else if (errorState > 5)
            delay = 480 * 60 * 1000;
        return delay;
    }

    var resposeList = new ResponseLists();
    if (!resposeList.parse(res)) {
        console.log('Error parsing [Add|Sub]_del Header');
        return false;
    }

    if (resposeList.reset) {
        //    Gestisci reset
    }

    objHttp = createXMLHttp('arraybuffer');
    res = updateList(objHttp, resposeList); //manca gestione errori
    if (typeof res === 'boolean') {
        errorState++;
        if (errorState == 2)
            delay = baseDelay;
        else if (errorState > 2)
            delay = delay * 2;
        else if (errorState > 5)
            delay = 480 * 60 * 1000;
        return delay;
    } else if (res == null) {
        //Errore nel parse
        return false;
    }

    errorState = 0;
    delay = 1 * 60 * 1000;
    return true;
}