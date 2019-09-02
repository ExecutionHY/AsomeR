var MyRenderer = function() {

    var _camera, _scene, _renderer, _controls;
    var _cameraFromUp, _rendererFromUp, _controlsFromUp;
    var _colorList = [0xff5555, 0xffff55, 0x55Ff55, 0x5555ff];
    var mesh;

    var BGCOLOR = 0xcccdd4;
    var BGCOLOR = 0x343235;
    var GREEN = 0x00ff00;
    var WHITE = 0xffffff;

    var _meshList;
    var _focusMid;

    var AUTOREFRESH = true;

    this.init = function(dom, WIDTH, HEIGHT) {

        _meshList = [];
        _scene = new THREE.Scene();
        var axesHelper = new THREE.AxesHelper(1.5);
        _scene.add(axesHelper);

        var pointLight = new THREE.PointLight(0xffffff, 0.7, 100, 2);
        pointLight.position.set(-3, 3, 3);
        _scene.add(pointLight);

        var pointLight2 = new THREE.PointLight(0xffffff, 0.3, 100, 2);
        pointLight2.position.set(3, 3, -3);
        _scene.add(pointLight2);

        var ambient = new THREE.AmbientLight(0xffffff, 0.3);
        _scene.add(ambient);

        // basic
        var geometry = new THREE.IcosahedronGeometry(0.8, 0);
        //var geometry = new THREE.SphereGeometry(0.2, 6, 6);
        var geometry2 = new THREE.BoxGeometry(2.0, 0.4, 0.4);
        // var material = new THREE.MeshNormalMaterial();
        var material = new THREE.MeshPhongMaterial({ color: 0xffffff });
        mesh = new THREE.Mesh(geometry, material);
        _scene.add(mesh);
        var mesh2 = new THREE.Mesh(geometry2, material);
        _scene.add(mesh2);
        //material.visible = false;

        var ball = new THREE.SphereGeometry(0.2, 100, 100);
        _ballList = [];
        for (let i = 0; i < 4; i++) {
            let mtl = new THREE.MeshBasicMaterial({ color: _colorList[i] });
            mtl.visible = false;
            let mesh = new THREE.Mesh(ball, mtl);
            mesh.position.z = 1.0;
            _ballList.push(mesh);
            _scene.add(mesh);
        }

        // build main renderer
        _renderer = new THREE.WebGLRenderer({ antialias: true });
        _renderer.setSize(WIDTH, HEIGHT);
        _renderer.setClearColor(BGCOLOR);

        _camera = new THREE.PerspectiveCamera(70, 4 / 3, 0.01, 10);
        _camera.position.set(1.5, 1.5, 3);
        //_camera.position.set(100, 100, 20);
        _camera.lookAt(0, 0, 0);
        _controls = new THREE.OrbitControls(_camera, _renderer.domElement);
        _controls.enablePan = false;

        // build up renderer
        _rendererFromUp = new THREE.WebGLRenderer({ antialias: true });
        _rendererFromUp.setSize(WIDTH, HEIGHT);
        _rendererFromUp.setClearColor(BGCOLOR);

        _cameraFromUp = new THREE.PerspectiveCamera(70, 4 / 3, 0.01, 10);
        _cameraFromUp.position.set(0, 3.674, 0); // sqrt(1.5^2+1.5^2+3^2)
        _cameraFromUp.lookAt(0, 0, 0);
        _controlsFromUp = new THREE.OrbitControls(_cameraFromUp, _renderer.domElement);
        _controlsFromUp.enablePan = false;
        _controlsFromUp.enableRotate = false;

        dom.appendChild(_renderer.domElement);
        dom.appendChild(_rendererFromUp.domElement);
        _rendererFromUp.domElement.id = 'canvas-up';

        if (!AUTOREFRESH) {
            _controls.addEventListener('change', renderCanvas);
            _controlsFromUp.addEventListener('change', renderCanvas);
            this.renderOnce();
        }

        var meshList = [];
        meshList.push({ 'obj': 'assets/private/1911-nosepad.obj' });
        meshList.push({ 'obj': 'assets/private/1911-frame.obj' });
        //this.addMeshList(meshList);
        _focusMid = -1;

        //_texture = THREE.ImageUtils.loadTexture("assets/1.jpg");
    }

    function animate() {
        requestAnimationFrame(animate);
        this.renderCanvas();
    }


    this.renderCanvas = function() {

        //requestAnimationFrame(animate);

        //_controls.update();
        _renderer.render(_scene, _camera);
        _controlsFromUp.zoom = _controls.zoom;
        //_controlsFromUp.update();
        _rendererFromUp.render(_scene, _cameraFromUp);

    }

    this.renderOnce = function() {
        if (!AUTOREFRESH) this.renderCanvas();
    }

    this.getBallList = function() {
        return _ballList;
    }
    this.getMainMesh = function() {
        return mesh;
    }
    this.getCameraUp = function() {
        return _cameraFromUp;
    }

    function loadOBJ(URL, mid) {
        // instantiate a loader
        var loader = new THREE.OBJLoader();

        // load a resource
        loader.load(
            // resource URL
            URL,
            // called when resource is loaded
            function(object) {
                object.traverse(function(child) {
                    if (child instanceof THREE.Mesh) {
                        child.material = new THREE.MeshPhongMaterial();
                        // child.material = new THREE.MeshPhongMaterial({ map: _texture });
                        child.name = 'hhh';
                        _scene.add(child);
                        _meshList[mid] = child;

                        child.scale.set(0.005, 0.005, 0.005);
                    }
                });
                this.renderOnce();
            },
            // called when loading is in progresses
            function(xhr) {
                console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            },
            // called when loading has errors
            function(error) {
                console.log('An error happened');
            }
        );
    }

    this.addMeshList = function(meshList) {
        var midBase = _meshList.length;
        for (mid in meshList) {

            // init _meshList[mid] as null
            _meshList.push(null);
            loadOBJ(meshList[mid]['obj'], parseInt(mid) + parseInt(midBase));
        }
    }
    this.focus = function(mid) {
        this.setMaterial('color', WHITE, _focusMid);
        _focusMid = mid;
        this.setMaterial('color', GREEN, _focusMid);
    }
    this.setMaterial = function(key, value, mid = _focusMid) {
        if (_focusMid < 0) return;
        if (key == 'color') {
            _meshList[parseInt(mid)].material.color = new THREE.Color(value);
        }
        this.renderOnce();
    }

    this.resizeCanvas = function(width, height, PixelRatio) {

        // 自动计算屏幕像素比
        if (!PixelRatio) {
            try {
                PixelRatio = window.devicePixelRatio;
            } catch (err) {
                console.warn(err);
                PixelRatio = 1;
            }
        }

        _camera.aspect = width / height;
        _camera.updateProjectionMatrix();
        _renderer.setSize(width * PixelRatio, height * PixelRatio);

        _cameraFromUp.aspect = width / height;
        _cameraFromUp.updateProjectionMatrix();
        _rendererFromUp.setSize(width * PixelRatio, height * PixelRatio);

        this.renderOnce();
    };
}