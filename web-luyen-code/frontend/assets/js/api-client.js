// frontend/assets/js/api-client.js
const API_BASE = '/api';

async function apiRequest(endpoint, method = 'GET', data = null) {
    const url = `${API_BASE}${endpoint}`;
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
    };
    const token = localStorage.getItem('token');
    if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
    }
    if (data) {
        options.body = JSON.stringify(data);
    }
    const response = await fetch(url, options);
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
    }
    return response.json();
}

// ============================================================
// AUTH
// ============================================================
export const authAPI = {
    sendOTP: (email) => apiRequest('/auth/send-otp', 'POST', { email }),
    verifyOTP: (email, otp) => apiRequest('/auth/verify-otp', 'POST', { email, otp }),
    getMe: () => apiRequest('/auth/me', 'GET'),
    logout: () => apiRequest('/auth/logout', 'POST'),
};

// ============================================================
// SUBJECTS
// ============================================================
export const subjectAPI = {
    getAll: () => apiRequest('/subjects', 'GET'),
    getOne: (id) => apiRequest(`/subjects/${id}`, 'GET'),
    getChapters: (id) => apiRequest(`/subjects/${id}/chapters`, 'GET'),
};

// ============================================================
// CHAPTERS
// ============================================================
export const chapterAPI = {
    getProblems: (id) => apiRequest(`/chapters/${id}/problems`, 'GET'),
};

// ============================================================
// PROBLEMS
// ============================================================
export const problemAPI = {
    getOne: (id) => apiRequest(`/problems/${id}`, 'GET'),
};

// ============================================================
// CODE
// ============================================================
export const codeAPI = {
    run: (data) => apiRequest('/code/run', 'POST', data),
    draft: (data) => apiRequest('/code/draft', 'PUT', data),
    versions: (problemId) => apiRequest(`/problems/${problemId}/versions`, 'GET'),
    restore: (versionId) => apiRequest(`/code/versions/${versionId}/restore`, 'POST'),
    files: (problemId) => apiRequest(`/code/files/${problemId}`, 'GET'),
    createFile: (data) => apiRequest('/code/files', 'POST', data),
    renameFile: (data) => apiRequest('/code/files/rename', 'PUT', data),
    deleteFile: (data) => apiRequest('/code/files/delete', 'DELETE', data),
    getFileContent: (problemId, fileName) => apiRequest(`/code/files/${problemId}/${fileName}`, 'GET'),
    updateFileContent: (data) => apiRequest('/code/files/update', 'PUT', data),
};

// ============================================================
// SUBMISSIONS
// ============================================================
export const submissionAPI = {
    submit: (data) => apiRequest('/submissions', 'POST', data),
    getAll: () => apiRequest('/submissions', 'GET'),
    getOne: (id) => apiRequest(`/submissions/${id}`, 'GET'),
};

// ============================================================
// ADMIN
// ============================================================
export const adminAPI = {
    // Subject
    getAllSubjects: () => apiRequest('/admin/subjects', 'GET'),
    createSubject: (data) => apiRequest('/admin/subjects', 'POST', data),
    updateSubject: (id, data) => apiRequest(`/admin/subjects/${id}`, 'PUT', data),
    deleteSubject: (id) => apiRequest(`/admin/subjects/${id}`, 'DELETE'),

    // Chapter
    getAllChapters: () => apiRequest('/admin/chapters', 'GET'),
    getChapterById: (id) => apiRequest(`/admin/chapters/${id}`, 'GET'),
    createChapter: (data) => apiRequest('/admin/chapters', 'POST', data),
    updateChapter: (id, data) => apiRequest(`/admin/chapters/${id}`, 'PUT', data),
    deleteChapter: (id) => apiRequest(`/admin/chapters/${id}`, 'DELETE'),

    // Problem
    getAllProblems: () => apiRequest('/admin/problems', 'GET'),
    getProblemById: (id) => apiRequest(`/admin/problems/${id}`, 'GET'),
    createProblem: (data) => apiRequest('/admin/problems', 'POST', data),
    updateProblem: (id, data) => apiRequest(`/admin/problems/${id}`, 'PUT', data),
    deleteProblem: (id) => apiRequest(`/admin/problems/${id}`, 'DELETE'),

    // Grading
    getGrading: (problemId) => apiRequest(`/admin/problems/${problemId}/grading`, 'GET'),
    updateGrading: (problemId, data) => apiRequest(`/admin/problems/${problemId}/grading`, 'PUT', data),
    deleteGrading: (problemId) => apiRequest(`/admin/problems/${problemId}/grading`, 'DELETE'),
};