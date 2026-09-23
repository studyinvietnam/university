// check.js
["auth", "subject", "lesson", "submission", "dispute", "notification", "prompt", "ai", "admin"]
    .forEach((name) => {
        const p = `./routes/${name}`;
        try {
            const m = require(p);
            console.log("✅", p);
        } catch (e) {
            console.log("❌", p, "→", e.message);
        }
    });