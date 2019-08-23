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

    var _slider;
    var _listener;
    var _sound;
    var _musicList;

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
        ball = new THREE.SphereGeometry(0.02, 100, 100);
        material = new THREE.MeshNormalMaterial();
        mesh = new THREE.Mesh(geometry, material);
        _scene.add(mesh);
        mesh2 = new THREE.Mesh(geometry2, material);
        _scene.add(mesh2);
        mesh3 = new THREE.Mesh(ball, material);
        mesh3.position.z = 0.5;
        _scene.add(mesh3);

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
        _rendererFromUp.domElement.style.position = "relative";

        _cameraFromUp = new THREE.PerspectiveCamera(70, 4 / 3, 0.01, 10);
        _cameraFromUp.position.set(0, 1, 0);
        _cameraFromUp.lookAt(0, 0, 0);
        _controlsFromUp = new THREE.OrbitControls(_cameraFromUp, _renderer.domElement);
        _controlsFromUp.enablePan = false;
        _controlsFromUp.enableRotate = false;

        // add canvas to view
        var container = document.getElementById('left-canvas');
        container.style.width = String(WIDTH) + "px";
        container.appendChild(_renderer.domElement);
        container.appendChild(_rendererFromUp.domElement);

        _slider = document.createElement("INPUT");
        _slider.type = "range";
        _slider.style.writingMode = "bt-lr"; // for IE
        _slider.style.webkitAppearance = "slider-vertical"; // for chrome
        _slider.style.width = "10px";
        _slider.style.height = String(HEIGHT) + "px";
        _slider.style.position = "relative";
        _slider.style.top = String(-HEIGHT - 5) + "px";
        // _slider.style.left = String(0 - 15) + "px";
        _slider.style.color = "black";
        _slider.max = 0.4;
        _slider.min = -0.4;
        _slider.step = 0.01;
        _slider.value = 0;
        container.appendChild(_slider);
        // add visualizer
        var visualizer = visualizerInit();
        var rightContainer = document.getElementById('right-tools');
        rightContainer.appendChild(visualizer);

        _musicList = [
            'ash.mp3',
            'donut\ hole.mp3',
        ]

        var musicListDiv = document.createElement("div");
        musicListDiv.id = "music-list";
        musicListDiv.style.height = String(HEIGHT / 2) + "px";
        musicListDiv.style.borderLeft = "2px solid lightskyblue";
        for (idx in _musicList) {
            var songDiv = document.createElement("div");
            songDiv.textContent = _musicList[idx];
            songDiv.className = "song";
            songDiv.addEventListener('click', changeSong, false);
            musicListDiv.appendChild(songDiv);
        }

        rightContainer.appendChild(musicListDiv);

        // add listener for panning the obj in x-z plane
        _rendererFromUp.domElement.addEventListener('mousedown', onMouseDown, false);
        // moving obj in y-axis
        _rendererFromUp.domElement.addEventListener('wheel', onWheel, false);
        _controls.addEventListener('change', _renderCanvas);
        _controlsFromUp.addEventListener('change', _renderCanvas);
        _slider.addEventListener('mousemove', _renderCanvas);

        _renderCanvas();




    };

    //
    // internals
    //

    function _renderCanvas() {

        //requestAnimationFrame(animate);

        mesh3.position.y = _slider.value;
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
                pickupObjects(event, mesh3);
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

        mesh3.position.x += (_mouse.x - _panStart.x) * _panScale.x;
        mesh3.position.z += (_mouse.y - _panStart.y) * _panScale.y;

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
    var _renderVis, _sceneVis, _cameraVis, _analyserVis, _uniformsVis;

    function visualizerInit() {

        //var container = document.getElementById('container');
        _renderVis = new THREE.WebGLRenderer({ antialias: true });
        _renderVis.setSize(WIDTH / 2, HEIGHT / 2);
        _renderVis.setClearColor(0x000000);
        _renderVis.setPixelRatio(window.devicePixelRatio);
        //container.appendChild(_renderVis.domElement);
        _renderVis.domElement.style.position = "relative";
        _sceneVis = new THREE.Scene();
        _cameraVis = new THREE.Camera();

        //
        //window.addEventListener('resize', onResize, false);
        // draw the background color
        _renderVis.render(_sceneVis, _cameraVis);
        return _renderVis.domElement;
    }

    function visualizerLoad(sound) {
        _analyserVis = new THREE.AudioAnalyser(sound, FFTSIZE);
        //
        _uniformsVis = {
            tAudioData: { value: new THREE.DataTexture(_analyserVis.data, FFTSIZE / 2, 1, THREE.LuminanceFormat) }
        };
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
        var material = new THREE.ShaderMaterial({
            uniforms: _uniformsVis,
            vertexShader: VertexShaderSrc,
            fragmentShader: FragmentShaderSrc
        });
        var geometry = new THREE.PlaneBufferGeometry(1.95, 1.95);
        var mesh = new THREE.Mesh(geometry, material);
        _sceneVis.add(mesh);
        visualizerAnimate();

    }

    function visualizerAnimate() {
        requestAnimationFrame(visualizerAnimate);
        visualizerRender();
    }

    function visualizerRender() {
        _analyserVis.getFrequencyData();
        _uniformsVis.tAudioData.value.needsUpdate = true;
        _renderVis.render(_sceneVis, _cameraVis);
    }

    function changeSong(event) {
        // load music
        _listener = new THREE.AudioListener();
        mesh2.add(_listener);
        if (_sound) _sound.stop();
        _sound = new THREE.PositionalAudio(_listener);
        // load a sound and set it as the PositionalAudio object's buffer
        var audioLoader = new THREE.AudioLoader();

        var song = event.target.innerText;
        audioLoader.load('assets/music/' + song, function(buffer) {
            mesh3.add(_sound);
            _sound.setBuffer(buffer);
            _sound.setRefDistance(0.2);
            _sound.loop = false;
            //_sound.setMaxDistance(0.2);
            _sound.play();
            visualizerLoad(_sound);


        });
    }
};