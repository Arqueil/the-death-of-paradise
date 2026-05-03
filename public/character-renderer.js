const canvasSize = { w: 991, h: 1204 };

const layers = [
    { file: 'parts/shoulder2_fill.png',     tint: true,  group: 'skin' },
    { file: 'parts/shoulder2_outline.png',  tint: false, group: 'outline' },
    { file: 'parts/forearm2_fill.png',      tint: true,  group: 'skin' },
    { file: 'parts/forearm2_outline.png',   tint: false, group: 'outline' },
    { file: 'parts/hip2_fill.png',          tint: true,  group: 'skin' },
    { file: 'parts/hip2_outline.png',       tint: false, group: 'outline' },
    { file: 'parts/shorts3_fill.png',       tint: true,  group: 'shorts' },
    { file: 'parts/shorts3_outline.png',    tint: false, group: 'shorts_outline' },
    { file: 'parts/knee2_fill.png',         tint: true,  group: 'skin' },
    { file: 'parts/knee2_outline.png',      tint: false, group: 'outline' },
    { file: 'parts/torso_fill.png',         tint: true,  group: 'skin' },
    { file: 'parts/torso_outline.png',      tint: false, group: 'outline' },
    { file: 'parts/shorts2_fill.png',       tint: true,  group: 'shorts' },
    { file: 'parts/shorts2_outline.png',    tint: false, group: 'shorts_outline' },
    { file: 'parts/hip_fill.png',           tint: true,  group: 'skin' },
    { file: 'parts/hip_outline.png',        tint: false, group: 'outline' },
    { file: 'parts/shorts1_fill.png',       tint: true,  group: 'shorts' },
    { file: 'parts/shorts1_outline.png',    tint: false, group: 'shorts_outline' },
    { file: 'parts/knee_fill.png',          tint: true,  group: 'skin' },
    { file: 'parts/knee_outline.png',       tint: false, group: 'outline' },
    { file: 'parts/shoulder_fill.png',      tint: true,  group: 'skin' },
    { file: 'parts/shoulder_outline.png',   tint: false, group: 'outline' },
    { file: 'parts/forearm_fill.png',       tint: true,  group: 'skin' },
    { file: 'parts/forearm_outline.png',    tint: false, group: 'outline' },
    { file: 'parts/head_fill.png',          tint: true,  group: 'skin' },
    { file: 'parts/head.png',               tint: false, group: 'outline' },
    { file: 'parts/ear_fill.png',           tint: true,  group: 'skin' },
    { file: 'parts/ear_lobe.png',           tint: false, group: 'outline' },
    { file: 'parts/ear_outline.png',        tint: false, group: 'outline' },
    { file: 'parts/face.png',               tint: false, group: 'face' },
];

const originalImages = {};
const tintCache = {};
let readyCallback = null;

function loadAllImages(cb) {
    let loaded = 0;
    layers.forEach(layer => {
        if (originalImages[layer.file]) { loaded++; check(); return; }
        const img = new Image();
        img.src = layer.file;
        img.onload = () => { loaded++; check(); };
        img.onerror = () => { loaded++; check(); };
        originalImages[layer.file] = img;
    });
    function check() { if (loaded >= layers.length && readyCallback) readyCallback(); }
    readyCallback = cb;
}

function onReady(cb) {
    if (Object.keys(originalImages).length >= layers.length) cb();
    else readyCallback = cb;
}

function applyTint(sourceImg, colorHex) {
    const key = sourceImg.src + '_' + colorHex;
    if (tintCache[key]) return tintCache[key];

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
        if (data[i + 3] > 0) {
            const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
            const factor = gray / 255;
            data[i] = Math.round(rT * factor);
            data[i + 1] = Math.round(gT * factor);
            data[i + 2] = Math.round(bT * factor);
        }
    }
    ctx.putImageData(imageData, 0, 0);
    tintCache[key] = canvas.toDataURL();
    return tintCache[key];
}

function renderCharacter(container, charData) {
    const skin = charData.skinColor || '#F2E7CD';
    const outline = charData.outlineColor || '#3A2E2E';
    const shorts = charData.shortsColor || '#8B6B4D';
    const shortsOutline = charData.shortsOutlineColor || '#3A2E2E';

    if (!container._initialized) {
        container.innerHTML = '';
        layers.forEach((layer, index) => {
            const img = document.createElement('img');
            img.style.position = 'absolute';
            img.style.top = '0';
            img.style.left = '0';
            img.style.width = (canvasSize.w / 2) + 'px';
            img.style.height = (canvasSize.h / 2) + 'px';
            img.style.pointerEvents = 'none';
            img.style.zIndex = index;
            img.dataset.file = layer.file;
            img.dataset.group = layer.group;
            img.dataset.tint = layer.tint;
            container.appendChild(img);
        });
        container._initialized = true;
    }

    const allImgs = container.querySelectorAll('img');
    allImgs.forEach(img => {
        const file = img.dataset.file;
        const group = img.dataset.group;
        const tint = img.dataset.tint === 'true';
        const srcImg = originalImages[file];
        if (!srcImg) return;

        if (group === 'skin' && tint) img.src = applyTint(srcImg, skin);
        else if (group === 'outline' && !tint) img.src = applyTint(srcImg, outline);
        else if (group === 'shorts' && tint) img.src = applyTint(srcImg, shorts);
        else if (group === 'shorts_outline' && !tint) img.src = applyTint(srcImg, shortsOutline);
        else img.src = srcImg.src;
    });
}

function renderToCanvas(charData, scale = 1.0) {
    const canvas = document.createElement('canvas');
    canvas.width = canvasSize.w * scale;
    canvas.height = canvasSize.h * scale;
    const ctx = canvas.getContext('2d');
    const skin = charData.skinColor || '#F2E7CD';
    const outline = charData.outlineColor || '#3A2E2E';
    const shorts = charData.shortsColor || '#8B6B4D';
    const shortsOutline = charData.shortsOutlineColor || '#3A2E2E';

    layers.forEach(layer => {
        const srcImg = originalImages[layer.file];
        if (!srcImg) return;
        let src;
        if (layer.group === 'skin' && layer.tint) src = applyTint(srcImg, skin);
        else if (layer.group === 'outline' && !layer.tint) src = applyTint(srcImg, outline);
        else if (layer.group === 'shorts' && layer.tint) src = applyTint(srcImg, shorts);
        else if (layer.group === 'shorts_outline' && !layer.tint) src = applyTint(srcImg, shortsOutline);
        else src = srcImg.src;
        const img = new Image();
        img.src = src;
        if (img.complete) ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        else img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    });
    return canvas;
}