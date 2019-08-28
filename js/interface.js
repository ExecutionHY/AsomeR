window.onload = function() {
    var interface = new Interface();
    interface.init();
};

var Interface = function() {
    var _camera, _scene, _renderer, _controls;
    var _cameraFromUp, _rendererFromUp, _controlsFromUp;
    var geometry, material, mesh;
    var geometry2, material2, mesh2;
    var ball, mesh3;


    var _colorList = [0xff5555, 0xffff55, 0x55Ff55, 0x5555ff];
    var _ballList;
    var _ballStateLists;

    var _slider;
    var _listener;
    var _sound;
    var _musicList;
    var _soundList;
    var _logTextarea;

    var WIDTH = 600,
        HEIGHT = 450;
    var BGCOLOR = 0xcccdd4;

    var FFTSIZE = 128;

    //
    // public methods
    //

    this.init = function() {

        _scene = new THREE.Scene();
        geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
        geometry2 = new THREE.BoxGeometry(0.6, 0.1, 0.1);
        material = new THREE.MeshNormalMaterial();
        mesh = new THREE.Mesh(geometry, material);
        _scene.add(mesh);
        mesh2 = new THREE.Mesh(geometry2, material);
        _scene.add(mesh2);
        // mesh3 = new THREE.Mesh(ball, material);
        // mesh3.position.z = 0.5;
        // _scene.add(mesh3);
        ball = new THREE.SphereGeometry(0.02, 100, 100);
        _ballList = [];
        for (let i = 0; i < 4; i++) {
            let mtl = new THREE.MeshBasicMaterial({ color: _colorList[i] });
            mtl.visible = false;
            let mesh = new THREE.Mesh(ball, mtl);
            mesh.position.z = 0.5;
            _ballList.push(mesh);
            _scene.add(mesh);
        }

        // build main renderer
        _renderer = new THREE.WebGLRenderer({ antialias: true });
        _renderer.setSize(WIDTH, HEIGHT);
        _renderer.setClearColor(BGCOLOR);

        _camera = new THREE.PerspectiveCamera(70, 4 / 3, 0.01, 10);
        _camera.position.set(1, 1, 2);
        _camera.position.normalize();
        _controls = new THREE.OrbitControls(_camera, _renderer.domElement);
        _controls.enablePan = false;

        // build up renderer
        _rendererFromUp = new THREE.WebGLRenderer({ antialias: true });
        _rendererFromUp.setSize(WIDTH, HEIGHT);
        _rendererFromUp.setClearColor(BGCOLOR);

        _cameraFromUp = new THREE.PerspectiveCamera(70, 4 / 3, 0.01, 10);
        _cameraFromUp.position.set(0, 1, 0);
        _cameraFromUp.lookAt(0, 0, 0);
        _controlsFromUp = new THREE.OrbitControls(_cameraFromUp, _renderer.domElement);
        _controlsFromUp.enablePan = false;
        _controlsFromUp.enableRotate = false;

        // add canvas to view
        var leftContainer = document.getElementById('left-canvas');
        leftContainer.appendChild(_renderer.domElement);
        leftContainer.appendChild(_rendererFromUp.domElement);

        _slider = document.createElement('INPUT');
        _slider.type = 'range';
        _slider.className = 'height-slider';
        _slider.max = 0.4;
        _slider.min = -0.4;
        _slider.step = 0.01;
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
        _ballStateLists = [];
        for (idx in _musicList) {
            var songDiv = document.createElement('div');
            songDiv.textContent = _musicList[idx];
            songDiv.className = 'song';
            songDiv.id = idx;
            songDiv.addEventListener('click', clickSong, false);
            musicListDiv.appendChild(songDiv);
            let ctrlDiv = document.createElement('div');
            ctrlDiv.className = 'ctrl-sel';
            let stateList = []
            for (i = 0; i < 4; i++) {
                let ctrlItem = document.createElement('div');
                ctrlItem.textContent = String(i);
                ctrlItem.setAttribute('sid', idx);
                ctrlItem.setAttribute('cid', i);
                ctrlItem.className = 'ctrl-item c' + String(i);
                ctrlItem.addEventListener('click', clickCtrlItem, false);
                ctrlDiv.appendChild(ctrlItem);
                stateList.push(false);
            }
            ctrlListDiv.appendChild(ctrlDiv);
            _ballStateLists.push(stateList);
        }
        musicCtrlDiv.appendChild(musicListDiv);
        musicCtrlDiv.appendChild(ctrlListDiv);
        rightContainer.appendChild(musicCtrlDiv);

        // add listener for panning the obj in x-z plane
        _rendererFromUp.domElement.addEventListener('mousedown', onMouseDown, false);
        // moving obj in y-axis
        _rendererFromUp.domElement.addEventListener('wheel', onWheel, false);
        _controls.addEventListener('change', _renderCanvas);
        _controlsFromUp.addEventListener('change', _renderCanvas);
        _slider.addEventListener('mousemove', _renderCanvas);

        _renderCanvas();
        printLog('canvas initialized.\n');

        loadSongs();

    };

    //
    // internals
    //

    function _renderCanvas() {

        //requestAnimationFrame(animate);
        _ballList[0].position.y = _slider.value;

        //_controls.update();
        _renderer.render(_scene, _camera);
        _controlsFromUp.zoom = _controls.zoom;
        //_controlsFromUp.update();
        _rendererFromUp.render(_scene, _cameraFromUp);

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
        raycaster.setFromCamera(_mouse, _cameraFromUp);
        var intersects = raycaster.intersectObject(object);
        if (intersects.length) {
            _panScale.x = intersects[0].point.x / _mouse.x;
            _panScale.y = intersects[0].point.z / _mouse.y;
            _panStart.set(_mouse.x, _mouse.y);
            _movingState = 1;
        }
    }

    function onMouseDown(event) {
        event.preventDefault();
        switch (event.button) {
            case THREE.MOUSE.LEFT:
                pickupObjects(event, _ballList[0]);
                _rendererFromUp.domElement.addEventListener('mousemove', onMouseMove, false);
                _rendererFromUp.domElement.addEventListener('mouseup', onMouseUp, false);
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
        _renderCanvas();
    }

    function onMouseUp(event) {
        event.preventDefault();
        _movingState = 0;
        _rendererFromUp.domElement.removeEventListener('mousemove', onMouseMove, false);
        _rendererFromUp.domElement.removeEventListener('mouseup', onMouseUp, false);
    }

    function onWheel(event) {
        event.preventDefault();
        if (event.deltaY < 0) _slider.value = parseFloat(_slider.value) - 0.05;
        if (event.deltaY > 0) _slider.value = parseFloat(_slider.value) + 0.05;
        _renderCanvas();
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

    function loadSongs() {
        // load music
        _listener = new THREE.AudioListener();
        mesh2.add(_listener);

        // must use let, otherwise songid will always be the last id, when these audio is loaded
        for (let songid in _musicList) {
            let sound = new THREE.PositionalAudio(_listener);
            // load a sound and set it as the PositionalAudio object's buffer
            let audioLoader = new THREE.AudioLoader();
            audioLoader.load('assets/music/' + _musicList[songid], function(buffer) {
                sound.setBuffer(buffer);
                sound.setRefDistance(0.2);
                sound.loop = true;

                let analyserVis = new THREE.AudioAnalyser(sound, FFTSIZE);
                let uniformsVis = {
                    tAudioData: { value: new THREE.DataTexture(analyserVis.data, FFTSIZE / 2, 1, THREE.LuminanceFormat) }
                };

                _soundList.push({ 'id': songid, 'name': _musicList[songid], 'sound': sound, 'uniformsVis': uniformsVis, 'analyserVis': analyserVis, 'play': false });
                console.log('song ' + songid + ': ' + _musicList[songid] + ' loaded');
                printLog('song ' + songid + ': ' + _musicList[songid] + ' loaded\n');
                //_sound.setMaxDistance(0.2);
                //_sound.play();
                //visualizerLoad(_sound);
            });
        }
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
        _renderCanvas();
    }

    function printLog(str) {
        _logTextarea.textContent += str;
        _logTextarea.scrollTop = _logTextarea.scrollHeight;
    }

};