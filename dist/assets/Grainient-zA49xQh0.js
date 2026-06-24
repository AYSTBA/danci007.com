import{C as e,M as t,O as n,Q as r,S as i,Z as a,j as o,l as s,p as c,v as l,x as u}from"./vendor-router-DHxAAZF5.js";import{t as d}from"./index-CDZDXlpp.js";import{i as f,n as p,r as m,t as h}from"./vendor-ogl-Ce4ZcFQO.js";var g=`#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`,_=`#version 300 es
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
`,v=d(l({__name:`Grainient`,props:{color1:{default:`#FF9FFC`},color2:{default:`#5227FF`},color3:{default:`#B497CF`},timeSpeed:{default:.25},colorBalance:{default:0},warpStrength:{default:1},warpFrequency:{default:5},warpSpeed:{default:2},warpAmplitude:{default:50},blendAngle:{default:0},blendSoftness:{default:.05},rotationAmount:{default:500},noiseScale:{default:2},grainAmount:{default:.1},grainScale:{default:2},grainAnimated:{type:Boolean,default:!1},contrast:{default:1.5},gamma:{default:1},saturation:{default:1},centerX:{default:0},centerY:{default:0},zoom:{default:.9},className:{default:``}},setup(l){let d=l,v=/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)||window.innerWidth<=768,y=s(()=>v?{background:`linear-gradient(135deg, ${d.color1} 0%, ${d.color2} 50%, ${d.color3} 100%)`}:{});function b(e){let t=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(e);return t?[parseInt(t[1],16)/255,parseInt(t[2],16)/255,parseInt(t[3],16)/255]:[1,1,1]}let x=o(null),S=null,C=null,w=null,T=0,E=0,D=!0,O=!0,k=[];function A(){let e=x.value;if(!e)return;S=new m({webgl:2,alpha:!0,antialias:!1,dpr:Math.min(window.devicePixelRatio||1,2)});let t=S.gl,n=t.canvas;n.style.width=`100%`,n.style.height=`100%`,n.style.display=`block`,e.appendChild(n),k.push(()=>{try{e.removeChild(n)}catch{}});let r=new h(t);C=new f(t,{vertex:g,fragment:_,uniforms:{iTime:{value:0},iResolution:{value:new Float32Array([1,1])},uTimeSpeed:{value:d.timeSpeed},uColorBalance:{value:d.colorBalance},uWarpStrength:{value:d.warpStrength},uWarpFrequency:{value:d.warpFrequency},uWarpSpeed:{value:d.warpSpeed},uWarpAmplitude:{value:d.warpAmplitude},uBlendAngle:{value:d.blendAngle},uBlendSoftness:{value:d.blendSoftness},uRotationAmount:{value:d.rotationAmount},uNoiseScale:{value:d.noiseScale},uGrainAmount:{value:d.grainAmount},uGrainScale:{value:d.grainScale},uGrainAnimated:{value:+!!d.grainAnimated},uContrast:{value:d.contrast},uGamma:{value:d.gamma},uSaturation:{value:d.saturation},uCenterOffset:{value:new Float32Array([d.centerX,d.centerY])},uZoom:{value:d.zoom},uColor1:{value:new Float32Array(b(d.color1))},uColor2:{value:new Float32Array(b(d.color2))},uColor3:{value:new Float32Array(b(d.color3))}}}),w=new p(t,{geometry:r,program:C});let i=()=>{let n=e.getBoundingClientRect(),r=Math.max(1,Math.floor(n.width)),i=Math.max(1,Math.floor(n.height));S.setSize(r,i);let a=C.uniforms.iResolution.value;a[0]=t.drawingBufferWidth,a[1]=t.drawingBufferHeight,S.render({scene:w})},a=new ResizeObserver(i);a.observe(e),k.push(()=>a.disconnect()),i(),E=performance.now();let o=e=>{C.uniforms.iTime.value=(e-E)*.001,S.render({scene:w}),T=requestAnimationFrame(o)},s=()=>{D&&O&&T===0&&(T=requestAnimationFrame(o))},c=()=>{T!==0&&(cancelAnimationFrame(T),T=0)},l=new IntersectionObserver(([e])=>{D=e.isIntersecting,D?s():c()},{threshold:0});l.observe(e),k.push(()=>l.disconnect());let u=()=>{O=!document.hidden,O?s():c()};document.addEventListener(`visibilitychange`,u),k.push(()=>document.removeEventListener(`visibilitychange`,u)),s()}return u(()=>{A()}),i(()=>{if(T!==0&&(cancelAnimationFrame(T),T=0),k.forEach(e=>e()),k=[],S){try{S.gl.getExtension(`WEBGL_lose_context`)?.loseContext()}catch{}S=null,C=null,w=null}}),n(()=>[d.timeSpeed,d.colorBalance,d.warpStrength,d.warpFrequency,d.warpSpeed,d.warpAmplitude,d.blendAngle,d.blendSoftness,d.rotationAmount,d.noiseScale,d.grainAmount,d.grainScale,d.grainAnimated,d.contrast,d.gamma,d.saturation,d.centerX,d.centerY,d.zoom,d.color1,d.color2,d.color3],()=>{if(!C)return;let e=C.uniforms;e.uTimeSpeed.value=d.timeSpeed,e.uColorBalance.value=d.colorBalance,e.uWarpStrength.value=d.warpStrength,e.uWarpFrequency.value=d.warpFrequency,e.uWarpSpeed.value=d.warpSpeed,e.uWarpAmplitude.value=d.warpAmplitude,e.uBlendAngle.value=d.blendAngle,e.uBlendSoftness.value=d.blendSoftness,e.uRotationAmount.value=d.rotationAmount,e.uNoiseScale.value=d.noiseScale,e.uGrainAmount.value=d.grainAmount,e.uGrainScale.value=d.grainScale,e.uGrainAnimated.value=+!!d.grainAnimated,e.uContrast.value=d.contrast,e.uGamma.value=d.gamma,e.uSaturation.value=d.saturation,e.uCenterOffset.value[0]=d.centerX,e.uCenterOffset.value[1]=d.centerY,e.uZoom.value=d.zoom;let t=b(d.color1),n=b(d.color2),r=b(d.color3),i=e.uColor1.value,a=e.uColor2.value,o=e.uColor3.value;i[0]=t[0],i[1]=t[1],i[2]=t[2],a[0]=n[0],a[1]=n[1],a[2]=n[2],o[0]=r[0],o[1]=r[1],o[2]=r[2]},{deep:!0}),(n,i)=>t(v)?(e(),c(`div`,{key:0,class:a([`grainient-container`,l.className].filter(Boolean).join(` `)),style:r(y.value)},null,6)):(e(),c(`div`,{key:1,ref_key:`containerRef`,ref:x,class:a([`grainient-container`,l.className].filter(Boolean).join(` `))},null,2))}}),[[`__scopeId`,`data-v-8bb504ea`]]);export{v as t};