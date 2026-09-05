
// backend/src/services/codeRunner/codeRunnerService.js

// ============================================================
// CODE RUNNER
// WINDOWS + LINUX / VERCEL
// ============================================================

const { exec } =
    require('child_process');

const fs =
    require('fs');

const path =
    require('path');

const os =
    require('os');

const { v4: uuidv4 } =
    require('uuid');

// ============================================================
// PLATFORM
// ============================================================

const IS_WINDOWS =
    process.platform === 'win32';

const IS_LINUX =
    process.platform === 'linux';

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
// ============================================================

let GCC;
let GPP;
let PYTHON;
let JAVAC;
let JAVA;

if (IS_WINDOWS) {

    const TOOLS_DIR =
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

    const LINUX_TOOLS_DIR =
        process.env.LINUX_TOOLS_DIR ||
        path.join(
            PROJECT_ROOT,
            'tools',
            'linux'
        );

    GCC =
        path.join(
            LINUX_TOOLS_DIR,
            'gcc',
            'bin',
            'gcc'
        );

    GPP =
        path.join(
            LINUX_TOOLS_DIR,
            'gcc',
            'bin',
            'g++'
        );

    PYTHON =
        path.join(
            LINUX_TOOLS_DIR,
            'python',
            'bin',
            'python3'
        );

    JAVAC =
        path.join(
            LINUX_TOOLS_DIR,
            'jdk',
            'bin',
            'javac'
        );

    JAVA =
        path.join(
            LINUX_TOOLS_DIR,
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

console.log(
    '=========================================='
);

console.log(
    '🚀 CODE RUNNER'
);

console.log(
    '=========================================='
);

console.log(
    'Platform:',
    process.platform
);

console.log(
    'Architecture:',
    process.arch
);

console.log(
    'Project:',
    PROJECT_ROOT
);

console.log(
    'GCC:',
    GCC
);

console.log(
    'G++:',
    GPP
);

console.log(
    'Python:',
    PYTHON
);

console.log(
    'Javac:',
    JAVAC
);

console.log(
    'Java:',
    JAVA
);

console.log(
    '=========================================='
);

console.log('');

// ============================================================
// CHECK TOOL
// ============================================================

function checkTool(
    name,
    file
) {
    if (!fs.existsSync(file)) {

        console.warn(
            `⚠️ Không tìm thấy ${name}:`
        );

        console.warn(file);

        return false;
    }

    console.log(
        `✅ ${name}: ${file}`
    );

    return true;
}

// ============================================================
// CHECK ALL TOOLS
// ============================================================

const TOOL_STATUS = {

    gcc:
        checkTool(
            'GCC',
            GCC
        ),

    gpp:
        checkTool(
            'G++',
            GPP
        ),

    python:
        checkTool(
            'Python',
            PYTHON
        ),

    javac:
        checkTool(
            'Javac',
            JAVAC
        ),

    java:
        checkTool(
            'Java',
            JAVA
        )
};

// ============================================================
// CREATE TEMP DIRECTORY
// ============================================================

function createTempDir() {

    const dir =
        path.join(
            os.tmpdir(),
            `code-${uuidv4()}`
        );

    fs.mkdirSync(
        dir,
        {
            recursive: true
        }
    );

    return dir;
}

// ============================================================
// RUN CODE
// ============================================================

async function runCode({
    language,
    code,
    input = '',
    timeout = 5000,
    extraFiles = [],
    outputFiles = []
}) {

    const timeoutMs =
        Number(timeout) || 5000;

    const langMap = {

        c: () =>
            runC(
                code,
                input,
                timeoutMs,
                extraFiles,
                outputFiles
            ),

        cpp: () =>
            runCpp(
                code,
                input,
                timeoutMs,
                extraFiles,
                outputFiles
            ),

        python: () =>
            runPython(
                code,
                input,
                timeoutMs,
                extraFiles,
                outputFiles
            ),

        java: () =>
            runJava(
                code,
                input,
                timeoutMs,
                extraFiles,
                outputFiles
            )
    };

    const runner =
        langMap[language];

    if (!runner) {
        throw new Error(
            `Unsupported language: ${language}`
        );
    }

    try {

        return await runner();

    } catch (error) {

        return {
            output: '',
            error:
                error.message ||
                String(error),
            executionTime: 0,
            generatedFiles: []
        };
    }
}

// ============================================================
// EXECUTION HELPER
// ============================================================

function executeCommand(
    command,
    options
) {
    return new Promise(
        (resolve) => {

            exec(
                command,
                options,
                (
                    error,
                    stdout,
                    stderr
                ) => {

                    resolve({
                        error,

                        stdout:
                            stdout || '',

                        stderr:
                            stderr || ''
                    });
                }
            );
        }
    );
}

// ============================================================
// C
// ============================================================

async function runC(
    code,
    input,
    timeoutMs,
    extraFiles = [],
    outputFiles = []
) {

    if (!TOOL_STATUS.gcc) {

        return {
            output: '',
            error:
                'GCC is not installed on this server.',
            executionTime: 0,
            generatedFiles: []
        };
    }

    const tempDir =
        createTempDir();

    const sourceFile =
        path.join(
            tempDir,
            'main.c'
        );

    const exeFile =
        path.join(
            tempDir,
            IS_WINDOWS
                ? 'main.exe'
                : 'main'
        );

    const inputFile =
        path.join(
            tempDir,
            'input.txt'
        );

    try {

        fs.writeFileSync(
            sourceFile,
            code,
            'utf8'
        );

        fs.writeFileSync(
            inputFile,
            input || '',
            'utf8'
        );

        writeExtraFiles(
            tempDir,
            extraFiles
        );

        const compile =
            await executeCommand(
                `"${GCC}" "${sourceFile}" -o "${exeFile}"`,
                {
                    cwd: tempDir,
                    timeout: timeoutMs
                }
            );

        if (compile.error) {

            const generatedFiles =
                collectOutputFiles(
                    tempDir,
                    outputFiles
                );

            cleanup(tempDir);

            return {

                output:
                    compile.stdout,

                error:
                    compile.stderr ||
                    compile.error.message,

                executionTime: 0,

                generatedFiles
            };
        }

        const start =
            Date.now();

        const run =
            await executeCommand(
                `"${exeFile}" < "${inputFile}"`,
                {
                    cwd: tempDir,
                    timeout: timeoutMs
                }
            );

        const executionTime =
            Date.now() - start;

        const generatedFiles =
            collectOutputFiles(
                tempDir,
                outputFiles
            );

        cleanup(tempDir);

        return {

            output:
                run.stdout,

            error:
                run.stderr ||
                run.error?.message ||
                '',

            executionTime,

            generatedFiles
        };

    } catch (error) {

        cleanup(tempDir);

        throw error;
    }
}

// ============================================================
// C++
// ============================================================

async function runCpp(
    code,
    input,
    timeoutMs,
    extraFiles = [],
    outputFiles = []
) {

    if (!TOOL_STATUS.gpp) {

        return {
            output: '',
            error:
                'G++ is not installed on this server.',
            executionTime: 0,
            generatedFiles: []
        };
    }

    const tempDir =
        createTempDir();

    const sourceFile =
        path.join(
            tempDir,
            'main.cpp'
        );

    const exeFile =
        path.join(
            tempDir,
            IS_WINDOWS
                ? 'main.exe'
                : 'main'
        );

    const inputFile =
        path.join(
            tempDir,
            'input.txt'
        );

    try {

        fs.writeFileSync(
            sourceFile,
            code,
            'utf8'
        );

        fs.writeFileSync(
            inputFile,
            input || '',
            'utf8'
        );

        writeExtraFiles(
            tempDir,
            extraFiles
        );

        const compile =
            await executeCommand(
                `"${GPP}" "${sourceFile}" -o "${exeFile}"`,
                {
                    cwd: tempDir,
                    timeout: timeoutMs
                }
            );

        if (compile.error) {

            const generatedFiles =
                collectOutputFiles(
                    tempDir,
                    outputFiles
                );

            cleanup(tempDir);

            return {

                output:
                    compile.stdout,

                error:
                    compile.stderr ||
                    compile.error.message,

                executionTime: 0,

                generatedFiles
            };
        }

        const start =
            Date.now();

        const run =
            await executeCommand(
                `"${exeFile}" < "${inputFile}"`,
                {
                    cwd: tempDir,
                    timeout: timeoutMs
                }
            );

        const executionTime =
            Date.now() - start;

        const generatedFiles =
            collectOutputFiles(
                tempDir,
                outputFiles
            );

        cleanup(tempDir);

        return {

            output:
                run.stdout,

            error:
                run.stderr ||
                run.error?.message ||
                '',

            executionTime,

            generatedFiles
        };

    } catch (error) {

        cleanup(tempDir);

        throw error;
    }
}

// ============================================================
// PYTHON
// ============================================================

async function runPython(
    code,
    input,
    timeoutMs,
    extraFiles = [],
    outputFiles = []
) {

    if (!TOOL_STATUS.python) {

        return {
            output: '',
            error:
                'Python is not installed on this server.',
            executionTime: 0,
            generatedFiles: []
        };
    }

    const tempDir =
        createTempDir();

    const sourceFile =
        path.join(
            tempDir,
            'main.py'
        );

    const inputFile =
        path.join(
            tempDir,
            'input.txt'
        );

    try {

        fs.writeFileSync(
            sourceFile,
            code,
            'utf8'
        );

        fs.writeFileSync(
            inputFile,
            input || '',
            'utf8'
        );

        writeExtraFiles(
            tempDir,
            extraFiles
        );

        const start =
            Date.now();

        const run =
            await executeCommand(
                `"${PYTHON}" "${sourceFile}" < "${inputFile}"`,
                {
                    cwd: tempDir,
                    timeout: timeoutMs
                }
            );

        const executionTime =
            Date.now() - start;

        const generatedFiles =
            collectOutputFiles(
                tempDir,
                outputFiles
            );

        cleanup(tempDir);

        return {

            output:
                run.stdout,

            error:
                run.stderr ||
                run.error?.message ||
                '',

            executionTime,

            generatedFiles
        };

    } catch (error) {

        cleanup(tempDir);

        throw error;
    }
}

// ============================================================
// JAVA
// ============================================================

async function runJava(
    code,
    input,
    timeoutMs,
    extraFiles = [],
    outputFiles = []
) {

    if (
        !TOOL_STATUS.javac ||
        !TOOL_STATUS.java
    ) {

        return {
            output: '',
            error:
                'Java JDK is not installed on this server.',
            executionTime: 0,
            generatedFiles: []
        };
    }

    const tempDir =
        createTempDir();

    /*
     * Java bắt buộc:
     *
     * public class Main
     *
     * =>
     *
     * Main.java
     */

    const sourceFile =
        path.join(
            tempDir,
            'Main.java'
        );

    const inputFile =
        path.join(
            tempDir,
            'input.txt'
        );

    try {

        fs.writeFileSync(
            sourceFile,
            code,
            'utf8'
        );

        fs.writeFileSync(
            inputFile,
            input || '',
            'utf8'
        );

        writeExtraFiles(
            tempDir,
            extraFiles
        );

        const compile =
            await executeCommand(
                `"${JAVAC}" "${sourceFile}"`,
                {
                    cwd: tempDir,
                    timeout: timeoutMs
                }
            );

        if (compile.error) {

            const generatedFiles =
                collectOutputFiles(
                    tempDir,
                    outputFiles
                );

            cleanup(tempDir);

            return {

                output:
                    compile.stdout,

                error:
                    compile.stderr ||
                    compile.error.message,

                executionTime: 0,

                generatedFiles
            };
        }

        const start =
            Date.now();

        const run =
            await executeCommand(
                `"${JAVA}" -cp "${tempDir}" Main < "${inputFile}"`,
                {
                    cwd: tempDir,
                    timeout: timeoutMs
                }
            );

        const executionTime =
            Date.now() - start;

        const generatedFiles =
            collectOutputFiles(
                tempDir,
                outputFiles
            );

        cleanup(tempDir);

        return {

            output:
                run.stdout,

            error:
                run.stderr ||
                run.error?.message ||
                '',

            executionTime,

            generatedFiles
        };

    } catch (error) {

        cleanup(tempDir);

        throw error;
    }
}

// ============================================================
// EXTRA FILES
// ============================================================

function writeExtraFiles(
    tempDir,
    extraFiles = []
) {

    for (
        const file of extraFiles
    ) {

        if (
            !file ||
            !file.name
        ) {
            continue;
        }

        try {

            const safeName =
                path.basename(
                    file.name
                );

            const filePath =
                path.join(
                    tempDir,
                    safeName
                );

            fs.writeFileSync(
                filePath,
                file.content ?? '',
                'utf8'
            );

        } catch (error) {

            console.warn(
                `⚠️ Không ghi được extra file "${file.name}":`,
                error.message
            );
        }
    }
}

// ============================================================
// COLLECT OUTPUT FILES
// ============================================================

function collectOutputFiles(
    tempDir,
    outputFiles = []
) {

    const generatedFiles = [];

    for (
        const name of outputFiles
    ) {

        if (!name) {
            continue;
        }

        try {

            const safeName =
                path.basename(
                    name
                );

            const filePath =
                path.join(
                    tempDir,
                    safeName
                );

            if (
                fs.existsSync(
                    filePath
                )
            ) {

                generatedFiles.push({

                    name:
                        safeName,

                    content:
                        fs.readFileSync(
                            filePath,
                            'utf8'
                        )
                });
            }

        } catch (error) {

            console.warn(
                `⚠️ Không đọc được output file "${name}":`,
                error.message
            );
        }
    }

    return generatedFiles;
}

// ============================================================
// CLEANUP
// ============================================================

function cleanup(dir) {

    try {

        fs.rmSync(
            dir,
            {
                recursive: true,
                force: true
            }
        );

    } catch (_) {}
}

// ============================================================
// EXPORT
// ============================================================

module.exports = {
    runCode
};

