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

    var WIDTH = 600,
        HEIGHT = 450;
    var BGCOLOR = 0xcccdd4;

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

        _renderer = new THREE.WebGLRenderer({ antialias: true });
        _renderer.setSize(WIDTH, HEIGHT);
        _renderer.setClearColor(BGCOLOR);

        _camera = new THREE.PerspectiveCamera(70, 4 / 3, 0.01, 10);
        _camera.position.set(0, 0, 1);
        _controls = new THREE.OrbitControls(_camera, _renderer.domElement);
        _controls.enablePan = false;

        _rendererFromUp = new THREE.WebGLRenderer({ antialias: true });
        _rendererFromUp.setSize(WIDTH, HEIGHT);
        _rendererFromUp.setClearColor(BGCOLOR);

        _cameraFromUp = new THREE.PerspectiveCamera(70, 4 / 3, 0.01, 10);
        _cameraFromUp.position.set(0, 1, 0);
        _cameraFromUp.lookAt(0, 0, 0);
        _controlsFromUp = new THREE.OrbitControls(_cameraFromUp, _renderer.domElement);
        _controlsFromUp.enablePan = false;
        _controlsFromUp.enableRotate = false;


        document.body.appendChild(_renderer.domElement);
        document.body.appendChild(_rendererFromUp.domElement);
        _slider = document.createElement("INPUT");
        _slider.type = "range";
        _slider.style.writingMode = "bt-lr"; // for IE
        _slider.style.webkitAppearance = "slider-vertical"; // for chrome
        _slider.style.width = "10px";
        _slider.style.height = String(HEIGHT) + "px";
        _slider.style.position = "relative";
        _slider.style.left = "-15px";
        _slider.style.color = "black";
        _slider.max = 0.5;
        _slider.min = -0.5;
        _slider.step = 0.01;
        _slider.value = 0;
        document.body.appendChild(_slider);

        _rendererFromUp.domElement.addEventListener('mousedown', onMouseDown, false);
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
        _movingState = 0;
        _rendererFromUp.domElement.removeEventListener('mousemove', onMouseMove, false);
        _rendererFromUp.domElement.removeEventListener('mouseup', onMouseUp, false);
    }

};