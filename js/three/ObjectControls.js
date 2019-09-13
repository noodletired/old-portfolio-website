/* --------------------------------------------------------
THREE.ObjectControls
version: 1.2
author: Alberto Piras, modified by Keagan Godfrey
email: a.piras.ict@gmail.com, kgodf18@gmail.com
github: https://github.com/albertopiras
license: MIT
----------------------------------------------------------*/

/**
 * THREE.ObjectControls
 * @constructor
 * @param camera - The camera.
 * @param domElement - the renderer's dom element
 * @param objectToMove - the object to control.
 */

THREE.ObjectControls = function(camera, domElement, objectToMove) {
  mesh = objectToMove;
  domElement = (domElement !== undefined) ? domElement : document;

  this.update = function() {
    if (Math.abs(deltaMove.x) > 400) return; // Occasional spikes in delta removed here
    if (Math.abs(deltaMove.y) > 400) return;
    
    if (horizontalRotationEnabled && deltaMove.x != 0)
      mesh.rotation.y += deltaMove.x * rotationSpeed;
    
    if (verticalRotationEnabled && deltaMove.y != 0)
      mesh.rotation.x += deltaMove.y * rotationSpeed;
    
    deltaMove.x *= 1 - dampingFactor;
    deltaMove.y *= 1 - dampingFactor;
  };
  
  this.setObjectToMove = function(newMesh) {
    mesh = newMesh;
  };

  this.setDistance = function(min, max) {
    minDistance = min;
    maxDistance = max;
  };

  this.setDamping = function(newDampingFactor) {
    dampingFactor = newDampingFactor;
  };
  
  this.setRotationSpeed = function(newRotationSpeed) {
    rotationSpeed = newRotationSpeed;
  };

  this.enableVerticalRotation = function() {
    verticalRotationEnabled = true;
  };

  this.disableVerticalRotation = function() {
    verticalRotationEnabled = false;
  };

  this.enableHorizontalRotation = function() {
    horizontalRotationEnabled = true;
  };

  this.disableHorizontalRotation = function() {
    horizontalRotationEnabled = false;
  };


  /** Mouse Interaction Controls (rotate desktop **/
  // Mouse - move
  domElement.addEventListener('mousedown', mouseDown, false);
  domElement.addEventListener('mousemove', mouseMove, false);
  domElement.addEventListener('mouseup', mouseUp, false);


  /** Touch Interaction Controls (rotate mobile) **/
  // Touch - move
  domElement.addEventListener('touchstart', onTouchStart, false);
  domElement.addEventListener('touchmove', onTouchMove, false);
  domElement.addEventListener('touchend', onTouchEnd, false);

  /********************* controls variables *************************/

  var MAX_ROTATON_ANGLES = {
    x: {
      // Vertical from bottom to top.
      enabled: false,
      from: Math.PI / 8,
      to: Math.PI / 8
    },
    y: {
      // Horizontal from left to right.
      enabled: false,
      from: Math.PI / 4,
      to: Math.PI / 4
    }
  };

  /**
   * RotationSpeed
   * 1= fast
   * 0.01 = slow
   * */
  var dampingFactor = 0.25, rotationSpeed = 0.05,
      verticalRotationEnabled = false,
      horizontalRotationEnabled = true;

  var mouseFlags = {MOUSEDOWN: 0, MOUSEMOVE: 1};

  var flag;
  var isDragging = false;
  var previousMousePosition = {x: 0, y: 0};
  var deltaMove = {x: 0, y: 0};

  /**
   * CurrentTouches
   * length 0 : no zoom
   * length 2 : is zoomming
   */
  var currentTouches = [];

  function resetMousePosition() {
    previousMousePosition = {x: 0, y: 0};
  }

  /******************  MOUSE interaction functions - desktop  *****/
  function mouseDown(e) {
    isDragging = true;
    flag = mouseFlags.MOUSEDOWN;
    previousMousePosition = {x: e.offsetX, y: e.offsetY};
  }

  function mouseMove(e) {
    if (isDragging) {
      deltaMove = {
        x: e.offsetX - previousMousePosition.x,
        y: e.offsetY - previousMousePosition.y
      };

      previousMousePosition = {x: e.offsetX, y: e.offsetY};

      if (horizontalRotationEnabled && deltaMove.x != 0)
        flag = mouseFlags.MOUSEMOVE;

      if (verticalRotationEnabled && deltaMove.y != 0)
        flag = mouseFlags.MOUSEMOVE;
    }
  }

  function mouseUp(e) {
    isDragging = false;
    resetMousePosition();
  }

  /****************** TOUCH interaction functions - mobile  *****/

  function onTouchStart(e) {
    //e.preventDefault();
    flag = mouseFlags.MOUSEDOWN;
    if (e.touches.length === 2) {
      // zoom
    } else {
      previousMousePosition = {x: e.touches[0].pageX, y: e.touches[0].pageY};
    }
  }

  function onTouchEnd(e) {
    /* If you were zooming out, currentTouches is updated for each finger you
     * leave up the screen so each time a finger leaves up the screen,
     * currentTouches length is decreased of a unit. When you leave up both 2
     * fingers, currentTouches.length is 0, this means the zoomming phase is
     * ended.
     */
    if (currentTouches.length > 0) {
      currentTouches.pop();
    } else {
      currentTouches = [];
    }
    //e.preventDefault();
    if (flag === mouseFlags.MOUSEDOWN) {
      // TouchClick
      // You can invoke more other functions for animations and so on...
    } else if (flag === mouseFlags.MOUSEMOVE) {
      // Touch drag
      // You can invoke more other functions for animations and so on...
    }
    resetMousePosition();
  }

  function onTouchMove(e) {
    //e.preventDefault();
    flag = mouseFlags.MOUSEMOVE;
    
    if (currentTouches.length === 0) {
      deltaMove = {
        x: e.touches[0].pageX - previousMousePosition.x,
        y: e.touches[0].pageY - previousMousePosition.y
      };
      previousMousePosition = {x: e.touches[0].pageX, y: e.touches[0].pageY};
    }
  }
};