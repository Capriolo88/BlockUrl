//Web Request

function createXMLHttp(type, handler) {
    var xmlhttp = new XMLHttpRequest();
    if (typeof type === 'function')
        handler = type, type = null;
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

function request(objHttp, url, body, async) {
    if (typeof body === 'boolean')
        async = body, body = null;
    else if (typeof async === 'null' || typeof async === 'undefined')
        async = true;
    if (!body && typeof body !== 'boolean')
        body = null;
    objHttp.open('POST', url, async);
    objHttp.send(body);

    if (!async)
        return objHttp.response;
    return true;
}

//function requestChunk(url, iter) {
//    var xmlhttp = new XMLHttpRequest(),
//        deferred = Q.defer();
//    xmlhttp.responseType = 'arraybuffer';
//    xmlhttp.open('POST', url, true);
//    xmlhttp.onreadystatechange = function () {
//        if (xmlhttp.readyState !== 4)
//            return;
//
//        if (xmlhttp.status === 200) {
//            deferred.resolve({
//                'r': xmlhttp.response,
//                'i': iter
//            });
//        } else
//            deferred.reject({
//                'status': xmlhttp.status,
//                'statusText': xmlhttp.statusText
//            });
//    };
//
//    xmlhttp.send(null);
//
//    return deferred.promise;
//}


