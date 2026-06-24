<script setup lang="ts">
import { onMounted, onUnmounted, watch, computed } from 'vue';
import { Renderer, Program, Mesh, Triangle } from 'ogl';

const props = withDefaults(defineProps<{
  color1?: string;
  color2?: string;
  color3?: string;
  timeSpeed?: number;
  colorBalance?: number;
  warpStrength?: number;
  warpFrequency?: number;
  warpSpeed?: number;
  warpAmplitude?: number;
  blendAngle?: number;
  blendSoftness?: number;
  rotationAmount?: number;
  noiseScale?: number;
  grainAmount?: number;
  grainScale?: number;
  grainAnimated?: boolean;
  contrast?: number;
  gamma?: number;
  saturation?: number;
  centerX?: number;
  centerY?: number;
  zoom?: number;
  className?: string;
}>(), {
  color1: '#FF9FFC',
  color2: '#5227FF',
  color3: '#B497CF',
  timeSpeed: 0.25,
  colorBalance: 0.0,
  warpStrength: 1.0,
  warpFrequency: 5.0,
  warpSpeed: 2.0,
  warpAmplitude: 50.0,
  blendAngle: 0.0,
  blendSoftness: 0.05,
  rotationAmount: 500.0,
  noiseScale: 2.0,
  grainAmount: 0.1,
  grainScale: 2.0,
  grainAnimated: false,
  contrast: 1.5,
  gamma: 1.0,
  saturation: 1.0,
  centerX: 0.0,
  centerY: 0.0,
  zoom: 0.9,
  className: '',
});

const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;

const cssGradientStyle = computed(() => ({
  background: `linear-gradient(135deg, ${props.color1} 0%, ${props.color2} 50%, ${props.color3} 100%)`,
}));

// === Desktop: no template rendered — canvas is managed as fixed fullscreen overlay in document.body
// === Mobile: renders CSS gradient instead of WebGL

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [1, 1, 1];
  return [
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255,
  ];
}

const vertex = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragment = `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform float uTimeSpeed;
uniform float uColorBalance;
uniform float uWarpStrength;
uniform float uWarpFrequency;
uniform float uWarpSpeed;
uniform float uWarpAmplitude;
uniform float uBlendAngle;
uniform float uBlendSoftness;
uniform float uRotationAmount;
uniform float uNoiseScale;
uniform float uGrainAmount;
uniform float uGrainScale;
uniform float uGrainAnimated;
uniform float uContrast;
uniform float uGamma;
uniform float uSaturation;
uniform vec2 uCenterOffset;
uniform float uZoom;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
out vec4 fragColor;
#define S(a,b,t) smoothstep(a,b,t)
mat2 Rot(float a){float s=sin(a),c=cos(a);return mat2(c,-s,s,c);} 
vec2 hash(vec2 p){p=vec2(dot(p,vec2(2127.1,81.17)),dot(p,vec2(1269.5,283.37)));return fract(sin(p)*43758.5453);} 
float noise(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.0-2.0*f);float n=mix(mix(dot(-1.0+2.0*hash(i+vec2(0.0,0.0)),f-vec2(0.0,0.0)),dot(-1.0+2.0*hash(i+vec2(1.0,0.0)),f-vec2(1.0,0.0)),u.x),mix(dot(-1.0+2.0*hash(i+vec2(0.0,1.0)),f-vec2(0.0,1.0)),dot(-1.0+2.0*hash(i+vec2(1.0,1.0)),f-vec2(1.0,1.0)),u.x),u.y);return 0.5+0.5*n;}
void mainImage(out vec4 o, vec2 C){
  float t=iTime*uTimeSpeed;
  vec2 uv=C/iResolution.xy;
  float ratio=iResolution.x/iResolution.y;
  vec2 tuv=uv-0.5+uCenterOffset;
  tuv/=max(uZoom,0.001);

  float degree=noise(vec2(t*0.1,tuv.x*tuv.y)*uNoiseScale);
  tuv.y*=1.0/ratio;
  tuv*=Rot(radians((degree-0.5)*uRotationAmount+180.0));
  tuv.y*=ratio;

  float frequency=uWarpFrequency;
  float ws=max(uWarpStrength,0.001);
  float amplitude=uWarpAmplitude/ws;
  float warpTime=t*uWarpSpeed;
  tuv.x+=sin(tuv.y*frequency+warpTime)/amplitude;
  tuv.y+=sin(tuv.x*(frequency*1.5)+warpTime)/(amplitude*0.5);

  vec3 colLav=uColor1;
  vec3 colOrg=uColor2;
  vec3 colDark=uColor3;
  float b=uColorBalance;
  float s=max(uBlendSoftness,0.0);
  mat2 blendRot=Rot(radians(uBlendAngle));
  float blendX=(tuv*blendRot).x;
  float edge0=-0.3-b-s;
  float edge1=0.2-b+s;
  float v0=0.5-b+s;
  float v1=-0.3-b-s;
  vec3 layer1=mix(colDark,colOrg,S(edge0,edge1,blendX));
  vec3 layer2=mix(colOrg,colLav,S(edge0,edge1,blendX));
  vec3 col=mix(layer1,layer2,S(v0,v1,tuv.y));

  vec2 grainUv=uv*max(uGrainScale,0.001);
  if(uGrainAnimated>0.5){grainUv+=vec2(iTime*0.05);} 
  float grain=fract(sin(dot(grainUv,vec2(12.9898,78.233)))*43758.5453);
  col+=(grain-0.5)*uGrainAmount;

  col=(col-0.5)*uContrast+0.5;
  float luma=dot(col,vec3(0.2126,0.7152,0.0722));
  col=mix(vec3(luma),col,uSaturation);
  col=pow(max(col,0.0),vec3(1.0/max(uGamma,0.001)));
  col=clamp(col,0.0,1.0);

  o=vec4(col,1.0);
}
void main(){
  vec4 o=vec4(0.0);
  mainImage(o,gl_FragCoord.xy);
  fragColor=o;
}
`;

// === Shared singleton WebGL context (canvas permanently in body wrapper, never removed) ===
let sRenderer: Renderer | null = null;
let sProgram: Program | null = null;
let sMesh: Mesh | null = null;
let sCanvas: HTMLCanvasElement | null = null;
let sWrap: HTMLDivElement | null = null;
let sRaf = 0;
let sT0 = 0;
let sCount = 0;
let sVisible = false;
let sPageVisible = true;
let sInitDone = false;

function sLoop(t: number) {
  if (!sProgram || !sRenderer || !sMesh) return;
  sProgram.uniforms.iTime.value = (t - sT0) * 0.001;
  sRenderer.render({ scene: sMesh });
  sRaf = requestAnimationFrame(sLoop);
}

function sStart() {
  if (sVisible && sPageVisible && sRaf === 0 && sRenderer) {
    sRaf = requestAnimationFrame(sLoop);
  }
}
function sStop() {
  if (sRaf !== 0) { cancelAnimationFrame(sRaf); sRaf = 0; }
}

function sSetSize() {
  if (!sRenderer || !sProgram || !sMesh || !sCanvas) return;
  const gl = sRenderer.gl;
  const w = Math.max(1, Math.floor(window.innerWidth));
  const h = Math.max(1, Math.floor(window.innerHeight));
  sRenderer.setSize(w, h);
  const res = sProgram.uniforms.iResolution.value as Float32Array;
  res[0] = gl.drawingBufferWidth;
  res[1] = gl.drawingBufferHeight;
  sRenderer.render({ scene: sMesh });
}

function ensureInit() {
  if (sInitDone) return;
  sInitDone = true;

  sRenderer = new Renderer({
    webgl: 2 as any,
    alpha: true,
    antialias: false,
    dpr: Math.min(window.devicePixelRatio || 1, 2),
  });

  const gl = sRenderer.gl;
  sCanvas = gl.canvas as HTMLCanvasElement;
  sWrap = document.createElement('div');
  sWrap.style.cssText = 'position:fixed;inset:0;z-index:-1;pointer-events:none;display:none';
  sCanvas.style.cssText = 'width:100%;height:100%;display:block';
  sWrap.appendChild(sCanvas);
  document.body.insertBefore(sWrap, document.body.firstChild);

  const geometry = new Triangle(gl);
  sProgram = new Program(gl, {
    vertex,
    fragment,
    uniforms: {
      iTime: { value: 0 },
      iResolution: { value: new Float32Array([1, 1]) },
      uTimeSpeed: { value: 0.25 },
      uColorBalance: { value: 0 },
      uWarpStrength: { value: 1 },
      uWarpFrequency: { value: 5 },
      uWarpSpeed: { value: 2 },
      uWarpAmplitude: { value: 50 },
      uBlendAngle: { value: 0 },
      uBlendSoftness: { value: 0.05 },
      uRotationAmount: { value: 500 },
      uNoiseScale: { value: 2 },
      uGrainAmount: { value: 0.1 },
      uGrainScale: { value: 2 },
      uGrainAnimated: { value: 0 },
      uContrast: { value: 1.5 },
      uGamma: { value: 1 },
      uSaturation: { value: 1 },
      uCenterOffset: { value: new Float32Array([0, 0]) },
      uZoom: { value: 0.9 },
      uColor1: { value: new Float32Array([1, 0.625, 0.988]) },
      uColor2: { value: new Float32Array([0.322, 0.153, 1]) },
      uColor3: { value: new Float32Array([0.706, 0.592, 0.812]) },
    },
  });

  sMesh = new Mesh(gl, { geometry, program: sProgram });

  window.addEventListener('resize', sSetSize);
  document.addEventListener('visibilitychange', () => {
    sPageVisible = !document.hidden;
    sPageVisible ? sStart() : sStop();
  });

  sT0 = performance.now();
  sSetSize();
}

function activate() {
  sCount++;
  sVisible = true;
  sPageVisible = !document.hidden;
  if (sWrap) sWrap.style.display = 'block';
  syncUniforms();
  sSetSize();
  sStart();
}

function deactivate() {
  sCount--;
  if (sCount <= 0) {
    if (sWrap) sWrap.style.display = 'none';
    sVisible = false;
    sStop();
  }
}

function syncUniforms() {
  if (!sProgram) return;
  const u = sProgram.uniforms;
  u.uTimeSpeed.value = props.timeSpeed;
  u.uColorBalance.value = props.colorBalance;
  u.uWarpStrength.value = props.warpStrength;
  u.uWarpFrequency.value = props.warpFrequency;
  u.uWarpSpeed.value = props.warpSpeed;
  u.uWarpAmplitude.value = props.warpAmplitude;
  u.uBlendAngle.value = props.blendAngle;
  u.uBlendSoftness.value = props.blendSoftness;
  u.uRotationAmount.value = props.rotationAmount;
  u.uNoiseScale.value = props.noiseScale;
  u.uGrainAmount.value = props.grainAmount;
  u.uGrainScale.value = props.grainScale;
  u.uGrainAnimated.value = props.grainAnimated ? 1.0 : 0.0;
  u.uContrast.value = props.contrast;
  u.uGamma.value = props.gamma;
  u.uSaturation.value = props.saturation;
  (u.uCenterOffset.value as Float32Array)[0] = props.centerX;
  (u.uCenterOffset.value as Float32Array)[1] = props.centerY;
  u.uZoom.value = props.zoom;
  const c1 = hexToRgb(props.color1);
  const c2 = hexToRgb(props.color2);
  const c3 = hexToRgb(props.color3);
  const arr1 = u.uColor1.value as Float32Array;
  const arr2 = u.uColor2.value as Float32Array;
  const arr3 = u.uColor3.value as Float32Array;
  arr1[0] = c1[0]; arr1[1] = c1[1]; arr1[2] = c1[2];
  arr2[0] = c2[0]; arr2[1] = c2[1]; arr2[2] = c2[2];
  arr3[0] = c3[0]; arr3[1] = c3[1]; arr3[2] = c3[2];
}

onMounted(() => {
  if (isMobile) return;
  try { ensureInit(); } catch {}
  try { activate(); } catch {}
});

onUnmounted(() => {
  if (isMobile) return;
  try { deactivate(); } catch {}
});

watch(
  () => [
    props.timeSpeed, props.colorBalance, props.warpStrength, props.warpFrequency,
    props.warpSpeed, props.warpAmplitude, props.blendAngle, props.blendSoftness,
    props.rotationAmount, props.noiseScale, props.grainAmount, props.grainScale,
    props.grainAnimated, props.contrast, props.gamma, props.saturation,
    props.centerX, props.centerY, props.zoom, props.color1, props.color2, props.color3,
  ],
  syncUniforms,
  { deep: true }
);
</script>

<template>
  <div
    v-if="isMobile"
    :class="['grainient-container', className].filter(Boolean).join(' ')"
    :style="cssGradientStyle"
  />
</template>

<style scoped>
.grainient-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
