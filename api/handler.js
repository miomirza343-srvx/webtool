import axios from 'axios';
import FormData from 'form-data';
import fetch from 'node-fetch';

class Picsart {
    constructor() {
        this.u = 'https://upload.picsart.com/files';
        this.a = 'https://ai.picsart.com';
        this.j = 'https://picsart.com/-/landings/4.310.0/static/index-C3-HwnoW-GZgP7cLS.js';
        this.h = {
            origin: 'https://picsart.com',
            referer: 'https://picsart.com/',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        };
    }
    async getToken() {
        const r = await axios.get(this.j, { headers: this.h });
        const m = r.data.match(/"x-app-authorization":"Bearer\s+([^"]+)"/);
        return m[1];
    }
    async upload(b) {
        const f = new FormData();
        f.append('type', 'editing-temp-landings');
        f.append('file', b, { filename: 'i.png', contentType: 'image/png' });
        const r = await axios.post(this.u, f, { headers: { ...this.h, ...f.getHeaders() } });
        return r.data;
    }
    async enhance(url, t) {
        const b = {
            image_url: url,
            colour_correction: { enabled: false, blending: 0.5 },
            upscale: { enabled: true, node: 'esrgan', target_scale: 2 },
            face_enhancement: { enabled: true, blending: 1, max_faces: 10, gfpgan: true, node: 'ada' }
        };
        const r = await axios.post(`${this.a}/gw1/diffbir-enhancement-service/v1.7.6`, b, {
            headers: { ...this.h, 'content-type': 'application/json', 'x-app-authorization': `Bearer ${t}`, 'x-touchpoint': 'widget_EnhancedImage' }
        });
        return r.data;
    }
}

async function upscaleV2(b) {
    const h = await fetch('https://www.iloveimg.com/upscale-image').then(r => r.text());
    const t = h.match(/"token":"(eyJ[^"]+)"/)?.[1];
    const tk = h.match(/ilovepdfConfig\.taskId\s*=\s*'([^']+)'/)?.[1];
    const f1 = new FormData();
    f1.append('name', 'i.jpg'); f1.append('chunk', '0'); f1.append('chunks', '1');
    f1.append('task', tk); f1.append('preview', '1'); f1.append('v', 'web.0');
    f1.append('file', b, { filename: 'i.jpg', contentType: 'image/jpeg' });
    const u = await axios.post('https://api29g.iloveimg.com/v1/upload', f1, { headers: { Authorization: `Bearer ${t}`, ...f1.getHeaders() } });
    const f2 = new FormData();
    f2.append('task', tk); f2.append('server_filename', u.data.server_filename); f2.append('scale', '4');
    const r = await axios.post('https://api29g.iloveimg.com/v1/upscale', f2, { headers: { Authorization: `Bearer ${t}`, ...f2.getHeaders() }, responseType: 'arraybuffer' });
    return r.data;
}

async function y2(q, f) {
    const k = await fetch("https://cnv.cx/v2/sanity/key").then(r => r.json());
    const b = new URLSearchParams({ link: q, format: f, audioBitrate: "128", videoQuality: "720", filenameStyle: "pretty" });
    return await fetch("https://cnv.cx/v2/converter", { method: "POST", headers: { "key": k.key, "content-type": "application/x-www-form-urlencoded" }, body: b.toString() }).then(r => r.json());
}

export default async function (req, res) {
    const { action } = req.query;
    try {
        if (action === 'v1') {
            const pa = new Picsart();
            const t = await pa.getToken();
            const u = await pa.upload(Buffer.from(req.body.image.split(',')[1], 'base64'));
            const r = await pa.enhance(u.result.url, t);
            return res.json(r);
        }
        if (action === 'v2') {
            const r = await upscaleV2(Buffer.from(req.body.image.split(',')[1], 'base64'));
            res.setHeader('Content-Type', 'image/jpeg');
            return res.send(r);
        }
        if (action === 'yt') {
            const r = await y2(req.body.url, req.body.type);
            return res.json(r);
        }
    } catch (e) { res.status(500).json({ error: e.message }); }
}
