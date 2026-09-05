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
// LOG
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

const fs = require('fs');

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