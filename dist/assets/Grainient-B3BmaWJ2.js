import{A as e,C as t,D as n,S as r,X as i,p as a,v as o,x as s}from"./vendor-router-Ch3HY_Wz.js";import{t as c}from"./index-BgsV00iU.js";import{i as l,n as u,r as d,t as f}from"./vendor-ogl-Ce4ZcFQO.js";var p=`#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`,m=`#version 300 es
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
`,h=c(o({__name:`Grainient`,props:{color1:{default:`#FF9FFC`},color2:{default:`#5227FF`},color3:{default:`#B497CF`},timeSpeed:{default:.25},colorBalance:{default:0},warpStrength:{default:1},warpFrequency:{default:5},warpSpeed:{default:2},warpAmplitude:{default:50},blendAngle:{default:0},blendSoftness:{default:.05},rotationAmount:{default:500},noiseScale:{default:2},grainAmount:{default:.1},grainScale:{default:2},grainAnimated:{type:Boolean,default:!1},contrast:{default:1.5},gamma:{default:1},saturation:{default:1},centerX:{default:0},centerY:{default:0},zoom:{default:.9},className:{default:``}},setup(o){let c=o;function h(e){let t=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(e);return t?[parseInt(t[1],16)/255,parseInt(t[2],16)/255,parseInt(t[3],16)/255]:[1,1,1]}let g=e(null),_=null,v=null,y=null,b=0,x=0,S=!0,C=!0,w=[];function T(){let e=g.value;if(!e)return;_=new d({webgl:2,alpha:!0,antialias:!1,dpr:Math.min(window.devicePixelRatio||1,2)});let t=_.gl,n=t.canvas;n.style.width=`100%`,n.style.height=`100%`,n.style.display=`block`,e.appendChild(n),w.push(()=>{try{e.removeChild(n)}catch{}});let r=new f(t);v=new l(t,{vertex:p,fragment:m,uniforms:{iTime:{value:0},iResolution:{value:new Float32Array([1,1])},uTimeSpeed:{value:c.timeSpeed},uColorBalance:{value:c.colorBalance},uWarpStrength:{value:c.warpStrength},uWarpFrequency:{value:c.warpFrequency},uWarpSpeed:{value:c.warpSpeed},uWarpAmplitude:{value:c.warpAmplitude},uBlendAngle:{value:c.blendAngle},uBlendSoftness:{value:c.blendSoftness},uRotationAmount:{value:c.rotationAmount},uNoiseScale:{value:c.noiseScale},uGrainAmount:{value:c.grainAmount},uGrainScale:{value:c.grainScale},uGrainAnimated:{value:+!!c.grainAnimated},uContrast:{value:c.contrast},uGamma:{value:c.gamma},uSaturation:{value:c.saturation},uCenterOffset:{value:new Float32Array([c.centerX,c.centerY])},uZoom:{value:c.zoom},uColor1:{value:new Float32Array(h(c.color1))},uColor2:{value:new Float32Array(h(c.color2))},uColor3:{value:new Float32Array(h(c.color3))}}}),y=new u(t,{geometry:r,program:v});let i=()=>{let n=e.getBoundingClientRect(),r=Math.max(1,Math.floor(n.width)),i=Math.max(1,Math.floor(n.height));_.setSize(r,i);let a=v.uniforms.iResolution.value;a[0]=t.drawingBufferWidth,a[1]=t.drawingBufferHeight,_.render({scene:y})},a=new ResizeObserver(i);a.observe(e),w.push(()=>a.disconnect()),i(),x=performance.now();let o=e=>{v.uniforms.iTime.value=(e-x)*.001,_.render({scene:y}),b=requestAnimationFrame(o)},s=()=>{S&&C&&b===0&&(b=requestAnimationFrame(o))},T=()=>{b!==0&&(cancelAnimationFrame(b),b=0)},E=new IntersectionObserver(([e])=>{S=e.isIntersecting,S?s():T()},{threshold:0});E.observe(e),w.push(()=>E.disconnect());let D=()=>{C=!document.hidden,C?s():T()};document.addEventListener(`visibilitychange`,D),w.push(()=>document.removeEventListener(`visibilitychange`,D)),s()}return s(()=>{T()}),r(()=>{b!==0&&(cancelAnimationFrame(b),b=0),w.forEach(e=>e()),w=[]}),n(()=>[c.timeSpeed,c.colorBalance,c.warpStrength,c.warpFrequency,c.warpSpeed,c.warpAmplitude,c.blendAngle,c.blendSoftness,c.rotationAmount,c.noiseScale,c.grainAmount,c.grainScale,c.grainAnimated,c.contrast,c.gamma,c.saturation,c.centerX,c.centerY,c.zoom,c.color1,c.color2,c.color3],()=>{if(!v)return;let e=v.uniforms;e.uTimeSpeed.value=c.timeSpeed,e.uColorBalance.value=c.colorBalance,e.uWarpStrength.value=c.warpStrength,e.uWarpFrequency.value=c.warpFrequency,e.uWarpSpeed.value=c.warpSpeed,e.uWarpAmplitude.value=c.warpAmplitude,e.uBlendAngle.value=c.blendAngle,e.uBlendSoftness.value=c.blendSoftness,e.uRotationAmount.value=c.rotationAmount,e.uNoiseScale.value=c.noiseScale,e.uGrainAmount.value=c.grainAmount,e.uGrainScale.value=c.grainScale,e.uGrainAnimated.value=+!!c.grainAnimated,e.uContrast.value=c.contrast,e.uGamma.value=c.gamma,e.uSaturation.value=c.saturation,e.uCenterOffset.value[0]=c.centerX,e.uCenterOffset.value[1]=c.centerY,e.uZoom.value=c.zoom;let t=h(c.color1),n=h(c.color2),r=h(c.color3),i=e.uColor1.value,a=e.uColor2.value,o=e.uColor3.value;i[0]=t[0],i[1]=t[1],i[2]=t[2],a[0]=n[0],a[1]=n[1],a[2]=n[2],o[0]=r[0],o[1]=r[1],o[2]=r[2]},{deep:!0}),(e,n)=>(t(),a(`div`,{ref_key:`containerRef`,ref:g,class:i([`grainient-container`,o.className].filter(Boolean).join(` `))},null,2))}}),[[`__scopeId`,`data-v-5b1c91b1`]]);export{h as t};