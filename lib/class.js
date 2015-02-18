function pageMap(){

	this._map = {};
	var counter = 0;

	this.increment = function(){
		counter++;
	};

	this.decrement = function(){
		counter--;
	};

	this.length = function(){
		return counter;
	};
};

pageMap.prototype = {

	set: function(id, url){
		
		if(this.has(id)){
			if(this._map[id].url == url)
				return false;
			else {
				this._map[id].url = url;
				this._map[id].checked = false;
			}
		} else {
			this.increment();
			this._map[id] = {url : url,
							 checked : false};
		}
		return true;
	},

	check: function(id,check){
		this._map[id].checked = check;
	},

	getUrl: function(id){
		return this._map[id].url;
	},

	delete: function(id){
		if(this.has(id)){
			delete this._map[id];
			this.decrement();
			return true;
		}
		return false;
	},

	clean: function(){
		for (id in this._map){
			delete this._map[id];
			this.decrement();
		}
	},

	
	has: function(id){
		return id in this._map;
	},

	isChecked: function(id){
		if(this.has(id)){
			if(this._map[id].checked)
				return true;
			else
				return false;
		} else
			return false;
	}

};


function WhiteList(obj){
	if(!obj){
		this._map = {};
		this.length = 0;
		this.cleaned = false;
	} else {
		this._map = obj._map;
		this.length = obj.length;
		this.cleaned = obj.cleaned;
	}
	
	var TTL = 12*60*60*1000;
	

};

WhiteList.prototype = {

	set: function(url){
		var d = new Date();
		var now = d.getTime();
		if(this.has(url)){
			if(this._map[url] > now)
				return false;
			else
				this._map[url] = (now + this.TTL);
		} else {
			this._map[url] = (now + this.TTL);
			this.length++;
		}
		return true;	
	},

	delete: function(url){
		if(url in this._map){
			delete this._map[url];
			this.length--;
			return true;
		}
		return false;
	},

	deleteAll: function(){
		for (url in this._map){
			delete this._map[url];
			this.length--;
		}
	},

	clean: function(){
		var d = new Date();
		var now = d.getTime();
		var i=0;
		for(url in this._map){
			if(this._map[url]<=now){
				delete this._map[url];
				this.length--;
				i++;
			}
		}
		console.log(i);
		this.cleaned = true;
	},
	
	has: function(url){
		if(url in this._map){
			return this._map[url];
		} else {
			return 0;
		}
	},

	isExpired: function(url){
		var exp = this.has(url);
		var d = new Date();
		if(exp<=d.getTime())
			return true;
		else
			return false;
	}

};