// Общий рендерер персонажа для редактора и мира
const canvasSize = { w: 991, h: 1204 };

// Все возможные слои
const allLayers = [
    // ЗАДНИЕ ЧАСТИ (рисуются первыми)
    { file: 'parts/shoulder2_fill.png',     tint: true,  group: 'skin' },
    { file: 'parts/shoulder2_outline.png',  tint: false, group: 'outline' },
    { file: 'parts/forearm2_fill.png',      tint: true,  group: 'skin' },
    { file: 'parts/forearm2_outline.png',   tint: false, group: 'outline' },
    { file: 'parts/hip2_fill.png',          tint: true,  group: 'skin' },
    { file: 'parts/hip2_outline.png',       tint: false, group: 'outline' },
    // Шорты 3 (левое бедро) — поверх бедра 2
    { file: 'parts/shorts3_fill.png',       tint: true,  group: 'shorts_leg', hideWithPants: true },
    { file: 'parts/shorts3_outline.png',    tint: false, group: 'shorts_outline', hideWithPants: true },
    { file: 'parts/knee2_fill.png',         tint: true,  group: 'skin' },
    { file: 'parts/knee2_outline.png',      tint: false, group: 'outline' },
    // ТУЛОВИЩЕ
    { file: 'parts/torso_fill.png',         tint: true,  group: 'skin' },
    { file: 'parts/torso_outline.png',      tint: false, group: 'outline' },
    // Шорты 2 (тазовая часть) — поверх туловища, НЕ снимаются
    { file: 'parts/shorts2_fill.png',       tint: true,  group: 'shorts_pelvis' },
    { file: 'parts/shorts2_outline.png',    tint: false, group: 'shorts_pelvis_outline' },
    // ПЕРЕДНИЕ ЧАСТИ
    { file: 'parts/hip_fill.png',           tint: true,  group: 'skin' },
    { file: 'parts/hip_outline.png',        tint: false, group: 'outline' },
    // Шорты 1 (правое бедро) — поверх бедра 1
    { file: 'parts/shorts1_fill.png',       tint: true,  group: 'shorts_leg', hideWithPants: true },
    { file: 'parts/shorts1_outline.png',    tint: false, group: 'shorts_outline', hideWithPants: true },
    { file: 'parts/knee_fill.png',          tint: true,  group: 'skin' },
    { file: 'parts/knee_outline.png',       tint: false, group: 'outline' },
    { file: 'parts/shoulder_fill.png',      tint: true,  group: 'skin' },
    { file: 'parts/shoulder_outline.png',   tint: false, group: 'outline' },
    { file: 'parts/forearm_fill.png',       tint: true,  group: 'skin' },
    { file: 'parts/forearm_outline.png',    tint: false, group: 'outline' },
    // ГОЛОВА
    { file: 'parts/head_fill.png',          tint: true,  group: 'skin' },
    { file: 'parts/head.png',               tint: false, group: 'outline' },
    { file: 'parts/ear_fill.png',           tint: true,  group: 'skin' },
    { file: 'parts/ear_lobe.png',           tint: false, group: 'outline' },
    { file: 'parts/ear_outline.png',        tint: false, group: 'outline' },
    { file: 'parts/face.png',               tint: false, group: 'face' },
];

// Слои по умолчанию (без скрытых)
function getVisibleLayers(pantsEquipped) {
    if (pantsEquipped) {
        return allLayers.filter(l => !l.hideWithPants);
    }
    return allLayers;
}

// Загружаем все изображения
const originalImages = {};
let allLoaded = false;
let onReadyCallback = null;

function loadAllImages(callback) {
    let toLoad = allLayers.length;
    let loaded = 0;
    allLayers.forEach(layer => {
        if (originalImages[layer.file]) {
            loaded++;
            if (loaded === toLoad) finish();
            return;
        }
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = layer.file;
        img.onload = () => { loaded++; if (loaded === toLoad) finish(); };
        img.onerror = () => { loaded++; console.warn('Не найден:', layer.file); if (loaded === toLoad) finish(); };
        originalImages[layer.file] = img;
    });
    function finish() {
        allLoaded = true;
        if (callback) callback();
        if (onReadyCallback) onReadyCallback();
    }
}

function onReady(cb) {
    if (allLoaded) cb();
    else onReadyCallback = cb;
}

function applyTint(sourceImg, colorHex) {
    const canvas = document.createElement('canvas');
    canvas.width = canvasSize.w;
    canvas.height = canvasSize.h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(sourceImg, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvasSize.w, canvasSize.h);
    const data = imageData.data;
    const rT = parseInt(colorHex.slice(1, 3), 16);
    const gT = parseInt(colorHex.slice(3, 5), 16);
    const bT = parseInt(colorHex.slice(5, 7), 16);
    for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3];
        if (alpha > 0) {
            const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
            const factor = gray / 255;
            data[i] = Math.round(rT * factor);
            data[i + 1] = Math.round(gT * factor);
            data[i + 2] = Math.round(bT * factor);
        }
    }
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL();
}

function renderCharacter(container, charData) {
    const skin = charData.skinColor || '#F2E7CD';
    const outline = charData.outlineColor || '#3A2E2E';
    const shortsColor = charData.shortsColor || charData.skinColor || '#F2E7CD'; // шорты 2 = цвет бедра
    const shortsOutline = charData.shortsOutlineColor || charData.outlineColor || '#3A2E2E';
    const pantsEquipped = charData.pantsEquipped || false;

    const layers = getVisibleLayers(pantsEquipped);

    container.innerHTML = '';
    layers.forEach((layer, index) => {
        const sourceImg = originalImages[layer.file];
        if (!sourceImg) return;
        const img = document.createElement('img');
        img.style.position = 'absolute';
        img.style.top = '0';
        img.style.left = '0';
        img.style.width = (canvasSize.w / 2) + 'px';
        img.style.height = (canvasSize.h / 2) + 'px';
        img.style.pointerEvents = 'none';
        img.style.zIndex = index;

        let src;
        if (layer.tint && (layer.group === 'skin' || layer.group === 'shorts_leg' || layer.group === 'shorts_pelvis')) {
            // Заливка шорт красится в цвет шорт (цвет бедра)
            src = applyTint(sourceImg, shortsColor);
        } else if (!layer.tint && (layer.group === 'shorts_outline' || layer.group === 'shorts_pelvis_outline')) {
            // Контур шорт красится в цвет контура шорт
            src = applyTint(sourceImg, shortsOutline);
        } else if (layer.tint && layer.group === 'skin') {
            src = applyTint(sourceImg, skin);
        } else if (!layer.tint && layer.group === 'outline') {
            src = applyTint(sourceImg, outline);
        } else {
            src = sourceImg.src;
        }
        img.src = src;
        container.appendChild(img);
    });
}

function renderToCanvas(charData, scale = 1.0) {
    const canvas = document.createElement('canvas');
    canvas.width = canvasSize.w * scale;
    canvas.height = canvasSize.h * scale;
    const ctx = canvas.getContext('2d');
    const skin = charData.skinColor || '#F2E7CD';
    const outline = charData.outlineColor || '#3A2E2E';
    const shortsColor = charData.shortsColor || charData.skinColor || '#F2E7CD';
    const shortsOutline = charData.shortsOutlineColor || charData.outlineColor || '#3A2E2E';
    const pantsEquipped = charData.pantsEquipped || false;

    const layers = getVisibleLayers(pantsEquipped);

    layers.forEach(layer => {
        const sourceImg = originalImages[layer.file];
        if (!sourceImg) return;
        let src;
        if (layer.tint && (layer.group === 'shorts_leg' || layer.group === 'shorts_pelvis')) {
            src = applyTint(sourceImg, shortsColor);
        } else if (!layer.tint && (layer.group === 'shorts_outline' || layer.group === 'shorts_pelvis_outline')) {
            src = applyTint(sourceImg, shortsOutline);
        } else if (layer.tint && layer.group === 'skin') {
            src = applyTint(sourceImg, skin);
        } else if (!layer.tint && layer.group === 'outline') {
            src = applyTint(sourceImg, outline);
        } else {
            src = sourceImg.src;
        }
        const img = new Image();
        img.src = src;
        if (img.complete) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        } else {
            img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
    });
    return canvas;
}