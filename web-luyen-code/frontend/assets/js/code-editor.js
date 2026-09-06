// frontend/assets/js/code-editor.js
// Code editor với interactive terminal, chọn AI model
import { codeAPI } from '/assets/js/api-client.js';

const API_BASE = '/api';
const io = window.io;

// AI Config
const AI_CONFIG = {
    gemini: {
        label: 'Gemini',
        models: ['gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-3-flash', 'gemini-3.1-flash-lite', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2-flash', 'gemini-2-flash-lite', 'gemini-3.1-pro', 'gemini-2.5-pro']
    },
    openai: {
        label: 'OpenAI',
        models: ['gpt-5.5', 'gpt-5.5-pro', 'gpt-5.4', 'gpt-5.4-mini', 'gpt-5.4-nano', 'o3', 'o3-pro', 'o4-mini', 'gpt-5.3-codex', 'gpt-4o', 'gpt-4o-mini']
    },
    deepseek: {
        label: 'DeepSeek',
        models: ['deepseek-chat', 'deepseek-v3.2', 'deepseek-v3.1', 'deepseek-v3', 'deepseek-reasoner', 'deepseek-r1', 'deepseek-v3.2-thinking', 'deepseek-coder-2.0', 'deepseek-vl2']
    },
    claude: {
        label: 'Claude',
        models: ['claude-fable-5', 'claude-mythos-5', 'claude-3-opus', 'claude-opus-4.5', 'claude-opus-4.6', 'claude-opus-4.7', 'claude-opus-4.8', 'claude-3-5-sonnet', 'claude-sonnet-4.5', 'claude-sonnet-4.6', 'claude-sonnet-5', 'claude-3-haiku', 'claude-3-5-haiku', 'claude-haiku-4.5']
    }
};

const LANG_CONFIG = {
    c: {
        monacoLanguage: 'c',
        defaultCode: '#include <stdio.h>\n\nint main() {\n    printf("Hello World\\n");\n    return 0;\n}'
    },
    cpp: {
        monacoLanguage: 'cpp',
        defaultCode: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello World" << endl;\n    return 0;\n}'
    },
    java: {
        monacoLanguage: 'java',
        defaultCode: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello World");\n    }\n}'
    },
    python: {
        monacoLanguage: 'python',
        defaultCode: 'print("Hello World")'
    }
};

let editor = null;
let currentProblemId = new URLSearchParams(window.location.search).get('problemId') || 'default';

// Interactive state
let interactiveSessionId = null;
let interactiveRunning = false;
let socket = null;

// File-edit modal state
let editingFileName = null;

// DOM refs
const terminalOutput = document.getElementById('terminal-output');
const terminalInput = document.getElementById('terminal-input');

// ============================================================
// Init
// ============================================================
require(['vs/editor/editor.main'], function () {
    const langSelect = document.getElementById('language-select');
    const initialLang = langSelect.value || 'cpp';
    const config = LANG_CONFIG[initialLang];

    editor = monaco.editor.create(document.getElementById('monaco-container'), {
        value: loadLastCode(initialLang) || config.defaultCode,
        language: config.monacoLanguage,
        theme: 'vs-dark',
        automaticLayout: true,
        fontSize: 14,
        minimap: { enabled: false }
    });

    editor.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
        runCode
    );

    initUI();
    loadProblem();
    renderHistory();
    renderFileList();
    populateModels();
    checkAIStatus();
});

// ============================================================
// UI
// ============================================================
function initUI() {
    const langSelect = document.getElementById('language-select');

    langSelect.addEventListener('change', () => {
        const lang = langSelect.value;
        const config = LANG_CONFIG[lang];

        if (!config) return;

        monaco.editor.setModelLanguage(
            editor.getModel(),
            config.monacoLanguage
        );

        editor.setValue(
            loadLastCode(lang) || config.defaultCode
        );

        setStatus('');
    });

    document
        .getElementById('ai-provider-select')
        .addEventListener('change', populateModels);

    document.getElementById('run-btn').addEventListener('click', runCode);
    document.getElementById('run-btn-right').addEventListener('click', runCode);

    document
        .getElementById('submit-btn')
        .addEventListener('click', submitCode);

    document
        .getElementById('submit-btn-right')
        .addEventListener('click', submitCode);

    document
        .getElementById('save-version-btn')
        .addEventListener('click', saveVersion);

    document
        .getElementById('history-btn')
        .addEventListener('click', toggleHistory);

    document
        .getElementById('run-interactive-btn')
        .addEventListener('click', startInteractive);

    document
        .getElementById('kill-interactive-btn')
        .addEventListener('click', killInteractive);

    document
        .getElementById('reset-ai-btn')
        .addEventListener('click', resetAI);

    document
        .getElementById('add-input-btn')
        .addEventListener('click', () => addWorkspaceFile('input'));

    document
        .getElementById('add-output-btn')
        .addEventListener('click', () => addWorkspaceFile('output'));

    document
        .getElementById('file-edit-cancel-btn')
        .addEventListener('click', closeFileEditModal);

    document
        .getElementById('file-edit-save-btn')
        .addEventListener('click', saveFileEditModal);

    // Terminal input
    terminalInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && interactiveRunning) {
            const input = terminalInput.value;

            if (input !== '') {
                appendTerminal(input + '\n');

                if (socket && socket.connected) {
                    socket.emit('interactive:input', {
                        input: input.trim()
                    });
                }

                terminalInput.value = '';
            }
        }
    });

    editor.onDidChangeModelContent(() => {
        saveLastCode(
            document.getElementById('language-select').value,
            editor.getValue()
        );
    });

    document
        .getElementById('logout-btn')
        .addEventListener('click', () => {
            localStorage.clear();
            window.location.href = '/pages/login.html';
        });

    document
        .getElementById('back-link')
        .addEventListener('click', (e) => {
            e.preventDefault();
            window.history.back();
        });
}

// ============================================================
// AI
// ============================================================
function populateModels() {
    const provider =
        document.getElementById('ai-provider-select').value;

    const modelSelect =
        document.getElementById('ai-model-select');

    const models = AI_CONFIG[provider]?.models || [];

    modelSelect.innerHTML = models
        .map(model => `<option value="${model}">${model}</option>`)
        .join('');
}

function getSelectedAI() {
    return {
        provider: document.getElementById('ai-provider-select').value,
        model: document.getElementById('ai-model-select').value
    };
}

async function checkAIStatus() {
    try {
        const res = await fetch('/api/ai/status', {
            headers: {
                'Authorization':
                    `Bearer ${localStorage.getItem('token')}`
            }
        });

        const data = await res.json();

        const dot =
            document.getElementById('ai-status-dot');

        const text =
            document.getElementById('ai-status-text');

        if (data.available) {
            dot.className = 'dot green';
            text.textContent = 'AI sẵn sàng';
        } else {
            dot.className = 'dot red';
            text.textContent = 'AI không khả dụng';
        }
    } catch (e) {
        document
            .getElementById('ai-status-dot')
            .className = 'dot red';

        document
            .getElementById('ai-status-text')
            .textContent = 'Lỗi kết nối';
    }
}

// ============================================================
// RESET AI
// ============================================================
async function resetAI() {
    const resetBtn =
        document.getElementById('reset-ai-btn');

    const providerSelect =
        document.getElementById('ai-provider-select');

    const dot =
        document.getElementById('ai-status-dot');

    const text =
        document.getElementById('ai-status-text');

    resetBtn.disabled = true;

    dot.className = 'dot yellow';
    text.textContent = 'Đang reset...';

    providerSelect.value = 'gemini';

    populateModels();

    await checkAIStatus();

    resetBtn.disabled = false;
}

// ============================================================
// API
// ============================================================
async function apiRequest(
    endpoint,
    method = 'POST',
    data = null
) {
    const token = localStorage.getItem('token');

    if (!token) {
        window.location.href = '/pages/login.html';
        throw new Error('Chưa đăng nhập');
    }

    const opts = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    };

    if (data) {
        opts.body = JSON.stringify(data);
    }

    const res = await fetch(
        `${API_BASE}${endpoint}`,
        opts
    );

    if (!res.ok) {
        const err =
            await res.json().catch(() => ({}));

        throw new Error(
            err.error || `HTTP ${res.status}`
        );
    }

    return res.json();
}

function callRun(code, language, input) {
    return apiRequest(
        '/code/run',
        'POST',
        {
            problemId: currentProblemId,
            code,
            language,
            input: input || ''
        }
    );
}

function callSubmit(
    code,
    language,
    input,
    aiProvider,
    aiModel
) {
    return apiRequest(
        '/submissions',
        'POST',
        {
            problemId: currentProblemId,
            code,
            language,
            input: input || '',
            aiProvider,
            aiModel
        }
    );
}

function callStartInteractive(code, language) {
    return apiRequest(
        '/code/interactive/start',
        'POST',
        {
            problemId: currentProblemId,
            code,
            language
        }
    );
}

// ============================================================
// Run (batch)
// ============================================================
async function runCode() {
    if (!editor) return;

    const lang =
        document.getElementById('language-select').value;

    const code = editor.getValue();

    const input =
        document.getElementById('input-textarea').value;

    const output =
        document.getElementById('output-area');

    setStatus('⏳ Đang chạy...');
    setButtonsDisabled(true);

    output.textContent = 'Đang chạy...';

    try {
        const result =
            await callRun(code, lang, input);

        output.textContent =
            formatRunResult(result);

        if (
            result.savedOutputFiles &&
            result.savedOutputFiles.length
        ) {
            renderFileList();
        }
    } catch (err) {
        output.textContent =
            '❌ Lỗi: ' + err.message;
    } finally {
        setStatus('');
        setButtonsDisabled(false);
    }
}

// ============================================================
// Submit
// ============================================================
async function submitCode() {
    if (!editor) return;

    const lang =
        document.getElementById('language-select').value;

    const code = editor.getValue();

    const input =
        document.getElementById('input-textarea').value;

    const {
        provider,
        model
    } = getSelectedAI();

    const output =
        document.getElementById('output-area');

    setStatus('⏳ Đang nộp bài...');
    setButtonsDisabled(true);

    output.textContent = 'Đang xử lý...';

    try {
        const result =
            await callSubmit(
                code,
                lang,
                input,
                provider,
                model
            );

        output.textContent =
            formatSubmitResult(result);

        document
            .getElementById('ai-status-dot')
            .className = 'dot green';

        document
            .getElementById('ai-status-text')
            .textContent = 'AI thành công';

    } catch (err) {
        output.textContent =
            '❌ Lỗi: ' + err.message;

        document
            .getElementById('ai-status-dot')
            .className = 'dot red';

        document
            .getElementById('ai-status-text')
            .textContent =
            'AI lỗi: ' + err.message;

    } finally {
        setStatus('');
        setButtonsDisabled(false);
    }
}

// ============================================================
// Interactive
// ============================================================
function appendTerminal(text) {
    terminalOutput.textContent += text;
    terminalOutput.scrollTop =
        terminalOutput.scrollHeight;
}

async function startInteractive() {
    if (!editor) return;

    if (interactiveRunning) {
        alert('Phiên tương tác đang chạy.');
        return;
    }

    const lang =
        document.getElementById('language-select').value;

    const code = editor.getValue();

    setStatus('⏳ Đang khởi tạo...');
    setButtonsDisabled(true);

    terminalOutput.textContent =
        'Đang khởi tạo...\n';

    try {
        const data =
            await callStartInteractive(code, lang);

        interactiveSessionId =
            data.sessionId;

        interactiveRunning = true;

        document
            .getElementById('kill-interactive-btn')
            .style.display = 'inline-block';

        if (socket) {
            socket.disconnect();
            socket = null;
        }

        socket = io('/', {
            path: '/socket.io',
            transports: ['websocket']
        });

        socket.on('connect', () => {
            console.log('✅ WebSocket connected');

            socket.emit('interactive:join', {
                sessionId: interactiveSessionId
            });
        });

        socket.on('interactive:ready', () => {
            terminalOutput.textContent +=
                '✅ Phiên tương tác đã sẵn sàng.\n';

            terminalOutput.textContent +=
                'Nhập dữ liệu và bấm Enter.\n';

            terminalInput.disabled = false;
            terminalInput.focus();

            setStatus('🔄 Đang chạy tương tác...');
        });

        socket.on('interactive:output', (data) => {
            appendTerminal(data);
        });

        socket.on('interactive:error', (data) => {
            appendTerminal('❌ ' + data + '\n');
        });

        socket.on('interactive:exit', (code) => {
            appendTerminal(
                `\n--- Process exited with code ${code} ---\n`
            );

            interactiveRunning = false;

            document
                .getElementById('kill-interactive-btn')
                .style.display = 'none';

            terminalInput.disabled = true;

            setStatus('');
            setButtonsDisabled(false);

            if (socket) {
                socket.disconnect();
                socket = null;
            }
        });

        socket.on('disconnect', () => {
            if (interactiveRunning) {
                appendTerminal(
                    '\n⚠️ Mất kết nối với server\n'
                );

                interactiveRunning = false;

                document
                    .getElementById('kill-interactive-btn')
                    .style.display = 'none';

                terminalInput.disabled = true;

                setStatus('');
                setButtonsDisabled(false);

                socket = null;
            }
        });

        setTimeout(() => {
            if (
                interactiveRunning &&
                socket &&
                !socket.connected
            ) {
                appendTerminal(
                    '\n⚠️ Không thể kết nối WebSocket. Vui lòng thử lại.\n'
                );

                interactiveRunning = false;

                document
                    .getElementById('kill-interactive-btn')
                    .style.display = 'none';

                terminalInput.disabled = true;

                setStatus('');
                setButtonsDisabled(false);

                if (socket) {
                    socket.disconnect();
                    socket = null;
                }
            }
        }, 5000);

    } catch (err) {
        terminalOutput.textContent +=
            '❌ Lỗi: ' + err.message + '\n';

        setStatus('');
        setButtonsDisabled(false);

        interactiveRunning = false;
    }
}

function killInteractive() {
    if (socket && socket.connected) {
        socket.emit('interactive:kill');
    }

    interactiveRunning = false;
    interactiveSessionId = null;

    document
        .getElementById('kill-interactive-btn')
        .style.display = 'none';

    terminalInput.disabled = true;

    setStatus('');
    setButtonsDisabled(false);

    if (socket) {
        socket.disconnect();
        socket = null;
    }

    appendTerminal(
        '\n⏹ Phiên tương tác đã bị dừng.\n'
    );
}

// ============================================================
// File Manager
// ============================================================
async function addWorkspaceFile(kind) {
    const defaultName =
        kind === 'input'
            ? 'input.txt'
            : 'output.txt';

    const fileName = (
        prompt(
            `Tên file ${kind === 'input' ? 'input' : 'output'} (VD: ${defaultName}):`,
            defaultName
        ) || ''
    ).trim();

    if (!fileName) return;

    const content =
        prompt(
            'Nội dung file (có thể để trống, sửa sau):',
            ''
        ) || '';

    try {
        await codeAPI.createFile({
            problemId: currentProblemId,
            fileName,
            content
        });

        await renderFileList();

        setStatus(
            `✅ Đã tạo file "${fileName}"`
        );

        setTimeout(() => setStatus(''), 2000);

    } catch (err) {
        alert(
            'Lỗi tạo file: ' + err.message
        );
    }
}

async function renderFileList() {
    const container =
        document.getElementById('file-list');

    if (!container) return;

    try {
        const files =
            await codeAPI.files(currentProblemId);

        if (!files || files.length === 0) {
            container.innerHTML =
                '<p style="color:var(--text-secondary);font-size:0.9rem;">Chưa có file nào.</p>';

            return;
        }

        container.innerHTML = files.map(f => `
            <div class="file-item">
                <span
                    class="file-item-name"
                    data-file-name="${f.name}"
                    style="cursor:pointer;"
                    title="Bấm để nạp nội dung vào ô Input (batch)"
                >
                    📄 ${f.name}
                </span>

                <span class="file-item-actions">
                    <button
                        class="file-edit-btn"
                        data-file-name="${f.name}"
                        title="Sửa nội dung file bằng tay"
                    >
                        ✏️
                    </button>

                    <button
                        class="file-rename-btn"
                        data-file-name="${f.name}"
                        title="Đổi tên file"
                    >
                        🔤
                    </button>

                    <button
                        class="file-delete-btn"
                        data-file-name="${f.name}"
                        title="Xóa file"
                    >
                        🗑️
                    </button>
                </span>
            </div>
        `).join('');

        container
            .querySelectorAll('.file-item-name')
            .forEach(el => {
                el.addEventListener('click', () => {
                    loadFileIntoInput(
                        el.dataset.fileName
                    );
                });
            });

        container
            .querySelectorAll('.file-edit-btn')
            .forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();

                    editWorkspaceFile(
                        btn.dataset.fileName
                    );
                });
            });

        container
            .querySelectorAll('.file-rename-btn')
            .forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();

                    renameWorkspaceFile(
                        btn.dataset.fileName
                    );
                });
            });

        container
            .querySelectorAll('.file-delete-btn')
            .forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();

                    deleteWorkspaceFile(
                        btn.dataset.fileName
                    );
                });
            });

    } catch (err) {
        container.innerHTML = `
            <p style="color:var(--color-danger);font-size:0.9rem;">
                Lỗi tải danh sách file: ${err.message}
            </p>
        `;
    }
}

async function loadFileIntoInput(fileName) {
    try {
        const data =
            await codeAPI.getFileContent(
                currentProblemId,
                fileName
            );

        document.getElementById(
            'input-textarea'
        ).value = data.content || '';

        setStatus(
            `✅ Đã nạp "${fileName}" vào ô Input`
        );

        setTimeout(
            () => setStatus(''),
            2000
        );

    } catch (err) {
        alert(
            'Lỗi tải nội dung file: ' +
            err.message
        );
    }
}

// ============================================================
// Edit file
// ============================================================
async function editWorkspaceFile(fileName) {
    try {
        const data =
            await codeAPI.getFileContent(
                currentProblemId,
                fileName
            );

        openFileEditModal(
            fileName,
            data.content || ''
        );

    } catch (err) {
        alert(
            'Lỗi tải nội dung file: ' +
            err.message
        );
    }
}

function openFileEditModal(
    fileName,
    content
) {
    editingFileName = fileName;

    document
        .getElementById(
            'file-edit-modal-title'
        )
        .textContent =
        `Sửa file: ${fileName}`;

    document
        .getElementById(
            'file-edit-textarea'
        )
        .value = content;

    document
        .getElementById(
            'file-edit-modal'
        )
        .style.display = 'flex';

    document
        .getElementById(
            'file-edit-textarea'
        )
        .focus();
}

function closeFileEditModal() {
    editingFileName = null;

    document
        .getElementById(
            'file-edit-modal'
        )
        .style.display = 'none';

    document
        .getElementById(
            'file-edit-textarea'
        )
        .value = '';
}

async function saveFileEditModal() {
    if (!editingFileName) return;

    const saveBtn =
        document.getElementById(
            'file-edit-save-btn'
        );

    const content =
        document.getElementById(
            'file-edit-textarea'
        ).value;

    saveBtn.disabled = true;

    try {
        await codeAPI.updateFileContent({
            problemId: currentProblemId,
            fileName: editingFileName,
            content
        });

        setStatus(
            `✅ Đã lưu nội dung "${editingFileName}"`
        );

        setTimeout(
            () => setStatus(''),
            2000
        );

        closeFileEditModal();

    } catch (err) {
        alert(
            'Lỗi lưu file: ' +
            err.message
        );

    } finally {
        saveBtn.disabled = false;
    }
}

// ============================================================
// Rename file
// ============================================================
async function renameWorkspaceFile(
    oldFileName
) {
    const newFileName = (
        prompt(
            `Đổi tên "${oldFileName}" thành:`,
            oldFileName
        ) || ''
    ).trim();

    if (
        !newFileName ||
        newFileName === oldFileName
    ) {
        return;
    }

    try {
        await codeAPI.renameFile({
            problemId: currentProblemId,
            oldFileName,
            newFileName
        });

        await renderFileList();

        setStatus(
            `✅ Đã đổi tên "${oldFileName}" thành "${newFileName}"`
        );

        setTimeout(
            () => setStatus(''),
            2000
        );

    } catch (err) {
        alert(
            'Lỗi đổi tên file: ' +
            err.message
        );
    }
}

// ============================================================
// Delete file
// ============================================================
async function deleteWorkspaceFile(fileName) {
    if (!fileName) return;

    const confirmed = confirm(
        `Bạn có chắc muốn xóa file "${fileName}"?\n\n` +
        'File sẽ bị xóa khỏi workspace của bài này.'
    );

    if (!confirmed) return;

    try {
        // Ưu tiên dùng codeAPI.deleteFile nếu api-client.js đã hỗ trợ.
        if (typeof codeAPI.deleteFile === 'function') {
            await codeAPI.deleteFile({
                problemId: currentProblemId,
                fileName
            });

        } else {
            // Fallback:
            // gọi trực tiếp API DELETE /api/code/files
            const token =
                localStorage.getItem('token');

            const res = await fetch(
                `${API_BASE}/code/files`,
                {
                    method: 'DELETE',
                    headers: {
                        'Content-Type':
                            'application/json',
                        'Authorization':
                            `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        problemId:
                            currentProblemId,
                        fileName
                    })
                }
            );

            if (!res.ok) {
                const err =
                    await res.json()
                        .catch(() => ({}));

                throw new Error(
                    err.error ||
                    `HTTP ${res.status}`
                );
            }
        }

        await renderFileList();

        setStatus(
            `🗑️ Đã xóa file "${fileName}"`
        );

        setTimeout(
            () => setStatus(''),
            2000
        );

    } catch (err) {
        alert(
            'Lỗi xóa file: ' +
            err.message
        );
    }
}

// ============================================================
// Format
// ============================================================
function formatRunResult(result) {
    let text = '';

    if (
        result.loadedInputFiles &&
        result.loadedInputFiles.length
    ) {
        text +=
            `📥 Đã tự động lấy input từ GitHub (freopen): ` +
            `${result.loadedInputFiles.join(', ')}\n`;
    }

    if (result.output) {
        text +=
            '--- Output ---\n' +
            result.output +
            '\n';
    }

    if (result.error) {
        text +=
            '--- Error ---\n' +
            result.error +
            '\n';
    }

    if (
        result.savedOutputFiles &&
        result.savedOutputFiles.length
    ) {
        text +=
            `\n💾 Đã tự động lưu output lên GitHub (freopen): ` +
            `${result.savedOutputFiles.join(', ')}\n`;
    }

    if (
        result.executionTime !== undefined
    ) {
        text +=
            `\n⏱️ ${result.executionTime}ms`;
    }

    return text || '(No output)';
}

function formatSubmitResult(result) {
    let text = '';

    if (result.score !== undefined) {
        text +=
            `⭐ Điểm: ${result.score}/10\n\n`;
    }

    if (result.output) {
        text +=
            '--- Output ---\n' +
            result.output +
            '\n';
    }

    if (result.error) {
        text +=
            '--- Error ---\n' +
            result.error +
            '\n';
    }

    if (result.review) {
        text +=
            '\n--- Nhận xét ---\n';

        if (result.review.overallComment) {
            text +=
                result.review.overallComment +
                '\n';
        }

        if (
            result.review.correctness !== undefined
        ) {
            text +=
                `Correctness: ${result.review.correctness}/10\n`;
        }

        if (
            result.review.quality !== undefined
        ) {
            text +=
                `Code Quality: ${result.review.quality}/10\n`;
        }

        if (
            result.review.performance !== undefined
        ) {
            text +=
                `Performance: ${result.review.performance}/10\n`;
        }

        if (
            result.review.strengths?.length
        ) {
            text +=
                '\n✅ Ưu điểm:\n' +
                result.review.strengths
                    .map(s => '  • ' + s)
                    .join('\n');
        }

        if (
            result.review.weaknesses?.length
        ) {
            text +=
                '\n\n⚠️ Nhược điểm:\n' +
                result.review.weaknesses
                    .map(w => '  • ' + w)
                    .join('\n');
        }

        if (
            result.review.improvements?.length
        ) {
            text +=
                '\n\n💡 Gợi ý cải thiện:\n' +
                result.review.improvements
                    .map(i => '  • ' + i)
                    .join('\n');
        }
    }

    return text || '(No output)';
}

// ============================================================
// Helpers
// ============================================================
function setStatus(text) {
    const el =
        document.getElementById('run-status');

    if (el) {
        el.textContent = text;
    }
}

function setButtonsDisabled(disabled) {
    [
        'run-btn',
        'run-btn-right',
        'submit-btn',
        'submit-btn-right'
    ].forEach(id => {
        const btn =
            document.getElementById(id);

        if (btn) {
            btn.disabled = disabled;
        }
    });
}

// ============================================================
// LocalStorage
// ============================================================
function getStorageKey(lang) {
    return (
        `code-editor:last-code:` +
        `${currentProblemId}:${lang}`
    );
}

function saveLastCode(lang, code) {
    try {
        localStorage.setItem(
            getStorageKey(lang),
            code
        );
    } catch (e) {}
}

function loadLastCode(lang) {
    try {
        return localStorage.getItem(
            getStorageKey(lang)
        );
    } catch (e) {
        return null;
    }
}

// ============================================================
// History
// ============================================================
function getHistoryKey() {
    return (
        `code-editor:history:${currentProblemId}`
    );
}

function getHistory() {
    try {
        const raw =
            localStorage.getItem(
                getHistoryKey()
            );

        return raw
            ? JSON.parse(raw)
            : [];
    } catch (e) {
        return [];
    }
}

function saveVersion() {
    if (!editor) return;

    const lang =
        document.getElementById(
            'language-select'
        ).value;

    const history = getHistory();

    history.unshift({
        timestamp:
            new Date().toISOString(),
        language: lang,
        code: editor.getValue()
    });

    try {
        localStorage.setItem(
            getHistoryKey(),
            JSON.stringify(
                history.slice(0, 20)
            )
        );
    } catch (e) {}

    renderHistory();

    setStatus(
        '✅ Đã lưu version lúc ' +
        new Date().toLocaleTimeString()
    );

    setTimeout(
        () => setStatus(''),
        2000
    );
}

function toggleHistory() {
    const panel =
        document.getElementById(
            'history-panel'
        );

    if (!panel) return;

    panel.style.display =
        panel.style.display === 'none'
            ? 'block'
            : 'none';

    if (
        panel.style.display === 'block'
    ) {
        renderHistory();
    }
}

function renderHistory() {
    const list =
        document.getElementById(
            'history-list'
        );

    if (!list) return;

    const history = getHistory();

    if (!history.length) {
        list.innerHTML =
            '<p style="color:var(--text-secondary);font-size:0.9rem;">Chưa có version nào.</p>';

        return;
    }

    list.innerHTML =
        history.map((item, index) => {
            const time =
                new Date(
                    item.timestamp
                ).toLocaleString();

            return `
                <div class="file-item">
                    <span>
                        ${time} — ${item.language}
                    </span>

                    <button
                        data-index="${index}"
                        class="restore-version-btn"
                    >
                        Khôi phục
                    </button>
                </div>
            `;
        }).join('');

    list
        .querySelectorAll(
            '.restore-version-btn'
        )
        .forEach(btn => {
            btn.addEventListener(
                'click',
                () => {
                    const idx =
                        Number(
                            btn.dataset.index
                        );

                    const item =
                        getHistory()[idx];

                    if (
                        !item ||
                        !editor
                    ) {
                        return;
                    }

                    const langSelect =
                        document.getElementById(
                            'language-select'
                        );

                    langSelect.value =
                        item.language;

                    const config =
                        LANG_CONFIG[
                            item.language
                        ];

                    if (config) {
                        monaco.editor
                            .setModelLanguage(
                                editor.getModel(),
                                config.monacoLanguage
                            );
                    }

                    editor.setValue(
                        item.code
                    );

                    setStatus(
                        '✅ Đã khôi phục version lúc ' +
                        new Date(
                            item.timestamp
                        ).toLocaleTimeString()
                    );

                    setTimeout(
                        () => setStatus(''),
                        2000
                    );
                }
            );
        });
}

// ============================================================
// Problem Statement
// ============================================================
async function loadProblem() {
    if (currentProblemId === 'default') {
        document.getElementById(
            'statement-content'
        ).textContent =
            'Viết chương trình in ra "Hello World".';

        document.getElementById(
            'sample-input'
        ).textContent = '';

        document.getElementById(
            'sample-output'
        ).textContent =
            'Hello World';

        document.getElementById(
            'problem-title'
        ).textContent =
            'Bài tập mẫu';

        return;
    }

    try {
        const res = await fetch(
            `${API_BASE}/problems/${currentProblemId}`,
            {
                headers: {
                    'Authorization':
                        `Bearer ${localStorage.getItem('token') || ''}`
                }
            }
        );

        if (!res.ok) {
            throw new Error(
                'HTTP ' + res.status
            );
        }

        const data =
            await res.json();

        document.getElementById(
            'statement-content'
        ).textContent =
            data.statement ||
            'Không có đề bài.';

        document.getElementById(
            'sample-input'
        ).textContent =
            data.exampleInput || '';

        document.getElementById(
            'sample-output'
        ).textContent =
            data.exampleOutput || '';

        document.getElementById(
            'problem-title'
        ).textContent =
            data.name ||
            'Bài tập';

    } catch (err) {
        console.error(
            'Lỗi tải đề bài:',
            err
        );

        document.getElementById(
            'statement-content'
        ).textContent =
            'Không thể tải đề bài.';
    }
}