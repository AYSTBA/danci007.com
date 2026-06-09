<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';

const props = withDefaults(defineProps<{
  images?: (string | { src: string; alt?: string })[];
  fit?: number;
  fitBasis?: 'auto' | 'min' | 'max' | 'width' | 'height';
  minRadius?: number;
  maxRadius?: number;
  padFactor?: number;
  overlayBlurColor?: string;
  maxVerticalRotationDeg?: number;
  dragSensitivity?: number;
  enlargeTransitionMs?: number;
  segments?: number;
  dragDampening?: number;
  openedImageWidth?: string;
  openedImageHeight?: string;
  imageBorderRadius?: string;
  openedImageBorderRadius?: string;
  grayscale?: boolean;
}>(), {
  images: () => [],
  fit: 0.5,
  fitBasis: 'auto',
  minRadius: 600,
  maxRadius: Infinity,
  padFactor: 0.25,
  overlayBlurColor: 'transparent',
  maxVerticalRotationDeg: 5,
  dragSensitivity: 20,
  enlargeTransitionMs: 300,
  segments: 35,
  dragDampening: 2,
  openedImageWidth: '250px',
  openedImageHeight: '350px',
  imageBorderRadius: '30px',
  openedImageBorderRadius: '30px',
  grayscale: false,
});

const DEFAULT_IMAGES = [
  { src: 'https://images.unsplash.com/photo-1755331039789-7e5680e26e8f?q=80&w=774&auto=format&fit=crop', alt: 'Abstract art' },
  { src: 'https://images.unsplash.com/photo-1755569309049-98410b94f66d?q=80&w=772&auto=format&fit=crop', alt: 'Modern sculpture' },
  { src: 'https://images.unsplash.com/photo-1755497595318-7e5e3523854f?q=80&w=774&auto=format&fit=crop', alt: 'Digital artwork' },
  { src: 'https://images.unsplash.com/photo-1755353985163-c2a0fe5ac3d8?q=80&w=774&auto=format&fit=crop', alt: 'Contemporary art' },
  { src: 'https://images.unsplash.com/photo-1745965976680-d00be7dc0377?q=80&w=774&auto=format&fit=crop', alt: 'Geometric pattern' },
  { src: 'https://images.unsplash.com/photo-1752588975228-21f44630bb3c?q=80&w=774&auto=format&fit=crop', alt: 'Textured surface' },
];

const rootRef = ref<HTMLElement | null>(null);
const mainRef = ref<HTMLElement | null>(null);
const sphereRef = ref<HTMLElement | null>(null);
const frameRef = ref<HTMLElement | null>(null);
const viewerRef = ref<HTMLElement | null>(null);
const scrimRef = ref<HTMLElement | null>(null);

const rotation = ref({ x: 0, y: 0 });
const startRot = ref({ x: 0, y: 0 });
const startPos = ref<{ x: number; y: number } | null>(null);
const dragging = ref(false);
const moved = ref(false);
const dataEnlarging = ref(false);

let inertiaRAF: number | null = null;
let openStartedAt = 0;
let lastDragEndAt = 0;
let focusedEl: HTMLElement | null = null;
let originalTilePosition: { left: number; top: number; width: number; height: number } | null = null;
let scrollLocked = false;

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
const normalizeAngle = (d: number) => ((d % 360) + 360) % 360;
const wrapAngleSigned = (deg: number) => {
  const a = (((deg + 180) % 360) + 360) % 360;
  return a - 180;
};
const getDataNumber = (el: HTMLElement, name: string, fallback: number) => {
  const attr = el.dataset[name] ?? el.getAttribute(`data-${name}`);
  const n = attr == null ? NaN : parseFloat(attr);
  return Number.isFinite(n) ? n : fallback;
};

const effectiveImages = computed(() =>
  props.images.length > 0 ? props.images : DEFAULT_IMAGES
);

function buildItems(pool: (string | { src: string; alt?: string })[], seg: number) {
  const xCols = Array.from({ length: seg }, (_, i) => -37 + i * 2);
  const evenYs = [-4, -2, 0, 2, 4];
  const oddYs = [-3, -1, 1, 3, 5];

  const coords = xCols.flatMap((x, c) => {
    const ys = c % 2 === 0 ? evenYs : oddYs;
    return ys.map(y => ({ x, y, sizeX: 2, sizeY: 2 }));
  });

  const totalSlots = coords.length;
  if (pool.length === 0) {
    return coords.map(c => ({ ...c, src: '', alt: '' }));
  }

  const normalizedImages = pool.map(image => {
    if (typeof image === 'string') return { src: image, alt: '' };
    return { src: image.src || '', alt: image.alt || '' };
  });

  const usedImages = Array.from({ length: totalSlots }, (_, i) => normalizedImages[i % normalizedImages.length]);

  for (let i = 1; i < usedImages.length; i++) {
    if (usedImages[i].src === usedImages[i - 1].src) {
      for (let j = i + 1; j < usedImages.length; j++) {
        if (usedImages[j].src !== usedImages[i].src) {
          const tmp = usedImages[i];
          usedImages[i] = usedImages[j];
          usedImages[j] = tmp;
          break;
        }
      }
    }
  }

  return coords.map((c, i) => ({
    ...c,
    src: usedImages[i].src,
    alt: usedImages[i].alt,
  }));
}

const items = computed(() => buildItems(effectiveImages.value, props.segments));

function computeItemBaseRotation(offsetX: number, offsetY: number, sizeX: number, sizeY: number, segments: number) {
  const unit = 360 / segments / 2;
  const rotateY = unit * (offsetX + (sizeX - 1) / 2);
  const rotateX = unit * (offsetY - (sizeY - 1) / 2);
  return { rotateX, rotateY };
}

function applyTransform(xDeg: number, yDeg: number) {
  const el = sphereRef.value;
  if (el) {
    el.style.transform = `translateZ(calc(var(--radius) * -1)) rotateX(${xDeg}deg) rotateY(${yDeg}deg)`;
  }
}

function lockScrollFn() {
  if (scrollLocked) return;
  scrollLocked = true;
  document.body.classList.add('dg-scroll-lock');
}

function unlockScrollFn() {
  if (!scrollLocked) return;
  if (dataEnlarging.value) return;
  scrollLocked = false;
  document.body.classList.remove('dg-scroll-lock');
}

function stopInertia() {
  if (inertiaRAF !== null) {
    cancelAnimationFrame(inertiaRAF);
    inertiaRAF = null;
  }
}

function startInertia(vx: number, vy: number) {
  const MAX_V = 1.4;
  let vX = clamp(vx, -MAX_V, MAX_V) * 80;
  let vY = clamp(vy, -MAX_V, MAX_V) * 80;
  let frames = 0;
  const d = clamp(props.dragDampening ?? 0.6, 0, 1);
  const frictionMul = 0.94 + 0.055 * d;
  const stopThreshold = 0.015 - 0.01 * d;
  const maxFrames = Math.round(90 + 270 * d);
  stopInertia();
  const step = () => {
    vX *= frictionMul;
    vY *= frictionMul;
    if (Math.abs(vX) < stopThreshold && Math.abs(vY) < stopThreshold) {
      inertiaRAF = null;
      return;
    }
    if (++frames > maxFrames) {
      inertiaRAF = null;
      return;
    }
    const nextX = clamp(rotation.value.x - vY / 200, -props.maxVerticalRotationDeg, props.maxVerticalRotationDeg);
    const nextY = wrapAngleSigned(rotation.value.y + vX / 200);
    rotation.value = { x: nextX, y: nextY };
    applyTransform(nextX, nextY);
    inertiaRAF = requestAnimationFrame(step);
  };
  inertiaRAF = requestAnimationFrame(step);
}

// Pointer events for drag
function onPointerDown(e: PointerEvent) {
  if (focusedEl) return;
  stopInertia();
  dragging.value = true;
  moved.value = false;
  startRot.value = { ...rotation.value };
  startPos.value = { x: e.clientX, y: e.clientY };
  (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId);
}

function onPointerMove(e: PointerEvent) {
  if (!dragging.value || !startPos.value || focusedEl) return;
  const dxTotal = e.clientX - startPos.value.x;
  const dyTotal = e.clientY - startPos.value.y;
  if (!moved.value) {
    if (dxTotal * dxTotal + dyTotal * dyTotal > 16) moved.value = true;
  }
  const nextX = clamp(startRot.value.x - dyTotal / props.dragSensitivity, -props.maxVerticalRotationDeg, props.maxVerticalRotationDeg);
  const nextY = wrapAngleSigned(startRot.value.y + dxTotal / props.dragSensitivity);
  if (rotation.value.x !== nextX || rotation.value.y !== nextY) {
    rotation.value = { x: nextX, y: nextY };
    applyTransform(nextX, nextY);
  }
}

function onPointerUp(e: PointerEvent) {
  if (!dragging.value) return;
  dragging.value = false;
  const vx = (e as any).velocityX ?? 0;
  const vy = (e as any).velocityY ?? 0;
  if (Math.abs(vx) > 0.005 || Math.abs(vy) > 0.005) {
    startInertia(vx, vy);
  }
  if (moved.value) lastDragEndAt = performance.now();
  moved.value = false;
}

function closeEnlarged() {
  if (performance.now() - openStartedAt < 250) return;
  const el = focusedEl;
  if (!el) return;
  const parent = el.parentElement;
  const overlay = viewerRef.value?.querySelector('.enlarge') as HTMLElement;
  if (!overlay) return;
  const refDiv = parent?.querySelector('.item__image--reference') as HTMLElement;
  const originalPos = originalTilePosition;
  if (!originalPos) {
    overlay.remove();
    if (refDiv) refDiv.remove();
    if (parent) {
      parent.style.setProperty('--rot-y-delta', '0deg');
      parent.style.setProperty('--rot-x-delta', '0deg');
    }
    el.style.visibility = '';
    el.style.zIndex = '0';
    focusedEl = null;
    dataEnlarging.value = false;
    unlockScrollFn();
    return;
  }
  const currentRect = overlay.getBoundingClientRect();
  const rootRect = rootRef.value!.getBoundingClientRect();
  const originalPosRelativeToRoot = {
    left: originalPos.left - rootRect.left,
    top: originalPos.top - rootRect.top,
    width: originalPos.width,
    height: originalPos.height,
  };
  const overlayRelativeToRoot = {
    left: currentRect.left - rootRect.left,
    top: currentRect.top - rootRect.top,
    width: currentRect.width,
    height: currentRect.height,
  };
  const animatingOverlay = document.createElement('div');
  animatingOverlay.className = 'enlarge-closing';
  animatingOverlay.style.cssText = `position:absolute;left:${overlayRelativeToRoot.left}px;top:${overlayRelativeToRoot.top}px;width:${overlayRelativeToRoot.width}px;height:${overlayRelativeToRoot.height}px;z-index:9999;border-radius:var(--enlarge-radius,32px);overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.35);transition:all ${props.enlargeTransitionMs}ms ease-out;pointer-events:none;margin:0;transform:none;`;
  const originalImg = overlay.querySelector('img');
  if (originalImg) {
    const img = originalImg.cloneNode() as HTMLImageElement;
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
    animatingOverlay.appendChild(img);
  }
  overlay.remove();
  rootRef.value!.appendChild(animatingOverlay);
  void animatingOverlay.getBoundingClientRect();
  requestAnimationFrame(() => {
    animatingOverlay.style.left = originalPosRelativeToRoot.left + 'px';
    animatingOverlay.style.top = originalPosRelativeToRoot.top + 'px';
    animatingOverlay.style.width = originalPosRelativeToRoot.width + 'px';
    animatingOverlay.style.height = originalPosRelativeToRoot.height + 'px';
    animatingOverlay.style.opacity = '0';
  });
  const cleanup = () => {
    animatingOverlay.remove();
    originalTilePosition = null;
    if (refDiv) refDiv.remove();
    if (parent) parent.style.transition = 'none';
    el.style.transition = 'none';
    parent?.style.setProperty('--rot-y-delta', '0deg');
    parent?.style.setProperty('--rot-x-delta', '0deg');
    requestAnimationFrame(() => {
      el.style.visibility = '';
      el.style.opacity = '0';
      el.style.zIndex = '0';
      focusedEl = null;
      dataEnlarging.value = false;
      requestAnimationFrame(() => {
        if (parent) parent.style.transition = '';
        el.style.transition = 'opacity 300ms ease-out';
        requestAnimationFrame(() => {
          el.style.opacity = '1';
          setTimeout(() => {
            el.style.transition = '';
            el.style.opacity = '';
            if (!dragging.value && !dataEnlarging.value) unlockScrollFn();
          }, 300);
        });
      });
    });
  };
  animatingOverlay.addEventListener('transitionend', cleanup, { once: true });
}

function openItemFromElement(el: HTMLElement) {
  const parent = el.parentElement;
  if (!parent || !mainRef.value || !frameRef.value) return;
  focusedEl = el;
  openStartedAt = performance.now();
  lockScrollFn();

  const offsetX = getDataNumber(parent, 'offsetX', 0);
  const offsetY = getDataNumber(parent, 'offsetY', 0);
  const sizeX = getDataNumber(parent, 'sizeX', 2);
  const sizeY = getDataNumber(parent, 'sizeY', 2);
  const parentRot = computeItemBaseRotation(offsetX, offsetY, sizeX, sizeY, props.segments);
  const parentY = normalizeAngle(parentRot.rotateY);
  const globalY = normalizeAngle(rotation.value.y);
  let rotY = -(parentY + globalY) % 360;
  if (rotY < -180) rotY += 360;
  const rotX = -parentRot.rotateX - rotation.value.x;
  parent.style.setProperty('--rot-y-delta', `${rotY}deg`);
  parent.style.setProperty('--rot-x-delta', `${rotX}deg`);

  const refDiv = document.createElement('div');
  refDiv.className = 'item__image item__image--reference';
  refDiv.style.opacity = '0';
  refDiv.style.transform = `rotateX(${-parentRot.rotateX}deg) rotateY(${-parentRot.rotateY}deg)`;
  parent.appendChild(refDiv);
  void refDiv.offsetHeight;

  const tileR = refDiv.getBoundingClientRect();
  const mainR = mainRef.value.getBoundingClientRect();
  const frameR = frameRef.value.getBoundingClientRect();
  if (tileR.width <= 0 || tileR.height <= 0) {
    refDiv.remove();
    focusedEl = null;
    unlockScrollFn();
    return;
  }

  originalTilePosition = { left: tileR.left, top: tileR.top, width: tileR.width, height: tileR.height };
  el.style.visibility = 'hidden';
  el.style.zIndex = '0';

  const overlay = document.createElement('div');
  overlay.className = 'enlarge';
  overlay.style.position = 'absolute';
  overlay.style.left = frameR.left - mainR.left + 'px';
  overlay.style.top = frameR.top - mainR.top + 'px';
  overlay.style.width = frameR.width + 'px';
  overlay.style.height = frameR.height + 'px';
  overlay.style.opacity = '0';
  overlay.style.zIndex = '30';
  overlay.style.willChange = 'transform, opacity';
  overlay.style.transformOrigin = 'top left';
  overlay.style.transition = `transform ${props.enlargeTransitionMs}ms ease, opacity ${props.enlargeTransitionMs}ms ease`;
  const rawSrc = parent.dataset.src || el.querySelector('img')?.src || '';
  const img = document.createElement('img');
  img.src = rawSrc;
  overlay.appendChild(img);
  viewerRef.value!.appendChild(overlay);

  const tx0 = tileR.left - frameR.left;
  const ty0 = tileR.top - frameR.top;
  const sx0 = tileR.width / frameR.width;
  const sy0 = tileR.height / frameR.height;
  const validSx0 = isFinite(sx0) && sx0 > 0 ? sx0 : 1;
  const validSy0 = isFinite(sy0) && sy0 > 0 ? sy0 : 1;
  overlay.style.transform = `translate(${tx0}px, ${ty0}px) scale(${validSx0}, ${validSy0})`;

  setTimeout(() => {
    if (!overlay.parentElement) return;
    overlay.style.opacity = '1';
    overlay.style.transform = 'translate(0px, 0px) scale(1, 1)';
    dataEnlarging.value = true;
  }, 16);

  if (props.openedImageWidth || props.openedImageHeight) {
    const onFirstEnd = (ev: TransitionEvent) => {
      if (ev.propertyName !== 'transform') return;
      overlay.removeEventListener('transitionend', onFirstEnd);
      overlay.style.transition = 'none';
      const tempWidth = props.openedImageWidth || `${frameR.width}px`;
      const tempHeight = props.openedImageHeight || `${frameR.height}px`;
      overlay.style.width = tempWidth;
      overlay.style.height = tempHeight;
      const newRect = overlay.getBoundingClientRect();
      overlay.style.width = frameR.width + 'px';
      overlay.style.height = frameR.height + 'px';
      void overlay.offsetWidth;
      overlay.style.transition = `left ${props.enlargeTransitionMs}ms ease, top ${props.enlargeTransitionMs}ms ease, width ${props.enlargeTransitionMs}ms ease, height ${props.enlargeTransitionMs}ms ease`;
      const centeredLeft = frameR.left - mainR.left + (frameR.width - newRect.width) / 2;
      const centeredTop = frameR.top - mainR.top + (frameR.height - newRect.height) / 2;
      requestAnimationFrame(() => {
        overlay.style.left = `${centeredLeft}px`;
        overlay.style.top = `${centeredTop}px`;
        overlay.style.width = tempWidth;
        overlay.style.height = tempHeight;
      });
    };
    overlay.addEventListener('transitionend', onFirstEnd);
  }
}

function onTileClick(e: MouseEvent, el: HTMLElement) {
  if (dragging.value || moved.value) return;
  if (performance.now() - lastDragEndAt < 80) return;
  openItemFromElement(el);
}

onMounted(() => {
  const root = rootRef.value;
  if (!root) return;
  const ro = new ResizeObserver(entries => {
    const cr = entries[0].contentRect;
    const w = Math.max(1, cr.width);
    const h = Math.max(1, cr.height);
    const minDim = Math.min(w, h);
    const maxDim = Math.max(w, h);
    const aspect = w / h;
    let basis: number;
    switch (props.fitBasis) {
      case 'min': basis = minDim; break;
      case 'max': basis = maxDim; break;
      case 'width': basis = w; break;
      case 'height': basis = h; break;
      default: basis = aspect >= 1.3 ? w : minDim;
    }
    let radius = basis * props.fit;
    radius = Math.min(radius, h * 1.35);
    radius = clamp(radius, props.minRadius, props.maxRadius);
    const viewerPad = Math.max(8, Math.round(minDim * props.padFactor));
    root.style.setProperty('--radius', `${Math.round(radius)}px`);
    root.style.setProperty('--viewer-pad', `${viewerPad}px`);
    applyTransform(rotation.value.x, rotation.value.y);
  });
  ro.observe(root);

  window.addEventListener('keydown', onEsc);
});

onUnmounted(() => {
  document.body.classList.remove('dg-scroll-lock');
  window.removeEventListener('keydown', onEsc);
  if (inertiaRAF !== null) cancelAnimationFrame(inertiaRAF);
});

function onEsc(e: KeyboardEvent) {
  if (e.key === 'Escape') closeEnlarged();
}
</script>

<template>
  <div
    ref="rootRef"
    class="sphere-root"
    :data-enlarging="dataEnlarging"
    :style="{
      '--segments-x': String(segments),
      '--segments-y': String(segments),
      '--overlay-blur-color': overlayBlurColor,
      '--tile-radius': imageBorderRadius,
      '--enlarge-radius': openedImageBorderRadius,
      '--image-filter': grayscale ? 'grayscale(1)' : 'none',
    }"
  >
    <main
      ref="mainRef"
      class="sphere-main"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
    >
      <div class="stage">
        <div ref="sphereRef" class="sphere">
          <div
            v-for="(it, i) in items"
            :key="`${it.x}-${it.y}-${i}`"
            class="item"
            :data-src="it.src"
            :data-offset-x="String(it.x)"
            :data-offset-y="String(it.y)"
            :data-size-x="String(it.sizeX)"
            :data-size-y="String(it.sizeY)"
            :style="{
              '--offset-x': String(it.x),
              '--offset-y': String(it.y),
              '--item-size-x': String(it.sizeX),
              '--item-size-y': String(it.sizeY),
            }"
          >
            <div
              class="item__image"
              role="button"
              tabindex="0"
              :aria-label="it.alt || 'Open image'"
              @click="(e: MouseEvent) => onTileClick(e, $event.currentTarget as HTMLElement)"
            >
              <img :src="it.src" draggable="false" :alt="it.alt" />
            </div>
          </div>
        </div>
      </div>

      <div class="overlay"></div>
      <div class="overlay overlay--blur"></div>
      <div class="edge-fade edge-fade--top"></div>
      <div class="edge-fade edge-fade--bottom"></div>

      <div class="viewer" ref="viewerRef">
        <div ref="scrimRef" class="scrim" @click="closeEnlarged"></div>
        <div ref="frameRef" class="frame"></div>
      </div>
    </main>
  </div>
</template>

<style>
/* dome-gallery.css - copied from React Bits */
.dg-scroll-lock {
  overflow: hidden !important;
  touch-action: none !important;
}

.sphere-root {
  position: relative;
  width: 100%;
  height: 100%;
  --radius: 520px;
  --viewer-pad: 72px;
  --circ: calc(var(--radius) * 3.14);
  --rot-y: calc((360deg / var(--segments-x)) / 2);
  --rot-x: calc((360deg / var(--segments-y)) / 2);
  --item-width: calc(var(--circ) / var(--segments-x));
  --item-height: calc(var(--circ) / var(--segments-y));
}

.sphere-root * {
  box-sizing: border-box;
}

.sphere,
.item,
.item__image {
  transform-style: preserve-3d;
}

main.sphere-main {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  overflow: hidden;
  touch-action: pan-y pinch-zoom;
  user-select: none;
  -webkit-user-select: none;
  background: transparent;
}

.stage {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  perspective: calc(var(--radius) * 2);
  perspective-origin: 50% 50%;
  contain: layout paint size;
}

.sphere {
  transform: translateZ(calc(var(--radius) * -1));
  will-change: transform;
}

.overlay,
.overlay--blur {
  position: absolute;
  inset: 0;
  margin: auto;
  z-index: 3;
  pointer-events: none;
}

.overlay {
  background-image: radial-gradient(rgba(255, 255, 255, 0) 65%, var(--overlay-blur-color, transparent) 100%);
}

.overlay--blur {
  -webkit-mask-image: radial-gradient(rgba(255, 255, 255, 0) 70%, var(--overlay-blur-color, transparent) 90%);
  mask-image: radial-gradient(rgba(255, 255, 255, 0) 70%, var(--overlay-blur-color, transparent) 90%);
  backdrop-filter: blur(3px);
}

.item {
  width: calc(var(--item-width) * var(--item-size-x));
  height: calc(var(--item-height) * var(--item-size-y));
  position: absolute;
  top: -999px;
  bottom: -999px;
  left: -999px;
  right: -999px;
  margin: auto;
  transform-origin: 50% 50%;
  backface-visibility: hidden;
  transition: transform 300ms;
  transform: rotateY(calc(var(--rot-y) * (var(--offset-x) + ((var(--item-size-x) - 1) / 2)) + var(--rot-y-delta, 0deg)))
    rotateX(calc(var(--rot-x) * (var(--offset-y) - ((var(--item-size-y) - 1) / 2)) + var(--rot-x-delta, 0deg)))
    translateZ(var(--radius));
}

.item__image {
  position: absolute;
  display: block;
  inset: 10px;
  border-radius: var(--tile-radius, 12px);
  background: transparent;
  overflow: hidden;
  backface-visibility: hidden;
  transition: transform 300ms;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  pointer-events: auto;
  transform: translateZ(0);
}

.item__image:focus {
  outline: none;
}

.item__image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
  backface-visibility: hidden;
  filter: var(--image-filter, none);
}

.viewer {
  position: absolute;
  inset: 0;
  z-index: 20;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--viewer-pad);
}

.viewer .frame {
  height: 100%;
  aspect-ratio: 1;
  border-radius: var(--enlarge-radius, 32px);
  display: flex;
}

@media (max-aspect-ratio: 1/1) {
  .viewer .frame {
    height: auto;
    width: 100%;
  }
}

.viewer .scrim {
  position: absolute;
  inset: 0;
  z-index: 10;
  background: rgba(0, 0, 0, 0.4);
  pointer-events: none;
  opacity: 0;
  transition: opacity 500ms ease;
  backdrop-filter: blur(3px);
  cursor: pointer;
}

.sphere-root[data-enlarging="true"] .viewer .scrim {
  opacity: 1;
  pointer-events: all;
}

.viewer .enlarge {
  position: absolute;
  z-index: 30;
  border-radius: var(--enlarge-radius, 32px);
  overflow: hidden;
  transition: transform 500ms ease, opacity 500ms ease;
  transform-origin: top left;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
}

.viewer .enlarge img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: var(--image-filter, none);
}

.sphere-root .enlarge-closing img {
  filter: var(--image-filter, none);
}

.edge-fade {
  position: absolute;
  left: 0;
  right: 0;
  height: 120px;
  z-index: 5;
  pointer-events: none;
  background: linear-gradient(to bottom, transparent, var(--overlay-blur-color, transparent));
}

.edge-fade--top {
  top: 0;
  transform: rotate(180deg);
}

.edge-fade--bottom {
  bottom: 0;
}
</style>
