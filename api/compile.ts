import { VercelRequest, VercelResponse } from '@vercel/node';
import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import formidable from 'formidable';

// Konfigurasi agar Vercel tidak membatasi body parser (biar upload file aman)
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Hanya terima method POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 1. Setup Lokasi Binary LuaJIT (Linux)
  const luajitPath = path.join(process.cwd(), 'bin', 'luajit');
  const jitLibPath = path.join(process.cwd(), 'bin', 'jit');
  const uploadDir = '/tmp'; // Vercel hanya boleh tulis di /tmp

  // 2. Parse File Upload
  const form = formidable({ 
    uploadDir: uploadDir,
    keepExtensions: true,
    filename: (_name, _ext, _part, _form) => {
        return `input_${Date.now()}.lua`;
    }
  });

  form.parse(req, async (err, _fields, files) => {
    if (err) {
      console.error("Upload Error:", err);
      return res.status(500).json({ error: 'Gagal upload file.', details: err.message });
    }

    // Ambil file yang diupload
    const uploadedFile = Array.isArray(files.file) ? files.file[0] : files.file;
    
    if (!uploadedFile) {
        return res.status(400).json({ error: 'Tidak ada file yang dikirim.' });
    }

    const inputPath = uploadedFile.filepath;
    const outputFilename = `compiled_${Date.now()}.luac`;
    const outputPath = path.join(uploadDir, outputFilename);

    console.log(`[VERCEL] Compiling: ${uploadedFile.originalFilename}`);

    // 3. Jalankan LuaJIT Compile
    const forceLuaPath = path.join(jitLibPath, '?.lua') + ';;';

    // Pastikan permission execute aktif
    try {
        if (fs.existsSync(luajitPath)) fs.chmodSync(luajitPath, '755');
    } catch (e) {
        console.error("Gagal chmod:", e);
    }

    // REVISI: Tambahkan underscore (_) pada 'stdout'
    execFile(luajitPath, ['-b', inputPath, outputPath], {
        env: {
            ...process.env,
            LUA_PATH: forceLuaPath
        }
    }, (error, _stdout, stderr) => {
        
        // Hapus file input (bersih-bersih)
        try { fs.unlinkSync(inputPath); } catch (e) {}

        if (error) {
            console.error('[ERROR] Compile:', stderr);
            return res.status(500).json({ 
                error: 'Compile Gagal.', 
                details: stderr || 'Binary LuaJIT error. Cek logs Vercel.' 
            });
        }

        // 4. Baca File Hasil & Kirim ke User
        try {
            const fileBuffer = fs.readFileSync(outputPath);
            
            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Content-Disposition', `attachment; filename=${uploadedFile.originalFilename?.replace('.lua', '')}.luac`);
            res.send(fileBuffer);

            // Hapus file output setelah dikirim
            fs.unlinkSync(outputPath);
        } catch (readErr) {
            return res.status(500).json({ error: 'Gagal membaca file hasil.' });
        }
    });
  });
}