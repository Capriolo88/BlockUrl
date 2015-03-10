/**
 * Created by Capriolo on 21/02/2015.
 */
const ProtoBuf = dcodeIO.ProtoBuf;
const ByteBuffer = dcodeIO.ByteBuffer;
var builder = ProtoBuf.loadProtoFile("./lib/message.proto");
var ChunkData = builder.build("ChunkData");

// Utility Classe CursorString
function isPatternMatch(str, pattern) {
    return pattern instanceof RegExp ? pattern.test(str) : pattern === str;
}

function patternMatchIndexOf(str, pattern, start) {
    var offset = start;
    while (!isPatternMatch(str.charAt(offset), pattern) &&
    offset < str.length) {
        offset++;
    }
    return offset;
}

// Per Body
function parseStrToIntArray(str) {
    var array = str.split(",");
    var ret = [];
    var subarray, app, limit;
    for (i = 0; i < array.length; i++) {
        if (/^([0-9]+)$/.test(array[i])) {
            ret.push(parseInt(array[i]));
        } else if (/^([0-9]+)-([0-9]+)$/.test(array[i])) {
            subarray = array[i].split('-');
            app = parseInt(subarray[0]);
            limit = parseInt(subarray[1]);
            while (app < limit + 1) {
                ret.push(app), app++;
            }
        } else
            return null;
    }
    return ret;
}

function parseIntArrayToStr(array) {
    var str = '';
    if (array.length == 1)
        str = str + array[0];
    else {
        var i = 1, p = array[0], l = 0, app = p;
        while (i < array.length) {
            if (array[i] == app + 1) {
                app = array[i], l = app;
            } else if (l > p) {
                if (l - p == 1)
                    str = str + p + ',' + l + ',';
                else
                    str = str + p + '-' + l + ',';
                l = 0, p = array[i], app = p;
            } else
                str = str + p + ',', p = array[i], app = p;
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


// Funzioni per canonicalizzare l'url
const PERCENT_ESCAPE = /%([A-Fa-f0-9]{2})/g;
const ESCAPED_CHARCODES = [35, 37];

function hasPercentEscape(url) {
    return PERCENT_ESCAPE.test(url);
}

function getDecodedURI(uri) {
    return uri.replace(PERCENT_ESCAPE, function (match, p1) {
        return String.fromCharCode(parseInt(p1, 16));
    });
}

function getEncodedCharCode(charCode) {
    var hex = charCode.toString(16);
    return hex.length < 2 ? '%0' + hex : '%' + hex;
}

function getEncodedURI(uri) {
    var encodedURI = '';
    for (var i = 0; i < uri.length; i++) {
        var code = uri.charCodeAt(i);
        if (code <= 32 || code >= 127 || ESCAPED_CHARCODES.indexOf(code) !== -1) {
            encodedURI += getEncodedCharCode(code);
        } else {
            encodedURI += uri.charAt(i);
        }
    }
    return encodedURI;
}

function getEntirelyDecodedURI(uri) {
    while (hasPercentEscape(uri)) {
        uri = getDecodedURI(uri);
    }
    return uri;
}

function getCanonicalizedHostname(hostname) {
    if (/^[0-9]+$/.test(hostname)) {
        var ret = '', n = parseInt(hostname, 10);
        for (var i = 0; i < 3; i++) {
            ret = '.' + (n % 256) + ret;
            n = Math.trunc(n / 256);
        }
        ret = n + ret;
        return ret;
    }
    return getEncodedURI(
        getEntirelyDecodedURI(hostname.toLowerCase())
            .replace(/^\.+/, '')
            .replace(/\.+$/, '')
            .replace(/\.+/, '.')
    );
}

function getCanonicalizedPathname(pathname) {
    return getEncodedURI(
        getEntirelyDecodedURI('/' + pathname)
            .replace('/./', '/')
            .replace(/[^\/]+\/\.\./, '')
            .replace(/\/+/, '/')
    );
}

function getCanonicalizedURL(url) {
    url = url.trim();
    url = url.replace(/[\t\r\n]/g, '');

    var cursor = new StringCursor(url);
    var protocol = cursor.chompUntilIfExists(':') || 'http';
    cursor.chompWhile('/');
    var host = cursor.chompUntil('/').split(':');
    var hostname = host[0];
    var port = host[1] || null;


    var localCursor = new StringCursor(cursor.chompRemaining());
    var pathCursor = new StringCursor(localCursor.chompUntil('#'));
    var pathname = pathCursor.chompUntil('?');
    var search = pathCursor.chompRemaining();

    var f = {
        protocol: protocol,
        hostname: getCanonicalizedHostname(hostname),
        port: port,
        pathname: getCanonicalizedPathname(pathname),
        search: search
    };

    return f.protocol + '://' + f.hostname + (f.port ? ':' + f.port : '') + f.pathname + (search ? '?' + search : '');
}

// Funzioni per il lookup dell'url canonicalizzato
const HOSTNAME_IP_PATTERN = /\d+\.\d+\.\d+\.\d+/;
const HOSTNAME_SEPARATOR = '.';
const MAX_HOSTNAME_SEGMENTS = 5;

const PATH_SEPARATOR = '/';
const MAX_PATH_SEGMENTS = 4;

function getHostnameExpressions(hostname) {
    if (HOSTNAME_IP_PATTERN.test(hostname)) {
        return [hostname];
    }

    var baseExpression = hostname
        .split(HOSTNAME_SEPARATOR)
        .reverse()
        .slice(0, MAX_HOSTNAME_SEGMENTS)
        .reverse();

    var numExpressions = Math.min(MAX_HOSTNAME_SEGMENTS, baseExpression.length) - 1;
    var expressions = [];

    for (var i = 0; i < numExpressions && expressions.length != 5; i++) {
        expressions.push(baseExpression.slice(i).join('.'));
    }
    if (expressions.indexOf(hostname) == -1)
        expressions.reverse().push(hostname), expressions.reverse();

    return expressions;
}

function getPathExpressions(pathname, search) {
    var baseExpression = pathname.split(PATH_SEPARATOR);
    if (baseExpression[baseExpression.length - 1] == '')
        baseExpression.pop();
    baseExpression = baseExpression.slice(0, MAX_PATH_SEGMENTS);

    var numExpressions = Math.min(MAX_PATH_SEGMENTS, baseExpression.length);

    var expressions = [pathname];
    if (search)
        expressions.push(pathname + search);

    for (var i = 0; i < numExpressions; i++) {
        expressions.push(baseExpression.slice(0, i).join('/'));
    }

    return expressions;
}

function getLookupExpressions(canonicalized) {
    var cursor = new StringCursor(canonicalized);

    // Drop the scheme.
    cursor.chompUntil(':');
    cursor.skip(2);

    var hostname = cursor.chompUntil('/');
    var pathname = cursor.chompUntil('?');
    var search = cursor.chompRemaining();

    var hostnames = getHostnameExpressions(hostname);

    var paths = getPathExpressions(pathname, search.length == 0 ? null : '?' + search);

    return hostnames.reduce(function (exprs, hostname) {
        return exprs.concat(paths.map(function (path) {
            return hostname + '/' + path;
        }));
    }, []);
}


var Hashes = {
    PREFIX_4B: 4,
    PREFIX_32B: 32,
    getHashObject: function (expr, pref_type) {
        if (typeof pref_type === 'undefined')
            pref_type = this.PREFIX_4B;
        var hex = CryptoJS.SHA256(expr).toString(CryptoJS.enc.Hex);

        return {
            hash: hex,
            prefix: hex.slice(0, pref_type * 2)
        };
    }
};