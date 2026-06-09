<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
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

const containerRef = ref<HTMLElement | null>(null);
let renderer: Renderer | null = null;
let program: Program | null = null;
let mesh: Mesh | null = null;
let raf = 0;
let t0 = 0;
let isVisible = true;
let isPageVisible = true;
let cleanupFns: (() => void)[] = [];

function build() {
  const container = containerRef.value;
  if (!container) return;

  renderer = new Renderer({
    webgl: 2 as any,
    alpha: true,
    antialias: false,
    dpr: Math.min(window.devicePixelRatio || 1, 2),
  });

  const gl = renderer.gl;
  const canvas = gl.canvas as HTMLCanvasElement;
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  container.appendChild(canvas);
  cleanupFns.push(() => { try { container.removeChild(canvas); } catch { /* ignore */ } });

  const geometry = new Triangle(gl);
  program = new Program(gl, {
    vertex,
    fragment,
    uniforms: {
      iTime: { value: 0 },
      iResolution: { value: new Float32Array([1, 1]) },
      uTimeSpeed: { value: props.timeSpeed },
      uColorBalance: { value: props.colorBalance },
      uWarpStrength: { value: props.warpStrength },
      uWarpFrequency: { value: props.warpFrequency },
      uWarpSpeed: { value: props.warpSpeed },
      uWarpAmplitude: { value: props.warpAmplitude },
      uBlendAngle: { value: props.blendAngle },
      uBlendSoftness: { value: props.blendSoftness },
      uRotationAmount: { value: props.rotationAmount },
      uNoiseScale: { value: props.noiseScale },
      uGrainAmount: { value: props.grainAmount },
      uGrainScale: { value: props.grainScale },
      uGrainAnimated: { value: props.grainAnimated ? 1.0 : 0.0 },
      uContrast: { value: props.contrast },
      uGamma: { value: props.gamma },
      uSaturation: { value: props.saturation },
      uCenterOffset: { value: new Float32Array([props.centerX, props.centerY]) },
      uZoom: { value: props.zoom },
      uColor1: { value: new Float32Array(hexToRgb(props.color1)) },
      uColor2: { value: new Float32Array(hexToRgb(props.color2)) },
      uColor3: { value: new Float32Array(hexToRgb(props.color3)) },
    },
  });

  mesh = new Mesh(gl, { geometry, program });

  const setSize = () => {
    const rect = container.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    renderer!.setSize(w, h);
    const res = program!.uniforms.iResolution.value as Float32Array;
    res[0] = gl.drawingBufferWidth;
    res[1] = gl.drawingBufferHeight;
    renderer!.render({ scene: mesh! });
  };

  const ro = new ResizeObserver(setSize);
  ro.observe(container);
  cleanupFns.push(() => ro.disconnect());
  setSize();

  t0 = performance.now();

  const loop = (t: number) => {
    program!.uniforms.iTime.value = (t - t0) * 0.001;
    renderer!.render({ scene: mesh! });
    raf = requestAnimationFrame(loop);
  };

  const tryStart = () => {
    if (isVisible && isPageVisible && raf === 0) raf = requestAnimationFrame(loop);
  };
  const tryStop = () => {
    if (raf !== 0) { cancelAnimationFrame(raf); raf = 0; }
  };

  const io = new IntersectionObserver(
    ([entry]) => {
      isVisible = entry.isIntersecting;
      isVisible ? tryStart() : tryStop();
    },
    { threshold: 0 }
  );
  io.observe(container);
  cleanupFns.push(() => io.disconnect());

  const onVisibility = () => {
    isPageVisible = !document.hidden;
    isPageVisible ? tryStart() : tryStop();
  };
  document.addEventListener('visibilitychange', onVisibility);
  cleanupFns.push(() => document.removeEventListener('visibilitychange', onVisibility));

  tryStart();
}

onMounted(() => {
  build();
});

onUnmounted(() => {
  if (raf !== 0) { cancelAnimationFrame(raf); raf = 0; }
  cleanupFns.forEach(fn => fn());
  cleanupFns = [];
});

// Watch props and sync to uniforms
watch(
  () => [
    props.timeSpeed, props.colorBalance, props.warpStrength, props.warpFrequency,
    props.warpSpeed, props.warpAmplitude, props.blendAngle, props.blendSoftness,
    props.rotationAmount, props.noiseScale, props.grainAmount, props.grainScale,
    props.grainAnimated, props.contrast, props.gamma, props.saturation,
    props.centerX, props.centerY, props.zoom, props.color1, props.color2, props.color3,
  ],
  () => {
    if (!program) return;
    const u = program.uniforms;
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
  },
  { deep: true }
);
</script>

<template>
  <div
    ref="containerRef"
    :class="['grainient-container', className].filter(Boolean).join(' ')"
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
