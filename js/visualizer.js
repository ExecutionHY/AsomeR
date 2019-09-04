var Visualizer = function() {
    var _renderVis, _sceneVis, _cameraVis, _materialVis;
    var _currentVisId, _nextVisId;
    var _soundList, _playTimeList;

    this.init = function(WIDTH, HEIGHT) {
        _soundList = [];
        _playTimeList = [];

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

    this.setNextVisId = function(nextVisId) {
        _nextVisId = nextVisId;
    }
    this.updateSoundList = function(soundList) {
        _soundList = soundList;
    }
    this.updatePlayTimeList = function(playTimeList) {
        _playTimeList = playTimeList;
    }
    this.setSize = function(w, h, PixelRatio) {
        if (!PixelRatio) {
            try {
                PixelRatio = window.devicePixelRatio;
            } catch (err) {
                console.warn(err);
                PixelRatio = 1;
            }
        }
        _renderVis.setSize(w * PixelRatio, h * PixelRatio);
    }

    //
    // internals
    //

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
}