var PathControl = function() {
    var _configList = [
        { 'type': 'eclipse', 'argNameList': ['a', 'b', 'ω'], 'default': [2, 1, 1] },
        { 'type': 'polygon', 'argNameList': ['r', 'n', 'v'], 'default': [1, 4, 1] },
        { 'type': 'y-sin', 'argNameList': ['a', 'ω'], 'default': [1, 1] },
    ];
    var _typeList = ['eclipse', 'polygon', 'y-sin']
    var _type;
    var _argList;

    this.getTypeList = function() {
        return _typeList;
    }
    this.init = function(type) {
        _type = _typeList[parseInt(type)];
        _argList = _configList[parseInt(type)]['default'];
        return _configList[parseInt(type)];
    }
    this.setArgList = function(argList) {
        _argList = argList;
    }
    this.setArg = function(vid, value) {
        _argList[vid] = value;
    }
    this.updatePos = function(pos) {
        // ms => sec
        var t = (new Date()).getTime() / 1000;
        if (_type == 'eclipse') {
            var a = _argList[0];
            var b = _argList[1];
            var w = _argList[2];
            pos.x = a * Math.sin(w * t);
            pos.z = b * Math.cos(w * t);
        } else if (_type == 'polygon') {
            // TODO add start point
            var r = _argList[0];
            var n = _argList[1];
            var v = _argList[2];

            var seg = Math.PI * 2 / n;
            var num = Math.floor(v * t / seg); // quotient
            var rem = v * t / seg - num; // remainder
            var p0x = r * Math.sin(num * seg);
            var p0y = r * Math.cos(num * seg);
            var p1x = r * Math.sin((num + 1) * seg);
            var p1y = r * Math.cos((num + 1) * seg);

            pos.x = p0x * (1 - rem) + p1x * rem;
            pos.z = p0y * (1 - rem) + p1y * rem;

        } else if (_type == 'y-sin') {
            var a = _argList[0];
            var w = _argList[1];
            pos.y = a * Math.sin(w * t);
        }
    }
}