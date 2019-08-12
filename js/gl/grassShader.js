const numGrassTypes = 2;
const grassShader = {
  v: `
  precision highp float;
  uniform mat4 modelViewMatrix;
  uniform mat4 projectionMatrix;
  uniform float uTime;

  attribute vec3 position;
  attribute vec2 uv;
  attribute vec3 translate;
  attribute vec2 scaleRot;

  varying vec2 vUv;
  //varying vec2 rootNDCPos;  // position of grass roots to sample colour
  varying vec3 vClipPosition; // vertex clip position
  
  #define PI 3.141592653
  #define windSpeed 0.09
  #define grassScale 4.0

  void main() {
    vUv = uv * vec2(0.5, 1);
    
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
    
    /*
    vec4 rootPosition = projectionMatrix * modelViewMatrix * vec4( translate - n*0.015, 1.0 );
    rootNDCPos = rootPosition.xy / rootPosition.w;
    */
    
    vClipPosition = gl_Position.xyz / gl_Position.w; //NDC
    
    // Change UV based on rotation
    if ( theta < PI ) vUv += vec2( 0.5, 0 );
    //else if ( theta < 2*PI ) vUv += vec2( 1.0, 0 );
  }
  `,
f: `
  precision highp float;
  uniform sampler2D map;
  uniform sampler2D tDiffuse;

  varying vec2 vUv;
  //varying vec2 rootNDCPos;
  varying vec3 vClipPosition; // current clip position
  
  ${depthShading}
  
  // https://stackoverflow.com/questions/15095909/from-rgb-to-hsv-in-opengl-glsl
  vec3 rgb2hsv(vec3 c)
  {
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
  }

  void main() {
    vec4 diffuseColor = texture2D( map, vUv );
    
    // Alpha clip
    if ( diffuseColor.b < 0.95 ) discard;
    
    vec3 grassColor = vec3(0.8, 1.0, 0.7);
    
    float brighten = .08;
    gl_FragColor = vec4( (diffuseColor.rrr + brighten) * grassColor, diffuseColor.b );
    
    
    // --- DEPTH-BASED BLEND --- //
    // Calculate depth difference in scene
    float sceneDepth = ndcToLinear( getBufferClipPosition( uDepthMap ).z, cameraNear, cameraFar );
    float grassDepth = ndcToLinear( vClipPosition.z, cameraNear, cameraFar );
    float depthDifference = abs( grassDepth - sceneDepth );
    
    float grassMaxDepth = 0.1;
    float grassDepthDifference01 = clamp(depthDifference / grassMaxDepth, 0.0, 1.0);
    
    // Try alpha blending first
    gl_FragColor.a = 1.0 - (1.0 - grassDepthDifference01) * (1.0 - vUv.y);
    
    
    /*
    // --- SAMPLE-BASED BLEND --- //
    vec3 rootColor = texture2D( tDiffuse, rootNDCPos*0.5+0.5 ).rgb;
    vec3 rootColorHSV = rgb2hsv(rootColor);
    if ( rootColorHSV.x > 0.21 && rootColorHSV.x < 0.38 && rootColorHSV.y > 0.1) {
      float mixFactor = clamp(vUv.y * 2.0, 0., 1.);
      gl_FragColor.rgb = mix(rootColor, gl_FragColor.rgb, mixFactor);
    }
    */
  }
  `
}