import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// 1. Setup Path (ES Module Fix)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3001; // Backend jalan di port 3001

app.use(cors());

// 2. Setup Folder Upload
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const upload = multer({ dest: uploadDir });

// 3. Konfigurasi LuaJIT (Auto Detect OS)
let LUAJIT_PATH;
if (process.platform === 'win32') {
    LUAJIT_PATH = path.join(__dirname, 'luajit.exe');
} else {
    LUAJIT_PATH = path.join(__dirname, 'luajit'); // Untuk Linux/Vercel nanti
}

// 4. Cek Folder 'jit' (PENTING!)
const jitPath = path.join(__dirname, 'jit');
if (!fs.existsSync(jitPath)) {
    console.error(`[FATAL ERROR] Folder 'jit' TIDAK DITEMUKAN di dalam folder backend!`);
    console.error(`--> Solusi: Copy folder 'jit' dari !LuaCompile ke folder backend sekarang.`);
}

// 5. Paksa LuaJIT baca modul dari folder ini
// Format: "path/to/backend/?.lua;;"
const FORCE_LUA_PATH = path.join(__dirname, '?.lua') + ';;';

// === API COMPILE ===
app.post('/api/compile', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Tidak ada file yang diupload.' });
    }

    const inputPath = req.file.path;
    const outputFilename = `${req.file.filename}.luac`;
    const outputPath = path.join(uploadDir, outputFilename);

    console.log(`[REQ] Compiling: ${req.file.originalname}`);

    // Eksekusi LuaJIT dengan Environment Variable LUA_PATH
    execFile(LUAJIT_PATH, ['-b', inputPath, outputPath], {
        env: {
            ...process.env,      // Pakai env bawaan
            LUA_PATH: FORCE_LUA_PATH // + Env tambahan kita
        }
    }, (error, stdout, stderr) => {
        
        // JIKA GAGAL
        if (error) {
            console.error('[ERROR] Compile Failed:', stderr);
            
            // Hapus file sampah
            try { fs.unlinkSync(inputPath); } catch (e) {}

            return res.status(500).json({ 
                error: 'Gagal Compile.', 
                details: stderr.includes('jit.*') ? 'Missing JIT Modules' : stderr 
            });
        }

        console.log('[SUCCESS] File compiled. Sending to user...');

        // JIKA SUKSES: Kirim file .luac
        res.download(outputPath, `${req.file.originalname.replace('.lua', '')}.luac`, (err) => {
            // Bersih-bersih file temporary
            try {
                if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
            } catch (e) {
                console.error("Gagal cleanup:", e);
            }
        });
    });
});

app.listen(port, () => {
    console.log(`✅ COMPILER SERVER ONLINE: http://localhost:${port}`);
    console.log(`📂 LUA_PATH Configured: ${FORCE_LUA_PATH}`);
});