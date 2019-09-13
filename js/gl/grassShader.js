const grassShader = {
  v: `
  precision highp float;
  uniform mat4 modelMatrix;
  uniform mat4 modelViewMatrix;
  uniform mat4 projectionMatrix;
  uniform float uTime;

  attribute vec3 position;
  attribute vec2 uv;
  attribute vec3 translate;
  attribute vec2 scaleRot;

  varying vec2 vUv;
  varying vec3 vClipPosition; // vertex clip position
  varying vec2 vWorldPosition; // world position
  varying vec2 vLocalPosition; // local translate
  
  #define PI 3.141592653
  #define windSpeed 0.09
  #define grassScale 0.2

  void main() {
    vUv = uv * vec2(0.25, 1.0);
    
    // --- WIND SWAY --- //
    float timeScaled = uTime * 0.4;
    vec3 sway = vUv.y * vec3( cos(translate.x + timeScaled), 0, sin(translate.z * 5.0 + timeScaled*0.8)) * windSpeed;
    
    
    // --- INSTANCED POSITIONS --- //
    vec3 n = normalize( translate );
    float scale = scaleRot.x * grassScale;
    float theta = scaleRot.y;
    
    // Math https://math.stackexchange.com/questions/180418/
    vec3 up = vec3(0, 1, 0);
    vec3 v = cross(n, up);
    float s = length(v);
    float c = dot(up, n);
    mat3 vx = mat3( vec3( 0,  -v.z, v.y),
                    vec3( v.z, 0,  -v.x),
                    vec3(-v.y, v.x, 0  ) );
    mat3 rotation = mat3(1) + vx + vx*vx*(1.-c)/(s*s);
    
    mat3 yRotation = mat3( vec3(cos(theta),  0, sin(theta)),
                           vec3(0,           1, 0         ),
                           vec3(-sin(theta), 0, cos(theta)) );
    
    vec4 mvPosition =  modelViewMatrix * vec4( (rotation * yRotation * (position + sway) * scale + translate + n*scale*0.45), 1.0 );
    
    gl_Position = projectionMatrix * mvPosition;
    vWorldPosition = (modelMatrix * vec4(translate, 1.0)).xy;
    vLocalPosition = translate.xy;
    vClipPosition = gl_Position.xyz / gl_Position.w; //NDC
    
    // Change UV based on rotation
    if ( theta < PI/3.0) vUv = vUv;                        // Grass 1, 33%
    else if ( theta < 2.0*PI/3.0 ) vUv += vec2( 0.25, 0 ); // Grass 2, 33%
    else if ( theta < 5.0*PI/6.0 ) vUv += vec2( 0.5, 0 );  // Flower 1, 16%
    else vUv += vec2( 0.75, 0 );                           // Flower 2, 16%
  }
  `,
f: `
  precision highp float;
  uniform sampler2D map;

  varying vec2 vUv;
  varying vec3 vClipPosition;  // clip position needed for depth
  varying vec2 vWorldPosition; // world position needed for fake lighting
  varying vec2 vLocalPosition; // local position needed for 'biomes'
  
  ${depthShading}
  ${perlinNoise}

  void main() {    
    vec4 diffuseColor = texture2D( map, vUv );
    
    // Alpha clip
    if ( diffuseColor.b < 0.78 ) discard;
    
    // Grass colours
    vec3 grassHealthy = vec3(0.8, 1.0, 0.7);
    vec3 grassDry = vec3(0.9, 1.0, 0.65);
    vec3 grassColor = mix(grassHealthy, grassDry, snoise(vLocalPosition));
    
    // Flowers
    vec3 flowerHealthy = vec3(1.0, 0.65, 1.0);
    vec3 flowerDry = vec3(1.0, 0.9, 0.5);
    vec3 flowerColor = mix(flowerHealthy, flowerDry, snoise(vLocalPosition.yx));
    grassColor = mix( grassColor, flowerColor, diffuseColor.g );
    
    // --- FAKE LIGHTING --- //
    // Set brightness according to world position
    // Flowers are always brighter
    // Assumes fixed lighting at position {10, 10, 10}
    float brighten = (vWorldPosition.y * 0.2) - .1 + (vWorldPosition.x*vWorldPosition.x * 0.15) + diffuseColor.g * 0.1;
    gl_FragColor = vec4( (diffuseColor.rrr + brighten) * grassColor, diffuseColor.b );
    
    
    // --- DEPTH-BASED BLEND --- //
    // Calculate depth difference in scene
    float sceneDepth = ndcToLinear( getBufferClipPosition( uDepthMap ).z, cameraNear, cameraFar );
    float grassDepth = ndcToLinear( vClipPosition.z, cameraNear, cameraFar );
    float depthDifference = abs( grassDepth - sceneDepth );
    
    float grassMaxDepth = 0.1;
    float grassDepthDifference01 = clamp(depthDifference / grassMaxDepth, 0.0, 1.0);
    
    // Alpha blending
    gl_FragColor.a = 1.0 - (1.0 - grassDepthDifference01) * (1.0 - vUv.y);
  }
  `
}