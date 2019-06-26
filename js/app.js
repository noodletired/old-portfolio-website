/* Copyright (C) Keagan Godfrey - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Keagan Godfrey <kgodf18@gmail.com>, June 2019
 */

let container;
let camera;
let controls;
let renderer;
let scene;
let raycaster;
let mouse;


// Called immediately once body is loaded
( function init() {
  container = document.querySelector( '#scene' );

  scene = new THREE.Scene();
  scene.background = new THREE.Color( 0x8FBCD4 );
  
  mouse = new THREE.Vector2();
  raycaster = new THREE.Raycaster()

  createCamera();
  //createControls();
  createLights();
  loadModels();
  createRenderer();

  renderer.setAnimationLoop( () => {
    update();
    render();
  } );

} )();


function createCamera() {
  // Create camera
  camera = new THREE.PerspectiveCamera(
    35, // FOV
    container.clientWidth / container.clientHeight, // aspect ratio
    0.1, // near clipping plane
    100, // far clipping plane
  );

  camera.position.copy(StateCameras[States.Home].position);
}


function createControls() {
  // Create an orbit controller
  controls = new THREE.OrbitControls( camera, container );
}


function createLights() {
  // Create indirect illumination
  const ambientLight = new THREE.HemisphereLight(
    0xddeeff, // bright sky color
    0x202020, // dim ground color
    2, // intensity
  );

  // Create direct illumination
  const mainLight = new THREE.DirectionalLight( 0xffffff, 2 );
  mainLight.position.set( 10, 10, 10 );

  scene.add( ambientLight, mainLight );
}


function loadModels() {
  // Define a loader object
  const loader = new THREE.GLTFLoader();

  // Reusable function to set up animated models.
  // Accepts a position parameter to quickly place models in the scene
  const onLoad = ( gltf, name, position ) => {
    const model = gltf.scene.children[ 0 ];
    model.name = name;
    model.position.copy( position );

    //const animation = gltf.animations[ 0 ];

    //const mixer = new THREE.AnimationMixer( model );
    //mixers.push( mixer );

    //const action = mixer.clipAction( animation );
    //action.play();

    scene.add( model );
  };
  
  // The loader will report the loading progress to this function
  const onProgress = () => {};

  // The loader will send error messages to this function
  const onError = ( error ) => { console.error( error ) };

  // Load planet model
  const planetPosition = new THREE.Vector3( 0, 0, 0 );
  loader.load(
     'assets/planet.gltf',
     ( gltf ) => onLoad( gltf, "planet", planetPosition ),
     onProgress,
     onError
  );

}
  

function createRenderer() {
  // Create renderer
  renderer = new THREE.WebGLRenderer( {antialias: true} );
  renderer.setSize( container.clientWidth, container.clientHeight );
  renderer.setPixelRatio( window.devicePixelRatio );

  // Set lighting constraints
  renderer.gammaFactor = 2.2;
  renderer.gammaOutput = true;
  renderer.physicallyCorrectLights = true;

  // Add to DOM
  container.appendChild( renderer.domElement );
}


// Perform updates to the scene once per frame
// Avoid heavy computation
function update() {
  // Update tweens
  TWEEN.update()
  
  // Rotate planet
  let planet = scene.getObjectByName( "planet" ) || undefined;
  if ( planet !== undefined ) {
    planet.rotation.y += -0.001;
  }
}


// Render the scene
function render() {
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
  renderer.setSize( container.clientWidth, container.clientHeight );
}
window.addEventListener( 'resize', onResize );


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
window.addEventListener( 'mousemove', onMouseMove );


// Called when the mouse is clicked
function onClick( event ) {
  event.preventDefault();
  
  mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
  mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
  
  // Register click on planet
  raycaster.setFromCamera( mouse, camera );
  let intersects = raycaster.intersectObject( scene.getObjectByName( "planet" ), true );
  if( intersects.length > 0 ) {
    if ( rootObject( intersects[ 0 ].object ).name === "planet" ) {
      console.log( "Planet clicked" );
    }
  }
  
}
window.addEventListener( 'click', onClick );


// Root object function to locate highest containing parent
function rootObject( object ) {
  while ( object.parent.type !== "Scene" ) {
    object = object.parent;
  }

  return object;
}