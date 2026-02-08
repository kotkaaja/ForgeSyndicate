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

    // Default ke 32-bit
    let targetArch = '32';
    if (fields.arch) {
        const val = Array.isArray(fields.arch) ? fields.arch[0] : fields.arch;
        if (val === '64') targetArch = '64';
    }

    const archDir = path.join(process.cwd(), 'bin', targetArch);
    const luajitBinary = path.join(archDir, 'luajit');
    const qemuBinary = path.join(archDir, 'qemu-i386-static'); // Emulator path
    const forceLuaPath = path.join(archDir, '?.lua') + ';;';

    const uploadedFile = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!uploadedFile) {
        return res.status(400).json({ error: 'File script tidak ditemukan.' });
    }

    const inputPath = uploadedFile.filepath;
    const outputFilename = `compiled_${targetArch}bit_${Date.now()}.luac`;
    const outputPath = path.join(uploadDir, outputFilename);

    // --- LOGIC UTAMA: TENTUKAN CARA EKSEKUSI ---
    let executable: string;
    let args: string[];

    if (targetArch === '32') {
        // Mode 32-bit: Pake QEMU sebagai peluncur
        executable = qemuBinary;
        // Format: ./qemu ./luajit -b input output
        args = [luajitBinary, '-b', inputPath, outputPath];
        console.log(`[COMPILE 32-BIT] Using QEMU emulation`);
    } else {
        // Mode 64-bit: Jalan langsung (Native)
        executable = luajitBinary;
        args = ['-b', inputPath, outputPath];
        console.log(`[COMPILE 64-BIT] Native execution`);
    }

    // Pastikan permission execute untuk Binary & QEMU
    try {
        if (fs.existsSync(executable)) fs.chmodSync(executable, '755');
        if (targetArch === '32' && fs.existsSync(luajitBinary)) fs.chmodSync(luajitBinary, '755');
    } catch (e) { console.error("Chmod error:", e); }

    // EXECUTE
    execFile(executable, args, {
        env: {
            ...process.env,
            LUA_PATH: forceLuaPath
        }
    }, (error, _stdout, stderr) => {
        try { fs.unlinkSync(inputPath); } catch (e) {}

        if (error) {
            console.error('[ERROR] Compile:', stderr);
            return res.status(500).json({ 
                error: `Gagal Compile (${targetArch}-bit).`, 
                details: stderr || 'Emulator error or Binary mismatch.' 
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