// =============================================================
// GEMINI API - WRITING AI
// =============================================================

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const GEMINI_MODEL =
    process.env.GEMINI_MODEL || "gemini-2.5-flash";


// =============================================================
// Táº O PROMPT CHáº¤M WRITING
// =============================================================

function createWritingPrompt(essay, topic = "") {

    return `
Báº¡n lÃ  má»™t giÃ¡o viÃªn cháº¥m bÃ i viáº¿t tiáº¿ng Anh.

Nhiá»‡m vá»¥:

- Äá»c bÃ i viáº¿t do há»c sinh gá»­i.
- ÄÃ¡nh giÃ¡ cháº¥t lÆ°á»£ng bÃ i viáº¿t má»™t cÃ¡ch khÃ¡ch quan.
- Chá»‰ dá»±a trÃªn ná»™i dung bÃ i viáº¿t Ä‘Æ°á»£c cung cáº¥p.
- KhÃ´ng tá»± bá»‹a thÃªm thÃ´ng tin.
- Nháº­n xÃ©t dá»… hiá»ƒu, phÃ¹ há»£p vá»›i há»c sinh.

=============================================================
Äá»€ BÃ€I
=============================================================

${topic}

=============================================================
DÃ€N Ã HÆ¯á»šNG DáºªN LÃ€M BÃ€I WRITING
=============================================================

1. Äá»ŒC Äá»€ VÃ€ XÃC Äá»ŠNH YÃŠU Cáº¦U

- XÃ¡c Ä‘á»‹nh Ä‘Ãºng chá»§ Ä‘á».
- XÃ¡c Ä‘á»‹nh cÃ¡c tá»« khÃ³a quan trá»ng trong Ä‘á».
- Kiá»ƒm tra sá»‘ lÆ°á»£ng tá»«.
- BÃ i yÃªu cáº§u tá»‘i thiá»ƒu 80 tá»«.

2. Láº¬P DÃ€N Ã CÆ  Báº¢N

BÃ i viáº¿t nÃªn cÃ³ 3 pháº§n:

Introduction â€“ Body â€“ Conclusion

2.1. INTRODUCTION

- Viáº¿t 1â€“2 cÃ¢u giá»›i thiá»‡u chung theo Ä‘á» bÃ i.
- Giá»›i thiá»‡u Ä‘Ãºng chá»§ Ä‘á».

2.2. BODY

- Viáº¿t khoáº£ng 3â€“4 cÃ¢u phÃ¡t triá»ƒn Ã½.
- Tráº£ lá»i cÃ¡c cÃ¢u há»i gá»£i Ã½ trong Ä‘á».
- CÃ³ thá»ƒ sá»­ dá»¥ng:
  What / When / Where / Who
- Bá»• sung cÃ¡c chi tiáº¿t:
  mÃ u sáº¯c, thá»i gian, Ä‘á»“ váº­t, hoáº¡t Ä‘á»™ng, cáº£m xÃºc...

2.3. CONCLUSION

- Viáº¿t 1â€“2 cÃ¢u káº¿t Ä‘oáº¡n.
- NÃªu cáº£m xÃºc hoáº·c lÃ½ do thÃ­ch/khÃ´ng thÃ­ch.

3. LÆ¯U Ã NGÃ”N NGá»®

- Sá»­ dá»¥ng thÃ¬ chÃ­nh xÃ¡c.
- Vá»›i bÃ i mÃ´ táº£ thÃ³i quen, Æ°u tiÃªn Present Simple.
- Sá»­ dá»¥ng tá»« ná»‘i phÃ¹ há»£p.

VÃ­ dá»¥:

First,
Then,
After that,
Sometimes,
In the morning,
In the evening,
Because,
So,

- CÃ¢u nÃªn rÃµ rÃ ng, Ä‘Æ¡n giáº£n vÃ  dá»… hiá»ƒu.
- Má»¥c tiÃªu khoáº£ng 80â€“100 tá»«.
- Khoáº£ng 8â€“10 cÃ¢u lÃ  phÃ¹ há»£p.

4. CHECKLIST

Kiá»ƒm tra:

- CÃ³ Introduction khÃ´ng?
- CÃ³ Body khÃ´ng?
- CÃ³ Conclusion khÃ´ng?
- CÃ³ Ä‘á»§ Ã­t nháº¥t 80 tá»« khÃ´ng?
- CÃ³ Ä‘Ãºng chá»§ Ä‘á» khÃ´ng?
- CÃ³ tráº£ lá»i cÃ¡c Ã½ chÃ­nh cá»§a Ä‘á» khÃ´ng?
- ThÃ¬ cÃ³ chÃ­nh xÃ¡c khÃ´ng?
- CÃ³ sá»­ dá»¥ng tá»« ná»‘i khÃ´ng?
- CÃ¡c cÃ¢u cÃ³ liÃªn káº¿t vá»›i nhau khÃ´ng?

=============================================================
TIÃŠU CHÃ CHáº¤M
=============================================================

1. Grammar

- Kiá»ƒm tra lá»—i ngá»¯ phÃ¡p.
- Chá»‰ ra lá»—i quan trá»ng.
- ÄÆ°a ra cÃ¡ch sá»­a.
- KhÃ´ng cá»‘ táº¡o lá»—i náº¿u bÃ i khÃ´ng cÃ³ lá»—i.

2. Vocabulary

- ÄÃ¡nh giÃ¡ Ä‘á»™ Ä‘a dáº¡ng vÃ  chÃ­nh xÃ¡c.
- Kiá»ƒm tra cÃ¡ch dÃ¹ng tá»«.
- Gá»£i Ã½ tá»«/cá»¥m tá»« tá»‘t hÆ¡n náº¿u cáº§n.

3. Coherence & Cohesion

- Kiá»ƒm tra cÃ¡ch triá»ƒn khai Ã½.
- Kiá»ƒm tra sá»± liÃªn káº¿t giá»¯a cÃ¡c cÃ¢u.
- Kiá»ƒm tra bá»‘ cá»¥c Introduction â€“ Body â€“ Conclusion.
- Kiá»ƒm tra cÃ¡ch sá»­ dá»¥ng tá»« ná»‘i.

4. Content

- Kiá»ƒm tra bÃ i viáº¿t cÃ³ tráº£ lá»i Ä‘Ãºng Ä‘á» khÃ´ng.
- Kiá»ƒm tra má»©c Ä‘á»™ phÃ¡t triá»ƒn Ã½.
- Kiá»ƒm tra cÃ¡c Ã½ cÃ²n thiáº¿u.

5. Outline

Kiá»ƒm tra riÃªng:

- Introduction
- Body
- Conclusion

ÄÃ¡nh giÃ¡ xem há»c sinh cÃ³ thá»±c sá»± triá»ƒn khai Ä‘á»§ 3 pháº§n hay khÃ´ng.

6. Overall

- ÄÆ°a ra Ä‘iá»ƒm tá»•ng quan trÃªn thang 10.
- Nháº­n xÃ©t Æ°u Ä‘iá»ƒm.
- Nháº­n xÃ©t Ä‘iá»ƒm cáº§n cáº£i thiá»‡n.
- ÄÆ°a ra 3â€“5 gá»£i Ã½ cá»¥ thá»ƒ.

=============================================================
BÃ€I VIáº¾T Cá»¦A Há»ŒC SINH
=============================================================

"""
${essay}
"""

=============================================================
TRáº¢ Káº¾T QUáº¢ THEO JSON
=============================================================

{
    "score": 0,

    "wordCount": 0,

    "grammar": {
        "score": 0,
        "comment": "",
        "errors": [
            {
                "original": "",
                "corrected": "",
                "explanation": ""
            }
        ]
    },

    "vocabulary": {
        "score": 0,
        "comment": "",
        "suggestions": []
    },

    "coherence": {
        "score": 0,
        "comment": ""
    },

    "content": {
        "score": 0,
        "comment": ""
    },

    "outline": {
        "introduction": {
            "score": 0,
            "comment": ""
        },

        "body": {
            "score": 0,
            "comment": ""
        },

        "conclusion": {
            "score": 0,
            "comment": ""
        }
    },

    "strengths": [],

    "weaknesses": [],

    "improvements": [],

    "overall_comment": ""
}

=============================================================
QUY Táº®C Báº®T BUá»˜C
=============================================================

- Chá»‰ tráº£ vá» JSON há»£p lá»‡.
- KhÃ´ng thÃªm Markdown.
- KhÃ´ng thÃªm \`\`\`json.
- KhÃ´ng thÃªm lá»i giáº£i thÃ­ch bÃªn ngoÃ i JSON.

- score tá»« 0 Ä‘áº¿n 10.
- grammar.score tá»« 0 Ä‘áº¿n 10.
- vocabulary.score tá»« 0 Ä‘áº¿n 10.
- coherence.score tá»« 0 Ä‘áº¿n 10.
- content.score tá»« 0 Ä‘áº¿n 10.

- outline.introduction.score tá»« 0 Ä‘áº¿n 10.
- outline.body.score tá»« 0 Ä‘áº¿n 10.
- outline.conclusion.score tá»« 0 Ä‘áº¿n 10.

- errors luÃ´n lÃ  array.
- suggestions luÃ´n lÃ  array.
- strengths luÃ´n lÃ  array.
- weaknesses luÃ´n lÃ  array.
- improvements luÃ´n lÃ  array.

- wordCount pháº£i lÃ  sá»‘ nguyÃªn.

- KhÃ´ng tá»± bá»‹a lá»—i ngá»¯ phÃ¡p.
- Náº¿u khÃ´ng cÃ³ lá»—i thÃ¬ errors pháº£i lÃ  [].
`;

}


// =============================================================
// Gá»ŒI GEMINI API
// =============================================================

async function checkWritingByGemini(essay, topic = "") {

    if (!GEMINI_API_KEY) {

        throw new Error(
            "ChÆ°a cáº¥u hÃ¬nh GEMINI_API_KEY trong file .env."
        );

    }


    if (!essay || !essay.trim()) {

        throw new Error(
            "BÃ i viáº¿t khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng."
        );

    }


    const prompt =
        createWritingPrompt(
            essay,
            topic
        );


    const url =
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;


    let response;


    try {

        response = await fetch(
            url,
            {

                method: "POST",

                headers: {

                    "Content-Type":
                        "application/json",

                    "X-goog-api-key":
                        GEMINI_API_KEY

                },

                body: JSON.stringify({

                    contents: [

                        {

                            role: "user",

                            parts: [

                                {

                                    text: prompt

                                }

                            ]

                        }

                    ],

                    generationConfig: {

                        temperature: 0.2,

                        responseMimeType:
                            "application/json"

                    }

                })

            }
        );

    } catch (error) {

        console.error(
            "Gemini connection error:",
            error
        );

        throw new Error(
            "KhÃ´ng thá»ƒ káº¿t ná»‘i Ä‘áº¿n Gemini API."
        );

    }


    let data;


    try {

        data =
            await response.json();

    } catch (error) {

        throw new Error(
            "Gemini tráº£ vá» dá»¯ liá»‡u khÃ´ng há»£p lá»‡."
        );

    }


    // =========================================================
    // GEMINI ERROR
    // =========================================================

    if (!response.ok) {

        console.error(
            "Gemini API Error:",
            data
        );


        const message =
            data?.error?.message ||
            "Gemini API khÃ´ng thá»ƒ xá»­ lÃ½ yÃªu cáº§u.";


        throw new Error(message);

    }


    // =========================================================
    // Láº¤Y TEXT
    // =========================================================

    const text =
        data
            ?.candidates
            ?.[0]
            ?.content
            ?.parts
            ?.[0]
            ?.text;


    if (!text) {

        console.error(
            "Gemini response:",
            data
        );


        throw new Error(
            "Gemini khÃ´ng tráº£ vá» káº¿t quáº£ cháº¥m bÃ i."
        );

    }


    // =========================================================
    // PARSE JSON
    // =========================================================

    let result;


    try {

        result =
            JSON.parse(text);

    } catch (error) {

        console.error(
            "JSON Gemini:",
            text
        );


        const cleaned =
            text
                .replace(
                    /^```json\s*/i,
                    ""
                )
                .replace(
                    /^```\s*/i,
                    ""
                )
                .replace(
                    /\s*```$/i,
                    ""
                )
                .trim();


        try {

            result =
                JSON.parse(cleaned);

        } catch (secondError) {

            throw new Error(
                "Gemini tráº£ vá» JSON khÃ´ng há»£p lá»‡."
            );

        }

    }


    return normalizeWritingResult(
        result,
        essay
    );

}


// =============================================================
// CHUáº¨N HÃ“A RESULT
// =============================================================

function normalizeWritingResult(
    data,
    essay
) {

    const wordCount =
        essay
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .length;


    return {

        score:
            normalizeScore(
                data?.score
            ),


        wordCount:
            Number(
                data?.wordCount ??
                wordCount
            ),


        grammar: {

            score:
                normalizeScore(
                    data?.grammar?.score
                ),

            comment:
                String(
                    data?.grammar?.comment ??
                    ""
                ),

            errors:
                Array.isArray(
                    data?.grammar?.errors
                )
                    ? data.grammar.errors
                    : []

        },


        vocabulary: {

            score:
                normalizeScore(
                    data?.vocabulary?.score
                ),

            comment:
                String(
                    data?.vocabulary?.comment ??
                    ""
                ),

            suggestions:
                Array.isArray(
                    data?.vocabulary?.suggestions
                )
                    ? data.vocabulary.suggestions
                    : []

        },


        coherence: {

            score:
                normalizeScore(
                    data?.coherence?.score
                ),

            comment:
                String(
                    data?.coherence?.comment ??
                    ""
                )

        },


        content: {

            score:
                normalizeScore(
                    data?.content?.score
                ),

            comment:
                String(
                    data?.content?.comment ??
                    ""
                )

        },


        outline: {

            introduction: {

                score:
                    normalizeScore(
                        data
                            ?.outline
                            ?.introduction
                            ?.score
                    ),

                comment:
                    String(
                        data
                            ?.outline
                            ?.introduction
                            ?.comment ??
                        ""
                    )

            },


            body: {

                score:
                    normalizeScore(
                        data
                            ?.outline
                            ?.body
                            ?.score
                    ),

                comment:
                    String(
                        data
                            ?.outline
                            ?.body
                            ?.comment ??
                        ""
                    )

            },


            conclusion: {

                score:
                    normalizeScore(
                        data
                            ?.outline
                            ?.conclusion
                            ?.score
                    ),

                comment:
                    String(
                        data
                            ?.outline
                            ?.conclusion
                            ?.comment ??
                        ""
                    )

            }

        },


        strengths:
            normalizeArray(
                data?.strengths
            ),


        weaknesses:
            normalizeArray(
                data?.weaknesses
            ),


        improvements:
            normalizeArray(
                data?.improvements
            ),


        overall_comment:
            String(
                data?.overall_comment ??
                ""
            )

    };

}


// =============================================================
// SCORE
// =============================================================

function normalizeScore(value) {

    const score =
        Number(value);


    if (
        Number.isNaN(score)
    ) {

        return 0;

    }


    return Math.min(
        10,
        Math.max(
            0,
            score
        )
    );

}


// =============================================================
// ARRAY
// =============================================================

function normalizeArray(value) {

    return Array.isArray(value)
        ? value.map(item =>
            String(item)
        )
        : [];

}


// =============================================================
// EXPORT
// =============================================================

module.exports = {

    checkWritingByGemini

};
