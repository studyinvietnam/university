// =============================================================
// BÀI VIẾT 1 - WRITING AI
// =============================================================

document.addEventListener("DOMContentLoaded", function () {

    const essayInput =
        document.getElementById("essayInput");

    const wordCount =
        document.getElementById("wordCount");


    if (!essayInput) {

        console.error(
            "❌ Không tìm thấy #essayInput"
        );

        return;

    }


    // =========================================================
    // ĐẾM SỐ TỪ
    // =========================================================

    function updateWordCount() {

        const text =
            essayInput.value.trim();


        if (!text) {

            if (wordCount) {

                wordCount.textContent = "0";

            }

            return;

        }


        const words =
            text
                .split(/\s+/)
                .filter(word => word.length > 0);


        if (wordCount) {

            wordCount.textContent =
                words.length;

        }

    }


    essayInput.addEventListener(
        "input",
        updateWordCount
    );


    updateWordCount();

});


// =============================================================
// CHẤM BÀI WRITING
// =============================================================

async function checkWritingWithAI() {

    const essayInput =
        document.getElementById("essayInput");

    const checkButton =
        document.getElementById("checkWritingBtn");

    const loading =
        document.getElementById("writingLoading");

    const result =
        document.getElementById("writingResult");


    if (!essayInput) {

        alert(
            "Không tìm thấy ô nhập bài viết."
        );

        return;

    }


    const essay =
        essayInput.value.trim();


    // =========================================================
    // KIỂM TRA RỖNG
    // =========================================================

    if (!essay) {

        alert(
            "Vui lòng nhập bài viết trước khi chấm."
        );

        essayInput.focus();

        return;

    }


    // =========================================================
    // ĐẾM TỪ
    // =========================================================

    const words =
        essay
            .split(/\s+/)
            .filter(word => word.length > 0);


    if (words.length < 10) {

        alert(
            "Bài viết quá ngắn. Vui lòng viết đầy đủ bài trước khi chấm."
        );

        essayInput.focus();

        return;

    }


    // =========================================================
    // LOADING
    // =========================================================

    if (checkButton) {

        checkButton.disabled = true;

        checkButton.innerHTML =
            "⏳ AI đang chấm...";

    }


    if (loading) {

        loading.style.display =
            "block";

    }


    if (result) {

        result.style.display =
            "none";

    }


    try {

        // =====================================================
        // GỌI GEMINI
        // =====================================================

        const data =
            await checkWritingByGemini(essay);


        // =====================================================
        // HIỂN THỊ
        // =====================================================

        displayWritingResult(data);


    } catch (error) {

        console.error(
            "❌ Lỗi chấm Writing:",
            error
        );


        alert(
            "Không thể chấm bài bằng AI.\n\n" +
            error.message
        );


    } finally {

        if (checkButton) {

            checkButton.disabled = false;

            checkButton.innerHTML =
                "🤖 Chấm bài bằng AI";

        }


        if (loading) {

            loading.style.display =
                "none";

        }

    }

}


// =============================================================
// HIỂN THỊ KẾT QUẢ
// =============================================================

function displayWritingResult(data) {

    const result =
        document.getElementById("writingResult");


    if (!result) {

        return;

    }


    // =========================================================
    // SCORE
    // =========================================================

    setText(
        "writingScore",
        formatScore(data.score)
    );


    // =========================================================
    // GRAMMAR
    // =========================================================

    setText(
        "grammarScore",
        `${formatScore(data.grammar?.score)}/10`
    );


    setText(
        "grammarComment",
        data.grammar?.comment || ""
    );


    renderGrammarErrors(
        data.grammar?.errors || []
    );


    // =========================================================
    // VOCABULARY
    // =========================================================

    setText(
        "vocabularyScore",
        `${formatScore(data.vocabulary?.score)}/10`
    );


    setText(
        "vocabularyComment",
        data.vocabulary?.comment || ""
    );


    renderList(
        "vocabularySuggestions",
        data.vocabulary?.suggestions || []
    );


    // =========================================================
    // COHERENCE
    // =========================================================

    setText(
        "coherenceScore",
        `${formatScore(data.coherence?.score)}/10`
    );


    setText(
        "coherenceComment",
        data.coherence?.comment || ""
    );


    // =========================================================
    // CONTENT
    // =========================================================

    setText(
        "contentScore",
        `${formatScore(data.content?.score)}/10`
    );


    setText(
        "contentComment",
        data.content?.comment || ""
    );


    // =========================================================
    // STRENGTHS
    // =========================================================

    renderList(
        "writingStrengths",
        data.strengths || []
    );


    // =========================================================
    // WEAKNESSES
    // =========================================================

    renderList(
        "writingWeaknesses",
        data.weaknesses || []
    );


    // =========================================================
    // IMPROVEMENTS
    // =========================================================

    renderList(
        "writingImprovements",
        data.improvements || []
    );


    // =========================================================
    // OVERALL
    // =========================================================

    setText(
        "overallComment",
        data.overall_comment || ""
    );


    // =========================================================
    // HIỂN THỊ
    // =========================================================

    result.style.display =
        "block";


    result.scrollIntoView({

        behavior: "smooth",

        block: "start"

    });

}


// =============================================================
// SET TEXT AN TOÀN
// =============================================================

function setText(id, value) {

    const element =
        document.getElementById(id);


    if (!element) {

        return;

    }


    element.textContent =
        value;

}


// =============================================================
// FORMAT SCORE
// =============================================================

function formatScore(score) {

    const number =
        Number(score);


    if (Number.isNaN(number)) {

        return "0";

    }


    return Math.max(
        0,
        Math.min(10, number)
    );

}


// =============================================================
// RENDER LIST
// =============================================================

function renderList(elementId, items) {

    const element =
        document.getElementById(elementId);


    if (!element) {

        return;

    }


    element.innerHTML =
        "";


    if (
        !Array.isArray(items) ||
        items.length === 0
    ) {

        const li =
            document.createElement("li");


        li.textContent =
            "Không có nhận xét.";


        element.appendChild(li);

        return;

    }


    items.forEach(function (item) {

        const li =
            document.createElement("li");


        li.textContent =
            String(item);


        element.appendChild(li);

    });

}


// =============================================================
// RENDER GRAMMAR ERRORS
// =============================================================

function renderGrammarErrors(errors) {

    const container =
        document.getElementById("grammarErrors");


    if (!container) {

        return;

    }


    container.innerHTML =
        "";


    if (
        !Array.isArray(errors) ||
        errors.length === 0
    ) {

        const message =
            document.createElement("p");


        message.textContent =
            "Không phát hiện lỗi ngữ pháp quan trọng.";


        container.appendChild(message);

        return;

    }


    errors.forEach(function (error) {

        const card =
            document.createElement("div");


        card.className =
            "grammar-error";


        // -----------------------------------------------------
        // ORIGINAL
        // -----------------------------------------------------

        const original =
            document.createElement("div");


        const originalStrong =
            document.createElement("strong");


        originalStrong.textContent =
            "❌ Gốc: ";


        const originalText =
            document.createElement("span");


        originalText.textContent =
            error?.original || "";


        original.appendChild(
            originalStrong
        );


        original.appendChild(
            originalText
        );


        // -----------------------------------------------------
        // CORRECTED
        // -----------------------------------------------------

        const corrected =
            document.createElement("div");


        const correctedStrong =
            document.createElement("strong");


        correctedStrong.textContent =
            "✅ Sửa: ";


        const correctedText =
            document.createElement("span");


        correctedText.textContent =
            error?.corrected || "";


        corrected.appendChild(
            correctedStrong
        );


        corrected.appendChild(
            correctedText
        );


        // -----------------------------------------------------
        // EXPLANATION
        // -----------------------------------------------------

        const explanation =
            document.createElement("div");


        const explanationStrong =
            document.createElement("strong");


        explanationStrong.textContent =
            "💡 Giải thích: ";


        const explanationText =
            document.createElement("span");


        explanationText.textContent =
            error?.explanation || "";


        explanation.appendChild(
            explanationStrong
        );


        explanation.appendChild(
            explanationText
        );


        // -----------------------------------------------------
        // APPEND
        // -----------------------------------------------------

        card.appendChild(
            original
        );

        card.appendChild(
            corrected
        );

        card.appendChild(
            explanation
        );


        container.appendChild(
            card
        );

    });

}