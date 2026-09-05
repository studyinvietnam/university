// backend/src/services/codeRunner/codeRunnerService.js

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

// ============================================================
// ĐƯỜNG DẪN TUYỆT ĐỐI ĐẾN CÁC CÔNG CỤ TRONG THƯ MỤC tools/
// ============================================================
// File này nằm ở: src/services/codeRunner/codeRunnerService.js
// Cần lên 3 cấp để tới thư mục gốc dự án (src -> services -> codeRunner -> web-luyen-code)
const PROJECT_ROOT = path.resolve(__dirname, '../../../'); // 👈 SỬA THÀNH 3 CẤP
const TOOLS_DIR = process.env.TOOLS_DIR || path.join(PROJECT_ROOT, 'tools');

// Đường dẫn từng công cụ
const GCC = path.join(TOOLS_DIR, 'mingw64', 'bin', 'gcc.exe');
const GPP = path.join(TOOLS_DIR, 'mingw64', 'bin', 'g++.exe');
const PYTHON = path.join(TOOLS_DIR, 'python', 'python.exe');
const JAVAC = path.join(TOOLS_DIR, 'jdk', 'bin', 'javac.exe');
const JAVA = path.join(TOOLS_DIR, 'jdk', 'bin', 'java.exe');

// Kiểm tra sự tồn tại và log warning nếu thiếu
if (!fs.existsSync(GCC)) console.warn('⚠️ Không tìm thấy gcc.exe tại:', GCC);
if (!fs.existsSync(GPP)) console.warn('⚠️ Không tìm thấy g++.exe tại:', GPP);
if (!fs.existsSync(PYTHON)) console.warn('⚠️ Không tìm thấy python.exe tại:', PYTHON);
if (!fs.existsSync(JAVAC)) console.warn('⚠️ Không tìm thấy javac.exe tại:', JAVAC);
if (!fs.existsSync(JAVA)) console.warn('⚠️ Không tìm thấy java.exe tại:', JAVA);

/**
 * Chạy code với ngôn ngữ tương ứng
 * @param {Object} params
 * @param {string} params.language - 'c' | 'cpp' | 'python' | 'java'
 * @param {string} params.code - Source code
 * @param {string} params.input - Input string
 * @param {number} params.timeout - Timeout (ms)
 * @param {Array<{name:string, content:string}>} [params.extraFiles] - Các file cần ghi sẵn vào thư mục chạy
 *        trước khi build/run (VD: file mà code sẽ freopen("...", "r", stdin) để đọc)
 * @param {string[]} [params.outputFiles] - Tên các file cần đọc lại sau khi chạy xong
 *        (VD: file mà code freopen("...", "w", stdout) để ghi ra)
 * @returns {Promise<{ output: string, error: string, executionTime: number, generatedFiles: Array<{name:string, content:string}> }>}
 */
async function runCode({ language, code, input = '', timeout = 5000, extraFiles = [], outputFiles = [] }) {
    const timeoutMs = Number(timeout) || 5000;
    const langMap = {
        c: () => runC(code, input, timeoutMs, extraFiles, outputFiles),
        cpp: () => runCpp(code, input, timeoutMs, extraFiles, outputFiles),
        python: () => runPython(code, input, timeoutMs, extraFiles, outputFiles),
        java: () => runJava(code, input, timeoutMs, extraFiles, outputFiles),
    };
    const runner = langMap[language];
    if (!runner) throw new Error(`Unsupported language: ${language}`);
    return runner();
}

// ============================================================
// C (dùng gcc)
// ============================================================
async function runC(code, input, timeoutMs, extraFiles = [], outputFiles = []) {
    const tempDir = createTempDir();
    const sourceFile = path.join(tempDir, 'main.c');
    const exeFile = path.join(tempDir, 'main.exe');
    const inputFile = path.join(tempDir, 'input.txt');

    fs.writeFileSync(sourceFile, code);
    fs.writeFileSync(inputFile, input || '');
    writeExtraFiles(tempDir, extraFiles); // 👈 ghi sẵn các file mà freopen(..., "r", stdin) sẽ đọc

    return new Promise((resolve) => {
        exec(`"${GCC}" "${sourceFile}" -o "${exeFile}"`, { cwd: tempDir }, (compileErr, _, stderr) => {
            if (compileErr) {
                const generatedFiles = collectOutputFiles(tempDir, outputFiles);
                cleanup(tempDir);
                return resolve({ output: '', error: stderr || compileErr.message, executionTime: 0, generatedFiles });
            }
            const start = Date.now();
            exec(`"${exeFile}" < "${inputFile}"`, { cwd: tempDir, timeout: timeoutMs }, (runErr, stdout, stderr) => {
                const executionTime = Date.now() - start;
                const generatedFiles = collectOutputFiles(tempDir, outputFiles); // 👈 đọc file freopen(..., "w", stdout) vừa ghi ra
                cleanup(tempDir);
                resolve({ output: stdout || '', error: stderr || runErr?.message || '', executionTime, generatedFiles });
            });
        });
    });
}

// ============================================================
// C++ (dùng g++)
// ============================================================
async function runCpp(code, input, timeoutMs, extraFiles = [], outputFiles = []) {
    const tempDir = createTempDir();
    const sourceFile = path.join(tempDir, 'main.cpp');
    const exeFile = path.join(tempDir, 'main.exe');
    const inputFile = path.join(tempDir, 'input.txt');

    fs.writeFileSync(sourceFile, code);
    fs.writeFileSync(inputFile, input || '');
    writeExtraFiles(tempDir, extraFiles); // 👈 ghi sẵn các file mà freopen(..., "r", stdin) sẽ đọc

    return new Promise((resolve) => {
        exec(`"${GPP}" "${sourceFile}" -o "${exeFile}"`, { cwd: tempDir }, (compileErr, _, stderr) => {
            if (compileErr) {
                const generatedFiles = collectOutputFiles(tempDir, outputFiles);
                cleanup(tempDir);
                return resolve({ output: '', error: stderr || compileErr.message, executionTime: 0, generatedFiles });
            }
            const start = Date.now();
            exec(`"${exeFile}" < "${inputFile}"`, { cwd: tempDir, timeout: timeoutMs }, (runErr, stdout, stderr) => {
                const executionTime = Date.now() - start;
                const generatedFiles = collectOutputFiles(tempDir, outputFiles); // 👈 đọc file freopen(..., "w", stdout) vừa ghi ra
                cleanup(tempDir);
                resolve({ output: stdout || '', error: stderr || runErr?.message || '', executionTime, generatedFiles });
            });
        });
    });
}

// ============================================================
// Python
// ============================================================
async function runPython(code, input, timeoutMs, extraFiles = [], outputFiles = []) {
    const tempDir = createTempDir();
    const sourceFile = path.join(tempDir, 'main.py');
    const inputFile = path.join(tempDir, 'input.txt');

    fs.writeFileSync(sourceFile, code);
    fs.writeFileSync(inputFile, input || '');
    writeExtraFiles(tempDir, extraFiles);

    return new Promise((resolve) => {
        const start = Date.now();
        exec(`"${PYTHON}" "${sourceFile}" < "${inputFile}"`, { cwd: tempDir, timeout: timeoutMs }, (runErr, stdout, stderr) => {
            const executionTime = Date.now() - start;
            const generatedFiles = collectOutputFiles(tempDir, outputFiles);
            cleanup(tempDir);
            resolve({ output: stdout || '', error: stderr || runErr?.message || '', executionTime, generatedFiles });
        });
    });
}

// ============================================================
// Java
// ============================================================
async function runJava(code, input, timeoutMs, extraFiles = [], outputFiles = []) {
    const tempDir = createTempDir();
    const sourceFile = path.join(tempDir, 'Main.java');
    const inputFile = path.join(tempDir, 'input.txt');

    fs.writeFileSync(sourceFile, code);
    fs.writeFileSync(inputFile, input || '');
    writeExtraFiles(tempDir, extraFiles);

    return new Promise((resolve) => {
        exec(`"${JAVAC}" "${sourceFile}"`, { cwd: tempDir }, (compileErr, _, stderr) => {
            if (compileErr) {
                const generatedFiles = collectOutputFiles(tempDir, outputFiles);
                cleanup(tempDir);
                return resolve({ output: '', error: stderr || compileErr.message, executionTime: 0, generatedFiles });
            }
            const start = Date.now();
            exec(`"${JAVA}" -cp "${tempDir}" Main < "${inputFile}"`, { cwd: tempDir, timeout: timeoutMs }, (runErr, stdout, stderr) => {
                const executionTime = Date.now() - start;
                const generatedFiles = collectOutputFiles(tempDir, outputFiles);
                cleanup(tempDir);
                resolve({ output: stdout || '', error: stderr || runErr?.message || '', executionTime, generatedFiles });
            });
        });
    });
}

// ============================================================
// Helper functions
// ============================================================
function createTempDir() {
    const dir = path.join(os.tmpdir(), `code-${uuidv4()}`);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
}

// Ghi các file phụ (VD: file mà freopen(..., "r", stdin) sẽ mở) vào thư mục chạy
// TRƯỚC khi build/run, để chương trình mở bằng tên tương đối là thấy ngay.
function writeExtraFiles(tempDir, extraFiles = []) {
    for (const f of extraFiles) {
        if (!f || !f.name) continue;
        try {
            // Chỉ lấy tên file (basename) để tránh path traversal (VD: "../../abc")
            const safeName = path.basename(f.name);
            fs.writeFileSync(path.join(tempDir, safeName), f.content ?? '');
        } catch (e) {
            console.warn(`⚠️ Không ghi được extra file "${f.name}":`, e.message);
        }
    }
}

// Đọc lại các file mà chương trình đã tạo/ghi ra (VD: file freopen(..., "w", stdout))
// SAU khi chạy xong, trước khi dọn thư mục temp.
function collectOutputFiles(tempDir, outputFiles = []) {
    const generatedFiles = [];
    for (const name of outputFiles) {
        if (!name) continue;
        try {
            const safeName = path.basename(name);
            const filePath = path.join(tempDir, safeName);
            if (fs.existsSync(filePath)) {
                generatedFiles.push({ name: safeName, content: fs.readFileSync(filePath, 'utf8') });
            }
        } catch (e) {
            console.warn(`⚠️ Không đọc được output file "${name}":`, e.message);
        }
    }
    return generatedFiles;
}

function cleanup(dir) {
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    } catch (_) {}
}

module.exports = { runCode };