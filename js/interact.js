/* Copyright (C) Keagan Godfrey - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Keagan Godfrey <kgodf18@gmail.com>, June 2019
 */

// Helper to delay synchronous execution
const delay = ms => new Promise(res => setTimeout(res, ms));


// Hides loading screen and shows home
async function showHome() {
  // Wait for load (1 sec)
  await delay( 1000 );
  
  // Hide loader
  document.querySelector( "#loading" ).classList.add("hide");
  
  // Wait for transition to end
  await delay( 1200 );
  
  // Show splash
  textElems = document.querySelectorAll( "#splash > text" );
  for (elem of textElems) {
    window.getComputedStyle(elem)['stroke-dashoffset'];
    elem.style = "stroke-dashoffset: 0; fill: white"
  }
}


function createLabels() {
  const ui = document.getElementById( "homeUI" );
  const labelAnimationSpeed = 0.03; // seconds
  
  // Create a label element for each data element in data.js
  for (const chunk of data) {
    const elem = document.createElement( "div" );
          elem.className = "uiLabel shrink";
          elem.addEventListener( "click", () => {showUI( chunk )} );
          elem.addEventListener( "touchstart", (e) => {touchUI( e, chunk )} );
    
    let delay = 0.0;
    for (const letter of chunk.name) {
      elem.innerHTML += `<span style="transition-delay: ${delay}s;">${letter}</span>`;
      delay += labelAnimationSpeed;
    }
    
    // Save elem to local data
    chunk.elem = elem;
    
    // Append to UI
    ui.appendChild(elem);
  }
}
 

function updateLabels( camera, rotation ) {
  if ( planet == undefined ) // TODO: only run update after everything is loaded
    return;
  
  const tempV = new THREE.Vector3();
  const cameraToPoint = new THREE.Vector3();
  const normalMatrix = new THREE.Matrix3();
        normalMatrix.getNormalMatrix(camera.matrixWorldInverse);
  
  // Update each label
  for (const chunk of data) {
    const {position, elem} = chunk;
    const position3 = new THREE.Vector3().fromArray(position);
    
    // Apply planet rotation
    position3.applyEuler(rotation);

    // Apply camera matrices
    tempV.copy(position3);
    tempV.applyMatrix3(normalMatrix);
    cameraToPoint.copy(position3);
    cameraToPoint.applyMatrix4(camera.matrixWorldInverse).normalize();

    // > 0 = facing away
    const dot = tempV.dot(cameraToPoint);
    
    // If the label is not facing us, shrink it away
    if (dot > 0.2) {
      elem.classList.remove("hover");
      elem.classList.add("shrink");
      continue;
    }

    // Or restore the label to its default display style
    elem.classList.remove("shrink");
    elem.classList.add("hover");

    // Project and convert normalized position to CSS coordinates
    tempV.copy(position3);
    tempV.project(camera);
    const x = (tempV.x *  .5 + .5) * container.clientWidth;
    const y = (tempV.y * -.5 + .5) * container.clientHeight;
    
    // Move the elem to that position
    elem.style.transform = `translate(-50%, -50%) translate(${x}px,${y}px)`;

    // Set the zIndex for sorting (if needed)
    //elem.style.zIndex = (-tempV.z * .5 + .5) * 100000 | 0;
  }
}


let interactLock = false;
function showUI( data ) {
  // Prevent immediate state changes
  if (interactLock)
    return;
  
  // Prevent interaction
  interactLock = true;
  
  // Disable controls
  controls.disableHorizontalRotation();
  
  // Copy the label and place in the popup UI
  data.elem.classList.add( "hovering" );
  let label = data.elem.cloneNode( true );
      label.innerHTML += data.body;
      
  let ui = document.getElementById( "popupUI" );
      ui.style = "visibility: visible";
      ui.appendChild( label );
      
      window.getComputedStyle(label).maxWidth; // flush updates
      label.className = "uiLabel popup";
      label.style.transform = `translate(-50%, -50%) translate(${window.innerWidth/2}px,${window.innerHeight/2}px)`;
      console.log(label.style.transform)
  
  // Hide home ui
  document.getElementById( "homeUI" ).className = "hide";
  
  // Animate camera
  let newPosition = new THREE.Vector3().fromArray( data.camera );
  let newLookAt   = new THREE.Vector3().fromArray( data.lookAt );
  moveCamera( newPosition, newLookAt, camera );
  
  // Animate planet
  let startingRotation = (planet.rotation.y %= 2 * Math.PI); // can return negative
  if ( startingRotation < 0 ) startingRotation += 2 * Math.PI;
  new TWEEN.Tween( {t:0} )
       .to( {t:1}, transitionDuration )
       .easing( TWEEN.Easing.Quadratic.InOut )
       .onUpdate( ({t}) => {
         planet.rotation.y = startingRotation + t * (data.planetRotation - startingRotation);
       })
       .start();
}


// Hover-click is handled as a two-touch movement here
function touchUI( e, data ) {
  e.preventDefault();
  if ( data.elem.className.includes("hovering") ) {
    showUI( data );
  }
  else {
    data.elem.classList.add("hovering");
    window.addEventListener("touchstart", function _clicked(e) {if(e.target == data.elem) return; data.elem.classList.remove("hovering"); window.removeEventListener("touchstart", _clicked)} );
  }
}


const transitionDuration = 3000; // ms
function moveCamera( newPosition, newLookAt, camera ) {
  let currentLookAt = new THREE.Vector3();
  let oldLookAt   = new THREE.Vector3( 0, 0, -1 ).applyQuaternion( camera.quaternion );
  let oldPosition = new THREE.Vector3().copy( camera.position );
  
  
  // Begin animation
  let tween = new TWEEN.Tween( {t:0} )
       .to( {t:1}, transitionDuration )
       .easing( TWEEN.Easing.Quadratic.InOut )
       .onUpdate( ({t}) =>
  {
    // Lerp current look at
    currentLookAt.lerpVectors( oldLookAt, newLookAt, t );
    camera.lookAt( currentLookAt );
    
    // Lerp position
    camera.position.lerpVectors( oldPosition, newPosition, t );
  } ).start();
}














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
//document.querySelector( '#buttonAbout'   ).addEventListener( 'click', () => { changeState( States.About   ) } );
//document.querySelector( '#buttonWork'    ).addEventListener( 'click', () => { changeState( States.Work    ) } );
//document.querySelector( '#buttonHome'    ).addEventListener( 'click', () => { changeState( States.Home    ) } );




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