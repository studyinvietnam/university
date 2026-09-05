
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const FILE_ID = '1eSFC7HbonqdCG7-wWaYNmGN5dgvcLpa0';

const DOWNLOAD_URL =
    `https://drive.usercontent.google.com/download?id=1eSFC7HbonqdCG7-wWaYNmGN5dgvcLpa0&export=download&authuser=0`;

const target = path.join(
    __dirname,
    '..',
    'tools',
    'jdk',
    'lib',
    'modules'
);

/**
 * Request HTTP/HTTPS
 */
function request(url, options = {}) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https://') ? https : http;

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

/**
 * Lấy nội dung HTML
 */
function getText(url) {
    return new Promise((resolve, reject) => {
        request(url)
            .then((response) => {
                let data = '';

                response.setEncoding('utf8');

                response.on('data', (chunk) => {
                    data += chunk;
                });

                response.on('end', () => {
                    resolve({
                        statusCode: response.statusCode,
                        headers: response.headers,
                        body: data
                    });
                });

                response.on('error', reject);
            })
            .catch(reject);
    });
}

/**
 * Tìm URL download thật trong HTML Google Drive
 */
function findDownloadUrl(html) {
    // Google Drive thường chứa form/action hoặc URL xác nhận
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

    // Một số trường hợp Google Drive dùng confirm token
    const tokenPatterns = [
        /confirm=([0-9A-Za-z_-]+)/i,
        /name="confirm"\s+value="([^"]+)"/i
    ];

    for (const pattern of tokenPatterns) {
        const match = html.match(pattern);

        if (match && match[1]) {
            return (
                `https://drive.usercontent.google.com/download` +
                `?id=${FILE_ID}` +
                `&export=download` +
                `&authuser=0` +
                `&confirm=${match[1]}`
            );
        }
    }

    return null;
}

/**
 * Download file
 */
async function downloadFile(url, destination) {
    console.log('🌐 Kết nối Google Drive...');

    let response = await request(url);

    // Xử lý redirect
    if (
        response.statusCode >= 300 &&
        response.statusCode < 400 &&
        response.headers.location
    ) {
        const redirectUrl = new URL(
            response.headers.location,
            url
        ).toString();

        console.log('🔄 Google Drive redirect...');

        return downloadFile(
            redirectUrl,
            destination
        );
    }

    if (response.statusCode !== 200) {
        throw new Error(
            `HTTP ${response.statusCode}`
        );
    }

    const contentType =
        response.headers['content-type'] || '';

    /*
     * Nếu Google trả HTML thì khả năng cao
     * đây là trang xác nhận "Download anyway".
     */
    if (contentType.includes('text/html')) {
        console.log(
            '⚠️ Google Drive yêu cầu xác nhận download...'
        );

        let html = '';

        response.setEncoding('utf8');

        for await (const chunk of response) {
            html += chunk;
        }

        const confirmedUrl =
            findDownloadUrl(html);

        if (!confirmedUrl) {
            throw new Error(
                'Không tìm thấy link download confirmation của Google Drive.'
            );
        }

        console.log(
            '✅ Đã tìm thấy link download xác nhận.'
        );

        return downloadFile(
            confirmedUrl,
            destination
        );
    }

    const totalSize =
        parseInt(
            response.headers['content-length'],
            10
        ) || 0;

    let downloaded = 0;
    let lastPercent = -1;

    console.log('⬇️ Đang tải JDK modules...');

    const file = fs.createWriteStream(
        destination
    );

    return new Promise((resolve, reject) => {
        response.on('data', (chunk) => {
            downloaded += chunk.length;

            if (totalSize > 0) {
                const percent = Math.floor(
                    (downloaded / totalSize) * 100
                );

                if (
                    percent !== lastPercent
                ) {
                    lastPercent = percent;

                    const downloadedMB =
                        (
                            downloaded /
                            1024 /
                            1024
                        ).toFixed(2);

                    const totalMB =
                        (
                            totalSize /
                            1024 /
                            1024
                        ).toFixed(2);

                    process.stdout.write(
                        `\r📥 ${percent}% | ${downloadedMB} MB / ${totalMB} MB`
                    );
                }
            } else {
                const downloadedMB =
                    (
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

            console.log('\n✅ Download hoàn tất.');

            resolve();
        });

        file.on('error', (error) => {
            file.close();

            fs.unlink(
                destination,
                () => {}
            );

            reject(error);
        });

        response.on('error', (error) => {
            file.close();

            fs.unlink(
                destination,
                () => {}
            );

            reject(error);
        });
    });
}

/**
 * Kiểm tra file có thực sự là binary hay không
 */
function validateDownloadedFile(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error(
            'File không tồn tại sau khi download.'
        );
    }

    const stats =
        fs.statSync(filePath);

    if (stats.size < 1024 * 1024) {
        throw new Error(
            `File tải về quá nhỏ (${stats.size} bytes). Có thể Google Drive trả về HTML thay vì file modules.`
        );
    }

    /*
     * Đọc một phần đầu file để phát hiện HTML.
     */
    const buffer =
        Buffer.alloc(100);

    const fd =
        fs.openSync(
            filePath,
            'r'
        );

    fs.readSync(
        fd,
        buffer,
        0,
        100,
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
            'File tải về là HTML, không phải JDK modules.'
        );
    }

    return true;
}

/**
 * Main
 */
async function main() {
    console.log('');
    console.log(
        '========================================'
    );
    console.log(
        '   JDK MODULES INSTALLER'
    );
    console.log(
        '========================================'
    );
    console.log('');

    // Nếu đã tồn tại thì không tải lại
    if (fs.existsSync(target)) {
        const stats =
            fs.statSync(target);

        console.log(
            '✅ JDK modules đã tồn tại.'
        );

        console.log(
            `📦 Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`
        );

        console.log(
            `📁 ${target}`
        );

        return;
    }

    const targetDir =
        path.dirname(target);

    // Tạo thư mục
    fs.mkdirSync(
        targetDir,
        {
            recursive: true
        }
    );

    console.log(
        `📦 File ID: ${FILE_ID}`
    );

    console.log(
        `📁 Destination: ${target}`
    );

    console.log('');

    try {
        await downloadFile(
            DOWNLOAD_URL,
            target
        );

        validateDownloadedFile(
            target
        );

        const stats =
            fs.statSync(target);

        console.log('');
        console.log(
            '========================================'
        );
        console.log(
            '🎉 JDK MODULES ĐÃ ĐƯỢC CÀI ĐẶT!'
        );
        console.log(
            '========================================'
        );

        console.log(
            `📦 Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`
        );

        console.log(
            `📁 ${target}`
        );

        console.log('');
    } catch (error) {
        console.error('');
        console.error(
            '❌ Không thể tải JDK modules.'
        );

        console.error(
            `💥 ${error.message}`
        );

        // Xóa file lỗi
        if (fs.existsSync(target)) {
            fs.unlinkSync(target);
        }

        process.exit(1);
    }
}

main();

