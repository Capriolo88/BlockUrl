'use strict'
function PageMap() {
    this._map = {};
}

PageMap.prototype = {

    set: function (id, url) {

        if (this.has(id)) {
            if (this._map[id].url == url)
                return false;
            else {
                this._map[id].url = url;
                this._map[id].checked = false;
            }
        } else {
            this._map[id] = {
                url: url,
                checked: false
            };
        }
        return true;
    },

    check: function (id, check) {
        this._map[id].checked = check;
    },

    getUrl: function (id) {
        return this._map[id].url;
    },

    delete: function (id) {
        if (this.has(id)) {
            delete this._map[id];
            return true;
        }
        return false;
    },

    clean: function () {
        for (var id in this._map) {
            delete this._map[id];
        }
    },

    has: function (id) {
        return id in this._map;
    },

    isChecked: function (id) {
        if (this.has(id)) {
            return this._map[id].checked;
        } else
            return false;
    }
};

function WhiteList(obj) {
    if (!obj) {
        this._map = {};
        this.length = 0;
        this.cleaned = false;
    } else {
        this._map = obj._map;
        this.length = obj.length;
        this.cleaned = obj.cleaned;
    }
    this.TTL = 60 * 60 * 1000;
}

WhiteList.prototype = {

    set: function (url) {
        var now = Date.now();
        if (this.has(url)) {
            if (this._map[url] > now)
                return false;
            else
                this._map[url] = (now + this.TTL);
        } else {
            this._map[url] = (now + this.TTL);
            this.length++;
        }
        return true;
    },

    delete: function (url) {
        if (url in this._map) {
            delete this._map[url];
            this.length--;
            return true;
        }
        return false;
    },

    deleteAll: function () {
        for (var url in this._map) {
            delete this._map[url];
            this.length--;
        }
    },

    clean: function () {
        var now = Date.now();
        for (url in this._map) {
            if (this._map[url] <= now) {
                delete this._map[url];
                this.length--;
            }
        }
        this.cleaned = true;
    },

    has: function (url) {
        if (url in this._map) {
            return this._map[url];
        } else {
            return 0;
        }
    },

    isExpired: function (url) {
        var exp = this.has(url);
        return exp <= Date.now();
    }
};

function GoogList(obj) {
    if (typeof obj === 'string') {
        this.name = obj;
        this._map = {add: {}, sub: {}};
        this._app = {};
        this.expiration = 0;
    } else {
        this.name = obj.name;
        if (typeof obj._map === 'string')
            this._app = {}, this._map = JSON.parse(obj._map);
        else
            this._app = obj._app, this._map = obj._map;
        this.expiration = obj.expiration;
    }
}

GoogList.prototype = {

    setExpiration: function (TTL) {
        this.expiration = Date.now() + TTL;
    },

    isExpired: function () {
        return this.expiration <= Date.now();
    },

    /**
     * Inserisce nella lista il 'chunk'
     * @param {ChunkData} chunk ChunkData message parsed
     * @expose
     */
    insert: function (chunk) {
        if (chunk.chunk_type == 0) {
            if (chunk.chunk_number in this._app && chunk.hashes)
                delete this._app[chunk.chunk_number];
            else if (chunk.chunk_number in this._map.add && !chunk.hashes)
                return;
            else
                this._map.add[chunk.chunk_number] = chunk;
        } else {
            if (chunk.chunk_number in this._map.sub)
                return;
            this._map.sub[chunk.chunk_number] = chunk;
            if (chunk.add_numbers.length != 0) {
                var deleted;
                for (var i = 0; i < chunk.add_numbers.length; i++) {
                    deleted = this.deleteChunk(chunk.add_numbers[i], 'add');
                    if (!deleted) {
                        this._app[chunk.add_numbers[i]] = null;
                    }
                }
            }
        }
    },

    parseBuffer: function (buffer) {
        var dataView = new DataView(buffer);
        var dim, data, i = 0;
        var chunk;
        while (i < buffer.byteLength) {
            dim = dataView.getUint32(i);
            i += 4;
            data = buffer.slice(i, i + dim);
            try {
                chunk = ChunkData.decode(data);
            } catch (e) {
                if (e.decoded) { // Truncated
                    console.log("ci entro?");
                    console.log(e.decoded + '\n\n');
                }
                return false;
            }
            this.insert(chunk);
            i += dim;
        }
        return true;
    },

    // togliere length, sugli oggetti usare Object.keys(obj).length
    getNumbers: function (type) {
        if (typeof this._map[type].length !== 'number' || this._map[type].length == 0)
            return null;
        var app = [];
        for (var id in this._map[type])
            app.push(id);
        app.sort(function (a, b) {
            return a - b;
        });
        return app;
    },

    // togliere length, sugli oggetti usare Object.keys(obj).length
    fillAppList: function () {
        if (typeof this._map.sub.length !== 'number' || this._map.sub.length == 0)
            return;
        var chunk, i;
        this.deleteAppList();
        for (chunk of this._map.sub) {
            for (i = 0; i < chunk.add_numbers.length; i++)
                this._app[chunk.add_numbers[i]] = null;
        }
    },

    getSerializable: function () {
        return {name: this.name, expiration: this.expiration, _map: JSON.stringify(this._map)};
    },

    loadFrom: function (obj) {
        this.deleteAll();
        this.name = obj.name;
        this._map = JSON.parse(obj._map);
        //this._app = {};
        this.expiration = obj.expiration;
    },

    deleteChunk: function (id, type) {
        if (id in this._map[type]) {
            delete this._map[type][id];
            return true;
        }
        return false;
    },

    deleteLists: function () {
        var id;
        for (id in this._map.add)
            delete this._map.add[id];
        for (id in this._map.sub)
            delete this._map.sub[id];
    },

    deleteAppList: function () {
        for (var id in this._app)
            delete this._app[id];
    },

    deleteAll: function () {
        this.deleteLists();
        this.deleteAppList();
    }
};

function List(name) {
    this.name = name;
    this.redirect_urls = [];
    this.add_del = [];
    this.sub_del = [];
}

function ResponseLists() {
    this.TTL = 0;
    this.reset = false;
    this.lists = null;
}

ResponseLists.prototype = {
    insertList: function (name) {
        if (this.lists == null)
            this.lists = {};
        this.lists[name] = new List(name);
    },

    has: function (str) {
        return str in this.lists;
    },

    deleteAll: function () {
        for (var l in this.lists)
            delete this.lists[l];
    },

    parse: function (res) {
        var arrayRes = res.split("\n"), code, val, app;
        var list_name;
        for (var i = 0; i < arrayRes.length; i++) {
            code = arrayRes[i].charAt(0);
            switch (code) {
                case 'n':
                    val = arrayRes[i].slice(2);
                    this.TTL = parseInt(val, 10) * 1000;
                    break;
                case 'r':
                    this.reset = true;
                    break;
                case 'i':
                    val = arrayRes[i].slice(2);
                    this.insertList(val);
                    list_name = val;
                    break;
                case 'u':
                    val = arrayRes[i].slice(2);
                    this.lists[list_name].redirect_urls.push("https://" + val);
                    break;
                case 'a':
                    val = arrayRes[i].slice(3);
                    app = parseStrToIntArray(val);
                    if (app == null)
                        return false;
                    this.lists[list_name].add_del = app;
                    break;
                case 's':
                    val = arrayRes[i].slice(3);
                    app = parseStrToIntArray(val);
                    if (app == null)
                        return false;
                    this.lists[list_name].sub_del = app;
                    break;
            }
        }
        return true;
    }
};
