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
        aNum = backgroundPage.phishing.getNumbers('add');
        if (aNum) {
            body = body + 'a:' + parseIntArrayToStr(aNum);
        }
        sNum = backgroundPage.phishing.getNumbers('sub');
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
    var buffer, list, ok, i, key;
    for (key in resposeList.lists) {
        ok = true;
        if (key == 'goog-malware-shavar') {
            var malware = backgroundPage.malware;
            malware.setExpiration(resposeList.TTL);
            list = resposeList.lists[key];
            for (i = 0; i < list.add_del.length; i++) {
                malware.deleteChunk(list.add_del[i], 'add');
            }
            for (i = 0; i < list.sub_del.length; i++) {
                malware.deleteChunk(list.sub_del[i], 'sub');
            }
            malware.fillAppList();
            for (i = 0; i < list.redirect_urls.length && ok; i++) {
                buffer = request(objHttp, list.redirect_urls[i], false);
                if (objHttp.status != 200)
                    break;
                ok = malware.parseBuffer(buffer);
            }
            if (ok)
                chrome.storage.local.set({'malware': malware});
            //chrome.extension.getBackgroundPage().malware = malware;
        }
        if (key == 'googpub-phish-shavar') {
            var phishing = backgroundPage.phishing;
            phishing.setExpiration(resposeList.TTL);
            list = resposeList.lists[key];
            for (i = 0; i < list.add_del.length; i++) {
                phishing.deleteChunk(list.add_del[i], 'add');
            }
            for (i = 0; i < list.sub_del.length; i++) {
                phishing.deleteChunk(list.sub_del[i], 'sub');
            }
            phishing.fillAppList();
            for (i = 0; i < list.redirect_urls.length && ok; i++) {
                buffer = request(objHttp, list.redirect_urls[i], false);
                if (objHttp.status != 200)
                    break;
                ok = phishing.parseBuffer(buffer);
            }
            if (ok)
                chrome.storage.local.set({'phishing': phishing});
            //chrome.extension.getBackgroundPage().phishing = phishing;
        }
    }
}

function downloadLists() {

    var objHttp, res, body;
    objHttp = createXMLHttp();
    res = request(objHttp, urlList, false);
    body = createDownloadBody(res);
    res = request(objHttp, urlDownload, body, false);

    var resposeList = new ResponseLists();
    resposeList.parse(res);

    if (resposeList.reset) {
        //    Gestisci reset
    }

    objHttp = createXMLHttp('arraybuffer');
    updateList(objHttp, resposeList); //manca gestione errori
}