/* Copyright (C) Keagan Godfrey - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Keagan Godfrey <kgodf18@gmail.com>, June 2019
 */

let loading;
let container;
let camera;
let controls;
let renderer;
let scene;
let raycaster;
let mouse;
let depthTarget;
let mixers = [];
const clock = new THREE.Clock();

let planet;
let water;
let grass;

const homeCameraPosition = new THREE.Vector3( 0, 0, 10 );
const loadingStages = ["Loading planet", "Generating life"];

// Called immediately once body is loaded
( async function init() {
  loading = document.querySelector( "#loadingText" );
  container = document.querySelector( '#scene' );

  scene = new THREE.Scene();
  scene.background = new THREE.Color( 0x8FBCD4 );
  
  mouse = new THREE.Vector2();
  raycaster = new THREE.Raycaster()

  createCamera();
  createLights();
  createRenderer();
  await loadModels();
  createControls();
  createLabels();
  showHome();
  addEventListeners();

  renderer.setAnimationLoop( () => {
    update();
    render();
  } );

} )();


function addEventListeners() {
  window.addEventListener( 'resize', onResize );
  window.addEventListener( 'mousemove', onMouseMove );
}

function createCamera() {
  // Create camera
  camera = new THREE.PerspectiveCamera(
    35, // FOV
    container.clientWidth / container.clientHeight, // aspect ratio
    1,  // near clipping plane
    14, // far clipping plane  : keep range small to encourage high quality depth texture
  );

  camera.position.copy( homeCameraPosition );
}


function createLights() {
  // Create indirect illumination
  const ambientLight = new THREE.HemisphereLight(
    0xddeeff, // bright sky color
    0x202020, // dim ground color
    2, // intensity
  );

  // Create direct illumination
  const mainLight = new THREE.DirectionalLight( 0xFFE9BB, 2 );
  mainLight.position.set( 10, 10, 10 );

  scene.add( ambientLight, mainLight );
}


function createControls() {
  // Create an object controller
  controls = new THREE.ObjectControls( camera, window, planet );
  controls.disableVerticalRotation();
  controls.setRotationSpeed(0.01);
  controls.setDamping(0.05);
}


function processPlanet( {scene} ) {
  planet = scene.getObjectByName( 'Planet' );
  createWater( scene );
}


function createGrass( {scene} ) {
  // Create base geometry
  let grassFidelity = 3;
  let baseGeometry = new THREE.Geometry();
  for (let i = 0; i < grassFidelity; i++) {
    let billboard = new THREE.PlaneGeometry(1,1,1,3);
    billboard.rotateY( Math.PI * i / grassFidelity );
    baseGeometry.merge( billboard );
  }
  let geometry = new THREE.InstancedBufferGeometry().fromGeometry( baseGeometry );
  
  // Pre-define GPU arrays
  const grassCount = 500;
  let translate = new Float32Array( grassCount * 3 );
  let scaleRot = new Float32Array( grassCount * 2 );
  
  // Set positions, scales and rotations
  const grassLocs = scene.getObjectByName( "GrassLocs" ).geometry;
  for ( let i = 0; i < grassCount; i++ ) {
    let point = THREE.GeometryUtils.randomPointsInBufferGeometry( grassLocs, 1 )[0];
    translate.set( [point.x, point.y, point.z], i*3, (i+1)*3 );
    
    let s = Math.random() * 0.6 + 0.2;
    let r = Math.random() * Math.PI;
    scaleRot.set( [s, r], i*2, (i+1)*2 );
  }
  
  geometry.addAttribute( 'translate', new THREE.InstancedBufferAttribute( translate, 3 ) );
  geometry.addAttribute( 'scaleRot', new THREE.InstancedBufferAttribute( scaleRot, 2 ) );

  // Define material
  let material = new THREE.RawShaderMaterial( {
    uniforms: {
      map: { value: new THREE.TextureLoader().load( 'assets/grass.png' ) },
      uTime: { value: 0.0 },
      cameraNear: { value: camera.near },
      cameraFar:  { value: camera.far },
      uDepthMap:  { value: depthTarget.depthTexture },
      uScreenSize: {value: new THREE.Vector4(container.clientWidth, container.clientHeight, 1.0/container.clientWidth, 1.0/container.clientHeight)}
    },
    vertexShader: grassShader.v,
    fragmentShader: grassShader.f,
    side: THREE.DoubleSide,
    transparent: true,
    depthTest: true
  } );
  
  // Make it one big mesh
  grass = new THREE.Mesh( geometry, material );
  grass.uniforms = material.uniforms;
  planet.add( grass );
}


function createWater( gltfScene ) {
  // Define uniforms
  let uniforms = {
      uTime: { value: 0.0 },
			tDiffuse: { value: depthTarget.texture },
      cameraNear: { value: camera.near },
      cameraFar:  { value: camera.far },
      uDepthMap:  { value: depthTarget.depthTexture },
      uScreenSize: {value: new THREE.Vector4(container.clientWidth, container.clientHeight, 1.0/container.clientWidth, 1.0/container.clientHeight)}
  };
  
  // Define material
  let material = new THREE.ShaderMaterial( {
    uniforms: uniforms,
    vertexShader: waterShader.v,
    fragmentShader: waterShader.f,
    transparent: false,
    depthWrite: false
  } );
  
  // Get water mesh
  let mesh = planet.getObjectByName( "Water" );
  mesh.uniforms = uniforms;
	mesh.material = material;

  // Save water object because we need to update its material
  water = mesh;
}


// Loads models specified within the loadList
// Planet is always loaded first, synchronously, and should be parent to all other objects
async function loadModels() {
  // Define a loader object
  const gltfLoader = new THREE.GLTFLoader();

  // Generic function to set up animated models
  // Accepts a position parameter to quickly place models in the scene
  const onLoad = ( gltf, name, position = [0,0,0], next = undefined ) => {
    const model = gltf.scene.getObjectByName( name );
    model.position.fromArray( position );

    const animation = gltf.animations[ 0 ];
    if ( animation ) {
      const mixer = new THREE.AnimationMixer( model );
      mixers.push( mixer );

      const action = mixer.clipAction( animation );
      action.play();
    }
    
    if ( next !== undefined ) {
      next( gltf );
    }
    
    scene.add( model );
  };
  
  // Callback to add text to the loading screen
  function loadingCallback( progress ) {
    console.log( `Loaded ${progress}` );
    const elem = document.createElement( "span" );
          elem.innerHTML = `${loadingStages[progress]}`;
          
    loading.appendChild( elem );
    window.getComputedStyle( elem ).opacity;
    elem.classList.add( "show" );
  }

  // The loader will send error messages to this function
  const onError = ( error ) => { console.error( error ) };

  // Load planet first as it serves as the parent object to all others
  loadingCallback( 0 );
  await promisifyLoader( gltfLoader ).load( "assets/planet.glb" ).then( (gltf) => onLoad( gltf, "Planet", undefined, processPlanet) ).catch( onError );

  let loadList = [
    {
      file: 'assets/grassLocs.glb',
      load: (gltf) => createGrass( gltf ),
      error: onError
    }
  ];

  let promises = [];
  for (const obj of loadList) {
    const promiseLoader = promisifyLoader( gltfLoader );
    promise = promiseLoader.load( obj.file ).then( obj.load ).catch( obj.error );
    promises.push( promise );
  }
  
  return allProgress( promises, loadingCallback );
}
  

function createRenderer() {
  // Create renderer
  renderer = new THREE.WebGLRenderer( {antialias: true} );
  renderer.setPixelRatio( 1 ); // window.devicePixelRatio breaks depth testing when using client sizing
  renderer.setSize( container.clientWidth, container.clientHeight );

  // Set lighting constraints
  renderer.gammaFactor = 2.2;
  renderer.gammaOutput = true;
  renderer.physicallyCorrectLights = true;

  // Add to DOM
  container.appendChild( renderer.domElement );
  
  // Create depth target for preprocessing
  depthTarget = new THREE.WebGLRenderTarget( container.clientWidth, container.clientHeight, {
    format : THREE.RGBFormat,
    minFilter : THREE.NearestFilter,
    magFilter : THREE.NearestFilter,
    stencilBuffer : false,
  } );
  depthTarget.texture.generateMipmaps = false;
  depthTarget.depthTexture = new THREE.DepthTexture();
  depthTarget.depthTexture.type = THREE.UnsignedShortType;
}


// Helper: locate highest containing parent
function rootObject( object ) {
  while ( object.parent.type !== "Scene" ) {
    object = object.parent;
  }

  return object;
}


// Helper: convert loader.load into a promise
function promisifyLoader ( loader, onProgress ) {
  function promiseLoader ( url ) {
    return new Promise( ( resolve, reject ) => {
      loader.load( url, resolve, onProgress, reject );
    });
  }

  return {
    originalLoader: loader,
    load: promiseLoader,
  };
}


// Helper: attach a unified progress callback on a Promise.all
function allProgress( promises, progressCallback ) {
  let d = 0;
  
  for (const p of promises) {
    p.then( _ => {
      d++;
      progressCallback( d );
    });
  }
  
  return Promise.all( promises );
}


// Perform updates to the scene once per frame
// Avoid heavy computation
function update() {
  // Get delta time
  const delta = clock.getDelta();
  
  // Update tweens
  TWEEN.update()
  
  // Update shaders
  grass.uniforms.uTime.value += delta * 10;
  water.uniforms.uTime.value += delta * 10;
  
  // Update animation mixers
  for ( const mixer of mixers ) {
    mixer.update( delta );
  }
  
  // Rotate planet
  controls.update();
  planet.rotation.y += Math.sin( Date.now() / 1000 ) * 0.0005;
  
  // Update labels
  updateLabels( camera, planet.rotation );
}


// Render the scene
function render() {
  // First pass without water or grass
  water.visible = false;
  grass.visible = false;
  renderer.setRenderTarget( depthTarget );
  renderer.render( scene, camera );
  
  // Second pass with water & grass
  water.visible = true;
  grass.visible = true;
  renderer.setRenderTarget( null );
  renderer.render( scene, camera );
}


// Called every time the window is resized
// Used to adjust camera and renderer
function onResize() {
  // Set the aspect ratio to match the new browser window aspect ratio
  camera.aspect = container.clientWidth / container.clientHeight;

  // Update the camera's frustum
  camera.updateProjectionMatrix();

  // Update the size of the renderer and canvas
  let w = container.clientWidth, h = container.clientHeight;
  renderer.setSize( w, h );
  depthTarget.setSize( w, h ); 
  
  // Update water shader uniforms
  water.material.uniforms.uScreenSize.value = new THREE.Vector4( w, h, 1.0/w, 1.0/h );
  grass.material.uniforms.uScreenSize.value = new THREE.Vector4( w, h, 1.0/w, 1.0/h );
  
  // Update transforms of popupUI
  let label = document.querySelector(".uiLabel.popup");
  label.style.transform = `translate(-50%, -50%) translate(${window.innerWidth/2}px,${window.innerHeight/2}px)`;
}


// Called every time the mouse is moved
function onMouseMove( event ) {
  event.preventDefault();

  mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
  mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

  // Raycast from camera to check intersection
  // More info in examples/webgl_camera_cinematic OR examples/webgl_postprocessing_unreal_bloom_selective
  raycaster.setFromCamera( mouse, camera );
  let intersects = raycaster.intersectObjects( scene.children, true );
  if ( intersects.length > 0 ) {
    container.classList.add( "hover" );
  }
  else {
    container.classList.remove( "hover" );
  }
}


// Called when the mouse is clicked
/*
function onClick( event ) {
  event.preventDefault();
  
  mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
  mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
  
  // Register click on planet
  raycaster.setFromCamera( mouse, camera );
  let intersects = raycaster.intersectObject( scene.getObjectByName( "Planet" ), true );
  if( intersects.length > 0 ) {
    if ( rootObject( intersects[ 0 ].object ).name === "Planet" ) {
      console.log( "Planet clicked" );
    }
  }
  
}
window.addEventListener( 'click', onClick );
*/