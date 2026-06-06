<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';

const props = defineProps<{
  visible: boolean;
  imageFile?: File | null;
  aspectRatio?: 'square' | 'circle' | 'free';
}>();

const emit = defineEmits<{
  (e: 'confirm', file: File): void;
  (e: 'cancel'): void;
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);
const image = ref<HTMLImageElement | null>(null);
const rotation = ref(0);
const scale = ref(1);
const cropX = ref(0);
const cropY = ref(0);
const cropWidth = ref(0);
const cropHeight = ref(0);
const isProcessing = ref(false);
const isDraggingCrop = ref(false);
const isDraggingImage = ref(false);
const dragStartX = ref(0);
const dragStartY = ref(0);
const startCropX = ref(0);
const startCropY = ref(0);
const startImageOffsetX = ref(0);
const startImageOffsetY = ref(0);
const imageOffsetX = ref(0);
const imageOffsetY = ref(0);
const aspectRatioMode = ref(props.aspectRatio || 'free');

const initImage = (file: File) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      image.value = img;
      resetCrop();
      drawCanvas();
    };
    img.src = e.target?.result as string;
  };
  reader.readAsDataURL(file);
};

const resetCrop = () => {
  if (!image.value || !containerRef.value) return;
  
  const img = image.value;
  const container = containerRef.value;
  const imgAspectRatio = img.width / img.height;
  
  // 计算图片在画布上的实际显示尺寸（与drawCanvas一致）
  let displayWidth, displayHeight;
  if (imgAspectRatio > 1) {
    displayWidth = Math.min(container.clientWidth * 0.9, img.width);
    displayHeight = displayWidth / imgAspectRatio;
  } else {
    displayHeight = Math.min(container.clientHeight * 0.9, img.height);
    displayWidth = displayHeight * imgAspectRatio;
  }
  
  // 根据裁剪模式设置裁剪框大小
  let w, h;
  if (aspectRatioMode.value === 'circle' || aspectRatioMode.value === 'square') {
    // 对于圆形和正方形，取较小边的尺寸
    const size = Math.min(displayWidth, displayHeight);
    w = size;
    h = size;
  } else {
    // 自由模式下，完全匹配图片显示尺寸
    w = displayWidth;
    h = displayHeight;
  }
  
  cropWidth.value = w;
  cropHeight.value = h;
  
  // 计算裁剪框位置，使其居中
  cropX.value = (container.clientWidth - w) / 2;
  cropY.value = (container.clientHeight - h) / 2;
  
  imageOffsetX.value = 0;
  imageOffsetY.value = 0;
  scale.value = 1;
};

const setAspectRatio = (mode: 'square' | 'circle' | 'free') => {
  aspectRatioMode.value = mode;
  resetCrop();
};

const drawCanvas = () => {
  const canvas = canvasRef.value;
  const container = containerRef.value;
  if (!canvas || !container || !image.value) return;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#f5f5f5';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  const img = image.value;
  const imgAspect = img.width / img.height;
  let drawWidth, drawHeight;
  if (imgAspect > 1) {
    drawWidth = Math.min(canvas.width * 0.9, img.width);
    drawHeight = drawWidth / imgAspect;
  } else {
    drawHeight = Math.min(canvas.height * 0.9, img.height);
    drawWidth = drawHeight * imgAspect;
  }
  
  const baseOffsetX = (canvas.width - drawWidth) / 2;
  const baseOffsetY = (canvas.height - drawHeight) / 2;
  
  const actualOffsetX = baseOffsetX + imageOffsetX.value;
  const actualOffsetY = baseOffsetY + imageOffsetY.value;
  
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotation.value * Math.PI) / 180);
  ctx.scale(scale.value, scale.value);
  ctx.translate(-canvas.width / 2, -canvas.height / 2);
  ctx.drawImage(img, actualOffsetX, actualOffsetY, drawWidth, drawHeight);
  ctx.restore();
  
  // 绘制遮罩
  if (aspectRatioMode.value === 'circle') {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    const centerX = cropX.value + cropWidth.value / 2;
    const centerY = cropY.value + cropHeight.value / 2;
    const radius = Math.min(cropWidth.value, cropHeight.value) / 2;
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    // 绘制圆形边框
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, cropY.value);
    ctx.fillRect(0, cropY.value + cropHeight.value, canvas.width, canvas.height - cropY.value - cropHeight.value);
    ctx.fillRect(0, cropY.value, cropX.value, cropHeight.value);
    ctx.fillRect(cropX.value + cropWidth.value, cropY.value, canvas.width - cropX.value - cropWidth.value, cropHeight.value);
    
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(cropX.value, cropY.value, cropWidth.value, cropHeight.value);
  }
  
  if (aspectRatioMode.value !== 'circle') {
    const cornerSize = 8;
    ctx.fillStyle = '#4caf50';
    ctx.fillRect(cropX.value - 1, cropY.value - 1, cornerSize, 3);
    ctx.fillRect(cropX.value - 1, cropY.value - 1, 3, cornerSize);
    ctx.fillRect(cropX.value + cropWidth.value - cornerSize + 1, cropY.value - 1, cornerSize, 3);
    ctx.fillRect(cropX.value + cropWidth.value - 2, cropY.value - 1, 3, cornerSize);
    ctx.fillRect(cropX.value - 1, cropY.value + cropHeight.value - 2, cornerSize, 3);
    ctx.fillRect(cropX.value - 1, cropY.value + cropHeight.value - cornerSize + 1, 3, cornerSize);
    ctx.fillRect(cropX.value + cropWidth.value - cornerSize + 1, cropY.value + cropHeight.value - 2, cornerSize, 3);
    ctx.fillRect(cropX.value + cropWidth.value - 2, cropY.value + cropHeight.value - cornerSize + 1, 3, cornerSize);
  }
};

const handleMouseDown = (e: MouseEvent) => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  if (x >= cropX.value && x <= cropX.value + cropWidth.value &&
      y >= cropY.value && y <= cropY.value + cropHeight.value) {
    isDraggingCrop.value = true;
    dragStartX.value = x;
    dragStartY.value = y;
    startCropX.value = cropX.value;
    startCropY.value = cropY.value;
  } else {
    isDraggingImage.value = true;
    dragStartX.value = x;
    dragStartY.value = y;
    startImageOffsetX.value = imageOffsetX.value;
    startImageOffsetY.value = imageOffsetY.value;
  }
};

const handleMouseMove = (e: MouseEvent) => {
  if (!isDraggingCrop.value && !isDraggingImage.value) return;
  
  const canvas = canvasRef.value;
  if (!canvas) return;
  
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  if (isDraggingCrop.value) {
    cropX.value = Math.max(0, Math.min(startCropX.value + (x - dragStartX.value), canvas.width - cropWidth.value));
    cropY.value = Math.max(0, Math.min(startCropY.value + (y - dragStartY.value), canvas.height - cropHeight.value));
  } else if (isDraggingImage.value) {
    imageOffsetX.value = startImageOffsetX.value + (x - dragStartX.value);
    imageOffsetY.value = startImageOffsetY.value + (y - dragStartY.value);
  }
  
  drawCanvas();
};

const handleMouseUp = () => {
  isDraggingCrop.value = false;
  isDraggingImage.value = false;
};

const rotateLeft = () => {
  rotation.value = (rotation.value - 90) % 360;
  drawCanvas();
};

const rotateRight = () => {
  rotation.value = (rotation.value + 90) % 360;
  drawCanvas();
};

const zoomIn = () => {
  scale.value = Math.min(scale.value + 0.1, 3);
  drawCanvas();
};

const zoomOut = () => {
  scale.value = Math.max(scale.value - 0.1, 0.5);
  drawCanvas();
};

const confirmCrop = () => {
  if (isProcessing.value) return;
  const canvas = canvasRef.value;
  if (!canvas || !image.value) return;

  isProcessing.value = true;

  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) return;
  
  const img = image.value;
  const imgAspect = img.width / img.height;
  
  let drawWidth, drawHeight;
  if (imgAspect > 1) {
    drawWidth = Math.min(canvas.width * 0.9, img.width);
    drawHeight = drawWidth / imgAspect;
  } else {
    drawHeight = Math.min(canvas.height * 0.9, img.height);
    drawWidth = drawHeight * imgAspect;
  }
  
  const baseOffsetX = (canvas.width - drawWidth) / 2;
  const baseOffsetY = (canvas.height - drawHeight) / 2;
  
  const actualOffsetX = baseOffsetX + imageOffsetX.value;
  const actualOffsetY = baseOffsetY + imageOffsetY.value;
  
  const cropRatioX = (cropX.value - actualOffsetX) / drawWidth;
  const cropRatioY = (cropY.value - actualOffsetY) / drawHeight;
  const cropRatioW = cropWidth.value / drawWidth;
  const cropRatioH = cropHeight.value / drawHeight;
  
  const srcX = Math.max(0, cropRatioX * img.width);
  const srcY = Math.max(0, cropRatioY * img.height);
  let srcW = Math.min(cropRatioW * img.width, img.width - srcX);
  let srcH = Math.min(cropRatioH * img.height, img.height - srcY);
  
  if (aspectRatioMode.value === 'circle') {
    const size = Math.min(srcW, srcH);
    srcW = size;
    srcH = size;
  }
  
  tempCanvas.width = srcW;
  tempCanvas.height = srcH;
  
  tempCtx.save();
  tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
  tempCtx.rotate((rotation.value * Math.PI) / 180);
  tempCtx.scale(scale.value, scale.value);
  tempCtx.translate(-tempCanvas.width / 2, -tempCanvas.height / 2);
  tempCtx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, tempCanvas.width, tempCanvas.height);
  tempCtx.restore();
  
  if (aspectRatioMode.value === 'circle') {
    const circleCanvas = document.createElement('canvas');
    circleCanvas.width = srcW;
    circleCanvas.height = srcH;
    const circleCtx = circleCanvas.getContext('2d');
    if (circleCtx) {
      circleCtx.beginPath();
      circleCtx.arc(srcW / 2, srcH / 2, Math.min(srcW, srcH) / 2, 0, Math.PI * 2);
      circleCtx.clip();
      circleCtx.drawImage(tempCanvas, 0, 0);
      
      circleCanvas.toBlob((blob) => {
        if (blob) {
          const fileName = (props.imageFile as File)?.name?.replace(/\.[^.]+$/, '') || 'cropped-image';
          const newFile = new File([blob], fileName + '.jpg', { type: 'image/jpeg' });
          emit('confirm', newFile);
        }
      }, 'image/jpeg', 0.92);
      return;
    }
  }
  
  tempCanvas.toBlob((blob) => {
    if (blob) {
      const fileName = (props.imageFile as File)?.name?.replace(/\.[^.]+$/, '') || 'cropped-image';
      const newFile = new File([blob], fileName + '.jpg', { type: 'image/jpeg' });
      emit('confirm', newFile);
    }
  }, 'image/jpeg', 0.92);
};

const cancel = () => {
  if (isProcessing.value) return;
  emit('cancel');
};

watch(() => props.visible, (newVal) => {
  if (newVal) {
    isProcessing.value = false;
    if (props.imageFile) {
      initImage(props.imageFile as File);
    }
  }
});

onMounted(() => {
  window.addEventListener('mouseup', handleMouseUp);
  window.addEventListener('mousemove', handleMouseMove);
});
</script>

<template>
  <div v-if="visible" class="image-editor-overlay" :class="{ 'no-close': isProcessing }" @click.self="cancel">
    <div class="image-editor">
      <div class="editor-header">
        <h3>编辑图片</h3>
        <button class="close-btn" :disabled="isProcessing" @click="cancel">×</button>
      </div>
      
      <div class="editor-body">
        <div ref="containerRef" class="canvas-container">
          <canvas
            ref="canvasRef"
            @mousedown="handleMouseDown"
          />
        </div>
        
        <div class="editor-controls">
          <div class="control-group">
            <button 
              :class="['ratio-btn', { active: aspectRatioMode === 'free' }]" 
              @click="setAspectRatio('free')"
            >
              自由
            </button>
            <button 
              :class="['ratio-btn', { active: aspectRatioMode === 'square' }]" 
              @click="setAspectRatio('square')"
            >
              正方形
            </button>
            <button 
              :class="['ratio-btn', { active: aspectRatioMode === 'circle' }]" 
              @click="setAspectRatio('circle')"
            >
              圆形
            </button>
          </div>
          
          <div class="control-group">
            <button class="control-btn" @click="rotateLeft" title="向左旋转">
              ↺
            </button>
            <button class="control-btn" @click="rotateRight" title="向右旋转">
              ↻
            </button>
          </div>
          
          <div class="control-group">
            <button class="control-btn" @click="zoomOut" title="缩小">
              −
            </button>
            <span class="scale-display">{{ Math.round(scale * 100) }}%</span>
            <button class="control-btn" @click="zoomIn" title="放大">
              +
            </button>
          </div>
          
          <div class="control-group">
            <button class="control-btn reset-btn" @click="resetCrop" title="重置">
              重置
            </button>
          </div>
        </div>
        
        <div class="editor-tip">
          点击图片区域拖拽图片，点击裁剪框移动裁剪区域
        </div>
      </div>
      
      <div class="editor-footer">
        <button class="btn btn-cancel" :disabled="isProcessing" @click="cancel">取消</button>
        <button class="btn btn-confirm" :disabled="isProcessing" @click="confirmCrop">
          {{ isProcessing ? '处理中…' : '确认' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.image-editor-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 20px;
}

.image-editor {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 900px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.editor-header {
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.editor-header h3 {
  margin: 0;
  font-size: 1.2rem;
  color: #333;
}

.close-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: #f5f5f5;
  border-radius: 50%;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  transition: all 0.3s;
}

.close-btn:hover {
  background: #eee;
  color: #333;
}

.editor-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.canvas-container {
  flex: 1;
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f9f9f9;
  position: relative;
}

.canvas-container canvas {
  cursor: grab;
  max-width: 100%;
  max-height: 100%;
}

.canvas-container canvas:active {
  cursor: grabbing;
}

.editor-controls {
  display: flex;
  justify-content: center;
  gap: 20px;
  padding: 16px;
  border-top: 1px solid #eee;
  flex-wrap: wrap;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ratio-btn {
  padding: 6px 16px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 8px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s;
}

.ratio-btn:hover {
  background: #f5f5f5;
  border-color: #ccc;
}

.ratio-btn.active {
  background: #4caf50;
  color: white;
  border-color: #4caf50;
}

.control-btn {
  width: 40px;
  height: 40px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 8px;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.control-btn:hover {
  background: #f5f5f5;
  border-color: #ccc;
}

.control-btn.reset-btn {
  width: auto;
  padding: 0 16px;
  font-size: 0.9rem;
}

.scale-display {
  min-width: 50px;
  text-align: center;
  color: #666;
  font-size: 0.9rem;
}

.editor-tip {
  text-align: center;
  color: #999;
  font-size: 0.85rem;
  padding-bottom: 10px;
}

.editor-footer {
  padding: 16px 20px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn {
  padding: 10px 24px;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-cancel {
  background: #f5f5f5;
  color: #333;
}

.btn-cancel:hover {
  background: #eee;
}

.btn-confirm {
  background: #4caf50;
  color: white;
}

.btn-confirm:hover {
  background: #43a047;
}

.btn:disabled,
.close-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn-confirm:disabled {
  background: #9ccc65;
}

@media (max-width: 768px) {
  .image-editor-overlay {
    padding: 10px;
  }
  
  .canvas-container {
    min-height: 300px;
  }
  
  .editor-controls {
    gap: 12px;
    padding: 12px;
  }
}
</style>
