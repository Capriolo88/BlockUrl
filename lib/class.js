function PageMap() {

    this._map = {};

};

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
        for (id in this._map) {
            delete this._map[id];
        }
    },


    has: function (id) {
        return id in this._map;
    },

    isChecked: function (id) {
        if (this.has(id)) {
            if (this._map[id].checked)
                return true;
            else
                return false;
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

    var TTL = 60 * 60 * 1000;
};

WhiteList.prototype = {

    set: function (url) {
        var d = new Date();
        var now = d.getTime();
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
        for (url in this._map) {
            delete this._map[url];
            this.length--;
        }
    },

    clean: function () {
        var d = new Date();
        var now = d.getTime();
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
        var d = new Date();
        if (exp <= d.getTime())
            return true;
        else
            return false;
    }
};

function GoogList(obj) {
    if (!obj) {
        this._map = {add: {}, sub: {}};
        this._app = {};
        this.expiration = 0;
    } else {
        this._map = obj._map;
        this._app = obj_app;
        this.expiration = obj.expiration;
    }
};

GoogList.prototype = {

    setExpiration: function (TTL) {
        var d = new Date();
        var now = d.getTime();
        this.expiration = now + TTL * 1000;
    },

    isExpired: function () {
        var d = new Date();
        if (this.expiration <= d.getTime())
            return true;
        else
            return false;
    },

    /**
     * Inserisce nella lista il 'chunk'
     * @param {ChunkData} chunk ChunkData message parsed
     * @expose
     */
    insert: function (chunk) {
        if (chunk.chunk_type == 1) {
            if (chunk.chunk_number in this._app && chunk.hashes.length != 0)
                delete this._app[chunk.chunk_number];
            else if (chunk.chunk_number in this._map.add && chunk.hashes.length == 0)
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
                    deleted = deleteChunk(chunk.add_numbers[i], 'add');
                    if (!deleted) {
                        this._app[chunk.add_numbers[i]] = null;
                    }
                }
            }
        }
    },

    getNumbers: function (type) {
        if (this._map[type].length == 0)
            return null;
        var app = [];
        for (id in this._map[type])
            app.push(id);
        app.sort(function (a, b) {
            return a - b;
        });
        return app;
    },

    fillAppList: function () {
        var chunk, i;
        for (chunk of this._map.sub) {
            if (chunk.add_numbers.length != 0)
                for (i = 0; i < chunk.add_numbers.length; i++)
                    this._app[chunk.add_numbers[i]] = null;
        }
    },

    deleteChunk: function (id, type) {
        if (id in this._map[type]) {
            delete this._map[type][id];
            return true;
        }
        return false;
    },


    deleteLists: function () {
        for (id in this._map.add)
            delete this._map.add[id];
        for (id in this._map.sub)
            delete this._map.sub[id];
    },

    deleteAppList: function () {
        for (id in this._app)
            delete this._app[id];
    }

};