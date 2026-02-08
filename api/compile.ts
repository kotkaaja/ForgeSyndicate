import { VercelRequest, VercelResponse } from '@vercel/node';
import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import formidable from 'formidable';

// Matikan body parser bawaan Vercel agar formidable bisa handle upload file
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

  // 1. Setup Path
  // Di Vercel, file project ada di process.cwd()
  const binDir = path.join(process.cwd(), 'bin');
  const luajitPath = path.join(binDir, 'luajit');
  const jitLibPath = path.join(binDir, 'jit');
  const uploadDir = '/tmp'; // Vercel hanya boleh tulis di /tmp

  // 2. Parse Upload File
  const form = formidable({ 
    uploadDir: uploadDir,
    keepExtensions: true,
    filename: (_name, _ext, part, _form) => {
        return `input_${Date.now()}.lua`;
    }
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("Upload Error:", err);
      return res.status(500).json({ error: 'Gagal upload file.' });
    }

    // Handle array of files or single file
    const uploadedFile = Array.isArray(files.file) ? files.file[0] : files.file;
    
    if (!uploadedFile) {
        return res.status(400).json({ error: 'Tidak ada file yang dikirim.' });
    }

    const inputPath = uploadedFile.filepath;
    const outputFilename = `compiled_${Date.now()}.luac`;
    const outputPath = path.join(uploadDir, outputFilename);

    console.log(`[VERCEL] Compiling: ${uploadedFile.originalFilename}`);

    // 3. Jalankan LuaJIT
    // Kita paksa LUA_PATH membaca folder 'jit' di dalam bin
    const forceLuaPath = path.join(jitLibPath, '?.lua') + ';;';

    execFile(luajitPath, ['-b', inputPath, outputPath], {
        env: {
            ...process.env,
            LUA_PATH: forceLuaPath
        }
    }, (error, stdout, stderr) => {
        
        // Hapus file input (bersih-bersih)
        try { fs.unlinkSync(inputPath); } catch (e) {}

        if (error) {
            console.error('[ERROR] Compile:', stderr);
            return res.status(500).json({ 
                error: 'Compile Gagal.', 
                details: stderr || 'Binary LuaJIT error. Cek logs Vercel.' 
            });
        }

        // 4. Kirim File Hasil
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