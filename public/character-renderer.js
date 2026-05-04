const canvasSize = { w: 991, h: 1204 };

const layers = [
    { file: 'parts/shoulder2_fill.png',     tint: true,  group: 'skin' },
    { file: 'parts/shoulder2_outline.png',  tint: false, group: 'outline' },
    { file: 'parts/forearm2_fill.png',      tint: true,  group: 'skin' },
    { file: 'parts/forearm2_outline.png',   tint: false, group: 'outline' },
    { file: 'parts/hip2_fill.png',          tint: true,  group: 'skin' },
    { file: 'parts/hip2_outline.png',       tint: false, group: 'outline' },
    { file: 'parts/shorts3_fill.png',       tint: false, group: 'shorts' },
    { file: 'parts/shorts3_outline.png',    tint: false, group: 'shorts_outline' },
    { file: 'parts/knee2_fill.png',         tint: true,  group: 'skin' },
    { file: 'parts/knee2_outline.png',      tint: false, group: 'outline' },
    { file: 'parts/torso_fill.png',         tint: true,  group: 'skin' },
    { file: 'parts/torso_outline.png',      tint: false, group: 'outline' },
    { file: 'parts/shorts2_fill.png',       tint: false, group: 'shorts' },
    { file: 'parts/shorts2_outline.png',    tint: false, group: 'shorts_outline' },
    { file: 'parts/hip_fill.png',           tint: true,  group: 'skin' },
    { file: 'parts/hip_outline.png',        tint: false, group: 'outline' },
    { file: 'parts/shorts1_fill.png',       tint: false, group: 'shorts' },
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
const tintedCache = {};
let totalCount = layers.length;
let readyCallbacks = [];

function loadAllImages(cb) {
    if (cb) readyCallbacks.push(cb);
    let pending = 0;
    layers.forEach(l => {
        if (originalImages[l.file]) return;
        pending++;
        const img = new Image();
        img.src = l.file;
        img.onload = () => { pending--; if (pending <= 0) fire(); };
        img.onerror = () => { pending--; if (pending <= 0) fire(); };
        originalImages[l.file] = img;
    });
    if (pending === 0) fire();
    function fire() {
        readyCallbacks.forEach(fn => fn());
        readyCallbacks = [];
    }
}

function onReady(cb) {
    let missing = layers.filter(l => !originalImages[l.file]).length;
    if (missing === 0) cb();
    else readyCallbacks.push(cb);
}

function applyTint(sourceImg, colorHex) {
    if (!sourceImg || !sourceImg.src) return '';
    const key = sourceImg.src + '_' + colorHex;
    if (tintedCache[key]) return tintedCache[key];
    const c = document.createElement('canvas');
    c.width = canvasSize.w;
    c.height = canvasSize.h;
    const ctx = c.getContext('2d');
    ctx.drawImage(sourceImg, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvasSize.w, canvasSize.h);
    const d = imageData.data;
    const r = parseInt(colorHex.slice(1,3), 16);
    const g = parseInt(colorHex.slice(3,5), 16);
    const b = parseInt(colorHex.slice(5,7), 16);
    for (let i = 0; i < d.length; i += 4) {
        if (d[i+3] > 0) {
            const gray = (d[i] + d[i+1] + d[i+2]) / 3;
            const f = gray / 255;
            d[i] = Math.round(r * f);
            d[i+1] = Math.round(g * f);
            d[i+2] = Math.round(b * f);
        }
    }
    ctx.putImageData(imageData, 0, 0);
    tintedCache[key] = c.toDataURL();
    return tintedCache[key];
}

function renderCharacter(container, charData) {
    const skin = charData.skinColor || '#F2E7CD';
    const outline = charData.outlineColor || '#3A2E2E';

    if (!container._built) {
        container.innerHTML = '';
        layers.forEach((l, i) => {
            const srcImg = originalImages[l.file];
            if (!srcImg) return;
            const img = document.createElement('img');
            img.style.cssText = 'position:absolute;top:0;left:0;width:'+(canvasSize.w/2)+'px;height:'+(canvasSize.h/2)+'px;pointer-events:none;z-index:'+i;
            img.dataset.file = l.file;
            img.dataset.group = l.group;
            img.dataset.tint = l.tint;
            const g = l.group;
            const t = l.tint;
            if (g === 'skin' && t) img.src = applyTint(srcImg, skin);
            else if (g === 'outline' && !t) img.src = applyTint(srcImg, outline);
            else img.src = srcImg.src;
            container.appendChild(img);
        });
        container._built = true;
    } else {
        container.querySelectorAll('img').forEach(img => {
            const srcImg = originalImages[img.dataset.file];
            if (!srcImg) return;
            const g = img.dataset.group;
            const t = img.dataset.tint === 'true';
            if (g === 'skin' && t) img.src = applyTint(srcImg, skin);
            else if (g === 'outline' && !t) img.src = applyTint(srcImg, outline);
        });
    }
}

function renderToCanvas(charData, scale) {
    scale = scale || 1;
    const c = document.createElement('canvas');
    c.width = canvasSize.w * scale;
    c.height = canvasSize.h * scale;
    const ctx = c.getContext('2d');
    layers.forEach(l => {
        const img = originalImages[l.file];
        if (!img) return;
        ctx.drawImage(img, 0, 0, c.width, c.height);
    });
    return c;
}