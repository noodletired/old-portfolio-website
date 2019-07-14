let waterShader = {
  v: `
  uniform float uTime;

  varying vec2 vUV;
  varying vec3 vWaterClipPosition;
  
  #define waveSize 0.01

  void main() {
    // Vary water mesh position
    vec3 pos = position;
    float timeScaled = uTime * 0.4;
    pos.z += cos(pos.x*5.0+timeScaled) * waveSize * sin(pos.y * 5.0 + timeScaled);

    // Convert to clip coords
    vec4 modelViewPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position =  projectionMatrix * modelViewPosition;
    
    vWaterClipPosition = gl_Position.xyz / gl_Position.w; //NDC
    vUV = uv;
  }
  `,
  
  f: `
  varying vec2 vUV;
  varying vec3 vWaterClipPosition;

  uniform sampler2D uDepthMap;
  uniform sampler2D tDiffuse;
  uniform float uTime;
  uniform float cameraNear;
  uniform float cameraFar;
  uniform vec4 uScreenSize;

  #define waterClarity 0.2     // controls translucency by blending with scene
  #define waterCutoffDepth 3.0 // water beyond this depth will default to nearest (avoids depth to far plane)
  #define waterMaxDepth 2.0    // controls depth-colour blending
  #define waveDensity 20.0     // controls amount of surfave waves
  #define surfaceCutoff 0.84   // controls size & quantity of surface waves
  #define foamMaxDepth 0.1     // controls foam max thickness
  #define foamMinEdge 0.3      // controls minimum foam edge thickness
  #define distortAmount 0.1    // controls noise distortion, slightly affects size of waves
  #define AA 0.03              // antialiasing for smoothstep
  #define timeScale 0.03

  // --- PERLIN NOISE --- //
  //
  // Description : Array and textureless GLSL 2D simplex noise function.
  //      Author : Ian McEwan, Ashima Arts.
  //  Maintainer : stegu
  //     Lastmod : 20110822 (ijm)
  //     License : Copyright (C) 2011 Ashima Arts. All rights reserved.
  //               Distributed under the MIT License. See LICENSE file.
  //               https://github.com/ashima/webgl-noise
  //               https://github.com/stegu/webgl-noise
  // 
  vec3 mod289(vec3 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }
  vec2 mod289(vec2 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }
  vec3 permute(vec3 x) {
    return mod289(((x*34.0)+1.0)*x);
  }
  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 
                        0.366025403784439,
                       -0.577350269189626, 
                        0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
      + i.x + vec3(0.0, i1.x, 1.0 ));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m ;
    m = m*m ;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }


  // --- BLENDING --- //
  vec4 alphaBlend(vec4 top, vec4 bottom) {
    vec3 color = (top.rgb * top.a) + (bottom.rgb * (1.0 - top.a));
    float alpha = top.a + bottom.a * (1.0 - top.a);

    return vec4(color, alpha);
  }


  // --- DEPTH CONVERSION --- //
  vec3 getBufferClipPosition(sampler2D depthSampler) { 
    vec2 uv = gl_FragCoord.xy * uScreenSize.zw;
    float depth = texture2D(depthSampler, uv).x;
    float z = depth * 2.0 - 1.0;
    return vec3(uv * 2.0 - 1.0, z); // NDC
  }
  
  // From https://learnopengl.com/Advanced-OpenGL/Depth-testing
  float ndcToLinear(float z, float near, float far) {
    return (2.0 * near * far) / (far + near - z * (far - near));
  }


  // --- MAIN --- //
  void main(){
    // --- DEPTH-BASED COLOR --- //
    // Calculate depth difference in scene
    float sceneDepth = ndcToLinear( getBufferClipPosition( uDepthMap ).z, cameraNear, cameraFar );
    float waterDepth = ndcToLinear( vWaterClipPosition.z, cameraNear, cameraFar );
    float depthDifference = abs( waterDepth - sceneDepth );
    
    // Scale color based on depth
    vec4 colorShallow = vec4(0.325, 0.807, 0.971, 0.725);
    vec4 colorDeep    = vec4(0.086, 0.407, 1.000, 0.749);
    float waterDepthDifference01 = clamp(depthDifference / waterMaxDepth, 0.0, 1.0);
    waterDepthDifference01 *= depthDifference > waterCutoffDepth ? 0.0 : 1.0;
    
    vec4 color = mix(colorShallow, colorDeep, waterDepthDifference01);

    // --- BLEND WITH SCENE --- //
    vec4 sceneColor = texture2D(tDiffuse, gl_FragCoord.xy * uScreenSize.zw);
    color = mix(color, sceneColor, waterClarity); // consider adding a blend as well
    
    // --- NOISE SAMPLING --- //
    // Distort the UV lookup
    vec2 distortionUV = vUV * 2.0;
    distortionUV.x -= uTime * pow(timeScale, 3.0); // hugely increase timescale for distortion
    float distortion = (snoise( distortionUV ) * 2.0 - 1.0) * distortAmount;
    
    // Lookup noise value
    vec2 noiseScaledUV = (vUV + vec2(distortion)) * waveDensity;
    noiseScaledUV.y -= uTime * timeScale;
    float noiseSample = snoise( noiseScaledUV );
    
    // --- WATER SURFACE --- //
    float waterNoise = smoothstep(surfaceCutoff - AA, surfaceCutoff + AA, noiseSample);
    color = alphaBlend( vec4(vec3(1.0), waterNoise), color );
    
    // --- FOAM --- //
    float foamDepthDifference01 = clamp(depthDifference / foamMaxDepth, 0.0, 1.0);
    float foamCutoff = foamDepthDifference01 * surfaceCutoff;
    float foamNoise = smoothstep(foamCutoff - AA, foamCutoff + AA, noiseSample);
    foamNoise += smoothstep(1.0 - foamMinEdge - AA, 1.0 - foamMinEdge + AA, 1.0-foamDepthDifference01);
    color = alphaBlend( vec4(vec3(1.0), foamNoise), color );
    
    gl_FragColor = color;
  }
  `
}