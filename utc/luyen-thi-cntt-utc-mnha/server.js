require("dotenv").config();

const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo").default;
const cors = require("cors");
const morgan = require("morgan");

const app = express();

const PORT = process.env.PORT || 3000;

const MONGODB_URI =
    process.env.MONGODB_URI ||
    "mongodb://127.0.0.1:27017/luyen_thi_cntt_utc_mnha";


// ============================================================
// VIEW ENGINE
// ============================================================

app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));


// ============================================================
// MIDDLEWARE
// ============================================================

app.use(cors());

app.use(morgan("dev"));

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

app.use(express.static(path.join(__dirname, "public")));


// ============================================================
// SESSION
// ============================================================

app.use(
    session({
        secret:
            process.env.SESSION_SECRET ||
            "change-this-session-secret",

        resave: false,

        saveUninitialized: false,

        store: MongoStore.create({
            mongoUrl: MONGODB_URI,
            collectionName: "sessions"
        }),

        cookie: {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 1000 * 60 * 60 * 24
        }
    })
);


// ============================================================
// GLOBAL LOCALS
// ============================================================

app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.currentPath = req.path;

    next();
});


// ============================================================
// HOME
// ============================================================

app.get("/", (req, res) => {
    if (!req.session.user) {
        return res.redirect("/auth/login");
    }

    if (req.session.user.status === "pending") {
        return res.redirect("/pages");
    }

    if (req.session.user.role === "admin") {
        return res.redirect("/admin/dashboard");
    }

    return res.redirect("/student/subjects");
});


// ============================================================
// PENDING PAGE
// ============================================================

app.get("/pages", (req, res) => {
    res.render("pages", {
        title: "Chờ duyệt tài khoản"
    });
});


// ============================================================
// ROUTES
// ============================================================

const authRoutes = require("./routes/auth");
const subjectRoutes = require("./routes/subject");
const lessonRoutes = require("./routes/lesson");
const submissionRoutes = require("./routes/submission");
const disputeRoutes = require("./routes/dispute");
const notificationRoutes = require("./routes/notification");
const promptRoutes = require("./routes/prompt");
const aiRoutes = require("./routes/ai");
const adminRoutes = require("./routes/admin");

app.use("/auth", authRoutes);
app.use("/subjects", subjectRoutes);
app.use("/lessons", lessonRoutes);
app.use("/submissions", submissionRoutes);
app.use("/disputes", disputeRoutes);
app.use("/notifications", notificationRoutes);
app.use("/prompts", promptRoutes);
app.use("/ai", aiRoutes);
app.use("/admin", adminRoutes);


// ============================================================
// 404
// ============================================================

app.use((req, res) => {
    res.status(404);

    if (req.accepts("html")) {
        return res.render("pages", {
            title: "Không tìm thấy trang",
            message: "Trang bạn đang truy cập không tồn tại."
        });
    }

    return res.json({
        success: false,
        message: "Không tìm thấy trang."
    });
});


// ============================================================
// ERROR HANDLER
// ============================================================

app.use((err, req, res, next) => {
    console.error("SERVER ERROR:", err);

    if (res.headersSent) {
        return next(err);
    }

    const statusCode = err.status || 500;

    if (req.accepts("html")) {
        return res.status(statusCode).render("pages", {
            title: "Lỗi máy chủ",
            message:
                process.env.NODE_ENV === "production"
                    ? "Đã xảy ra lỗi máy chủ."
                    : err.message
        });
    }

    return res.status(statusCode).json({
        success: false,
        message:
            process.env.NODE_ENV === "production"
                ? "Đã xảy ra lỗi máy chủ."
                : err.message
    });
});


// ============================================================
// START SERVER
// ============================================================

async function startServer() {
    try {
        await mongoose.connect(MONGODB_URI);

        console.log("MongoDB connected");

        app.listen(PORT, () => {
            console.log("");
            console.log("==============================================");
            console.log("  LUYEN THI CNTT UTC - MNHA");
            console.log("==============================================");
            console.log(`  Server: http://localhost:${PORT}`);
            console.log(
                `  Environment: ${process.env.NODE_ENV || "development"}`
            );
            console.log("==============================================");
            console.log("");
        });
    } catch (error) {
        console.error("MongoDB connection failed:");
        console.error(error.message);

        process.exit(1);
    }
}

startServer();

module.exports = app;