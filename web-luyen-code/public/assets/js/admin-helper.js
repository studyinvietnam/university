// frontend/assets/js/admin-helper.js
import { adminAPI, subjectAPI, chapterAPI } from '/assets/js/api-client.js';

// ============================================================
// SUBJECT
// ============================================================

let editingSubjectId = null;

export async function loadSubjectList() {
    try {
        const data = await adminAPI.getAllSubjects();
        const container = document.getElementById('subject-list');
        if (!data || data.length === 0) {
            container.innerHTML = '<p style="color:var(--text-secondary);">Chưa có môn học nào.</p>';
            return;
        }
        container.innerHTML = data.map(sub => `
            <div class="list-item">
                <div class="info">
                    <strong>${sub.name}</strong>
                    <span style="color:var(--text-secondary);font-size:0.9rem;margin-left:8px;">${sub.code}</span>
                    <span class="status-badge status-${sub.status || 'draft'}">
                        ${sub.status === 'published' ? '✅ Published' : sub.status === 'archived' ? '📦 Archived' : '📝 Draft'}
                    </span>
                </div>
                <div class="actions">
                    <button class="btn btn-sm btn-outline" onclick="window.editSubject('${sub._id}')">✏️</button>
                    <button class="btn btn-sm btn-danger" onclick="window.deleteSubject('${sub._id}')">🗑️</button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error('Lỗi load môn:', err);
        document.getElementById('subject-list').innerHTML = `<p style="color:var(--color-danger);">Lỗi: ${err.message}</p>`;
    }
}

export async function deleteSubject(id) {
    if (!confirm('Xóa môn này? Hành động không thể hoàn tác!')) return;
    try {
        await adminAPI.deleteSubject(id);
        alert('Xóa thành công');
        await loadSubjectList();
        await loadSubjectsForSelect();
    } catch (err) {
        alert('Lỗi xóa: ' + err.message);
    }
}

export async function editSubject(id) {
    try {
        const subject = await subjectAPI.getOne(id);
        if (!subject) {
            alert('Không tìm thấy môn học');
            return;
        }

        document.getElementById('subject-id').value = subject._id;
        document.getElementById('subject-name').value = subject.name;
        document.getElementById('subject-code').value = subject.code;
        document.getElementById('subject-desc').value = subject.description || '';
        document.getElementById('subject-status').value = subject.status || 'draft';

        const submitBtn = document.querySelector('#subject-form button[type="submit"]');
        submitBtn.textContent = '💾 Cập nhật môn';
        submitBtn.dataset.mode = 'update';

        editingSubjectId = id;
        document.getElementById('cancel-subject-edit').style.display = 'inline-block';
        document.getElementById('subject-form').scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
        alert('Lỗi tải dữ liệu: ' + err.message);
    }
}

export function cancelEditSubject() {
    editingSubjectId = null;
    document.getElementById('subject-id').value = '';
    document.getElementById('subject-name').value = '';
    document.getElementById('subject-code').value = '';
    document.getElementById('subject-desc').value = '';
    document.getElementById('subject-status').value = 'draft';
    const submitBtn = document.querySelector('#subject-form button[type="submit"]');
    submitBtn.textContent = 'Tạo môn';
    submitBtn.dataset.mode = 'create';
    document.getElementById('cancel-subject-edit').style.display = 'none';
}

export async function handleSubjectSubmit(e) {
    e.preventDefault();
    const mode = document.querySelector('#subject-form button[type="submit"]').dataset.mode || 'create';
    const name = document.getElementById('subject-name').value.trim();
    const code = document.getElementById('subject-code').value.trim();
    const description = document.getElementById('subject-desc').value.trim();
    const status = document.getElementById('subject-status').value;

    if (!name || !code) {
        alert('Tên và mã môn không được để trống');
        return;
    }

    const data = { name, code, description, status };

    try {
        if (mode === 'update') {
            const id = document.getElementById('subject-id').value;
            await adminAPI.updateSubject(id, data);
            alert('Cập nhật môn thành công');
        } else {
            await adminAPI.createSubject(data);
            alert('Tạo môn thành công');
        }
        cancelEditSubject();
        await loadSubjectList();
        await loadSubjectsForSelect();
    } catch (err) {
        alert('Lỗi: ' + err.message);
        console.error(err);
    }
}

// ============================================================
// CHAPTER
// ============================================================

export async function loadChapterList() {
    try {
        const data = await adminAPI.getAllChapters();
        const container = document.getElementById('chapter-list');
        if (!data || data.length === 0) {
            container.innerHTML = '<p style="color:var(--text-secondary);">Chưa có chương nào.</p>';
            return;
        }
        container.innerHTML = data.map(ch => `
            <div class="list-item">
                <div class="info">
                    <strong>${ch.name}</strong>
                    <span style="color:var(--text-secondary);font-size:0.9rem;margin-left:8px;">Thứ tự: ${ch.order || 0}</span>
                    <span class="status-badge status-${ch.status || 'draft'}">
                        ${ch.status === 'published' ? '✅ Published' : ch.status === 'archived' ? '📦 Archived' : '📝 Draft'}
                    </span>
                </div>
                <div class="actions">
                    <button class="btn btn-sm btn-outline" onclick="window.editChapter('${ch._id}')">✏️</button>
                    <button class="btn btn-sm btn-danger" onclick="window.deleteChapter('${ch._id}')">🗑️</button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error('Lỗi load chương:', err);
        document.getElementById('chapter-list').innerHTML = `<p style="color:var(--color-danger);">Lỗi: ${err.message}</p>`;
    }
}

export async function deleteChapter(id) {
    if (!confirm('Xóa chương này?')) return;
    try {
        await adminAPI.deleteChapter(id);
        alert('Xóa thành công');
        await loadChapterList();
    } catch (err) {
        alert('Lỗi: ' + err.message);
    }
}

export async function editChapter(id) {
    try {
        const chapter = await adminAPI.getChapterById(id);
        if (!chapter) {
            alert('Không tìm thấy chương');
            return;
        }
        document.getElementById('chapter-id').value = chapter._id;
        document.getElementById('chapter-subject').value = chapter.subjectId;
        document.getElementById('chapter-name').value = chapter.name;
        document.getElementById('chapter-order').value = chapter.order || 1;
        document.getElementById('chapter-status').value = chapter.status || 'draft';

        const submitBtn = document.querySelector('#chapter-form button[type="submit"]');
        submitBtn.textContent = '💾 Cập nhật chương';
        submitBtn.dataset.mode = 'update';
        document.getElementById('cancel-chapter-edit').style.display = 'inline-block';
        document.getElementById('chapter-form').scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
        alert('Lỗi: ' + err.message);
    }
}

export function cancelEditChapter() {
    document.getElementById('chapter-id').value = '';
    document.getElementById('chapter-name').value = '';
    document.getElementById('chapter-order').value = 1;
    document.getElementById('chapter-status').value = 'draft';
    const submitBtn = document.querySelector('#chapter-form button[type="submit"]');
    submitBtn.textContent = 'Tạo chương';
    submitBtn.dataset.mode = 'create';
    document.getElementById('cancel-chapter-edit').style.display = 'none';
}

export async function handleChapterSubmit(e) {
    e.preventDefault();
    const mode = document.querySelector('#chapter-form button[type="submit"]').dataset.mode || 'create';
    const data = {
        subjectId: document.getElementById('chapter-subject').value,
        name: document.getElementById('chapter-name').value.trim(),
        order: parseInt(document.getElementById('chapter-order').value),
        status: document.getElementById('chapter-status').value,
    };
    if (!data.name) {
        alert('Tên chương không được để trống');
        return;
    }
    try {
        if (mode === 'update') {
            const id = document.getElementById('chapter-id').value;
            await adminAPI.updateChapter(id, data);
            alert('Cập nhật chương thành công');
        } else {
            await adminAPI.createChapter(data);
            alert('Tạo chương thành công');
        }
        cancelEditChapter();
        await loadChapterList();
    } catch (err) {
        alert('Lỗi: ' + err.message);
    }
}

// ============================================================
// PROBLEM
// ============================================================

export async function loadProblemList() {
    try {
        const data = await adminAPI.getAllProblems();
        const container = document.getElementById('problem-list');
        if (!data || data.length === 0) {
            container.innerHTML = '<p style="color:var(--text-secondary);">Chưa có bài tập nào.</p>';
            return;
        }
        container.innerHTML = data.map(p => `
            <div class="list-item">
                <div class="info">
                    <strong>${p.name}</strong>
                    <span style="color:var(--text-secondary);font-size:0.9rem;margin-left:8px;">${p.code}</span>
                    <span style="color:var(--text-secondary);font-size:0.9rem;margin-left:8px;">Điểm: ${p.score || 10}</span>
                    <span class="status-badge status-${p.status || 'draft'}">
                        ${p.status === 'published' ? '✅ Published' : p.status === 'archived' ? '📦 Archived' : '📝 Draft'}
                    </span>
                </div>
                <div class="actions">
                    <button class="btn btn-sm btn-outline" onclick="window.editProblem('${p._id}')">✏️</button>
                    <button class="btn btn-sm btn-danger" onclick="window.deleteProblem('${p._id}')">🗑️</button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error('Lỗi load bài tập:', err);
        document.getElementById('problem-list').innerHTML = `<p style="color:var(--color-danger);">Lỗi: ${err.message}</p>`;
    }
}

export async function deleteProblem(id) {
    if (!confirm('Xóa bài tập này?')) return;
    try {
        await adminAPI.deleteProblem(id);
        alert('Xóa thành công');
        await loadProblemList();
    } catch (err) {
        alert('Lỗi: ' + err.message);
    }
}

export async function editProblem(id) {
    try {
        const problem = await adminAPI.getProblemById(id);
        if (!problem) {
            alert('Không tìm thấy bài tập');
            return;
        }
        document.getElementById('problem-id').value = problem._id;
        document.getElementById('problem-subject').value = problem.subjectId;
        document.getElementById('problem-chapter').value = problem.chapterId;
        document.getElementById('problem-name').value = problem.name;
        document.getElementById('problem-code').value = problem.code;
        document.getElementById('problem-statement').value = problem.statement || '';
        document.getElementById('problem-input-sample').value = problem.exampleInput || '';
        document.getElementById('problem-output-sample').value = problem.exampleOutput || '';
        document.getElementById('problem-score').value = problem.score || 10;
        document.getElementById('problem-status').value = problem.status || 'draft';
        document.getElementById('problem-grading-requirements').value = problem.gradingRequirements || '';

        const langSelect = document.getElementById('problem-languages');
        Array.from(langSelect.options).forEach(opt => {
            opt.selected = problem.languages && problem.languages.includes(opt.value);
        });

        const submitBtn = document.querySelector('#problem-form button[type="submit"]');
        submitBtn.textContent = '💾 Cập nhật bài tập';
        submitBtn.dataset.mode = 'update';
        document.getElementById('cancel-problem-edit').style.display = 'inline-block';
        document.getElementById('problem-form').scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
        alert('Lỗi: ' + err.message);
    }
}

export function cancelEditProblem() {
    document.getElementById('problem-id').value = '';
    document.getElementById('problem-name').value = '';
    document.getElementById('problem-code').value = '';
    document.getElementById('problem-statement').value = '';
    document.getElementById('problem-input-sample').value = '';
    document.getElementById('problem-output-sample').value = '';
    document.getElementById('problem-score').value = 10;
    document.getElementById('problem-status').value = 'draft';
    document.getElementById('problem-grading-requirements').value = '';
    const submitBtn = document.querySelector('#problem-form button[type="submit"]');
    submitBtn.textContent = 'Tạo bài';
    submitBtn.dataset.mode = 'create';
    document.getElementById('cancel-problem-edit').style.display = 'none';
}

export async function handleProblemSubmit(e) {
    e.preventDefault();
    const mode = document.querySelector('#problem-form button[type="submit"]').dataset.mode || 'create';
    const languages = Array.from(document.getElementById('problem-languages').selectedOptions).map(o => o.value);
    const gradingRequirements = document.getElementById('problem-grading-requirements').value.trim();
    const data = {
        subjectId: document.getElementById('problem-subject').value,
        chapterId: document.getElementById('problem-chapter').value,
        name: document.getElementById('problem-name').value.trim(),
        code: document.getElementById('problem-code').value.trim(),
        statement: document.getElementById('problem-statement').value,
        inputSample: document.getElementById('problem-input-sample').value,
        outputSample: document.getElementById('problem-output-sample').value,
        score: parseInt(document.getElementById('problem-score').value),
        languages,
        status: document.getElementById('problem-status').value,
        gradingRequirements,
    };
    if (!data.name || !data.code) {
        alert('Tên và mã bài không được để trống');
        return;
    }
    try {
        if (mode === 'update') {
            const id = document.getElementById('problem-id').value;
            await adminAPI.updateProblem(id, data);
            alert('Cập nhật bài tập thành công');
        } else {
            await adminAPI.createProblem(data);
            alert('Tạo bài tập thành công');
        }
        cancelEditProblem();
        await loadProblemList();
    } catch (err) {
        alert('Lỗi: ' + err.message);
    }
}

// ============================================================
// COMMON
// ============================================================

export async function loadSubjectsForSelect() {
    try {
        const subjects = await adminAPI.getAllSubjects();
        const selects = ['chapter-subject', 'problem-subject'];
        selects.forEach(id => {
            const sel = document.getElementById(id);
            if (!sel) return;
            const currentVal = sel.value;
            sel.innerHTML = subjects.map(s => `<option value="${s._id}">${s.name}</option>`).join('');
            if (currentVal) sel.value = currentVal;
        });
        document.getElementById('problem-subject')?.dispatchEvent(new Event('change'));
    } catch (err) {
        console.error('❌ Lỗi load subjects cho dropdown:', err);
        const selects = ['chapter-subject', 'problem-subject'];
        selects.forEach(id => {
            const sel = document.getElementById(id);
            if (sel) sel.innerHTML = '<option value="">⚠️ Lỗi tải dữ liệu</option>';
        });
    }
}

export function setupChapterDropdown() {
    document.getElementById('problem-subject')?.addEventListener('change', async (e) => {
        const subjectId = e.target.value;
        if (!subjectId) {
            document.getElementById('problem-chapter').innerHTML = '<option value="">Chọn môn trước</option>';
            return;
        }
        try {
            // Dùng adminAPI để lấy tất cả chương (không filter status)
            const allChapters = await adminAPI.getAllChapters();
            const chapters = allChapters.filter(ch => ch.subjectId === subjectId);
            const sel = document.getElementById('problem-chapter');
            const currentVal = sel.value;
            sel.innerHTML = chapters.map(c => `<option value="${c._id}">${c.name}</option>`).join('');
            if (currentVal) sel.value = currentVal;
            if (chapters.length === 0) {
                sel.innerHTML = '<option value="">Chưa có chương nào</option>';
            }
        } catch (err) {
            console.error('Lỗi load chapters:', err);
            document.getElementById('problem-chapter').innerHTML = '<option value="">⚠️ Lỗi tải</option>';
        }
    });
}

// ============================================================
// EXPOSE TO WINDOW (cho onclick)
// ============================================================
window.deleteSubject = deleteSubject;
window.editSubject = editSubject;
window.deleteChapter = deleteChapter;
window.editChapter = editChapter;
window.deleteProblem = deleteProblem;
window.editProblem = editProblem;