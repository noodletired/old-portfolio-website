/* Copyright (C) Keagan Godfrey - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Keagan Godfrey <kgodf18@gmail.com>, June 2019
 */
let States = {Home:0, About:1, Work:2,};
const StateCameras = {
  0: {
    lookAt:   new THREE.Vector3( 0, 0, 0 ),
    position: new THREE.Vector3( 0, 0, 10 ),
    zoom: 1 },
  1: {
    lookAt:   new THREE.Vector3( 0, -1.2, 0 ),
    position: new THREE.Vector3( 0, 2, 6.5 ),
    zoom: 3},
  2: {
    lookAt:   new THREE.Vector3( 0, 1.2, 0 ),
    position: new THREE.Vector3( 0, -2, 6.5 ),
    zoom: 3}
}
let oldState = States.Home;
let state = States.Home;
let interactLock = false; // lock during camera zoom
const transitionDuration = 1200; // ms


// Function to change state
// Attaches to UI elements
function changeState( newState ) {
  // Prevent immediate state changes
  if (interactLock)
    return;
  
  // Prevent interaction
  interactLock = true;

  // Advance state machine
  oldState = state;
  state = newState;
  
  // Modify interface
  hideOldOverlay(); // triggers showNewOverlay after, unlocks interaction when complete
  moveCamera();
}
document.querySelector( '#buttonAbout'   ).addEventListener( 'click', () => { changeState( States.About   ) } );
document.querySelector( '#buttonWork'    ).addEventListener( 'click', () => { changeState( States.Work    ) } );
document.querySelector( '#buttonHome'    ).addEventListener( 'click', () => { changeState( States.Home    ) } );


// Moves camera based on current state
function moveCamera() {
  let currentLookAt   = new THREE.Vector3( );
  let oldLookAt   = StateCameras[oldState].lookAt;
  let oldPosition = StateCameras[oldState].position;
  let oldZoom     = StateCameras[oldState].zoom;
  let newLookAt   = StateCameras[state].lookAt;
  let newPosition = StateCameras[state].position;
  let newZoom     = StateCameras[state].zoom;
    
  // Begin animation
  let tween = new TWEEN.Tween( {t:0} )
       .to( {t:1}, transitionDuration)
       .easing( TWEEN.Easing.Quadratic.InOut )
       .onUpdate( ({t}) =>
  {
    // Lerp current look at
    currentLookAt.lerpVectors( oldLookAt, newLookAt, t );
    camera.lookAt( currentLookAt );
    
    // Lerp position
    camera.position.lerpVectors( oldPosition, newPosition, t );
    
    // Lerp zoom
    camera.zoom = THREE.Math.lerp( oldZoom, newZoom, t );
    
    camera.updateProjectionMatrix();
  } ).start();
}


// Hides old overlay
// * during planet motion transition
function hideOldOverlay() {
  // Hide old state
  let elementsToHide = [];
  switch (oldState) {
    case States.Home:
       elementsToHide.push( document.querySelector( '#homeUI' ) );
    break;
    
    case States.About:
       elementsToHide.push( document.querySelector( '#aboutUI' ) );
    break;
    
    default:
    break;
  }
  
  let tween = new TWEEN.Tween( {t:1} )
       .to( {t:0}, transitionDuration)
       .easing( TWEEN.Easing.Quadratic.InOut )
       .onUpdate( ({t}) =>
  {
    elementsToHide.forEach( (el) => {el.style.opacity = t} );
  } ).onComplete( () => {
    // Truly set invisible
    elementsToHide.forEach( (el) => {el.style.visibility = "hidden"} );

    // Unlock interaction
    // * early, it's annoying to wait for everything to animate in
    interactLock = false;
    
    showNewOverlay();
  } ).start();
}


// Shows new overlay
// * after planet motion transition
function showNewOverlay() {
    // Show new state
  let elementsToShow = [];
  switch (state) {
    case States.Home:
       elementsToShow.push( document.querySelector( '#homeUI' ) );
    break;
    
    case States.About:
       elementsToShow.push( document.querySelector( '#aboutUI' ) );
    break;
    
    default:
    break;
  }
  
  elementsToShow.forEach( (el) => {el.style.visibility = "visible"} );
  
  let tween = new TWEEN.Tween( {t:0} )
       .to( {t:1}, transitionDuration)
       .easing( TWEEN.Easing.Quadratic.InOut )
       .onUpdate( ({t}) =>
  {
    elementsToShow.forEach( (el) => {el.style.opacity = t} );
  } ).start();
}