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

  const uploadDir = '/tmp';
  const form = formidable({ 
    uploadDir: uploadDir,
    keepExtensions: true,
    filename: (_name, _ext, _part, _form) => `input_${Date.now()}.lua`
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({ error: 'Gagal upload.', details: err.message });
    }

    // 1. CEK PILIHAN USER (Default ke 32-bit biar aman buat PC)
    // User harus kirim field "arch" isinya "32" atau "64"
    let targetArch = '32';
    if (fields.arch) {
        // Handle kalau fields.arch itu array (formidable v3) atau string
        const val = Array.isArray(fields.arch) ? fields.arch[0] : fields.arch;
        if (val === '64') targetArch = '64';
    }

    // 2. TENTUKAN JALUR BINARY
    const archDir = path.join(process.cwd(), 'bin', targetArch);
    const luajitPath = path.join(archDir, 'luajit');
    const forceLuaPath = path.join(archDir, '?.lua') + ';;'; // Library JIT spesifik versi

    const uploadedFile = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!uploadedFile) {
        return res.status(400).json({ error: 'File script tidak ditemukan.' });
    }

    const inputPath = uploadedFile.filepath;
    const outputFilename = `compiled_${targetArch}bit_${Date.now()}.luac`;
    const outputPath = path.join(uploadDir, outputFilename);

    console.log(`[COMPILE] Target: ${targetArch}-bit | Binary: ${luajitPath}`);

    // Pastikan permission
    try {
        if (fs.existsSync(luajitPath)) fs.chmodSync(luajitPath, '755');
    } catch (e) { console.error("Chmod error:", e); }

    // 3. EXECUTE
    execFile(luajitPath, ['-b', inputPath, outputPath], {
        env: {
            ...process.env,
            LUA_PATH: forceLuaPath // PENTING: Pake library yg sesuai folder (32 atau 64)
        }
    }, (error, _stdout, stderr) => {
        try { fs.unlinkSync(inputPath); } catch (e) {}

        if (error) {
            console.error('[ERROR] Compile:', stderr);
            return res.status(500).json({ 
                error: `Gagal Compile (${targetArch}-bit).`, 
                details: stderr || 'Binary error. Cek logs.' 
            });
        }

        try {
            const fileBuffer = fs.readFileSync(outputPath);
            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Content-Disposition', `attachment; filename=${uploadedFile.originalFilename?.replace('.lua', '')}_${targetArch}bit.luac`);
            res.send(fileBuffer);
            fs.unlinkSync(outputPath);
        } catch (readErr) {
            return res.status(500).json({ error: 'Gagal membaca output file.' });
        }
    });
  });
}