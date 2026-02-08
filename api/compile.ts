import { IncomingForm } from 'formidable';
import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';

// Matikan body parser bawaan Vercel biar kita bisa handle file upload sendiri
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. Setup Formidable buat handle upload ke folder /tmp (Satu-satunya yang writable di Vercel)
  const form = new IncomingForm({
    uploadDir: '/tmp',
    keepExtensions: true,
    filename: (_name, _ext, part, form) => {
      return `input_${Date.now()}.lua`;
    }
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({ error: 'Upload failed', details: err.message });
    }

    // Ambil file yang diupload
    const uploadedFile = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!uploadedFile) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const inputPath = uploadedFile.filepath;
    const outputPath = inputPath.replace('.lua', '.luac');

    // 2. Tentukan Path LuaJIT
    // Di Vercel, binary ada di folder 'backend' relative dari root process
    const isWindows = process.platform === 'win32';
    const luajitBinary = isWindows ? 'luajit.exe' : 'luajit';
    const luajitPath = path.join(process.cwd(), 'backend', luajitBinary);
    
    // Pastikan permission execute (PENTING BUAT LINUX/VERCEL)
    if (!isWindows) {
      try {
        fs.chmodSync(luajitPath, '755');
      } catch (e) {
        console.log("Chmod warning:", e);
      }
    }

    // 3. Setup LUA_PATH (Module JIT)
    const forceLuaPath = path.join(process.cwd(), 'backend', '?.lua') + ';;';

    // 4. Eksekusi Compile
    execFile(luajitPath, ['-b', inputPath, outputPath], {
      env: {
        ...process.env,
        LUA_PATH: forceLuaPath
      }
    }, (error, stdout, stderr) => {
      
      // Bersih-bersih file input
      try { fs.unlinkSync(inputPath); } catch (e) {}

      if (error) {
        console.error("Compile Error:", stderr);
        return res.status(500).json({ 
            error: 'Gagal Compile', 
            details: stderr.includes('jit') ? 'JIT Library Error' : stderr 
        });
      }

      // 5. Kirim File Hasil Balik ke User
      const fileBuffer = fs.readFileSync(outputPath);
      
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename=${uploadedFile.originalFilename?.replace('.lua', '.luac')}`);
      res.send(fileBuffer);

      // Hapus file output setelah dikirim
      try { fs.unlinkSync(outputPath); } catch (e) {}
    });
  });
}