(function () {
    "use strict";

    var modal = document.getElementById("testPromptModal");
    var nameEl = document.getElementById("testPromptName");
    var statusEl = document.getElementById("tp-status");
    var resultsEl = document.getElementById("tp-results");
    var resultsBody = document.getElementById("tp-results-body");

    var topicEl = document.getElementById("tp-topic");
    var essayEl = document.getElementById("tp-essay");
    var sampleEl = document.getElementById("tp-sample");
    var modelEl = document.getElementById("tp-model");

    var runSingleBtn = document.getElementById("tp-run-single");
    var runAllBtn = document.getElementById("tp-run-all");

    var currentPromptId = null;

    function escapeHtml(str) {
        var div = document.createElement("div");
        div.textContent = str == null ? "" : String(str);
        return div.innerHTML;
    }

    function setStatus(text, isError) {
        if (!text) {
            statusEl.classList.add("hidden");
            statusEl.textContent = "";
            return;
        }
        statusEl.classList.remove("hidden");
        statusEl.textContent = text;
        statusEl.className = "text-sm " + (isError ? "text-red-600" : "text-gray-500");
    }

    function clearResults() {
        resultsBody.innerHTML = "";
        resultsEl.classList.add("hidden");
    }

    function renderRow(row) {
        var tr = document.createElement("tr");

        var scoreText = row.success && row.score !== null && row.score !== undefined
            ? row.score
            : "--";

        var feedbackText = row.success
            ? (row.feedback || "(không có feedback)")
            : ("❌ " + (row.error || "Lỗi không xác định."));

        tr.innerHTML =
            '<td class="px-4 py-3 font-medium text-gray-900">' + escapeHtml(row.model) + "</td>" +
            '<td class="px-4 py-3">' + escapeHtml(scoreText) + "</td>" +
            '<td class="px-4 py-3 text-gray-500">' + escapeHtml(row.latencyMs != null ? row.latencyMs + " ms" : "--") + "</td>" +
            '<td class="px-4 py-3 ' + (row.success ? "text-gray-700" : "text-red-600") + ' whitespace-pre-wrap">' + escapeHtml(feedbackText) + "</td>";

        resultsBody.appendChild(tr);
    }

    function renderResults(rows) {
        clearResults();
        rows.forEach(renderRow);
        resultsEl.classList.remove("hidden");
    }

    function getPayload() {
        return {
            topic: topicEl.value,
            essay: essayEl.value,
            sampleSolution: sampleEl.value
        };
    }

    function openModal(promptId, promptName) {
        currentPromptId = promptId;
        nameEl.textContent = promptName || "";
        setStatus("");
        clearResults();
        modal.classList.remove("hidden");
    }

    async function runTest(models) {
        if (!currentPromptId) return;

        var essay = essayEl.value.trim();
        if (!essay) {
            setStatus("Vui lòng nhập bài làm mẫu trước khi test.", true);
            return;
        }

        setStatus(models === "all" ? "Đang chạy tất cả model, có thể mất một lúc..." : "Đang gọi model...", false);
        clearResults();
        runSingleBtn.disabled = true;
        runAllBtn.disabled = true;

        var payload = getPayload();
        if (models === "all") {
            payload.models = "all";
        } else {
            payload.model = modelEl.value;
        }

        try {
            var res = await fetch("/admin/prompts/" + currentPromptId + "/test", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            var data = await res.json();

            if (!res.ok || !data.success) {
                setStatus(data.message || "Test thất bại.", true);
                return;
            }

            setStatus("");

            if (data.mode === "all") {
                renderResults(data.results || []);
            } else {
                var single = {
                    model: data.model,
                    success: true,
                    score: data.result && data.result.data ? data.result.data.score : null,
                    feedback: data.result && data.result.data
                        ? data.result.data.feedback
                        : (data.result ? data.result.text : ""),
                    latencyMs: null
                };
                renderResults([single]);
            }
        } catch (error) {
            setStatus("Lỗi kết nối: " + error.message, true);
        } finally {
            runSingleBtn.disabled = false;
            runAllBtn.disabled = false;
        }
    }

    document.addEventListener("click", function (event) {
        var btn = event.target.closest(".test-prompt-btn");
        if (btn) {
            openModal(btn.getAttribute("data-prompt-id"), btn.getAttribute("data-prompt-name"));
        }
    });

    if (runSingleBtn) {
        runSingleBtn.addEventListener("click", function () {
            runTest("single");
        });
    }

    if (runAllBtn) {
        runAllBtn.addEventListener("click", function () {
            runTest("all");
        });
    }
})();
