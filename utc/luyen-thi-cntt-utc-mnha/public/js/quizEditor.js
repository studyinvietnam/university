/* ============================================================
   public/js/quizEditor.js — admin tạo / sửa bài trắc nghiệm
   Khớp với views/admin/quiz-form.pug + public/css/quiz-form.css.
   Luồng: dán text AI → "Chuyển" → sửa từng thẻ câu hỏi → Lưu.
   Khi lưu, client serialize các thẻ về TEXT rồi gửi lên; SERVER PARSE LẠI
   (không tin JSON từ client). Parser ở đây chỉ để xem trước / bắt lỗi sớm.
   Điểm hỗ trợ số thập phân: "0.1", "0,25", "1.5"…
   ============================================================ */
(function () {
    "use strict";

    var dataEl = document.getElementById("qfData");
    if (!dataEl) return;
    var CFG = JSON.parse(dataEl.textContent);

    var PARTS = ["mcq", "tf", "fill"];
    var PART_TITLES = { mcq: "Phần 1 · Nhiều đáp án", tf: "Phần 2 · Đúng / Sai", fill: "Phần 3 · Điền số liệu / đáp án" };
    var LETTERS = "ABCDEFGHIJ";
    var HOSTS = CFG.allowedImageHosts || ["raw.githubusercontent.com"];
    var MAX_OPT = CFG.maxOptions || 10;
    var DUR = CFG.durationLimits || { min: 1, max: 600 };

    var state = { mcq: [], tf: [], fill: [] };
    var saving = false;

    function $(id) { return document.getElementById(id); }
    function esc(s) {
        return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
            .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    // ---------- Số thập phân: chấp nhận cả "0.25" lẫn "0,25" ----------
    function toNum(v, def) {
        var s = String(v == null ? "" : v).trim().replace(",", ".");
        if (s === "") return def;
        var n = Number(s);
        return isFinite(n) ? n : def;
    }
    function fmt(n) { return String(Math.round(n * 10000) / 10000); }

    // ============================================================
    // PARSER (mirror quizParserService — chỉ để xem trước)
    // ============================================================
    function imageIssue(url) {
        url = String(url || "").trim();
        if (!url) return "";
        var u;
        try { u = new URL(url); } catch (e) { return "Link ảnh không hợp lệ."; }
        if (u.protocol !== "https:") return "Ảnh phải là link https.";
        if (HOSTS.indexOf(u.hostname) === -1) return "Host ảnh không được phép (chỉ: " + HOSTS.join(", ") + ").";
        return "";
    }

    function normTf(s) {
        s = String(s || "").trim().toLowerCase();
        if (["đúng", "dung", "đ", "d", "true", "t", "1"].indexOf(s) !== -1) return true;
        if (["sai", "s", "false", "f", "0"].indexOf(s) !== -1) return false;
        return null;
    }

    function parsePart(part, text) {
        var errors = [], questions = [], note = [];
        var t = String(text || "").replace(/\r/g, "").trim();
        if (/^["“].*["”]$/s.test(t)) t = t.slice(1, -1);
        var lines = [];
        t.split("\n").forEach(function (raw, idx) {
            if (/^\s*```/.test(raw)) return;
            if (!raw.trim()) return;
            lines.push({ n: idx + 1, s: raw.trim() });
        });

        var cur = null, open = null;
        function err(line, msg, qi) { errors.push({ line: line, msg: msg, qi: qi }); }

        lines.forEach(function (L) {
            var s = L.s, escaped = false;
            if (/^\\(- |\+\+\)|\+\)|=>)/.test(s)) { s = s.slice(1); escaped = true; }

            if (!escaped && /^- /.test(s)) {
                cur = { line: L.n, text: s.slice(2).trim(), image: "", options: [], rawCorrect: null, explanation: "", imgLine: 0, order: questions.length };
                questions.push(cur); open = "text"; return;
            }
            if (!escaped && s.indexOf("++)") === 0) {
                if (!cur) return err(L.n, "Giải thích nằm ngoài câu hỏi.");
                cur.explanation = s.slice(3).trim(); open = "expl"; return;
            }
            if (!escaped && s.indexOf("+)") === 0) {
                if (!cur) return err(L.n, "Đáp án nằm ngoài câu hỏi.");
                if (part !== "mcq") return err(L.n, "Phần này không có dòng “+)”.", cur.order);
                cur.options.push(s.slice(2).trim()); open = "opt"; return;
            }
            if (!escaped && s.indexOf("=>") === 0) {
                if (!cur) return err(L.n, "Dòng “=>” nằm ngoài câu hỏi.");
                cur.rawCorrect = s.slice(2).trim(); open = "corr"; return;
            }
            if (cur && /^https?:\/\/\S+$/.test(s)) {
                if (cur.options.length || cur.rawCorrect !== null || cur.explanation || cur.image) {
                    return err(L.n, "Link ảnh phải đặt ngay sau câu hỏi, trước “+)” / “=>”.", cur.order);
                }
                cur.image = s; cur.imgLine = L.n; open = null; return;
            }
            // dòng thường
            if (!cur) { if (part === "fill") { note.push(s); return; } return err(L.n, "Dòng nằm ngoài câu hỏi."); }
            if (open === "text") cur.text += "\n" + s;
            else if (open === "expl") cur.explanation += "\n" + s;
            else if (open === "opt") cur.options[cur.options.length - 1] += " " + s;
            else if (open === "corr") cur.rawCorrect += " " + s;
            else err(L.n, "Dòng thừa, không thuộc mục nào.", cur.order);
        });

        var out = [];
        questions.forEach(function (q, qi) {
            if (!q.text.trim()) err(q.line, "Câu hỏi rỗng.", qi);
            if (q.rawCorrect === null) err(q.line, "Thiếu dòng “=> đáp án”.", qi);
            else if (q.rawCorrect === "") err(q.line, "Chưa chọn đáp án đúng.", qi);
            var iss = imageIssue(q.image);
            if (iss) err(q.imgLine || q.line, iss, qi);

            var item = { text: q.text.trim(), image: q.image, explanation: q.explanation.trim() };
            if (part === "mcq") {
                var opts = q.options;
                if (opts.length < 2) err(q.line, "Cần ít nhất 2 đáp án.", qi);
                if (opts.length > MAX_OPT) err(q.line, "Tối đa " + MAX_OPT + " đáp án.", qi);
                var seen = {};
                opts.forEach(function (o) {
                    var k = o.trim().toLowerCase();
                    if (!k) err(q.line, "Có đáp án bị để trống.", qi);
                    else if (seen[k]) err(q.line, "Đáp án bị trùng: “" + o + "”.", qi);
                    seen[k] = true;
                });
                item.options = opts.map(function (o) { return o.trim(); });
                item.correct = [];
                if (q.rawCorrect) {
                    var whole = opts.findIndex(function (o) { return o.trim().toLowerCase() === q.rawCorrect.toLowerCase(); });
                    var idxs = [];
                    if (whole !== -1 && !/^[A-Za-z]$/.test(q.rawCorrect) && !/^\d+$/.test(q.rawCorrect)) idxs = [whole];
                    else {
                        q.rawCorrect.split(",").forEach(function (tok) {
                            tok = tok.trim(); if (!tok) return;
                            var i = -1;
                            if (/^[A-Za-z]$/.test(tok)) i = LETTERS.indexOf(tok.toUpperCase());
                            else if (/^\d+$/.test(tok)) i = Number(tok) - 1;
                            else i = opts.findIndex(function (o) { return o.trim().toLowerCase() === tok.toLowerCase(); });
                            if (i < 0 || i >= opts.length) err(q.line, "“=> " + tok + "” không khớp đáp án nào.", qi);
                            else if (idxs.indexOf(i) === -1) idxs.push(i);
                        });
                    }
                    item.correct = idxs.sort(function (a, b) { return a - b; });
                }
            } else if (part === "tf") {
                var v = q.rawCorrect ? normTf(q.rawCorrect) : null;
                if (q.rawCorrect && v === null) err(q.line, "Phần Đúng/Sai chỉ nhận “Đúng” hoặc “Sai”.", qi);
                item.correct = v;
            } else {
                var ans = (q.rawCorrect || "").split("|").map(function (x) { return x.trim(); }).filter(Boolean);
                if (q.rawCorrect !== null && !ans.length) err(q.line, "Đáp án rỗng.", qi);
                item.answers = ans.join(" | ");
            }
            out.push(item);
        });
        return { questions: out, note: note.join(" "), errors: errors };
    }

    function escLine(s) {
        return String(s).split("\n").map(function (l, i) {
            return (i > 0 && /^\s*(- |\+\+\)|\+\)|=>)/.test(l)) ? "\\" + l.replace(/^\s+/, "") : l;
        }).join("\n");
    }
    function serializePart(part, list) {
        return list.map(function (q) {
            var o = ["- " + escLine(q.text || "")];
            if (q.image && q.image.trim()) o.push(q.image.trim());
            if (part === "mcq") {
                (q.options || []).forEach(function (t) { o.push("+)" + String(t).replace(/\n/g, " ")); });
                o.push("=> " + (q.correct || []).slice().sort(function (a, b) { return a - b; }).map(function (i) { return LETTERS[i]; }).join(", "));
            } else if (part === "tf") {
                o.push("=> " + (q.correct === true ? "Đúng" : q.correct === false ? "Sai" : ""));
            } else {
                o.push("=> " + (q.answers || ""));
            }
            if (q.explanation && q.explanation.trim()) o.push("++) " + escLine(q.explanation.trim()));
            return o.join("\n");
        }).join("\n");
    }

    // ============================================================
    // STATE ↔ ĐỀ ĐÃ LƯU (GitHub JSON)
    // ============================================================
    function blank(part) {
        var b = { text: "", image: "", explanation: "" };
        if (part === "mcq") { b.options = ["", "", "", ""]; b.correct = []; }
        else if (part === "tf") b.correct = null;
        else b.answers = "";
        return b;
    }
    function fromSaved(part, q) {
        var b = { text: q.text || "", image: q.image || "", explanation: q.explanationHtml || "" };
        if (part === "mcq") {
            b.options = (q.options || []).map(function (o) { return o.text; });
            b.correct = (q.correct || []).map(function (k) {
                return (q.options || []).findIndex(function (o) { return o.key === k; });
            }).filter(function (i) { return i >= 0; });
        } else if (part === "tf") b.correct = q.correct === true ? true : q.correct === false ? false : null;
        else b.answers = (q.answers || []).join(" | ");
        return b;
    }

    // ============================================================
    // RENDER
    // ============================================================
    function imageBlock(q) {
        var iss = imageIssue(q.image);
        var okImg = q.image && !iss;
        return '<div class="qc-img"><label class="qc-l" style="margin-top:0">Ảnh minh hoạ (link https, tuỳ chọn)</label>' +
            '<div class="qc-imgrow"><input type="text" data-f="image" value="' + esc(q.image) + '" placeholder="https://raw.githubusercontent.com/…">' +
            '<button type="button" class="qf-btn danger-s" data-act="rmimg"' + (q.image ? "" : " hidden") + ">Xoá ảnh</button></div>" +
            '<div class="qc-imgwarn">' + esc(iss) + "</div>" +
            '<img class="qc-imgprev" referrerpolicy="no-referrer" alt=""' + (okImg ? ' src="' + esc(q.image) + '"' : " hidden") + "></div>";
    }

    function cardHtml(part, q, i, n) {
        var h = '<div class="qc" data-k="' + part + '" data-i="' + i + '"><div class="qc-head"><b>Câu ' + (i + 1) + "</b>" +
            '<span class="qc-tools"><button type="button" data-act="up" title="Lên"' + (i === 0 ? " disabled" : "") + ">↑</button>" +
            '<button type="button" data-act="down" title="Xuống"' + (i === n - 1 ? " disabled" : "") + ">↓</button>" +
            '<button type="button" data-act="del" title="Xoá câu">✕</button></span></div>' +
            '<label class="qc-l">Nội dung câu hỏi</label><textarea rows="2" data-f="text">' + esc(q.text) + "</textarea>" +
            imageBlock(q);

        if (part === "mcq") {
            h += '<label class="qc-l">Đáp án — tick ô vuông là đáp án đúng (tick nhiều ô = câu nhiều đáp án)</label><div class="qc-opts">' +
                q.options.map(function (t, oi) {
                    var on = q.correct.indexOf(oi) !== -1;
                    return '<div class="qc-opt' + (on ? " ok" : "") + '" data-oi="' + oi + '">' +
                        '<input type="checkbox" data-f="correct"' + (on ? " checked" : "") + ">" +
                        '<span class="ltr">' + LETTERS[oi] + "</span>" +
                        '<input type="text" data-f="opt" value="' + esc(t) + '" placeholder="Nội dung đáp án">' +
                        '<button type="button" data-act="rmopt" title="Xoá đáp án"' + (q.options.length <= 2 ? " disabled" : "") + ">✕</button></div>";
                }).join("") + "</div>" +
                '<button type="button" class="qf-btn small" data-act="addopt" style="margin-top:8px"' + (q.options.length >= MAX_OPT ? " disabled" : "") + ">＋ Thêm đáp án</button>";
        } else if (part === "tf") {
            h += '<label class="qc-l">Đáp án đúng</label><div class="qc-tf">' +
                [[true, "Đúng"], [false, "Sai"]].map(function (c) {
                    return '<label class="' + (q.correct === c[0] ? "ok" : "") + '"><input type="radio" name="tf-' + i + '" data-f="tf" value="' + c[0] + '"' +
                        (q.correct === c[0] ? " checked" : "") + "> " + c[1] + "</label>";
                }).join("") + "</div>";
        } else {
            h += '<label class="qc-l">Đáp án đúng (nhiều cách viết ngăn bằng dấu |)</label><div class="qc-ans">' +
                '<input type="text" data-f="answers" value="' + esc(q.answers) + '" placeholder="VD: 12.57 | 12,57"></div>' +
                '<div class="qc-note">Đáp án là số thì được so với “Sai số cho phép” ở trên (VD 0.01).</div>';
        }
        h += '<label class="qc-l">Giải thích (tuỳ chọn, HTML ngắn)</label><textarea rows="2" data-f="explanation">' + esc(q.explanation) + "</textarea>" +
            '<div class="qc-err"></div></div>';
        return h;
    }

    function renderPart(part) {
        var list = state[part], box = $("cards-" + part);
        if (!box) return;
        box.innerHTML = list.map(function (q, i) { return cardHtml(part, q, i, list.length); }).join("");
        refreshMeta();
    }
    function renderAll() { PARTS.forEach(renderPart); }

    function partPoints(part) { return toNum(($("ppq-" + part) || {}).value, 0); }
    function refreshMeta() {
        var total = 0, n = 0;
        PARTS.forEach(function (k) {
            var cnt = state[k].length, pts = cnt * partPoints(k);
            n += cnt; total += pts;
            if ($("count-" + k)) $("count-" + k).textContent = cnt + " câu";
            if ($("sum-" + k)) $("sum-" + k).textContent = cnt ? cnt + " × " + fmt(partPoints(k)) + " = " + fmt(pts) + " điểm thô" : "";
        });
        var max = toNum($("fMax").value, 0);
        $("saveSummary").textContent = n
            ? n + " câu · tổng " + fmt(total) + " điểm thô → quy về thang " + fmt(max)
            : "Chưa có câu hỏi";
    }

    // ============================================================
    // THÔNG BÁO
    // ============================================================
    function showErrors(list) {
        var box = $("qfErrors");
        if (!list || !list.length) { box.hidden = true; box.innerHTML = ""; return; }
        box.innerHTML = "<b>Chưa lưu được:</b><ul>" + list.map(function (e) {
            return "<li>" + (e.part ? "[" + esc(PART_TITLES[e.part] || e.part) + "] " : "") +
                (e.q ? "Câu " + e.q + ": " : "") + (e.line ? "dòng " + e.line + ": " : "") + esc(e.msg) + "</li>";
        }).join("") + "</ul>";
        box.hidden = false;
        box.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    function showOk(msg) {
        var box = $("qfOk");
        box.textContent = msg || "";
        box.hidden = !msg;
    }

    // ============================================================
    // SỰ KIỆN TRÊN THẺ (uỷ quyền)
    // ============================================================
    function ctx(target) {
        var card = target.closest(".qc");
        if (!card) return null;
        var part = card.getAttribute("data-k"), i = Number(card.getAttribute("data-i"));
        return { card: card, part: part, i: i, q: state[part][i] };
    }

    document.addEventListener("input", function (e) {
        var c = ctx(e.target);
        if (c) {
            var f = e.target.getAttribute("data-f");
            if (f === "text") c.q.text = e.target.value;
            else if (f === "explanation") c.q.explanation = e.target.value;
            else if (f === "answers") c.q.answers = e.target.value;
            else if (f === "opt") c.q.options[Number(e.target.closest(".qc-opt").getAttribute("data-oi"))] = e.target.value;
            else if (f === "image") {
                c.q.image = e.target.value;
                var iss = imageIssue(c.q.image), prev = c.card.querySelector(".qc-imgprev");
                c.card.querySelector(".qc-imgwarn").textContent = iss;
                c.card.querySelector('[data-act="rmimg"]').hidden = !c.q.image;
                if (c.q.image && !iss) { prev.src = c.q.image; prev.hidden = false; } else { prev.hidden = true; }
            }
            return;
        }
        if (/^(ppq-|fMax$|tolerance$)/.test(e.target.id || "")) refreshMeta();
    });

    document.addEventListener("change", function (e) {
        var c = ctx(e.target);
        if (!c) return;
        var f = e.target.getAttribute("data-f");
        if (f === "correct") {
            var oi = Number(e.target.closest(".qc-opt").getAttribute("data-oi"));
            var at = c.q.correct.indexOf(oi);
            if (e.target.checked && at === -1) c.q.correct.push(oi);
            if (!e.target.checked && at !== -1) c.q.correct.splice(at, 1);
            renderPart(c.part);
        } else if (f === "tf") {
            c.q.correct = e.target.value === "true";
            renderPart(c.part);
        }
    });

    document.addEventListener("click", function (e) {
        var addBtn = e.target.closest("[data-add]");
        if (addBtn) { var k = addBtn.getAttribute("data-add"); state[k].push(blank(k)); renderPart(k); return; }

        var btn = e.target.closest("button[data-act]");
        if (!btn) return;
        var c = ctx(btn);
        if (!c) return;
        var act = btn.getAttribute("data-act"), list = state[c.part];

        if (act === "del") {
            if (!confirm("Xoá câu " + (c.i + 1) + "?")) return;
            list.splice(c.i, 1);
        } else if (act === "up" && c.i > 0) {
            list.splice(c.i - 1, 0, list.splice(c.i, 1)[0]);
        } else if (act === "down" && c.i < list.length - 1) {
            list.splice(c.i + 1, 0, list.splice(c.i, 1)[0]);
        } else if (act === "rmimg") {
            c.q.image = "";
        } else if (act === "addopt") {
            if (c.q.options.length < MAX_OPT) c.q.options.push("");
        } else if (act === "rmopt") {
            var oi = Number(btn.closest(".qc-opt").getAttribute("data-oi"));
            if (c.q.options.length <= 2) return;
            c.q.options.splice(oi, 1);
            c.q.correct = c.q.correct.filter(function (x) { return x !== oi; }).map(function (x) { return x > oi ? x - 1 : x; });
        }
        renderPart(c.part);
    });

    // ============================================================
    // CHUYỂN TEXT ↔ CÂU HỎI
    // ============================================================
    $("btnParse").addEventListener("click", function () {
        var errs = [], done = 0;
        PARTS.forEach(function (k) {
            var txt = $("paste-" + k).value;
            if (!txt.trim()) return;
            var r = parsePart(k, txt);
            if (r.errors.length) {
                r.errors.forEach(function (x) { errs.push({ part: k, line: x.line, msg: x.msg }); });
                return;
            }
            if (state[k].length && !confirm(PART_TITLES[k] + " đang có " + state[k].length + " câu. Thay bằng " + r.questions.length + " câu từ text đã dán?")) return;
            state[k] = r.questions;
            if (k === "fill" && r.note && $("fillNote") && !$("fillNote").value.trim()) $("fillNote").value = r.note.slice(0, 300);
            renderPart(k);
            done++;
        });
        showErrors(errs);
        $("syncHint").textContent = errs.length ? "" : (done ? "✓ Đã chuyển " + done + " phần" : "Chưa có text nào để chuyển");
    });

    $("btnExport").addEventListener("click", function () {
        PARTS.forEach(function (k) { $("paste-" + k).value = serializePart(k, state[k]); });
        $("syncHint").textContent = "✓ Đã xuất câu hỏi ra text (có thể copy / sửa rồi chuyển lại)";
    });

    // Prompt mẫu
    var promptBox = $("promptBox");
    if (promptBox && CFG.authoringPrompt) promptBox.textContent = CFG.authoringPrompt;
    $("btnTogglePrompt").addEventListener("click", function () { promptBox.hidden = !promptBox.hidden; });
    $("btnCopyPrompt").addEventListener("click", function () {
        var msg = $("copyMsg");
        navigator.clipboard.writeText(CFG.authoringPrompt || "").then(function () {
            msg.textContent = "✓ Đã sao chép"; setTimeout(function () { msg.textContent = ""; }, 1800);
        }).catch(function () { msg.textContent = "Không sao chép được — bấm “Xem / ẩn prompt” rồi copy tay."; });
    });

    // ============================================================
    // KIỂM TRA + LƯU
    // ============================================================
    function validateAll() {
        var errs = [];
        document.querySelectorAll(".qc").forEach(function (c) { c.classList.remove("qc-bad"); c.querySelector(".qc-err").textContent = ""; });

        var isEdit = CFG.mode === "edit";
        if (!isEdit && !$("fSubject").value) errs.push({ msg: "Chưa chọn môn học." });
        if (!$("fTitle").value.trim()) errs.push({ msg: "Chưa nhập tiêu đề bài." });

        var max = toNum($("fMax").value, NaN);
        if (!(max > 0)) errs.push({ msg: "Thang điểm tối đa phải là số lớn hơn 0 (VD 10 hoặc 2.5)." });

        var dur = toNum($("fDuration").value, NaN);
        if (!(Number.isInteger(dur) && dur >= DUR.min && dur <= DUR.max)) {
            errs.push({ msg: "Thời gian làm bài phải là số phút nguyên từ " + DUR.min + " đến " + DUR.max + "." });
        }

        var total = 0;
        PARTS.forEach(function (k) {
            var list = state[k];
            if (!list.length) return;
            total += list.length;
            if (!(partPoints(k) > 0)) errs.push({ part: k, msg: "“Điểm / câu” phải là số lớn hơn 0 (VD 0.1, 0.2, 0.25, 1)." });
            if (k === "fill" && toNum($("tolerance").value, 0) < 0) errs.push({ part: k, msg: "Sai số cho phép không được âm." });

            // serialize → parse lại để bắt đúng các lỗi mà server sẽ bắt
            var r = parsePart(k, serializePart(k, list));
            r.errors.forEach(function (x) {
                var qi = x.qi;
                if (qi != null && list[qi]) {
                    var card = document.querySelector('.qc[data-k="' + k + '"][data-i="' + qi + '"]');
                    if (card) { card.classList.add("qc-bad"); card.querySelector(".qc-err").textContent += (card.querySelector(".qc-err").textContent ? " · " : "") + x.msg; }
                    errs.push({ part: k, q: qi + 1, msg: x.msg });
                } else errs.push({ part: k, msg: x.msg });
            });
        });
        if (!total) errs.push({ msg: "Cần ít nhất 1 câu hỏi ở một phần nào đó." });
        return errs;
    }

    function collectBody() {
        var body = {
            subjectId: $("fSubject").value,
            title: $("fTitle").value.trim(),
            slug: $("fSlug") ? $("fSlug").value.trim() : "",
            maxScore: toNum($("fMax").value, 10),
            duration: toNum($("fDuration").value, 20),
            promptId: $("fPrompt").value,
            contentHtml: $("fDesc").value,
            tolerance: toNum($("tolerance").value, 0),
            note: $("fillNote").value.trim(),
            aiKeyIds: Array.prototype.map.call(document.querySelectorAll('input[name="aiKeyIds"]:checked'), function (x) { return x.value; }),
            sha: CFG.sha || ""
        };
        PARTS.forEach(function (k) {
            body[k] = serializePart(k, state[k]);
            body["pointsPerQuestion_" + k] = partPoints(k);
        });
        return body;
    }

    $("btnSave").addEventListener("click", async function () {
        if (saving) return;
        showOk("");
        var errs = validateAll();
        if (errs.length) { showErrors(errs); return; }
        showErrors([]);

        saving = true;
        var btn = $("btnSave"), old = btn.textContent;
        btn.disabled = true; btn.textContent = "Đang lưu…";
        try {
            var url = CFG.mode === "edit" ? "/admin/quiz/" + encodeURIComponent(CFG.lessonId) : "/admin/quiz";
            var res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json", Accept: "application/json" },
                body: JSON.stringify(collectBody())
            });
            var data = {};
            try { data = await res.json(); } catch (e) { /* noop */ }
            if (!res.ok || !data.success) {
                if (data.errors && data.errors.length) showErrors(data.errors);
                else showErrors([{ msg: data.message || "Lưu thất bại (" + res.status + ")." }]);
                return;
            }
            showOk("✓ Đã lưu bài trắc nghiệm.");
            setTimeout(function () { window.location.href = "/admin/lessons"; }, 700);
        } catch (err) {
            showErrors([{ msg: "Lỗi mạng: " + err.message }]);
        } finally {
            saving = false; btn.disabled = false; btn.textContent = old;
        }
    });

    // ============================================================
    // KHỞI TẠO
    // ============================================================
    var parts = CFG.parts || {};
    PARTS.forEach(function (k) {
        var p = parts[k];
        state[k] = (p && Array.isArray(p.questions)) ? p.questions.map(function (q) { return fromSaved(k, q); }) : [];
        if ($("paste-" + k) && CFG.raw && CFG.raw[k]) $("paste-" + k).value = CFG.raw[k];
    });
    renderAll();
})();
