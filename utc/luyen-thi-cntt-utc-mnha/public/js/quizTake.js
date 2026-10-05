/* ============================================================
   quizTake.js — làm bài trắc nghiệm (student)
   Dữ liệu đề lấy từ <script id="quizData"> (đã qua toStudentView: KHÔNG có đáp án).
   API dùng:
     POST /api/quiz/:lessonId/submit            { answers }
     GET  /api/quiz/submissions/:id/status      → { success, status }   (status: 'pending' | 'committed' | 'failed')
     POST /api/quiz/submissions/:id/analyze     { aiKeyId? } → { success, analysis, analysisCount?, limitReached? }
   ============================================================ */
(function () {
    "use strict";

    var dataEl = document.getElementById("quizData");
    if (!dataEl) return;
    var CFG = JSON.parse(dataEl.textContent);

    var PART_ORDER = ["mcq", "tf", "fill"];
    var PART_TITLES = { mcq: "Trắc nghiệm nhiều đáp án", tf: "Đúng / Sai", fill: "Điền số liệu / đáp án" };
    var LETTERS = "ABCDEFGHIJ";

    // ---------- Làm phẳng đề ----------
    var questions = [];
    PART_ORDER.forEach(function (k) {
        var p = CFG.parts && CFG.parts[k];
        if (!p || !Array.isArray(p.questions)) return;
        // Câu hỏi chùm (phần mcq / fill): clusters[] + q.clusterId do server gửi (nội dung chùm đã sanitize)
        var cmap = {};
        (Array.isArray(p.clusters) ? p.clusters : []).forEach(function (c) { cmap[c.id] = c; });
        p.questions.forEach(function (q) {
            questions.push(Object.assign({}, q, {
                part: k,
                partNote: k === "fill" ? (p.note || "") : "",
                cluster: q.clusterId && cmap[q.clusterId] ? cmap[q.clusterId] : null
            }));
        });
    });
    if (!questions.length) return;
    var indexById = {};
    questions.forEach(function (q, i) { indexById[q.id] = i; });
    // Khoảng số câu (đánh số liền qua các phần, đúng số sinh viên thấy) của từng chùm: id → [từ, đến]
    var clusterRange = {};
    questions.forEach(function (q, i) {
        if (!q.cluster) return;
        var r = clusterRange[q.cluster.id] || (clusterRange[q.cluster.id] = [i + 1, i + 1]);
        r[1] = i + 1;
    });

    // ---------- State ----------
    var DRAFT_KEY = "quiz-draft:" + CFG.lessonId;
    var TOTAL_SECONDS = CFG.duration * 60;
    var state = {
        current: 0,
        answers: {},          // id → mcq: ["A"] | tf: true/false | fill: "text"
        flagged: {},          // id → true
        endAt: null,
        remaining: TOTAL_SECONDS,
        timerId: null,
        timeUp: false,
        submitting: false,
        submitted: false,
        submissionId: null,
        analysisCount: 0,
        analyzing: false
    };

    // ---------- DOM ----------
    function $(id) { return document.getElementById(id); }
    var el = {
        qContainer: $("questionContainer"), qNumber: $("questionNumber"), qNumbers: $("questionNumbers"),
        answered: $("answeredCount"), pPercent: $("progressPercent"), pFill: $("progressFill"),
        timer: $("timer"), timerWrap: $("timerWrap"), flagBtn: $("flagBtn"),
        lockMsg: $("lockMessage"), audio: $("timeUpAudio"), audioBar: $("audioBar"), audioBadge: $("audioBadge"),
        submitTop: $("submitTop"), submitMain: $("submitMain"), saveBtn: $("saveBtn"), saveHint: $("saveHint"),
        statusText: $("statusText"), dot: $("connectionDot"),
        result: $("resultSection"), review: $("reviewList"),
        listen: $("quizAudio"), listenMsg: $("listenMsg"),
        analyzeBtn: $("analyzeBtn"), analyzeMsg: $("analyzeMsg"), aiPick: $("aiPick"), analysisList: $("analysisList")
    };

    // ---------- Helpers ----------
    function esc(s) {
        return String(s == null ? "" : s)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }
    function isAnswered(q) {
        var a = state.answers[q.id];
        if (q.part === "mcq") return Array.isArray(a) && a.length > 0;
        if (q.part === "tf") return (q.statements || []).some(function (st) { return typeof state.answers[st.id] === "boolean"; });
        return typeof a === "string" && a.trim() !== "";
    }
    var TF_LABELS = "abcdefghij";
    function tfLabel(i) { return TF_LABELS.charAt(i) || String(i + 1); }
    function tfScoringHint() {
        var p = CFG.parts && CFG.parts.tf;
        var ppq = p && p.pointsPerQuestion != null ? fmtPts(p.pointsPerQuestion) : null;
        if (p && p.scoring === "thptqg") {
            return "Cách tính điểm THPTQG: đúng 1 ý = 10%, 2 ý = 25%, 3 ý = 50%, đủ 4 ý = 100%" + (ppq ? " của " + ppq + "đ / câu" : "") + ".";
        }
        return "Cách tính điểm: chia đều cho các ý, mỗi ý đúng được một phần điểm" + (ppq ? " (tối đa " + ppq + "đ / câu)" : "") + ".";
    }
    function countAnswered() { return questions.filter(isAnswered).length; }

    // Khung "Dữ kiện dùng chung" của câu hỏi chùm — hiện TRƯỚC câu hỏi.
    // c.text là HTML ngắn đã được server sanitize (in đậm, in nghiêng…) nên chèn trực tiếp.
    function clusterBox(q) {
        var c = q.cluster;
        if (!c) return "";
        var r = clusterRange[c.id];
        var label = r ? (r[0] === r[1] ? "câu " + r[0] : "câu " + r[0] + "–" + r[1]) : "";
        return '<div class="cluster-box">' +
            '<div class="cluster-label">📖 Dữ kiện dùng chung' + (label ? " cho " + label : "") + "</div>" +
            (c.text ? '<div class="cluster-text">' + c.text + "</div>" : "") +
            (c.image ? '<img class="cluster-image" src="' + esc(c.image) + '" alt="Hình minh hoạ chùm" loading="lazy" referrerpolicy="no-referrer">' : "") +
            "</div>";
    }
    function fmtTime(s) {
        var m = Math.floor(s / 60), ss = s % 60;
        return String(m).padStart(2, "0") + ":" + String(ss).padStart(2, "0");
    }
    function locked() { return state.timeUp || state.submitted || state.submitting || CFG.readOnly; }
    // Điểm thập phân: tối đa 2 chữ số, bỏ số 0 thừa (0.2 → "0.2", 8.50 → "8.5", 3 → "3")
    function fmtPts(n) {
        n = Number(n);
        if (!isFinite(n)) return "0";
        return String(Math.round(n * 100) / 100);
    }
    function providerName(p) { return /vilao/i.test(String(p || "")) ? "vilao.ai" : "Gemini"; }

    // ---------- Nháp (localStorage, có try/catch) ----------
    function saveDraft(showHint) {
        if (state.submitted || CFG.readOnly) return;
        try {
            localStorage.setItem(DRAFT_KEY, JSON.stringify({
                answers: state.answers, flagged: state.flagged, endAt: state.endAt, dur: CFG.duration, savedAt: Date.now()
            }));
            if (showHint && el.saveHint) {
                el.saveHint.textContent = "✓ Đã lưu nháp " + new Date().toLocaleTimeString("vi-VN");
            }
        } catch (e) { /* trình duyệt chặn storage → bỏ qua */ }
    }
    function loadDraft() {
        try {
            var d = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
            if (!d || !d.endAt) return null;
            // Nháp bỏ dở quá 30 phút sau khi hết giờ → coi như lần làm mới
            if (Date.now() > d.endAt + 30 * 60 * 1000) { localStorage.removeItem(DRAFT_KEY); return null; }
            return d;
        } catch (e) { return null; }
    }
    function clearDraft() { try { localStorage.removeItem(DRAFT_KEY); } catch (e) { /* noop */ } }

    // ============================================================
    // CHUÔNG HẾT GIỜ (giữ đúng hành vi của lesson.pug)
    // ============================================================
    var intentionalStop = false;
    var blockMsgTimer = null;

    function canPlayAlarm() { return state.timeUp && !state.submitted && !state.submitting; }

    function playAlarm() {
        if (!el.audio) return;
        try {
            el.audio.loop = true;
            el.audio.volume = 1.0;
            el.audio.currentTime = 0;
            var p = el.audio.play();
            if (p && typeof p.catch === "function") p.catch(function (err) { console.warn("Không tự phát được chuông:", err); });
        } catch (e) { console.warn("playAlarm:", e); }
    }
    function stopAlarm() {
        if (!el.audio) return;
        intentionalStop = true;
        try { el.audio.loop = false; el.audio.pause(); el.audio.currentTime = 0; } catch (e) { /* noop */ }
        setTimeout(function () { intentionalStop = false; }, 60);
    }
    function updateAudioBar() {
        if (!el.audioBar || !el.audioBadge) return;
        if (canPlayAlarm()) {
            el.audioBar.classList.remove("locked");
            el.audioBar.classList.add("unlocked");
            el.audioBadge.textContent = "🔓 Đã mở khoá";
        } else {
            el.audioBar.classList.add("locked");
            el.audioBar.classList.remove("unlocked");
            el.audioBadge.textContent = state.submitted ? "✓ Đã nộp" : "🔒 Đang khoá";
        }
    }
    function showBlockedAudioMessage() {
        if (!el.lockMsg || state.timeUp) return;
        el.lockMsg.textContent = "🔒 Chuông chỉ tự động reo khi đồng hồ về 00:00 (hết giờ).";
        el.lockMsg.classList.add("show");
        if (blockMsgTimer) clearTimeout(blockMsgTimer);
        blockMsgTimer = setTimeout(function () {
            blockMsgTimer = null;
            if (!state.timeUp) el.lockMsg.classList.remove("show");
        }, 2500);
    }
    if (el.audio) {
        // Chặn phát khi chưa hết giờ / đã nộp
        el.audio.addEventListener("play", function () {
            if (!canPlayAlarm()) {
                intentionalStop = true;
                try { el.audio.pause(); el.audio.currentTime = 0; } catch (e) { /* noop */ }
                setTimeout(function () { intentionalStop = false; }, 60);
                showBlockedAudioMessage();
            }
        });
        // Hết giờ mà bị tạm dừng → tự reo lại cho tới khi nộp bài
        el.audio.addEventListener("pause", function () {
            if (intentionalStop) return;
            if (canPlayAlarm()) {
                setTimeout(function () {
                    if (canPlayAlarm() && el.audio.paused) {
                        try { el.audio.loop = true; el.audio.play().catch(function () {}); } catch (e) { /* noop */ }
                    }
                }, 400);
            }
        });
    }

    // ============================================================
    // BÀI NGHE (<audio id="quizAudio">, chỉ có khi đề có audioUrl)
    // Tách biệt với chuông hết giờ (#timeUpAudio) ở trên.
    // ============================================================
    function pauseListen() {
        if (!el.listen) return;
        try { el.listen.pause(); } catch (e) { /* noop */ }
    }
    if (el.listen) {
        // Hết giờ (chuông đang reo, chưa nộp) → không cho bật bài nghe chồng lên chuông
        el.listen.addEventListener("play", function () {
            if (canPlayAlarm()) pauseListen();
        });
        el.listen.addEventListener("error", function () {
            if (!el.listenMsg) return;
            el.listenMsg.textContent = "⚠️ Không tải được file audio. Kiểm tra mạng rồi tải lại trang; nếu vẫn lỗi hãy báo giảng viên (link audio có thể sai hoặc repo đang để private).";
            el.listenMsg.hidden = false;
        });
        el.listen.addEventListener("loadedmetadata", function () {
            if (el.listenMsg) el.listenMsg.hidden = true;
        });
    }

    // ============================================================
    // ĐỒNG HỒ
    // ============================================================
    function paintTimer() {
        el.timer.textContent = fmtTime(Math.max(0, state.remaining));
        el.timer.classList.remove("warning", "danger");
        el.timerWrap.classList.toggle("finished", state.timeUp && !state.submitted);
        if (state.timeUp || state.submitted) return;
        // Cảnh báo: còn ≤10% thời gian (tối đa 5 phút) → đỏ; còn ≤25% (tối đa 15 phút) → vàng
        var dangerAt = Math.min(300, Math.round(TOTAL_SECONDS * 0.10));
        var warnAt = Math.min(900, Math.round(TOTAL_SECONDS * 0.25));
        if (state.remaining <= dangerAt) el.timer.classList.add("danger");
        else if (state.remaining <= warnAt) el.timer.classList.add("warning");
    }
    function tick() {
        if (state.submitted) { clearInterval(state.timerId); state.timerId = null; return; }
        state.remaining = Math.max(0, Math.ceil((state.endAt - Date.now()) / 1000));
        paintTimer();
        if (state.remaining <= 0) {
            clearInterval(state.timerId);
            state.timerId = null;
            onTimeUp();
        }
    }
    function startTimer() {
        if (CFG.readOnly || state.timerId || state.submitted) return;
        if (!state.endAt) state.endAt = Date.now() + TOTAL_SECONDS * 1000;
        tick();
        if (state.remaining > 0) state.timerId = setInterval(tick, 1000);
    }
    function onTimeUp() {
        if (state.timeUp || state.submitted) return;
        state.timeUp = true;
        el.lockMsg.textContent = "⏰ Đã hết thời gian làm bài! Chuông sẽ reo cho tới khi bạn nộp bài.";
        el.lockMsg.classList.add("show");
        el.statusText.textContent = "Hết giờ";
        el.dot.classList.add("offline");
        paintTimer();
        updateAudioBar();
        pauseListen();              // hết giờ → dừng bài nghe, nhường chỗ cho chuông
        renderQuestion();           // khoá các ô chọn
        if (canPlayAlarm()) playAlarm();
        saveDraft(false);
    }

    // ============================================================
    // RENDER CÂU HỎI
    // ============================================================
    function renderQuestion() {
        var q = questions[state.current];
        var dis = locked();
        el.qNumber.textContent = (state.current + 1) + " / " + questions.length;

        var body = "";
        if (q.part === "mcq") {
            var sel = Array.isArray(state.answers[q.id]) ? state.answers[q.id] : [];
            var multi = !!q.multi;
            body = '<div class="options">' + (q.options || []).map(function (o, i) {
                var on = sel.indexOf(o.key) !== -1;
                return '<label class="option' + (on ? " selected" : "") + (multi ? " multi" : "") + (dis ? " disabled" : "") + '">' +
                    '<input type="' + (multi ? "checkbox" : "radio") + '" name="q-' + esc(q.id) + '" value="' + esc(o.key) + '"' +
                    (on ? " checked" : "") + (dis ? " disabled" : "") + ">" +
                    '<span class="option-letter">' + esc(o.key || LETTERS[i]) + "</span>" +
                    '<span class="option-text">' + esc(o.text) + "</span></label>";
            }).join("") + "</div>";
        } else if (q.part === "tf") {
            body = '<div class="multi-hint">' + esc(tfScoringHint()) + "</div>" +
                '<div class="tf-statements">' + (q.statements || []).map(function (st, si) {
                    var cur = state.answers[st.id];
                    return '<div class="tf-statement" style="margin:10px 0;padding:10px 12px;border:1px solid #e2e8f0;border-radius:10px">' +
                        '<div class="tf-text" style="margin-bottom:8px"><b>' + tfLabel(si) + ")</b> " + esc(st.text) + "</div>" +
                        '<div class="options" style="display:flex;gap:10px;flex-wrap:wrap">' +
                        [[true, "Đ", "Đúng"], [false, "S", "Sai"]].map(function (c) {
                            var on = cur === c[0];
                            return '<label class="option' + (on ? " selected" : "") + (dis ? " disabled" : "") + '" style="flex:1 1 120px">' +
                                '<input type="radio" data-st="' + esc(st.id) + '" name="st-' + esc(st.id) + '" value="' + c[0] + '"' + (on ? " checked" : "") + (dis ? " disabled" : "") + ">" +
                                '<span class="option-letter">' + c[1] + "</span>" +
                                '<span class="option-text">' + c[2] + "</span></label>";
                        }).join("") + "</div></div>";
                }).join("") + "</div>";
        } else {
            var v = typeof state.answers[q.id] === "string" ? state.answers[q.id] : "";
            body = '<input type="text" class="fill-input" id="fillInput" autocomplete="off" placeholder="Nhập đáp án của bạn…" value="' +
                esc(v) + '"' + (dis ? " disabled" : "") + ">";
        }

        el.qContainer.innerHTML =
            '<article class="question-card">' +
            '<span class="part-tag">Phần ' + (PART_ORDER.indexOf(q.part) + 1) + " · " + PART_TITLES[q.part] + "</span>" +
            clusterBox(q) +
            '<div class="question-title"><span class="q-number">' + (state.current + 1) + "</span><h2>" + esc(q.text) + "</h2></div>" +
            (q.image ? '<img class="q-image" src="' + esc(q.image) + '" alt="Hình minh hoạ" loading="lazy" referrerpolicy="no-referrer">' : "") +
            (q.part === "mcq" && q.multi ? '<div class="multi-hint">☑ Câu này có thể có nhiều đáp án đúng — chọn tất cả.</div>' : "") +
            (q.part === "fill" && q.partNote ? '<div class="fill-note">📝 ' + esc(q.partNote) + "</div>" : "") +
            body + "</article>";

        // Gắn sự kiện
        if (q.part === "fill") {
            var inp = $("fillInput");
            inp.addEventListener("input", function () {
                state.answers[q.id] = inp.value;
                saveDraft(false);
                updateProgress();
                renderNav();
            });
        } else {
            el.qContainer.querySelectorAll("input").forEach(function (inp) {
                inp.addEventListener("change", function () {
                    if (locked()) return;
                    if (q.part === "mcq") {
                        var cur = Array.isArray(state.answers[q.id]) ? state.answers[q.id].slice() : [];
                        if (q.multi) {
                            var at = cur.indexOf(inp.value);
                            if (at === -1) cur.push(inp.value); else cur.splice(at, 1);
                            cur.sort();
                        } else {
                            cur = [inp.value];
                        }
                        state.answers[q.id] = cur;
                    } else {
                        var sid = inp.getAttribute("data-st");
                        if (!sid) return;
                        state.answers[sid] = inp.value === "true";
                    }
                    saveDraft(false);
                    renderQuestion();
                    updateProgress();
                    renderNav();
                });
            });
        }
        updateFlagButton();
    }

    function renderNav() {
        var html = "", lastPart = "";
        questions.forEach(function (q, i) {
            if (q.part !== lastPart) {
                lastPart = q.part;
                html += '<div class="nav-part">Phần ' + (PART_ORDER.indexOf(q.part) + 1) + " · " + PART_TITLES[q.part] + "</div>";
            }
            html += '<button type="button" class="question-number' + (i === state.current ? " active" : "") +
                (isAnswered(q) ? " answered" : "") + (state.flagged[q.id] ? " flagged" : "") +
                '" data-index="' + i + '" title="Câu ' + (i + 1) + '">' + (i + 1) +
                (state.flagged[q.id] ? '<span class="flag-mini">⚑</span>' : "") + "</button>";
        });
        el.qNumbers.innerHTML = html;
        el.qNumbers.querySelectorAll(".question-number").forEach(function (b) {
            b.addEventListener("click", function () {
                state.current = Number(b.dataset.index);
                renderQuestion();
                renderNav();
            });
        });
    }

    function updateProgress() {
        var n = countAnswered();
        var pct = Math.round((n / questions.length) * 100);
        el.answered.textContent = n;
        el.pPercent.textContent = pct + "%";
        el.pFill.style.width = pct + "%";
    }
    function updateFlagButton() {
        var on = !!state.flagged[questions[state.current].id];
        el.flagBtn.classList.toggle("active", on);
        el.flagBtn.textContent = on ? "⚑ Đã đánh dấu" : "⚑ Đánh dấu";
    }
    function go(delta) {
        var n = state.current + delta;
        if (n < 0 || n >= questions.length) return;
        state.current = n;
        renderQuestion();
        renderNav();
    }

    // ============================================================
    // NỘP BÀI
    // ============================================================
    function buildAnswersPayload() {
        var out = {};
        questions.forEach(function (q) {
            if (q.part === "tf") {
                (q.statements || []).forEach(function (st) {
                    if (typeof state.answers[st.id] === "boolean") out[st.id] = state.answers[st.id];
                });
            } else if (isAnswered(q)) out[q.id] = state.answers[q.id];
        });
        return out;
    }

    function setSubmitDisabled(v) {
        el.submitTop.disabled = v;
        el.submitMain.disabled = v;
    }

    async function submitExam() {
        if (state.submitted || state.submitting || CFG.readOnly) return;

        var unanswered = questions.length - countAnswered();
        if (!state.timeUp) {
            var msg = unanswered > 0
                ? "Bạn còn " + unanswered + " câu chưa trả lời.\n\nBạn có chắc muốn nộp bài không?"
                : "Bạn có chắc muốn nộp bài và xem kết quả không?";
            if (!confirm(msg)) return;
        }

        state.submitting = true;
        stopAlarm();                       // tắt chuông ngay khi bắt đầu nộp
        pauseListen();
        updateAudioBar();
        setSubmitDisabled(true);
        el.submitTop.textContent = "ĐANG NỘP…";
        el.submitMain.textContent = "ĐANG CHẤM…";
        renderQuestion();

        try {
            var res = await fetch("/api/quiz/" + encodeURIComponent(CFG.lessonId) + "/submit", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Accept": "application/json" },
                body: JSON.stringify({ answers: buildAnswersPayload() })
            });
            var data;
            try { data = await res.json(); } catch (e) { throw new Error("Server không trả JSON. Kiểm tra log backend."); }
            if (!res.ok || !data.success) throw new Error(data.message || "Nộp bài thất bại.");

            state.submitting = false;
            state.submitted = true;
            state.submissionId = data.submissionId || (data.submission && data.submission._id) || null;
            if (state.timerId) { clearInterval(state.timerId); state.timerId = null; }
            clearDraft();
            stopAlarm();
            el.lockMsg.classList.remove("show");
            showResult(data);
            afterSubmitUi();
            setupAnalyze(data);
        } catch (err) {
            console.error("submitExam:", err);
            state.submitting = false;
            setSubmitDisabled(false);
            el.submitTop.textContent = "NỘP BÀI";
            el.submitMain.textContent = "NỘP BÀI & XEM KẾT QUẢ";
            renderQuestion();
            updateAudioBar();
            alert("❌ " + err.message);
            if (canPlayAlarm()) playAlarm();    // đã hết giờ mà nộp lỗi → reo lại
        }
    }

    function afterSubmitUi() {
        ["examContent", "questionNav", "submitArea", "toolbar"].forEach(function (id) {
            var n = $(id);
            if (n) n.classList.add("hidden");
        });
        el.submitTop.textContent = "ĐÃ NỘP";
        el.submitTop.disabled = true;
        el.statusText.textContent = "Đã nộp bài";
        el.dot.classList.add("offline");
        paintTimer();
        updateAudioBar();
        // Đã nộp bài → mở khoá tua để nghe lại khi xem đáp án
        if (window.quizAudioLock && typeof window.quizAudioLock.unlock === "function") window.quizAudioLock.unlock();
    }

    // ============================================================
    // HIỂN THỊ KẾT QUẢ (đáp án đúng + giải thích do server trả về sau khi nộp)
    // ============================================================
    function showResult(data) {
        var r = data.result || data;
        var items = Array.isArray(r.items) ? r.items : [];
        var byId = {};
        items.forEach(function (it) { byId[it.id] = it; });
        window.__quizItemsById = byId;

        var total = r.totalCount != null ? r.totalCount : questions.length;
        var correct = r.correctCount != null ? r.correctCount : items.filter(function (i) { return i.correct; }).length;
        var unanswered = questions.length - countAnswered();
        var wrong = Math.max(0, total - correct - unanswered);
        var maxScore = r.maxScore != null ? r.maxScore : CFG.maxScore;
        var score = Number(r.score != null ? r.score : data.score || 0);
        var pct = total ? Math.round((correct / total) * 100) : 0;

        $("scoreValue").textContent = fmtPts(score);
        $("scoreMax").textContent = "/ " + fmtPts(maxScore);
        $("correctCount").textContent = correct;
        $("wrongCount").textContent = wrong;
        $("unansweredCount").textContent = unanswered;
        $("resultPercent").textContent = pct + "%";

        // điểm từng phần
        var pb = "";
        PART_ORDER.forEach(function (k) {
            var p = r.parts && r.parts[k];
            if (p && p.total) {
                pb += '<span class="part-chip">' + PART_TITLES[k] + ": <b>" + p.correct + "/" + p.total + "</b> câu đúng" +
                    (p.earned != null && p.points != null ? " · <b>" + fmtPts(p.earned) + "/" + fmtPts(p.points) + "đ</b>" : "") + "</span>";
            }
        });
        $("partsBreakdown").innerHTML = pb;

        var ratio = maxScore ? score / maxScore : 0;
        var m = ratio >= 0.9 ? "🔥 Xuất sắc! Kiến thức của bạn đang rất chắc."
            : ratio >= 0.8 ? "👏 Rất tốt! Rà lại vài câu sai là gần như trọn điểm."
            : ratio >= 0.65 ? "💪 Khá ổn! Hãy xem kỹ phần giải thích các câu sai."
            : ratio >= 0.5 ? "📚 Đã có nền tảng. Nên ôn lại các phần bị sai nhiều."
            : "🧠 Không sao! Xem giải thích bên dưới, bấm Phân tích AI để biết nên ôn gì trước.";
        if (unanswered > 0) m += " Bạn còn bỏ trống " + unanswered + " câu.";
        $("resultMessage").textContent = m;

        // Chùm: hiện khung nội dung chùm MỘT lần, ngay trước câu đầu tiên của chùm
        el.review.innerHTML = questions.map(function (q, i) {
            var first = q.cluster && (i === 0 || !questions[i - 1].cluster || questions[i - 1].cluster.id !== q.cluster.id);
            return (first ? clusterBox(q) : "") + reviewCard(q, i, byId[q.id] || {});
        }).join("");

        el.result.classList.remove("hidden");
        setTimeout(function () { el.result.scrollIntoView({ behavior: "smooth", block: "start" }); }, 100);
    }

    function reviewCard(q, i, it) {
        var byIdAll = window.__quizItemsById || {};
        var mine = state.answers[q.id];
        var blank = !isAnswered(q);
        var ok = q.part === "tf" && it.correct === undefined
            ? (q.statements || []).every(function (st) { var x = byIdAll[st.id]; return x && x.correct; })
            : !!it.correct;
        var status = ok ? "✓ ĐÚNG" : blank ? "— BỎ TRỐNG" : "✕ SAI";
        var ppq = CFG.parts && CFG.parts[q.part] ? CFG.parts[q.part].pointsPerQuestion : null;
        if (it.earned != null && ppq != null) status += " · " + fmtPts(it.earned) + "/" + fmtPts(ppq) + "đ";

        var inner = "";
        if (q.part === "mcq") {
            var right = Array.isArray(it.correctAnswer) ? it.correctAnswer : [];
            var picked = Array.isArray(mine) ? mine : [];
            inner = '<div class="review-options">' + (q.options || []).map(function (o, oi) {
                var isRight = right.indexOf(o.key) !== -1, isMine = picked.indexOf(o.key) !== -1;
                var cls = isRight ? " correct-option" : (isMine ? " wrong-option" : "");
                var tag = isRight ? '<strong class="answer-tag">ĐÁP ÁN ĐÚNG</strong>' : (isMine ? '<strong class="your-answer-tag">BẠN CHỌN</strong>' : "");
                return '<div class="review-option' + cls + '"><span class="option-letter">' + esc(o.key || LETTERS[oi]) + "</span><span>" + esc(o.text) + "</span>" + tag + "</div>";
            }).join("") + "</div>";
        } else if (q.part === "tf") {
            inner = '<div class="review-options">' + (q.statements || []).map(function (st, si) {
                var sit = byIdAll[st.id] || {};
                var rightTf = sit.correctAnswer === true || sit.correctAnswer === "true";
                var hasKey = sit.correctAnswer !== undefined && sit.correctAnswer !== null;
                var mineSt = state.answers[st.id];
                var cls = !hasKey ? "" : (typeof mineSt !== "boolean" ? "" : (mineSt === rightTf ? " correct-option" : " wrong-option"));
                var mineTxt = typeof mineSt === "boolean" ? (mineSt ? "Đúng" : "Sai") : "bỏ trống";
                var rightTxt = hasKey ? (rightTf ? "Đúng" : "Sai") : "";
                var sx = sit.explanationHtml ? '<div class="explanation"><strong>💡</strong><span>' + sit.explanationHtml + "</span></div>" : "";
                return '<div class="review-option' + cls + '" style="flex-wrap:wrap"><span class="option-letter">' + tfLabel(si) + "</span><span>" + esc(st.text) + "</span>" +
                    '<strong class="your-answer-tag">Bạn chọn: ' + mineTxt + "</strong>" +
                    (rightTxt ? '<strong class="answer-tag">Đáp án: ' + rightTxt + "</strong>" : "") + sx + "</div>";
            }).join("") + "</div>";
        } else {
            var ans = Array.isArray(it.correctAnswer) ? it.correctAnswer.join("  |  ") : (it.correctAnswer == null ? "" : it.correctAnswer);
            inner = '<div class="review-fill">' +
                '<div class="review-option ' + (ok ? "correct-option" : (blank ? "" : "wrong-option")) + '"><span>Bạn điền:</span><b>' +
                (blank ? "(bỏ trống)" : esc(mine)) + "</b></div>" +
                '<div class="review-option correct-option"><span>Đáp án đúng:</span><b>' + esc(ans) + "</b></div></div>";
        }

        // explanationHtml đã được server sanitize (sanitize-html) trước khi gửi xuống
        var expl = it.explanationHtml
            ? '<div class="explanation"><strong>💡 Giải thích:</strong><span>' + it.explanationHtml + "</span></div>" : "";

        return '<article class="review-card ' + (ok ? "review-correct" : "review-wrong") + '" id="review-' + esc(q.id) + '">' +
            '<div class="review-question-head"><div><span class="review-number">Câu ' + (i + 1) + " · " + PART_TITLES[q.part] + "</span><h4>" +
            esc(q.text) + '</h4></div><span class="review-status">' + status + "</span></div>" +
            (q.image ? '<img class="review-image" src="' + esc(q.image) + '" alt="" loading="lazy" referrerpolicy="no-referrer">' : "") +
            inner + expl + "</article>";
    }

    // ============================================================
    // PHÂN TÍCH AI
    // ============================================================
    function setupAnalyze(data) {
        // Dropdown AI (chỉ hiện khi bài cho phép chọn AI)
        if (Array.isArray(CFG.analysisAis) && CFG.analysisAis.length) {
            el.aiPick.innerHTML = '<option value="">— AI mặc định —</option>' + CFG.analysisAis.map(function (a) {
                return '<option value="' + esc(a.id) + '">' + esc(a.label) + "</option>";
            }).join("");
            el.aiPick.classList.remove("hidden");
        }
        if (!state.submissionId) {
            el.analyzeBtn.textContent = "Không có mã bài nộp";
            return;
        }
        if (data.status === "committed") return enableAnalyze();
        pollStatus(0);
    }

    function enableAnalyze() {
        el.analyzeBtn.disabled = false;
        el.analyzeBtn.textContent = state.analysisCount ? "🤖 Phân tích thêm bằng AI khác" : "🤖 Phân tích AI";
        el.analyzeMsg.textContent = "";
    }

    function pollStatus(n) {
        if (n > 25) {
            el.analyzeBtn.textContent = "⏳ Chưa lưu xong";
            el.analyzeMsg.textContent = "Bài chưa đồng bộ lên GitHub. Tải lại trang sau ít phút để phân tích.";
            return;
        }
        fetch("/api/quiz/submissions/" + encodeURIComponent(state.submissionId) + "/status", { cache: "no-store", headers: { Accept: "application/json" } })
            .then(function (r) { return r.json(); })
            .then(function (d) {
                if (d && d.status === "committed") return enableAnalyze();
                if (d && d.status === "failed") {
                    el.analyzeBtn.textContent = "❌ Lưu bài lỗi";
                    el.analyzeMsg.textContent = "Điểm của bạn vẫn được ghi nhận. Liên hệ giảng viên nếu cần phân tích.";
                    return;
                }
                setTimeout(function () { pollStatus(n + 1); }, 2500);
            })
            .catch(function () { setTimeout(function () { pollStatus(n + 1); }, 4000); });
    }

    async function analyze() {
        if (state.analyzing || !state.submissionId) return;
        state.analyzing = true;
        el.analyzeBtn.disabled = true;
        el.analyzeBtn.textContent = "🤖 AI đang phân tích…";
        el.analyzeMsg.textContent = "";
        el.analyzeMsg.classList.remove("error");
        try {
            var body = {};
            if (el.aiPick && !el.aiPick.classList.contains("hidden") && el.aiPick.value) body.aiKeyId = el.aiPick.value;
            var res = await fetch("/api/quiz/submissions/" + encodeURIComponent(state.submissionId) + "/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json", Accept: "application/json" },
                body: JSON.stringify(body)
            });
            var data;
            try { data = await res.json(); } catch (e) { throw new Error("Server không trả JSON."); }
            if (!res.ok || !data.success) throw new Error(data.message || "Phân tích thất bại.");

            state.analysisCount = data.analysisCount != null ? data.analysisCount : state.analysisCount + 1;
            if (data.analysis) el.analysisList.insertAdjacentHTML("afterbegin", analysisCard(data.analysis));
            bindChips();
            if (data.limitReached || state.analysisCount >= CFG.maxAnalyses) {
                el.analyzeBtn.disabled = true;
                el.analyzeBtn.textContent = "Đã đạt số lần phân tích tối đa";
            } else {
                enableAnalyze();
            }
        } catch (err) {
            console.error("analyze:", err);
            el.analyzeMsg.textContent = "❌ " + err.message;
            el.analyzeMsg.classList.add("error");
            enableAnalyze();
        } finally {
            state.analyzing = false;
        }
    }

    function analysisCard(a) {
        var label = a.aiLabel || (providerName(a.aiProvider) + (a.aiKeyName ? ": " + a.aiKeyName : ""));
        var when = a.analyzedAt ? new Date(a.analyzedAt).toLocaleString("vi-VN") : "";
        var head = '<div class="an-head"><strong>🤖 ' + esc(label) + "</strong><span>" +
            esc([a.model, when].filter(Boolean).join(" · ")) + "</span></div>";
        var prompt = a.promptName ? '<div class="an-prompt">Prompt: ' + esc(a.promptName) + (a.promptVersion ? " v" + esc(a.promptVersion) : "") + "</div>" : "";

        var body;
        if (a.status === "parse_failed" || !a.result) {
            body = "<div>AI trả về định dạng không đọc được. Nội dung gốc:</div><pre class=\"an-raw\">" + esc(a.rawText || "(trống)") + "</pre>";
        } else {
            var r = a.result;
            body = "";
            if (r.summary) body += "<div><h4>Tổng quan</h4><div>" + esc(r.summary) + "</div></div>";
            if (Array.isArray(r.weakTopics) && r.weakTopics.length) {
                body += "<div><h4>Chủ đề cần ôn</h4>" + r.weakTopics.map(function (t) {
                    return '<div class="an-topic"><b>' + esc(t.topic) + "</b>" + (t.wrongCount != null ? " — sai " + esc(t.wrongCount) + " câu" : "") +
                        (t.advice ? "<div>" + esc(t.advice) + "</div>" : "") + chips(t.questions) + "</div>";
                }).join("") + "</div>";
            }
            if (Array.isArray(r.mistakes) && r.mistakes.length) {
                body += "<div><h4>Phân tích từng câu sai</h4>" + r.mistakes.map(function (x) {
                    return '<div class="an-mistake">' + chips([x.id]) +
                        (x.why ? "<div><b>Vì sao sai:</b> " + esc(x.why) + "</div>" : "") +
                        (x.correctReasoning ? "<div><b>Cách nghĩ đúng:</b> " + esc(x.correctReasoning) + "</div>" : "") +
                        (x.tip ? "<div><b>Mẹo:</b> " + esc(x.tip) + "</div>" : "") + "</div>";
                }).join("") + "</div>";
            }
            if (Array.isArray(r.studyPlan) && r.studyPlan.length) {
                body += "<div><h4>Kế hoạch ôn tập</h4><ol>" + r.studyPlan.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ol></div>";
            }
        }
        return '<article class="an-card">' + head + '<div class="an-body">' + prompt + body + "</div></article>";
    }

    // chip "Câu N" bấm để nhảy tới câu tương ứng ở phần đáp án
    function chips(ids) {
        if (!Array.isArray(ids)) return "";
        return ids.map(function (id) {
            var i = indexById[id];
            if (i == null) return "";
            return '<a class="an-chip" data-goto="' + esc(id) + '">Câu ' + (i + 1) + "</a>";
        }).join("");
    }
    function bindChips() {
        el.analysisList.querySelectorAll(".an-chip:not([data-bound])").forEach(function (c) {
            c.setAttribute("data-bound", "1");
            c.addEventListener("click", function () {
                var t = document.getElementById("review-" + c.getAttribute("data-goto"));
                if (!t) return;
                t.scrollIntoView({ behavior: "smooth", block: "center" });
                t.classList.remove("review-flash");
                void t.offsetWidth;
                t.classList.add("review-flash");
            });
        });
    }

    // ============================================================
    // SỰ KIỆN + KHỞI TẠO
    // ============================================================
    $("prevBtn").addEventListener("click", function () { go(-1); });
    $("nextBtn").addEventListener("click", function () { go(1); });
    el.flagBtn.addEventListener("click", function () {
        var id = questions[state.current].id;
        if (state.flagged[id]) delete state.flagged[id]; else state.flagged[id] = true;
        updateFlagButton();
        renderNav();
        saveDraft(false);
    });
    el.submitTop.addEventListener("click", submitExam);
    el.submitMain.addEventListener("click", submitExam);
    el.saveBtn.addEventListener("click", function () { saveDraft(true); });
    el.analyzeBtn.addEventListener("click", analyze);
    $("retryBtn").addEventListener("click", function () {
        // Mỗi lần nộp là một bài nộp mới. Nếu muốn khoá làm lại thì sửa ở server (xem README: "Cho làm lại bài?").
        clearDraft();
        location.reload();
    });
    $("fullscreenBtn").addEventListener("click", async function () {
        try {
            if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
            else await document.exitFullscreen();
        } catch (e) { alert("Trình duyệt không cho phép bật toàn màn hình."); }
    });
    document.addEventListener("keydown", function (e) {
        if (state.submitted) return;
        var t = e.target;
        if (t && t.tagName === "INPUT" && t.type === "text") return;   // đang gõ ô điền
        if (e.key === "ArrowRight") go(1);
        if (e.key === "ArrowLeft") go(-1);
    });
    window.addEventListener("beforeunload", function () { stopAlarm(); pauseListen(); });

    // Khôi phục nháp (kể cả giờ còn lại theo endAt, reload không reset đồng hồ)
    var draft = loadDraft();
    if (draft && !CFG.readOnly) {
        state.answers = draft.answers || {};
        state.flagged = draft.flagged || {};
        // Admin vừa đổi thời gian làm bài → giữ đáp án nhưng bắt đầu đồng hồ mới
        state.endAt = (draft.dur != null && draft.dur !== CFG.duration) ? null : draft.endAt;
        el.saveHint.textContent = "↺ Đã khôi phục bài làm nháp";
    }

    if (CFG.readOnly) {
        setSubmitDisabled(true);
        el.saveBtn.disabled = true;
        el.statusText.textContent = "Chế độ xem";
    }

    renderQuestion();
    renderNav();
    updateProgress();
    updateAudioBar();
    paintTimer();
    startTimer();
    if (draft) saveDraft(false);
})();
