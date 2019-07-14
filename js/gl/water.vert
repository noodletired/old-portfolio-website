uniform float uTime;

varying vec2 vUV;
varying vec3 vWaterClipPosition;

void main() {
  // Vary water mesh position
  vec3 pos = position;
  float timeScaled = uTime * 0.4;
  pos.z += cos(pos.x*5.0+timeScaled) * 0.1 * sin(pos.y * 5.0 + timeScaled);

  // Convert to clip coords
  vec4 modelViewPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position =  projectionMatrix * modelViewPosition;
  
  vWaterClipPosition = gl_Position.xyz / gl_Position.w; //NDC
  vUV = uv;
}