window.onload = function() {
    var interface = new Interface();
    interface.init();
};

var Interface = function() {

    var _myRenderer;
    var _visualizer;

    var _ballList;
    var _ballStateLists;

    var _heightSlider;
    var _listener;
    var _musicList;
    var _soundList, _playTimeList;
    var _logTextarea;
    var _pathCtrlList;

    var WIDTH = 600,
        HEIGHT = 450;

    var FFTSIZE = 128;

    //
    // public methods
    //

    this.init = function() {

        _myRenderer = new MyRenderer();

        // add canvas to view
        var leftContainer = document.getElementById('left-canvas');
        _myRenderer.init(leftContainer, WIDTH, HEIGHT);
        _ballList = _myRenderer.getBallList();


        _heightSlider = document.createElement('INPUT');
        _heightSlider.type = 'range';
        _heightSlider.className = 'height-slider';
        _heightSlider.max = 0.4;
        _heightSlider.min = -0.4;
        _heightSlider.step = 0.005;
        _heightSlider.value = 0;
        leftContainer.appendChild(_heightSlider);


        // add visualizer
        _soundList = [];
        _playTimeList = [];
        _visualizer = new Visualizer(WIDTH, HEIGHT);
        //var visualizer = visualizerInit();
        var rightContainer = document.getElementById('right-tools');
        rightContainer.appendChild(_visualizer.init());

        // log textarea display
        var logDiv = document.createElement('div');
        logDiv.id = 'log-div';
        _logTextarea = document.createElement('textarea');
        _logTextarea.id = 'log';
        _logTextarea.setAttribute('readonly', 'readonly');
        logDiv.appendChild(_logTextarea);
        rightContainer.appendChild(logDiv);

        // music list display
        _musicList = [
            'ash.mp3',
            'donut\ hole.mp3',
        ]

        var musicCtrlDiv = document.createElement('div');
        musicCtrlDiv.id = 'music-ctrl';
        var musicListDiv = document.createElement('div');
        musicListDiv.id = 'music-list';
        var ctrlListDiv = document.createElement('div');
        ctrlListDiv.id = 'ctrl-list';

        var addMusicDiv = document.createElement('div');
        addMusicDiv.className = 'add-music';
        //addMusicDiv.textContent = '+';
        var fileInput = document.createElement('input');
        fileInput.id = 'music-upload';
        fileInput.type = 'file';
        fileInput.setAttribute('accept', 'audio/*');
        fileInput.onchange = function() {
            let sid = _soundList.length;
            _soundList.push(null);
            let soundFile = fileInput.files[0];
            let soundName = soundFile['name']
            let reader = new FileReader();
            reader.readAsDataURL(soundFile);
            reader.onload = function(e) {
                console.log(e, soundFile);
                addNewSongData(this.result, soundName, sid);
            }
            addNewSongDiv(soundName, sid, musicListDiv, ctrlListDiv);
        }

        addMusicDiv.appendChild(fileInput);
        musicListDiv.appendChild(addMusicDiv);

        musicCtrlDiv.appendChild(musicListDiv);
        musicCtrlDiv.appendChild(ctrlListDiv);
        rightContainer.appendChild(musicCtrlDiv);

        // path control window
        var pathControl = new PathControl();
        var typeList = pathControl.getTypeList()
        _pathCtrlList = [];

        var pathCtrlDiv = document.createElement('div');
        pathCtrlDiv.id = 'path-ctrl';
        var pathSelect = document.createElement('select');
        pathSelect.id = 'path-select';

        var emptyOption = document.createElement('option');
        emptyOption.textContent = '+';
        emptyOption.selected = 'selected';
        //emptyOption.style.display = 'none';
        pathSelect.append(emptyOption);

        for (tid in typeList) {
            let option = document.createElement('option');
            option.textContent = typeList[tid];
            option.value = tid;
            pathSelect.appendChild(option);
        }

        pathSelect.addEventListener('change', onPathSelectChange, false);
        pathCtrlDiv.appendChild(pathSelect);
        rightContainer.appendChild(pathCtrlDiv);


        // add listener for panning the obj in x-z plane
        var canvasUp = document.getElementById('canvas-up');
        canvasUp.addEventListener('mousedown', onMouseDown, false);
        // moving obj in y-axis
        canvasUp.addEventListener('wheel', onWheel, false);
        _heightSlider.addEventListener('mousemove', onHeightSliderChange);
        // auto resize
        window.addEventListener('resize', onWindowResize);
        onWindowResize();

        printLog('canvas initialized.\n');

        loadSongs(musicListDiv, ctrlListDiv);
        window._myRenderer = _myRenderer;

        mainAnimate();
    };

    //
    // internals
    //

    function mainAnimate() {
        requestAnimationFrame(mainAnimate);
        for (pid in _pathCtrlList) {
            if (_pathCtrlList[pid]['state']) {
                let bid = _pathCtrlList[pid]['bid'];
                if (bid > -1) {
                    _pathCtrlList[pid]['ctrl'].updatePos(_ballList[bid].position);
                }
            }
        }
        _myRenderer.renderCanvas();

        // update vertical-line position by playing time
        for (sid in _soundList) {
            if (_soundList[sid] != null && _soundList[sid]['play'] == true && sid != _movingIdx) {
                var audioCtx = _soundList[sid]['sound'].context;
                var barWidth = document.getElementsByClassName('song-container')[0].offsetWidth;
                var ptime = audioCtx.currentTime + _soundList[sid]['sound'].offset - _playTimeList[sid]['ctx-st'];
                if (ptime > _soundList[sid]['sound'].buffer.duration)
                    ptime = ptime % _soundList[sid]['sound'].buffer.duration;
                var leftPos = barWidth * ptime / _soundList[sid]['sound'].buffer.duration;
                _playTimeList[sid]['vline'].style.left = leftPos + 'px';
            }
        }
    }

    // add a new path
    function onPathSelectChange(e) {
        // build pathControl object
        var sel = parseInt(e.target.options[e.target.selectedIndex].value);
        var pathControl = new PathControl();
        _pathCtrlList.push({ 'ctrl': pathControl, 'state': true, 'bid': -1 });

        // one path-div contains type-name & arg-line & ball-select
        var pathDiv = document.createElement('div');
        pathDiv.id = _pathCtrlList.length - 1;
        pathDiv.className = 'path';

        var typeDiv = document.createElement('div');
        typeDiv.className = 'type-name';
        typeDiv.textContent = e.target.options[e.target.selectedIndex].textContent + ":";
        pathDiv.appendChild(typeDiv);

        var argLineDiv = document.createElement('div');
        argLineDiv.className = 'arg-line';

        // arg-line contains several [argument-div, value-input]
        var cfgList = pathControl.init(sel);
        for (idx in cfgList['argNameList']) {
            let argName = cfgList['argNameList'][idx];
            let argValue = cfgList['default'][idx];
            let argDiv = document.createElement('div');
            argDiv.className = 'arg-item';
            argDiv.textContent = argName + '=';
            let valDiv = document.createElement('input');
            valDiv.className = 'val-item';
            valDiv.id = idx;
            valDiv.value = argValue;
            valDiv.addEventListener('change', onArgValueChange, false);

            argLineDiv.appendChild(argDiv);
            argLineDiv.appendChild(valDiv);
        }
        pathDiv.appendChild(argLineDiv);

        var ballSelect = document.createElement('select');
        ballSelect.className = 'ball-select';
        for (let i = -1; i < 4; i++) {
            let option = document.createElement('option');
            option.textContent = i;
            option.value = i;
            ballSelect.appendChild(option);
        }
        ballSelect.addEventListener('change', onBallSelectChange, false);
        pathDiv.appendChild(ballSelect);

        var pathCtrlDiv = document.getElementById('path-ctrl');
        var pathSelect = document.getElementById('path-select');
        pathCtrlDiv.insertBefore(pathDiv, pathSelect);
        // reset selected index at default
        e.target.selectedIndex = 0;
    }

    function onBallSelectChange(e) {
        var pid = parseInt(e.target.parentNode.id);
        var bid = parseInt(e.target.options[e.target.selectedIndex].value);
        _pathCtrlList[pid]['bid'] = bid;
    }

    function onArgValueChange(e) {
        var pid = parseInt(e.target.parentNode.parentNode.id);
        var value = parseInt(e.target.value);
        var vid = parseInt(e.target.id);
        _pathCtrlList[pid]['ctrl'].setArg(vid, value);
    }


    function onWindowResize() {
        WIDTH = window.innerWidth * 2 / 3.1;
        HEIGHT = window.innerHeight * 1 / 2.1;
        _myRenderer.resizeCanvas(WIDTH, HEIGHT);

        _visualizer.setSize(WIDTH / 2, HEIGHT / 2);

        document.getElementById('left-canvas').style.width = WIDTH + 'px';
        document.getElementById('right-tools').style.width = WIDTH / 2 + 'px';
        document.getElementById('right-tools').style.height = HEIGHT * 2 + 'px';
    }

    // ************* first ball moving control
    // for convenience only ball[0] is movable
    var _mouse = new THREE.Vector2();
    var _panStart = new THREE.Vector2();
    var _panScale = new THREE.Vector2();
    var _movingState = 0;

    // check if mouse is click on the object
    function pickupObjects(e, object) {
        // to coord [-1, 1]
        _mouse.x = (e.offsetX / WIDTH) * 2 - 1;
        _mouse.y = -(e.offsetY / HEIGHT) * 2 + 1;
        // use raycaster to build
        var raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(_mouse, _myRenderer.getCameraUp());
        var intersects = raycaster.intersectObject(object);
        if (intersects.length) {
            _panScale.x = intersects[0].point.x / _mouse.x;
            _panScale.y = intersects[0].point.z / _mouse.y;
            _panStart.set(_mouse.x, _mouse.y);
            _movingState = 1;
        }
    }

    function onHeightSliderChange(event) {
        _ballList[0].position.y = _heightSlider.value;
        _myRenderer.renderOnce();
    }

    function onMouseDown(e) {
        e.preventDefault();
        switch (e.button) {
            case THREE.MOUSE.LEFT:
                pickupObjects(e, _ballList[0]);
                e.target.addEventListener('mousemove', onMouseMove, false);
                document.addEventListener('mouseup', onMouseUp, false);
                break;
        }
    }

    function onMouseMove(event) {
        event.preventDefault();
        if (!_movingState) return;

        _mouse.x = (event.offsetX / WIDTH) * 2 - 1;
        _mouse.y = -(event.offsetY / HEIGHT) * 2 + 1;

        _ballList[0].position.x += (_mouse.x - _panStart.x) * _panScale.x;
        _ballList[0].position.z += (_mouse.y - _panStart.y) * _panScale.y;

        _panStart.copy(_mouse);
        _myRenderer.renderOnce();
    }

    function onMouseUp(e) {
        e.preventDefault();
        if (e.target.id == 'canvas-up') {
            _movingState = 0;
            e.target.removeEventListener('mousemove', onMouseMove, false);
            document.removeEventListener('mouseup', onMouseUp, false);
        }
    }

    function onWheel(event) {
        event.preventDefault();
        if (event.deltaY < 0) _heightSlider.value = parseFloat(_heightSlider.value) - 0.05;
        if (event.deltaY > 0) _heightSlider.value = parseFloat(_heightSlider.value) + 0.05;
        onHeightSliderChange();
    }

    // *********** music list control

    function clickSong(e) {
        // if this song is playing, pause it
        // change the style of this DIV
        // change VisId for VisRender
        var sid = e.target.id;
        var nextVisId = -1;
        if (_soundList[sid] == null) return;
        if (_soundList[sid]['play'] == true) {
            _soundList[sid]['sound'].pause();
            _soundList[sid]['play'] = false;
            // update 'song-line' div
            e.target.classList.remove('active');
            for (ssid in _soundList) {
                if (_soundList[ssid] != null && _soundList[ssid]['play'] == true) {
                    nextVisId = ssid;
                }
            }
        } else {
            _soundList[sid]['sound'].play();
            _soundList[sid]['play'] = true;
            e.target.classList.add('active');
            nextVisId = sid;
            _playTimeList[sid]['ctx-st'] = _soundList[sid]['sound'].context.currentTime;
        }
        _visualizer.setNextVisId(nextVisId);
    }

    function loadSongs(musicListDiv, ctrlListDiv) {

        _ballStateLists = [];
        // init listener
        _listener = new THREE.AudioListener();
        _myRenderer.getMainMesh().add(_listener);

        // must use let sid, otherwise sid will always be the last id, when these audio is concurrently loaded
        for (let sid in _musicList) {
            _soundList.push(null);
            addNewSongData('assets/music/' + _musicList[sid], _musicList[sid], sid);
            addNewSongDiv(_musicList[sid], sid, musicListDiv, ctrlListDiv);
        }
    }

    function addNewSongData(URL, songName, sid) {
        let sound = new THREE.PositionalAudio(_listener);
        // load a sound and set it as the PositionalAudio object's buffer
        let audioLoader = new THREE.AudioLoader();
        audioLoader.load(URL, function(buffer) {
            sound.setBuffer(buffer);
            sound.setRefDistance(0.2);
            sound.loop = true;

            let analyserVis = new THREE.AudioAnalyser(sound, FFTSIZE);
            let uniformsVis = {
                tAudioData: { value: new THREE.DataTexture(analyserVis.data, FFTSIZE / 2, 1, THREE.LuminanceFormat) }
            };

            // loading is concurrent, so must use [sid] to save data
            _soundList[sid] = { 'id': sid, 'name': songName, 'sound': sound, 'uniformsVis': uniformsVis, 'analyserVis': analyserVis, 'play': false };
            console.log('song ' + sid + ': ' + songName + ' loaded');
            printLog('song ' + sid + ': ' + songName + ' loaded\n');

            _visualizer.updateSoundList(_soundList);
            //_sound.setMaxDistance(0.2);
            //_sound.play();
            //visualizerLoad(_sound);
        });

    }

    function addNewSongDiv(songName, sid, musicListDiv, ctrlListDiv) {
        // add new div for this song
        let songDiv = document.createElement('div');
        songDiv.textContent = songName;
        songDiv.className = 'song';
        songDiv.id = sid;
        songDiv.addEventListener('click', clickSong, false);
        // hover selector need a container as parentNode
        let songContainer = document.createElement('div');
        songContainer.className = 'song-container';
        songContainer.appendChild(songDiv);

        // vertical-line
        let vlineDiv = document.createElement('div');
        vlineDiv.className = 'vertical-line';
        vlineDiv.id = sid;
        vlineDiv.style.left = '0px';
        vlineDiv.addEventListener('mousedown', onVlineMouseDown, false);
        _playTimeList.push({ 'vline': vlineDiv, 'ctx-st': 0 });
        _visualizer.updatePlayTimeList(_playTimeList);

        let volumeSlider = document.createElement('INPUT');
        volumeSlider.id = sid;
        volumeSlider.type = 'range';
        volumeSlider.className = 'volume-slider';
        volumeSlider.max = 1;
        volumeSlider.min = 0;
        volumeSlider.step = 0.005;
        volumeSlider.value = 0.5;
        volumeSlider.addEventListener('mousemove', onVolumeSliderChange);
        let vsliderDiv = document.createElement('div');
        vsliderDiv.append(volumeSlider);

        // song-line contains song-container & vline
        let songlineDiv = document.createElement('div');
        songlineDiv.className = 'song-line';
        songlineDiv.append(songContainer);
        songlineDiv.append(vlineDiv);
        songlineDiv.append(vsliderDiv);
        // insert this song-line before music-upload node
        musicListDiv.insertBefore(songlineDiv, musicListDiv.lastChild);

        // control part
        let ctrlDiv = document.createElement('div');
        ctrlDiv.className = 'ctrl-sel';
        let stateList = []
        for (i = 0; i < 4; i++) {
            let ctrlItem = document.createElement('div');
            ctrlItem.textContent = String(i);
            ctrlItem.setAttribute('sid', sid);
            ctrlItem.setAttribute('cid', i);
            ctrlItem.className = 'ctrl-item c' + String(i);
            ctrlItem.addEventListener('click', clickCtrlItem, false);
            ctrlDiv.appendChild(ctrlItem);
            stateList.push(false);
        }
        ctrlListDiv.appendChild(ctrlDiv);
        _ballStateLists.push(stateList);
    }

    function onVolumeSliderChange(e) {
        let vol = e.target.value;
        let sid = e.target.id;
        _soundList[sid]['sound'].setVolume(vol);
    }

    // ************* vertical-line dragging control
    var _mouseStart;
    var _movingVline;
    var _movingIdx;

    function onVlineMouseDown(e) {
        e.preventDefault();
        switch (e.button) {
            case THREE.MOUSE.LEFT:
                _movingVline = e.target;
                _mouseStart = e.pageX;
                _movingIdx = parseInt(e.target.id);
                document.addEventListener('mousemove', onVlineMouseMove, false);
                document.addEventListener('mouseup', onVlineMouseUp, false);
                break;
        }
    }

    function onVlineMouseMove(e) {
        e.preventDefault();
        var left = _movingVline.style.left;
        var leftPos = parseFloat(left.slice(0, left.length - 2));
        var newLeft = leftPos + e.pageX - _mouseStart;
        _movingVline.style.left = newLeft + 'px';
        _mouseStart = e.pageX;
    }

    function onVlineMouseUp(e) {
        e.preventDefault();
        document.removeEventListener('mousemove', onVlineMouseMove, false);
        document.removeEventListener('mouseup', onVlineMouseUp, false);
        var left = _movingVline.style.left;
        var leftPos = parseFloat(left.slice(0, left.length - 2));
        var barWidth = document.getElementsByClassName('song-container')[0].offsetWidth;
        var ptime = leftPos * _soundList[_movingIdx]['sound'].buffer.duration / barWidth;
        if (ptime < 0) ptime = 0;
        else if (ptime > _soundList[_movingIdx]['sound'].buffer.duration)
            ptime = _soundList[_movingIdx]['sound'].buffer.duration;
        if (_soundList[_movingIdx]['sound']['play'] == true) {
            _soundList[_movingIdx]['sound'].pause();
            _soundList[_movingIdx]['sound'].offset = ptime;
            _soundList[_movingIdx]['sound'].play();
        } else _soundList[_movingIdx]['sound'].offset = ptime;

        _movingIdx = -1;
    }

    // click a ball to bind
    function clickCtrlItem(event) {
        var ctrlItem = event.target;
        var sid = parseInt(ctrlItem.getAttribute('sid'));
        var cid = parseInt(ctrlItem.getAttribute('cid'));

        _ballStateLists[sid][cid] = !_ballStateLists[sid][cid];
        if (_ballStateLists[sid][cid]) {
            ctrlItem.classList.add('active');
            _ballList[cid].add(_soundList[sid]['sound']);
        } else {
            ctrlItem.classList.remove('active');
            _ballList[cid].remove(_soundList[sid]['sound']);
        }
        var vis = false;
        for (ssid in _soundList) {
            if (_ballStateLists[ssid][cid]) {
                vis = true;
                break;
            }
        }
        _ballList[cid].material.visible = vis;
        _myRenderer.renderOnce();
    }

    function printLog(str) {
        _logTextarea.textContent += str;
        _logTextarea.scrollTop = _logTextarea.scrollHeight;
    }

};