var PathControl = function() {
    var _configList = [
        { 'type': 'eclipse', 'argNameList': ['a', 'b', 'ω'], 'default': [1, 1, 1] },
        { 'type': 'polygon', 'argNameList': ['r', 'n', 'v'], 'default': [1, 3, 1] },
        { 'type': 'y-sin', 'argNameList': ['ω'], 'default': [1] },
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
    this.changeArg = function(argList) {
        _argList = argList;
    }
    this.updatePos = function(pos) {
        var t = (new Date()).getTime();
        if (_type == 'eclipse') {
            var a = _argList[0];
            var b = _argList[1];
            var w = _argList[2];
            pos.x = a * Math.sin(w * t);
            pos.z = b * Math.cos(w * t);
        } else if (_type == 'polygon') {
            // TODO
        } else if (_type == 'y-sin') {
            var w = _argList[0];
            pos.y = b * Math.sin(w * t);
        }
    }
}