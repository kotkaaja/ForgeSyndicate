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

  // Arahkan ke folder 'bin' sesuai struktur project lo
  const luajitPath = path.join(process.cwd(), 'bin', 'luajit');
  const jitLibPath = path.join(process.cwd(), 'bin', 'jit');
  const uploadDir = '/tmp'; 

  const form = formidable({ 
    uploadDir: uploadDir,
    keepExtensions: true,
    // FIX 1: Pake underscore buat parameter yang gak dipake
    filename: (_name, _ext, _part, _form) => {
        return `input_${Date.now()}.lua`;
    }
  });

  // FIX 2: Pake underscore di _fields
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

    const forceLuaPath = path.join(jitLibPath, '?.lua') + ';;';

    // Pastikan permission execute
    try {
        if (fs.existsSync(luajitPath)) fs.chmodSync(luajitPath, '755');
    } catch (e) {
        console.error("Gagal chmod:", e);
    }

    // FIX 3: Pake underscore di _stdout
    execFile(luajitPath, ['-b', inputPath, outputPath], {
        env: {
            ...process.env,
            LUA_PATH: forceLuaPath
        }
    }, (error, _stdout, stderr) => {
        
        try { fs.unlinkSync(inputPath); } catch (e) {}

        if (error) {
            console.error('[ERROR] Compile:', stderr);
            return res.status(500).json({ 
                error: 'Compile Gagal.', 
                details: stderr || 'Binary LuaJIT error. Cek logs.' 
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