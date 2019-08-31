window.onload = function() {
    var interface = new Interface();
    interface.init();
};

var Interface = function() {

    var _myRenderer;

    var _ballList;
    var _ballStateLists;

    var _slider;
    var _listener;
    var _musicList;
    var _soundList;
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


        _slider = document.createElement('INPUT');
        _slider.type = 'range';
        _slider.className = 'height-slider';
        _slider.max = 0.4;
        _slider.min = -0.4;
        _slider.step = 0.005;
        _slider.value = 0;
        leftContainer.appendChild(_slider);


        // add visualizer
        _soundList = [];
        var visualizer = visualizerInit();
        var rightContainer = document.getElementById('right-tools');
        rightContainer.appendChild(visualizer);

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
        emptyOption.style.display = 'none';
        pathSelect.append(emptyOption);

        for (tid in typeList) {
            let option = document.createElement('option');
            option.textContent = typeList[tid];
            option.value = tid;
            pathSelect.appendChild(option);
        }

        pathSelect.addEventListener('change', onSelectChange, false);
        pathCtrlDiv.appendChild(pathSelect);
        rightContainer.appendChild(pathCtrlDiv);


        // add listener for panning the obj in x-z plane
        var canvasUp = document.getElementById('canvas-up');
        canvasUp.addEventListener('mousedown', onMouseDown, false);
        // moving obj in y-axis
        canvasUp.addEventListener('wheel', onWheel, false);
        _slider.addEventListener('mousemove', onSliderChange);
        // auto resize
        window.addEventListener('resize', onWindowResize);
        onWindowResize();

        _myRenderer.renderCanvas();
        printLog('canvas initialized.\n');

        loadSongs(musicListDiv, ctrlListDiv);
        window._myRenderer = _myRenderer;

    };

    //
    // internals
    //

    function onSelectChange(e) {
        var sel = e.target.options[e.target.selectedIndex].value;
        var pathControl = new PathControl();

        var pathCtrlDiv = document.getElementById('path-ctrl');
        var pathDiv = document.createElement('div');
        pathDiv.className = 'path';
        var typeDiv = document.createElement('div');
        typeDiv.className = 'arg-item';
        typeDiv.textContent = e.target.options[e.target.selectedIndex].textContent;
        pathDiv.appendChild(typeDiv);

        var cfgList = pathControl.init(sel);
        for (idx in cfgList['argNameList']) {
            let argName = cfgList['argNameList'][idx];
            let argValue = cfgList['default'][idx];
            let argDiv = document.createElement('div');
            argDiv.className = 'arg-item';
            argDiv.textContent = argName + '=' + argValue;

            pathDiv.appendChild(argDiv);
        }
        var pathSelect = document.getElementById('path-select');
        pathCtrlDiv.insertBefore(pathDiv, pathSelect);
        e.target.selectedIndex = 0;
    }

    function onWindowResize() {
        WIDTH = window.innerWidth * 2 / 3.1;
        HEIGHT = window.innerHeight * 1 / 2.1;
        PixelRatio = 1
        _myRenderer.resizeCanvas(WIDTH, HEIGHT, PixelRatio);
        _renderVis.setSize(WIDTH / 2 * PixelRatio, HEIGHT / 2 * PixelRatio);

        document.getElementById('left-canvas').style.width = WIDTH + 'px';
        document.getElementById('right-tools').style.width = WIDTH / 2 + 'px';
        document.getElementById('right-tools').style.height = HEIGHT * 2 + 'px';
    }

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

    function onSliderChange(event) {
        _ballList[0].position.y = _slider.value;
        _myRenderer.renderCanvas();
    }

    function onMouseDown(event) {
        event.preventDefault();
        switch (event.button) {
            case THREE.MOUSE.LEFT:
                pickupObjects(event, _ballList[0]);
                var canvasUp = document.getElementById('canvas-up');
                canvasUp.addEventListener('mousemove', onMouseMove, false);
                canvasUp.addEventListener('mouseup', onMouseUp, false);
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
        _myRenderer.renderCanvas();
    }

    function onMouseUp(event) {
        event.preventDefault();
        _movingState = 0;
        var canvasUp = document.getElementById('canvas-up');
        canvasUp.removeEventListener('mousemove', onMouseMove, false);
        canvasUp.removeEventListener('mouseup', onMouseUp, false);
    }

    function onWheel(event) {
        event.preventDefault();
        if (event.deltaY < 0) _slider.value = parseFloat(_slider.value) - 0.05;
        if (event.deltaY > 0) _slider.value = parseFloat(_slider.value) + 0.05;
        onSliderChange();
    }

    // *********** visualizer content
    var _renderVis, _sceneVis, _cameraVis, _materialVis;
    var _currentVisId, _nextVisId;

    function visualizerInit() {
        _nextVisId = -1;
        _currentVisId = -1;

        _renderVis = new THREE.WebGLRenderer({ antialias: true });
        _renderVis.setSize(WIDTH / 2, HEIGHT / 2);
        _renderVis.setClearColor(0x000000);
        _renderVis.setPixelRatio(window.devicePixelRatio);

        _sceneVis = new THREE.Scene();
        _cameraVis = new THREE.Camera();

        //
        //window.addEventListener('resize', onResize, false);

        // draw the background color
        _renderVis.render(_sceneVis, _cameraVis);

        visualizerAnimate();
        return _renderVis.domElement;
    }

    function visualizerLoad(uniformsVis) {

        var VertexShaderSrc = `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = vec4( position, 1.0 );
            }
        `;
        var FragmentShaderSrc = `
            uniform sampler2D tAudioData;
            varying vec2 vUv;
            void main() {
                vec3 backgroundColor = vec3( 0.125, 0.125, 0.125 );
                vec3 color = vec3( 1.0, 1.0, 0.0 );
                float f = texture2D( tAudioData, vec2( vUv.x, 0.0 ) ).r;
                float i = step( vUv.y, f ) * step( f - 0.0125, vUv.y );
                gl_FragColor = vec4( mix( backgroundColor, color, i ), 1.0 );
            }
        `;
        _materialVis = new THREE.ShaderMaterial({
            uniforms: uniformsVis,
            vertexShader: VertexShaderSrc,
            fragmentShader: FragmentShaderSrc
        });
        var geometry = new THREE.PlaneBufferGeometry(1.95, 1.95);
        var mesh = new THREE.Mesh(geometry, _materialVis);
        _sceneVis = new THREE.Scene(); // refresh the scene
        _sceneVis.add(mesh);
    }

    function visualizerAnimate() {
        requestAnimationFrame(visualizerAnimate);
        visualizerRender();
    }

    function visualizerRender() {

        if (_soundList.length == 0) return;

        if (_currentVisId != _nextVisId) {
            _currentVisId = _nextVisId;
            if (_currentVisId != -1) {
                visualizerLoad(_soundList[_currentVisId]['uniformsVis']);
            }
        }
        // if no song is playing, render a black page
        if (_currentVisId == -1) {
            _sceneVis = new THREE.Scene();
            _renderVis.render(_sceneVis, _cameraVis);
            return;
        }
        let sound = _soundList[_currentVisId];

        // render the last song we played
        sound['analyserVis'].getFrequencyData();
        sound['uniformsVis'].tAudioData.value.needsUpdate = true;
        _renderVis.render(_sceneVis, _cameraVis);
    }

    // *********** music list control

    function clickSong(event) {
        // if this song is playing, pause it
        // change the style of this DIV
        // change VisId for VisRender
        var sid = event.target.id;
        if (_soundList[sid]['play'] == true) {
            _soundList[sid]['sound'].pause();
            _soundList[sid]['play'] = false;
            event.target.classList.remove('active');
            _nextVisId = -1;
            for (ssid in _soundList) {
                if (_soundList[ssid]['play'] == true) {
                    _nextVisId = ssid;
                }
            }
        } else {
            _soundList[sid]['sound'].play();
            _soundList[sid]['play'] = true;
            event.target.classList.add('active');
            _nextVisId = sid;
        }

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
        musicListDiv.insertBefore(songDiv, musicListDiv.lastChild);
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
        _myRenderer.renderCanvas();
    }

    function printLog(str) {
        _logTextarea.textContent += str;
        _logTextarea.scrollTop = _logTextarea.scrollHeight;
    }

};