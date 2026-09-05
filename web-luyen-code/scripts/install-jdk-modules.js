const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const os = require('os');
const { execFileSync } = require('child_process');

// ============================================================
// CONFIG
// ============================================================

const PROJECT_ROOT = path.resolve(__dirname, '..');
const TOOLS_DIR = path.join(PROJECT_ROOT, 'tools');

const IS_WINDOWS = process.platform === 'win32';
const IS_LINUX = process.platform === 'linux';

// ============================================================
// WINDOWS JDK MODULES
// ============================================================

const FILE_ID =
    '1eSFC7HbonqdCG7-wWaYNmGN5dgvcLpa0';

const WINDOWS_JDK_MODULES_URL =
    `https://drive.usercontent.google.com/download?id=${FILE_ID}&export=download&authuser=0`;

const WINDOWS_JDK_MODULES_TARGET = path.join(
    TOOLS_DIR,
    'jdk',
    'lib',
    'modules'
);

// ============================================================
// HELPERS
// ============================================================

function log(message) {
    console.log(`[install-tools] ${message}`);
}

function ensureDir(dir) {
    fs.mkdirSync(dir, {
        recursive: true
    });
}

function tmpDir() {
    const dir = path.join(
        os.tmpdir(),
        'web-luyen-code-tools'
    );

    ensureDir(dir);

    return dir;
}

// ============================================================
// HTTP / HTTPS REQUEST
// ============================================================

function request(url, options = {}) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https://')
            ? https
            : http;

        const req = protocol.get(
            url,
            {
                headers: {
                    'User-Agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36',
                    ...options.headers
                }
            },
            (response) => {
                resolve(response);
            }
        );

        req.on('error', reject);
    });
}

// ============================================================
// DOWNLOAD FILE
// ============================================================

async function downloadFile(url, destination) {
    log(`⬇️ Download: ${url}`);

    let response = await request(url);

    // --------------------------------------------------------
    // REDIRECT
    // --------------------------------------------------------

    if (
        response.statusCode >= 300 &&
        response.statusCode < 400 &&
        response.headers.location
    ) {
        const redirectUrl = new URL(
            response.headers.location,
            url
        ).toString();

        response.resume();

        log('🔄 Redirect...');

        return downloadFile(
            redirectUrl,
            destination
        );
    }

    if (response.statusCode !== 200) {
        response.resume();

        throw new Error(
            `HTTP ${response.statusCode}: ${url}`
        );
    }

    const contentType =
        response.headers['content-type'] || '';

    // --------------------------------------------------------
    // GOOGLE DRIVE HTML CONFIRMATION
    // --------------------------------------------------------

    if (contentType.includes('text/html')) {
        let html = '';

        response.setEncoding('utf8');

        for await (const chunk of response) {
            html += chunk;
        }

        const confirmedUrl =
            findGoogleDriveDownloadUrl(html);

        if (!confirmedUrl) {
            throw new Error(
                'Google Drive trả về HTML nhưng không tìm thấy link download xác nhận.'
            );
        }

        log('✅ Đã tìm thấy link Google Drive confirmation.');

        return downloadFile(
            confirmedUrl,
            destination
        );
    }

    // --------------------------------------------------------
    // WRITE FILE
    // --------------------------------------------------------

    ensureDir(path.dirname(destination));

    const totalSize =
        parseInt(
            response.headers['content-length'],
            10
        ) || 0;

    let downloaded = 0;
    let lastPercent = -1;

    const file = fs.createWriteStream(
        destination
    );

    return new Promise((resolve, reject) => {

        response.on('data', (chunk) => {
            downloaded += chunk.length;

            if (totalSize > 0) {
                const percent = Math.floor(
                    downloaded /
                    totalSize *
                    100
                );

                if (percent !== lastPercent) {
                    lastPercent = percent;

                    const downloadedMB = (
                        downloaded /
                        1024 /
                        1024
                    ).toFixed(2);

                    const totalMB = (
                        totalSize /
                        1024 /
                        1024
                    ).toFixed(2);

                    process.stdout.write(
                        `\r📥 ${percent}% | ${downloadedMB} MB / ${totalMB} MB`
                    );
                }
            } else {
                const downloadedMB = (
                    downloaded /
                    1024 /
                    1024
                ).toFixed(2);

                process.stdout.write(
                    `\r📥 ${downloadedMB} MB`
                );
            }
        });

        response.pipe(file);

        file.on('finish', () => {
            file.close();

            console.log('');
            console.log('✅ Download hoàn tất.');

            resolve();
        });

        file.on('error', (error) => {
            file.close();

            try {
                fs.unlinkSync(destination);
            } catch (_) {}

            reject(error);
        });

        response.on('error', (error) => {
            file.close();

            try {
                fs.unlinkSync(destination);
            } catch (_) {}

            reject(error);
        });
    });
}

// ============================================================
// GOOGLE DRIVE DOWNLOAD URL
// ============================================================

function findGoogleDriveDownloadUrl(html) {

    const patterns = [

        /href="(https:\/\/drive\.usercontent\.google\.com\/download[^"]+)"/i,

        /href="(\/download[^"]+)"/i,

        /action="(https:\/\/drive\.usercontent\.google\.com\/download[^"]+)"/i,

        /action="(\/download[^"]+)"/i
    ];

    for (const pattern of patterns) {

        const match = html.match(pattern);

        if (match && match[1]) {

            let url = match[1];

            url = url
                .replace(/&amp;/g, '&')
                .replace(/\\u003d/g, '=')
                .replace(/\\u0026/g, '&');

            if (url.startsWith('/')) {
                url =
                    'https://drive.usercontent.google.com' +
                    url;
            }

            return url;
        }
    }

    const tokenPatterns = [
        /confirm=([0-9A-Za-z_-]+)/i,
        /name="confirm"\s+value="([^"]+)"/i
    ];

    for (const pattern of tokenPatterns) {

        const match = html.match(pattern);

        if (match && match[1]) {

            return (
                'https://drive.usercontent.google.com/download' +
                `?id=${FILE_ID}` +
                '&export=download' +
                '&authuser=0' +
                `&confirm=${match[1]}`
            );
        }
    }

    return null;
}

// ============================================================
// VALIDATE BINARY
// ============================================================

function validateBinary(filePath, minimumSize = 1024 * 1024) {

    if (!fs.existsSync(filePath)) {
        throw new Error(
            `File không tồn tại: ${filePath}`
        );
    }

    const stats =
        fs.statSync(filePath);

    if (stats.size < minimumSize) {
        throw new Error(
            `File quá nhỏ: ${stats.size} bytes`
        );
    }

    const buffer =
        Buffer.alloc(256);

    const fd =
        fs.openSync(filePath, 'r');

    fs.readSync(
        fd,
        buffer,
        0,
        256,
        0
    );

    fs.closeSync(fd);

    const header =
        buffer
            .toString('utf8')
            .toLowerCase();

    if (
        header.includes('<html') ||
        header.includes('<!doctype') ||
        header.includes('<head')
    ) {
        throw new Error(
            'File tải về là HTML, không phải binary.'
        );
    }

    return true;
}

// ============================================================
// WINDOWS
// ============================================================

async function installWindowsTools() {

    log('🪟 Windows detected.');

    if (
        fs.existsSync(
            WINDOWS_JDK_MODULES_TARGET
        )
    ) {

        const stats =
            fs.statSync(
                WINDOWS_JDK_MODULES_TARGET
            );

        log(
            `✅ Windows JDK modules đã tồn tại (${(
                stats.size /
                1024 /
                1024
            ).toFixed(2)} MB)`
        );

        return;
    }

    ensureDir(
        path.dirname(
            WINDOWS_JDK_MODULES_TARGET
        )
    );

    log('📦 Windows JDK modules');
    log(
        `📁 ${WINDOWS_JDK_MODULES_TARGET}`
    );

    await downloadFile(
        WINDOWS_JDK_MODULES_URL,
        WINDOWS_JDK_MODULES_TARGET
    );

    validateBinary(
        WINDOWS_JDK_MODULES_TARGET
    );

    log('✅ Windows JDK modules hoàn tất.');
}

// ============================================================
// TAR EXTRACTION
// ============================================================

function extractTarGz(
    archive,
    destination
) {

    ensureDir(destination);

    execFileSync(
        'tar',
        [
            '-xzf',
            archive,
            '-C',
            destination
        ],
        {
            stdio: 'inherit'
        }
    );
}

function extractTarXz(
    archive,
    destination
) {

    ensureDir(destination);

    execFileSync(
        'tar',
        [
            '-xJf',
            archive,
            '-C',
            destination
        ],
        {
            stdio: 'inherit'
        }
    );
}

// ============================================================
// CHMOD
// ============================================================

function chmodRecursive(dir) {

    if (!fs.existsSync(dir)) {
        return;
    }

    const entries =
        fs.readdirSync(
            dir,
            {
                withFileTypes: true
            }
        );

    for (const entry of entries) {

        const fullPath =
            path.join(
                dir,
                entry.name
            );

        if (entry.isDirectory()) {

            chmodRecursive(
                fullPath
            );

        } else {

            try {
                fs.chmodSync(
                    fullPath,
                    0o755
                );
            } catch (_) {}
        }
    }
}

// ============================================================
// FIND FILE
// ============================================================

function findFile(
    root,
    fileName
) {

    if (!fs.existsSync(root)) {
        return null;
    }

    const entries =
        fs.readdirSync(
            root,
            {
                withFileTypes: true
            }
        );

    for (const entry of entries) {

        const fullPath =
            path.join(
                root,
                entry.name
            );

        if (
            entry.isFile() &&
            entry.name === fileName
        ) {
            return fullPath;
        }

        if (entry.isDirectory()) {

            const result =
                findFile(
                    fullPath,
                    fileName
                );

            if (result) {
                return result;
            }
        }
    }

    return null;
}

// ============================================================
// FIND DIRECTORY CONTAINING bin/
// ============================================================

function findRootWithBin(root) {

    if (!fs.existsSync(root)) {
        return null;
    }

    const entries =
        fs.readdirSync(
            root,
            {
                withFileTypes: true
            }
        );

    for (const entry of entries) {

        if (!entry.isDirectory()) {
            continue;
        }

        const candidate =
            path.join(
                root,
                entry.name
            );

        const binDir =
            path.join(
                candidate,
                'bin'
            );

        if (fs.existsSync(binDir)) {
            return candidate;
        }

        const nested =
            findRootWithBin(
                candidate
            );

        if (nested) {
            return nested;
        }
    }

    return null;
}

// ============================================================
// FIND JDK
// ============================================================

function findJdkRoot(root) {

    if (!fs.existsSync(root)) {
        return null;
    }

    const entries =
        fs.readdirSync(
            root,
            {
                withFileTypes: true
            }
        );

    for (const entry of entries) {

        if (!entry.isDirectory()) {
            continue;
        }

        const candidate =
            path.join(
                root,
                entry.name
            );

        const java =
            path.join(
                candidate,
                'bin',
                'java'
            );

        const javac =
            path.join(
                candidate,
                'bin',
                'javac'
            );

        if (
            fs.existsSync(java) &&
            fs.existsSync(javac)
        ) {
            return candidate;
        }

        const nested =
            findJdkRoot(
                candidate
            );

        if (nested) {
            return nested;
        }
    }

    return null;
}

// ============================================================
// INSTALL LINUX GCC / G++
// ============================================================

async function installLinuxGcc() {

    const linuxDir =
        path.join(
            TOOLS_DIR,
            'linux'
        );

    const gccDir =
        path.join(
            linuxDir,
            'gcc'
        );

    const gcc =
        path.join(
            gccDir,
            'bin',
            'gcc'
        );

    const gpp =
        path.join(
            gccDir,
            'bin',
            'g++'
        );

    if (
        fs.existsSync(gcc) &&
        fs.existsSync(gpp)
    ) {

        log(
            '✅ Linux GCC/G++ đã tồn tại.'
        );

        return;
    }

    ensureDir(gccDir);

    const archive =
        path.join(
            tmpDir(),
            'linux-gcc.tar.xz'
        );

    /*
     * Toolchain musl x86_64.
     *
     * Asset này chứa compiler,
     * binutils, headers và libraries.
     */
    const url =
        'https://github.com/76-eddge/musl-cross/releases/latest/download/x86_64-linux-musl.tar.xz';

    await downloadFile(
        url,
        archive
    );

    const extractDir =
        path.join(
            tmpDir(),
            'gcc-extract'
        );

    fs.rmSync(
        extractDir,
        {
            recursive: true,
            force: true
        }
    );

    ensureDir(extractDir);

    log(
        '📦 Giải nén Linux GCC...'
    );

    extractTarXz(
        archive,
        extractDir
    );

    const compilerGcc =
        findFile(
            extractDir,
            'x86_64-linux-musl-gcc'
        );

    const compilerGpp =
        findFile(
            extractDir,
            'x86_64-linux-musl-g++'
        );

    if (
        !compilerGcc ||
        !compilerGpp
    ) {

        throw new Error(
            'Không tìm thấy x86_64-linux-musl-gcc/g++.'
        );
    }

    const toolchainRoot =
        findRootWithBin(
            extractDir
        );

    if (!toolchainRoot) {

        throw new Error(
            'Không tìm thấy Linux GCC toolchain.'
        );
    }

    /*
     * Copy nguyên toolchain.
     */
    fs.rmSync(
        gccDir,
        {
            recursive: true,
            force: true
        }
    );

    fs.cpSync(
        toolchainRoot,
        gccDir,
        {
            recursive: true
        }
    );

    /*
     * Tạo gcc/g++ wrapper.
     *
     * codeRunnerService.js sẽ gọi:
     *
     * tools/linux/gcc/bin/gcc
     * tools/linux/gcc/bin/g++
     */

    const binDir =
        path.join(
            gccDir,
            'bin'
        );

    const targetGcc =
        path.join(
            binDir,
            'x86_64-linux-musl-gcc'
        );

    const targetGpp =
        path.join(
            binDir,
            'x86_64-linux-musl-g++'
        );

    if (
        fs.existsSync(targetGcc) &&
        !fs.existsSync(gcc)
    ) {

        fs.symlinkSync(
            'x86_64-linux-musl-gcc',
            gcc
        );
    }

    if (
        fs.existsSync(targetGpp) &&
        !fs.existsSync(gpp)
    ) {

        fs.symlinkSync(
            'x86_64-linux-musl-g++',
            gpp
        );
    }

    chmodRecursive(
        gccDir
    );

    try {
        fs.rmSync(
            archive,
            {
                force: true
            }
        );

        fs.rmSync(
            extractDir,
            {
                recursive: true,
                force: true
            }
        );
    } catch (_) {}

    log(
        '✅ Linux GCC/G++ đã cài.'
    );
}

// ============================================================
// INSTALL LINUX PYTHON
// ============================================================

async function installLinuxPython() {

    const pythonDir =
        path.join(
            TOOLS_DIR,
            'linux',
            'python'
        );

    const python =
        path.join(
            pythonDir,
            'bin',
            'python3'
        );

    if (fs.existsSync(python)) {

        log(
            '✅ Linux Python đã tồn tại.'
        );

        return;
    }

    ensureDir(pythonDir);

    /*
     * Lấy release mới nhất từ GitHub API.
     */
    const releaseInfo =
        await getJson(
            'https://api.github.com/repos/astral-sh/python-build-standalone/releases/latest'
        );

    const asset =
        releaseInfo.assets.find(
            (item) =>
                /cpython-3\.13\..*-x86_64-unknown-linux-gnu-install_only_stripped\.tar\.gz$/i
                    .test(item.name)
        );

    if (!asset) {

        throw new Error(
            'Không tìm thấy Python x86_64 Linux package.'
        );
    }

    const archive =
        path.join(
            tmpDir(),
            'python-linux.tar.gz'
        );

    await downloadFile(
        asset.browser_download_url,
        archive
    );

    const extractDir =
        path.join(
            tmpDir(),
            'python-extract'
        );

    fs.rmSync(
        extractDir,
        {
            recursive: true,
            force: true
        }
    );

    ensureDir(extractDir);

    log(
        `📦 Python: ${asset.name}`
    );

    extractTarGz(
        archive,
        extractDir
    );

    const pythonRoot =
        findPythonRoot(
            extractDir
        );

    if (!pythonRoot) {

        throw new Error(
            'Không tìm thấy Python installation.'
        );
    }

    fs.rmSync(
        pythonDir,
        {
            recursive: true,
            force: true
        }
    );

    fs.cpSync(
        pythonRoot,
        pythonDir,
        {
            recursive: true
        }
    );

    chmodRecursive(
        pythonDir
    );

    fs.rmSync(
        archive,
        {
            force: true
        }
    );

    fs.rmSync(
        extractDir,
        {
            recursive: true,
            force: true
        }
    );

    log(
        '✅ Linux Python đã cài.'
    );
}

function findPythonRoot(root) {

    if (!fs.existsSync(root)) {
        return null;
    }

    const entries =
        fs.readdirSync(
            root,
            {
                withFileTypes: true
            }
        );

    for (const entry of entries) {

        if (!entry.isDirectory()) {
            continue;
        }

        const candidate =
            path.join(
                root,
                entry.name
            );

        const python =
            path.join(
                candidate,
                'bin',
                'python3'
            );

        if (fs.existsSync(python)) {
            return candidate;
        }

        const nested =
            findPythonRoot(
                candidate
            );

        if (nested) {
            return nested;
        }
    }

    return null;
}

// ============================================================
// INSTALL LINUX JDK 21
// ============================================================

async function installLinuxJdk() {

    const jdkDir =
        path.join(
            TOOLS_DIR,
            'linux',
            'jdk'
        );

    const java =
        path.join(
            jdkDir,
            'bin',
            'java'
        );

    const javac =
        path.join(
            jdkDir,
            'bin',
            'javac'
        );

    if (
        fs.existsSync(java) &&
        fs.existsSync(javac)
    ) {

        log(
            '✅ Linux JDK đã tồn tại.'
        );

        return;
    }

    ensureDir(jdkDir);

    const archive =
        path.join(
            tmpDir(),
            'jdk-linux.tar.gz'
        );

    /*
     * Eclipse Temurin JDK 21.
     *
     * API sẽ redirect về file tar.gz.
     */
    const url =
        'https://api.adoptium.net/v3/binary/latest/21/ga/linux/x64/jdk/hotspot/normal/eclipse';

    await downloadFile(
        url,
        archive
    );

    const extractDir =
        path.join(
            tmpDir(),
            'jdk-extract'
        );

    fs.rmSync(
        extractDir,
        {
            recursive: true,
            force: true
        }
    );

    ensureDir(extractDir);

    log(
        '📦 Giải nén Linux JDK 21...'
    );

    extractTarGz(
        archive,
        extractDir
    );

    const jdkRoot =
        findJdkRoot(
            extractDir
        );

    if (!jdkRoot) {

        throw new Error(
            'Không tìm thấy Linux JDK.'
        );
    }

    fs.rmSync(
        jdkDir,
        {
            recursive: true,
            force: true
        }
    );

    fs.cpSync(
        jdkRoot,
        jdkDir,
        {
            recursive: true
        }
    );

    chmodRecursive(
        jdkDir
    );

    fs.rmSync(
        archive,
        {
            force: true
        }
    );

    fs.rmSync(
        extractDir,
        {
            recursive: true,
            force: true
        }
    );

    log(
        '✅ Linux JDK 21 đã cài.'
    );
}

// ============================================================
// GET JSON
// ============================================================

function getJson(url) {

    return new Promise(
        (resolve, reject) => {

            request(
                url,
                {
                    headers: {
                        Accept:
                            'application/vnd.github+json'
                    }
                }
            )
                .then(
                    (response) => {

                        let data = '';

                        response.setEncoding(
                            'utf8'
                        );

                        response.on(
                            'data',
                            (chunk) => {
                                data += chunk;
                            }
                        );

                        response.on(
                            'end',
                            () => {

                                if (
                                    response.statusCode !== 200
                                ) {

                                    return reject(
                                        new Error(
                                            `HTTP ${response.statusCode}: ${url}`
                                        )
                                    );
                                }

                                try {

                                    resolve(
                                        JSON.parse(data)
                                    );

                                } catch (error) {

                                    reject(
                                        error
                                    );
                                }
                            }
                        );

                        response.on(
                            'error',
                            reject
                        );
                    }
                )
                .catch(reject);
        }
    );
}

// ============================================================
// LINUX
// ============================================================

async function installLinuxTools() {

    log('🐧 Linux detected.');
    log(
        '➡️ Vercel/Linux: bắt đầu tải Linux tools...'
    );

    await installLinuxGcc();

    await installLinuxPython();

    await installLinuxJdk();

    log('');
    log(
        '=========================================='
    );
    log(
        '🎉 LINUX TOOLS INSTALLATION COMPLETE'
    );
    log(
        '=========================================='
    );
}

// ============================================================
// MAIN
// ============================================================

async function main() {

    console.log('');
    console.log(
        '=========================================='
    );
    console.log(
        '       WEB LUYEN CODE - TOOLS INSTALLER'
    );
    console.log(
        '=========================================='
    );

    log(
        `Platform: ${process.platform}`
    );

    log(
        `Architecture: ${process.arch}`
    );

    log(
        `Project: ${PROJECT_ROOT}`
    );

    log(
        `Tools: ${TOOLS_DIR}`
    );

    console.log('');

    try {

        if (IS_WINDOWS) {

            await installWindowsTools();

        } else if (IS_LINUX) {

            await installLinuxTools();

        } else {

            throw new Error(
                `OS chưa được hỗ trợ: ${process.platform}`
            );
        }

        console.log('');
        log(
            '✅ POSTINSTALL HOÀN TẤT.'
        );
        console.log('');

    } catch (error) {

        console.error('');
        console.error(
            '❌ INSTALL TOOLS ERROR'
        );

        console.error(
            error.stack ||
            error.message
        );

        process.exit(1);
    }
}

main();