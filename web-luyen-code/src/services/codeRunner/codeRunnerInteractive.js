// backend/src/services/codeRunner/codeRunnerInteractive.js

const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const { EventEmitter } = require('events');

// ============================================================
// PLATFORM
// ============================================================

const IS_WINDOWS = process.platform === 'win32';
const IS_LINUX = process.platform === 'linux';

// ============================================================
// PROJECT ROOT
// ============================================================

const PROJECT_ROOT =
    path.resolve(
        __dirname,
        '../../../'
    );

// ============================================================
// TOOL PATHS
// WINDOWS + LINUX / VERCEL
// ============================================================

let TOOLS_DIR;
let GCC;
let GPP;
let PYTHON;
let JAVAC;
let JAVA;

if (IS_WINDOWS) {

    // ========================================================
    // WINDOWS
    // ========================================================

    TOOLS_DIR =
        process.env.TOOLS_DIR ||
        path.join(
            PROJECT_ROOT,
            'tools'
        );

    GCC =
        path.join(
            TOOLS_DIR,
            'mingw64',
            'bin',
            'gcc.exe'
        );

    GPP =
        path.join(
            TOOLS_DIR,
            'mingw64',
            'bin',
            'g++.exe'
        );

    PYTHON =
        path.join(
            TOOLS_DIR,
            'python',
            'python.exe'
        );

    JAVAC =
        path.join(
            TOOLS_DIR,
            'jdk',
            'bin',
            'javac.exe'
        );

    JAVA =
        path.join(
            TOOLS_DIR,
            'jdk',
            'bin',
            'java.exe'
        );

} else if (IS_LINUX) {

    // ========================================================
    // LINUX / VERCEL
    // ========================================================

    TOOLS_DIR =
        process.env.LINUX_TOOLS_DIR ||
        path.join(
            PROJECT_ROOT,
            'tools',
            'linux'
        );

    GCC =
        path.join(
            TOOLS_DIR,
            'gcc',
            'bin',
            'gcc'
        );

    GPP =
        path.join(
            TOOLS_DIR,
            'gcc',
            'bin',
            'g++'
        );

    PYTHON =
        path.join(
            TOOLS_DIR,
            'python',
            'bin',
            'python3'
        );

    JAVAC =
        path.join(
            TOOLS_DIR,
            'jdk',
            'bin',
            'javac'
        );

    JAVA =
        path.join(
            TOOLS_DIR,
            'jdk',
            'bin',
            'java'
        );

} else {

    throw new Error(
        `Unsupported platform: ${process.platform}`
    );
}

// ============================================================
// LOG (kept from the original diagnostic script)
// ============================================================

console.log('');
console.log('==========================================');
console.log('🚀 INTERACTIVE CODE RUNNER');
console.log('==========================================');
console.log('Platform:', process.platform);
console.log('Architecture:', process.arch);
console.log('Project:', PROJECT_ROOT);
console.log('Tools:', TOOLS_DIR);
console.log('GCC:', GCC);
console.log('G++:', GPP);
console.log('Python:', PYTHON);
console.log('Javac:', JAVAC);
console.log('Java:', JAVA);
console.log('==========================================');
console.log('');

// ============================================================
// TOOL FILE CHECK
// ============================================================

console.log('========== TOOL FILE CHECK ==========');
console.log('GCC exists:', fs.existsSync(GCC));
console.log('G++ exists:', fs.existsSync(GPP));
console.log('Python exists:', fs.existsSync(PYTHON));
console.log('Javac exists:', fs.existsSync(JAVAC));
console.log('Java exists:', fs.existsSync(JAVA));

if (IS_LINUX) {
    try {
        console.log('GCC mode:', fs.statSync(GCC).mode.toString(8));
        console.log('G++ mode:', fs.statSync(GPP).mode.toString(8));
    } catch (error) {
        console.error('❌ Không stat được Linux compiler:', error.message);
    }
}

console.log('====================================');

// ============================================================
// HELPERS
// ============================================================

function createTempDir() {
    const dir = path.join(os.tmpdir(), `interactive-${uuidv4()}`);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
}

function cleanup(dir) {
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    } catch (_) {}
}

// ============================================================
// INTERACTIVE RUNNER
//
// Unlike codeRunnerService.js (which uses exec() and buffers all
// I/O until the process exits), this uses spawn() so stdin/stdout
// can be streamed live to/from a running process — required for
// programs that alternate reading input and printing output
// (e.g. interactive judges, REPL-style problems).
// ============================================================

class InteractiveRunner extends EventEmitter {

    constructor() {
        super();
        this.child = null;
        this.tempDir = null;
        this.language = null;
        this.killed = false;
    }

    async start({ language, code }) {
        this.language = language;
        this.tempDir = createTempDir();

        switch (language) {
            case 'c':
                await this._startC(code);
                break;
            case 'cpp':
                await this._startCpp(code);
                break;
            case 'python':
                await this._startPython(code);
                break;
            case 'java':
                await this._startJava(code);
                break;
            default:
                cleanup(this.tempDir);
                throw new Error(`Unsupported language: ${language}`);
        }
    }

    async _compile(compiler, args, sourceFile) {
        return new Promise((resolve, reject) => {
            const proc = spawn(compiler, args, { cwd: this.tempDir });
            let stderr = '';

            proc.stderr.on('data', (d) => { stderr += d.toString(); });

            proc.on('error', (err) => reject(err));

            proc.on('close', (codeExit) => {
                if (codeExit !== 0) {
                    reject(new Error(stderr || `Compilation failed (exit code ${codeExit})`));
                } else {
                    resolve();
                }
            });
        });
    }

    _spawnAndAttach(command, args, options = {}) {
        const child = spawn(command, args, {
            cwd: this.tempDir,
            ...options,
        });

        this.child = child;

        child.stdout.on('data', (data) => {
            this.emit('output', data.toString());
        });

        child.stderr.on('data', (data) => {
            this.emit('error', data.toString());
        });

        child.on('close', (exitCode) => {
            this.emit('exit', exitCode);
            cleanup(this.tempDir);
        });

        child.on('error', (err) => {
            this.emit('error', err.message);
        });
    }

    async _startC(code) {
        if (!fs.existsSync(GCC)) {
            throw new Error('GCC is not installed on this server.');
        }

        const sourceFile = path.join(this.tempDir, 'main.c');
        const exeFile = path.join(this.tempDir, IS_WINDOWS ? 'main.exe' : 'main');

        fs.writeFileSync(sourceFile, code, 'utf8');
        await this._compile(GCC, [sourceFile, '-o', exeFile]);

        this._spawnAndAttach(exeFile, []);
    }

    async _startCpp(code) {
        if (!fs.existsSync(GPP)) {
            throw new Error('G++ is not installed on this server.');
        }

        const sourceFile = path.join(this.tempDir, 'main.cpp');
        const exeFile = path.join(this.tempDir, IS_WINDOWS ? 'main.exe' : 'main');

        fs.writeFileSync(sourceFile, code, 'utf8');
        await this._compile(GPP, [sourceFile, '-o', exeFile]);

        this._spawnAndAttach(exeFile, []);
    }

    async _startPython(code) {
        if (!fs.existsSync(PYTHON)) {
            throw new Error('Python is not installed on this server.');
        }

        const sourceFile = path.join(this.tempDir, 'main.py');
        fs.writeFileSync(sourceFile, code, 'utf8');

        // -u => unbuffered stdin/stdout, needed for real-time interaction
        this._spawnAndAttach(PYTHON, ['-u', sourceFile]);
    }

    async _startJava(code) {
        if (!fs.existsSync(JAVAC) || !fs.existsSync(JAVA)) {
            throw new Error('Java JDK is not installed on this server.');
        }

        const sourceFile = path.join(this.tempDir, 'Main.java');
        fs.writeFileSync(sourceFile, code, 'utf8');
        await this._compile(JAVAC, [sourceFile]);

        this._spawnAndAttach(JAVA, ['-cp', this.tempDir, 'Main']);
    }

    sendInput(input) {
        if (!this.child || !this.child.stdin.writable) {
            return;
        }
        this.child.stdin.write(input.endsWith('\n') ? input : input + '\n');
    }

    kill() {
        if (this.child && !this.killed) {
            this.killed = true;
            try {
                this.child.kill('SIGKILL');
            } catch (_) {}
        }
        cleanup(this.tempDir);
    }
}

// ============================================================
// EXPORT
// ============================================================

module.exports = { InteractiveRunner };
