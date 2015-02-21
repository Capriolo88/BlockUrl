//Web Request

function createXMLHttp(type, handler) {
    var xmlhttp = new XMLHttpRequest();
    if (type && typeof type === 'function')
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
    if (body && typeof body === 'boolean')
        async = body, body = null;
    else if (typeof async === 'null' || typeof async === 'undefined')
        async = true;
    if (typeof body === 'undefined')
        body = null;
    objHttp.open('POST', url, async);
    objHttp.send(body);

    if (!async)
        return objHttp.response;
    return true;
}


