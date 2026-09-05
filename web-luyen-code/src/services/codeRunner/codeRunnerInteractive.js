// backend/src/services/codeRunner/codeRunnerInteractive.js
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const EventEmitter = require('events');

// ============================================================
// ĐƯỜNG DẪN TUYỆT ĐỐI ĐẾN CÁC CÔNG CỤ
// ============================================================
const PROJECT_ROOT = path.resolve(__dirname, '../../../'); // 👈 SỬA THÀNH 3 CẤP
const TOOLS_DIR = process.env.TOOLS_DIR || path.join(PROJECT_ROOT, 'tools');

const GCC = path.join(TOOLS_DIR, 'mingw64', 'bin', 'gcc.exe');
const GPP = path.join(TOOLS_DIR, 'mingw64', 'bin', 'g++.exe');
const PYTHON = path.join(TOOLS_DIR, 'python', 'python.exe');
const JAVAC = path.join(TOOLS_DIR, 'jdk', 'bin', 'javac.exe');
const JAVA = path.join(TOOLS_DIR, 'jdk', 'bin', 'java.exe');

// Kiểm tra công cụ
const TOOLS_EXIST = {
    gcc: fs.existsSync(GCC),
    gpp: fs.existsSync(GPP),
    python: fs.existsSync(PYTHON),
    javac: fs.existsSync(JAVAC),
    java: fs.existsSync(JAVA),
};

if (!TOOLS_EXIST.gcc) console.warn('⚠️ Không tìm thấy gcc.exe tại:', GCC);
if (!TOOLS_EXIST.gpp) console.warn('⚠️ Không tìm thấy g++.exe tại:', GPP);
if (!TOOLS_EXIST.python) console.warn('⚠️ Không tìm thấy python.exe tại:', PYTHON);
if (!TOOLS_EXIST.javac) console.warn('⚠️ Không tìm thấy javac.exe tại:', JAVAC);
if (!TOOLS_EXIST.java) console.warn('⚠️ Không tìm thấy java.exe tại:', JAVA);

class InteractiveRunner extends EventEmitter {
    constructor() {
        super();
        this.process = null;
        this.tempDir = null;
        this.isRunning = false;
        this.isCompiled = false;
        // Safety net: nếu nơi gọi (socket handler) quên gắn .on('error', ...),
        // EventEmitter sẽ throw và crash cả server. Listener mặc định này đảm bảo
        // luôn có ít nhất một handler, việc gắn thêm listener khác vẫn hoạt động bình thường.
        this.on('error', (msg) => {
            console.error('⚠️ InteractiveRunner error (no upstream listener attached):', msg);
        });
    }

    async start({ language, code }) {
        if (this.isRunning) {
            throw new Error('A process is already running');
        }

        this.tempDir = path.join(os.tmpdir(), `code-interactive-${uuidv4()}`);
        fs.mkdirSync(this.tempDir, { recursive: true });

        const exeFile = path.join(this.tempDir, process.platform === 'win32' ? 'main.exe' : 'main.out');

        // Không dùng shell:true nữa: spawn thẳng bằng đường dẫn tuyệt đối + mảng args,
        // tránh lỗi "./main.exe" không hợp lệ trên Windows cmd, và tránh injection do
        // args không được escape khi shell:true (xem deprecation warning DEP0190).
        const fileMap = {
            c: {
                ext: 'c',
                compileCmd: GCC,
                compileArgs: (sourceFile) => [sourceFile, '-o', exeFile],
                runCmd: exeFile,
                runArgs: [],
            },
            cpp: {
                ext: 'cpp',
                compileCmd: GPP,
                compileArgs: (sourceFile) => [sourceFile, '-o', exeFile],
                runCmd: exeFile,
                runArgs: [],
            },
            python: {
                ext: 'py',
                compileCmd: null,
                compileArgs: null,
                runCmd: PYTHON,
                runArgs: (sourceFile) => [sourceFile],
            },
            java: {
                ext: 'java',
                compileCmd: JAVAC,
                compileArgs: (sourceFile) => [sourceFile],
                runCmd: JAVA,
                runArgs: () => ['-cp', this.tempDir, 'Main'],
            },
        };

        const lang = fileMap[language];
        if (!lang) throw new Error(`Unsupported language: ${language}`);

        const sourceFile = path.join(this.tempDir, `main.${lang.ext}`);
        fs.writeFileSync(sourceFile, code);

        if (lang.compileCmd) {
            await new Promise((resolve, reject) => {
                const args = lang.compileArgs(sourceFile);
                const compileProcess = spawn(lang.compileCmd, args, {
                    cwd: this.tempDir,
                });

                let stderr = '';
                compileProcess.stderr.on('data', (data) => { stderr += data.toString(); });
                compileProcess.on('close', (code) => {
                    if (code !== 0) reject(new Error(stderr || 'Compilation failed'));
                    else {
                        this.isCompiled = true;
                        resolve();
                    }
                });
                compileProcess.on('error', reject);
            });
        }

        const runArgs = typeof lang.runArgs === 'function' ? lang.runArgs(sourceFile) : lang.runArgs;
        this.process = spawn(lang.runCmd, runArgs, {
            cwd: this.tempDir,
            stdio: ['pipe', 'pipe', 'pipe'],
        });

        this.isRunning = true;

        this.process.stdout.on('data', (data) => {
            this.emit('output', data.toString());
        });

        // ⚠️ QUAN TRỌNG: không emit('error', ...) ở đây. 'error' là sự kiện đặc biệt
        // của Node EventEmitter — nếu không có listener nào lắng nghe, Node sẽ tự
        // throw và làm crash toàn bộ process (ERR_UNHANDLED_ERROR). Output stderr của
        // chương trình người dùng (VD: lỗi biên dịch/runtime) không phải là lỗi của
        // chính InteractiveRunner nên dùng tên sự kiện riêng: 'stderr'.
        this.process.stderr.on('data', (data) => {
            this.emit('stderr', data.toString());
        });

        this.process.on('close', (code) => {
            this.isRunning = false;
            this.emit('exit', code);
            this.cleanup();
        });

        // Đây mới là lỗi thật của tiến trình con (VD: không spawn được binary).
        // Nếu chưa có ai lắng nghe 'error' ở nơi gọi (socket handler), Node vẫn sẽ
        // throw — nên luôn đảm bảo nơi tạo InteractiveRunner có gắn .on('error', ...).
        this.process.on('error', (err) => {
            this.isRunning = false;
            this.emit('error', err.message);
            this.cleanup();
        });

        return { success: true };
    }

    sendInput(input) {
        if (!this.process || !this.isRunning) {
            throw new Error('No process is running');
        }
        this.process.stdin.write(input + '\n');
    }

    kill() {
        if (this.process && this.isRunning) {
            this.process.kill();
            this.isRunning = false;
        }
        this.cleanup();
    }

    cleanup() {
        if (this.tempDir) {
            try {
                fs.rmSync(this.tempDir, { recursive: true, force: true });
            } catch (e) {}
            this.tempDir = null;
        }
        this.process = null;
        this.isCompiled = false;
    }
}

module.exports = { InteractiveRunner };