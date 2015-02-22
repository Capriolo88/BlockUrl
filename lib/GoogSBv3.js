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

const backgroundPage = chrome.extension.getBackgroundPage();


function createDownloadBody(res) {
    var body = '', aNum, sNum;
    if (res.search('goog-malware-shavar') != -1) {
        body = body + 'goog-malware-shavar' + ';';
        aNum = backgroundPage.malware.getNumbers('add');
        if (aNum) {
            body = body + 'a:' + arrayToString(aNum);
        }
        sNum = backgroundPage.malware.getNumbers('sub');
        if (sNum) {
            if (aNum)
                body += ':';
            body = body + 's:' + arrayToString(sNum);
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
    var app = {};
    for (key in resposeList.lists) {
        name = key.match(/(malware|phish)/)[0];
        app[name] = new GoogList((backgroundPage[name]));
        app[name].setExpiration(resposeList.TTL);
    }
    for (key in resposeList.lists) {
        name = key.match(/(malware|phish)/)[0];
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
            if (objHttp.status != 200)
                break;
            if (!app[name].parseBuffer(buffer))
                return false;
        }
    }
    chrome.storage.local.set(app);
    chrome.alarms.create('next', {'when': Date.now() + (resposeList.TTL * 1000)});
// Aggiungere timer per nuova richiesta
}

function downloadLists() {

    var objHttp, res, body;
    objHttp = createXMLHttp();
    res = request(objHttp, urlList, false);
    body = createDownloadBody(res);
    res = request(objHttp, urlDownload, body, false);

    var resposeList = new ResponseLists();
    if (!resposeList.parse(res)) {
        console.log('Error parsing [Add|Sub]_del Header');
        return;
    }

    if (resposeList.reset) {
        //    Gestisci reset
    }

    objHttp = createXMLHttp('arraybuffer');
    updateList(objHttp, resposeList); //manca gestione errori
}