import { VercelRequest, VercelResponse } from '@vercel/node';
import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import formidable from 'formidable';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 1. Setup Path (FIX DISINI)
  // Kita set root ke folder 'bin', bukan 'bin/jit'
  const binDir = path.join(process.cwd(), 'bin');
  const luajitPath = path.join(binDir, 'luajit');
  
  // LUA_PATH harus nembak ke root folder yang isinya folder 'jit'
  // Jadi patternya: /var/task/bin/?.lua
  // Pas require('jit.bcsave') -> /var/task/bin/jit/bcsave.lua (BENAR)
  const forceLuaPath = path.join(binDir, '?.lua') + ';;';

  const uploadDir = '/tmp'; 

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

    const uploadedFile = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!uploadedFile) {
        return res.status(400).json({ error: 'Tidak ada file yang dikirim.' });
    }

    const inputPath = uploadedFile.filepath;
    const outputFilename = `compiled_${Date.now()}.luac`;
    const outputPath = path.join(uploadDir, outputFilename);

    // 2. Debugging (Opsional, buat ngecek di logs Vercel)
    console.log(`[EXEC] Binary: ${luajitPath}`);
    console.log(`[EXEC] LUA_PATH: ${forceLuaPath}`);

    // Pastikan permission execute
    try {
        if (fs.existsSync(luajitPath)) fs.chmodSync(luajitPath, '755');
    } catch (e) {
        console.error("Gagal chmod:", e);
    }

    // 3. Eksekusi
    execFile(luajitPath, ['-b', inputPath, outputPath], {
        env: {
            ...process.env,
            // Setup Environment Variable biar modul JIT kebaca
            LUA_PATH: forceLuaPath
        }
    }, (error, _stdout, stderr) => {
        
        try { fs.unlinkSync(inputPath); } catch (e) {}

        if (error) {
            console.error('[ERROR] Compile:', stderr);
            return res.status(500).json({ 
                error: 'Compile Gagal.', 
                details: stderr || 'Error binary execution. Cek struktur folder bin/jit.' 
            });
        }

        try {
            const fileBuffer = fs.readFileSync(outputPath);
            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Content-Disposition', `attachment; filename=${uploadedFile.originalFilename?.replace('.lua', '')}.luac`);
            res.send(fileBuffer);
            fs.unlinkSync(outputPath);
        } catch (readErr) {
            return res.status(500).json({ error: 'Gagal membaca file hasil.' });
        }
    });
  });
}