/**
 * Created by Capriolo on 21/02/2015.
 */
const ProtoBuf = dcodeIO.ProtoBuf;
var builder = ProtoBuf.loadProtoFile("./lib/message.proto");
var ChunkData = builder.build("ChunkData");

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

function parseStrToIntArray(str) {
    var array = str.split(",");
    var ret = [];
    var subarray, app;
    for (i = 0; i < array.length; i++) {
        if (array[i].contains('-')) {
            subarray = array[i].split('-');
            app = parseInt(subarray[0]);
            while (app < parseInt(subarray[1]) + 1) {
                ret.push(app), app++;
            }
        } else {
            ret.push(parseInt(array[i]));
        }
    }
    return ret;
}

function parseIntArrayToStr(array) {
    var str = '';
    if (array.length == 1) {
        str = str + array[0];
    } else {
        var i = 1, p = array[0], l = 0, app = p;
        while (i < array.length) {
            if (array[i] == app + 1) {
                app = array[i], l = app;
            } else {
                if (l > p) {
                    if (l - p == 1)
                        str = str + p + ',' + l + ',';
                    else
                        str = str + p + '-' + l + ',';
                    l = 0, p = array[i], app = p;
                } else {
                    str = str + p + ',', p = array[i], app = p;
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