# 📚 Hệ Thống Nộp Bài Tập Tích Hợp Google AI

## 🎯 Tổng Quan

Hệ thống web cho phép sinh viên nộp bài tập trực tuyến, tự động chấm điểm bằng **Google AI (Gemini)**, quản lý bài tập/môn học linh hoạt, lưu trữ bài nộp và đề bài dưới dạng **JSON trên GitHub**, đồng thời lưu metadata (ID, key, người dùng…) trên **MongoDB**.

- **Backend:** Node.js (Express) + Pug (view engine)
- **Database:** MongoDB (Mongoose)
- **Storage đề bài & bài nộp:** GitHub (JSON)
- **AI chấm bài:** Google Gemini API
- **Email:** Nodemailer (xác thực đăng ký / quên mật khẩu)
- **Xác thực:** Email + Password (bcrypt hash), session/JWT
- **Thông báo:** Notification system (polling, không cần WebSocket)
- **Prompt chấm:** Quản lý linh hoạt trong Admin (theo môn / bài / global)
- **Frontend:** Pug templates + CSS (đẹp cho cả Admin & Student)

---

## 🧩 Kiến Trúc Hệ Thống

```
views
└── admin
    ├── dashboard.pug
    ├── subjects.pug
    ├── lessons.pug
    ├── roles.pug
    ├── users.pug
    ├── aikeys.pug
    ├── prompts.pug
    ├── submissions.pug
    └── auditlog.pug

```

```
Client (Browser)
   │
   ▼
Node.js Server (Express + Pug)
   ├── MongoDB  ──► Lưu user, role, key AI, ID bài/môn, log chấm, notifications, prompt
   ├── GitHub   ──► Lưu JSON đề bài + JSON bài nộp + JSON kết quả chấm
   └── Google AI ──► Chấm điểm (dùng prompt lấy từ DB theo thứ tự ưu tiên)
```

---

## 👥 Vai Trò Người Dùng

| Role | Quyền |
|------|-------|
| **Admin** | Duyệt user, quản lý môn/bài/role, quản lý key Google AI, **quản lý prompt chấm**, xem thống kê |
| **Student** | Xem bài tập, làm bài, nộp, xem lịch sử + điểm |
| **Client** | **CHỈ hiển thị trang `pages.pug` với thông báo "Vui lòng chờ Admin duyệt..."** |

### 🔒 Luồng phân quyền

- Role mặc định khi đăng ký: `client` → chỉ render `pages.pug` chờ duyệt.
- Admin duyệt → đổi thành `student`/`admin` → sinh notification `account_approved`.
- `student` → xem/làm/nộp bài.
- `admin` → vào trang quản trị.

> ⚠️ **Middleware chặn `client` phải áp dụng ở tầng API/route, không chỉ ở tầng render view** — nếu chỉ chặn render, client vẫn có thể gọi thẳng các endpoint ẩn (`/api/...`) để lấy dữ liệu.

---

## 🔐 Xác Thực & Bảo Mật

### Đăng ký
1. Nhập email + password + tên → hash (bcrypt) → gửi mã 6 số qua Nodemailer.
2. Nhập mã đúng → kích hoạt với `role = client`.
3. Thông báo **"Tạo tài khoản thành công"** → chuyển đăng nhập.

### Đăng nhập
- Email + Password → session/JWT → điều hướng theo role.

### Quên mật khẩu
1. Nhập email → gửi mã 6 số.
2. Nhập mã đúng → đổi mật khẩu mới.
3. Thông báo **"Đổi mật khẩu thành công"** → chuyển đăng nhập.

### Chống lạm dụng (bổ sung)
- **OTP:** giới hạn số lần thử sai (vd tối đa 5 lần), thời gian hết hạn rõ ràng (5–10 phút), giới hạn số lần gửi lại mã (chống spam email).
- **Rate-limit** cho route đăng nhập, quên mật khẩu, nộp bài (chống brute-force).
- **JWT:** cần nêu rõ thời gian hết hạn, cơ chế refresh, và revoke khi user đổi mật khẩu.

---

## 📦 Cấu Trúc Dữ Liệu

### MongoDB (metadata)
```js
User     { _id, email, passwordHash, name, role, verified, createdAt }
Role     { _id, name, permissions, deletedAt, deletedForever }
Subject  { _id, name, slug, githubFolder, promptId (optional), deletedAt, deletedForever }
Lesson   { _id, subjectId, title, slug, githubFile, promptId (optional), deletedAt, deletedForever }
Submission { _id, userId, lessonId, githubFile, score, gradedAt, submittedAt, promptSnapshot }
AIKey    { _id, name, encryptedKey: { iv, content, authTag }, active, createdAt }
OTP      { _id, email, code, type ('register'|'reset'), attempts, expiresAt }
Notification {
  _id, userId, type, title, message, link, isRead, createdAt
}

// Prompt chấm điểm
GradingPrompt {
  _id,
  name,              // "Chấm chặt - Lập trình căn bản"
  description,
  content,           // Nội dung prompt chính (system prompt cho AI)
  rubric,            // Thang điểm dạng JSON: [{ criterion, weight, description }]
  strictness,        // 'lenient' | 'normal' | 'strict' | 'very_strict'
  maxScore,          // Điểm tối đa (vd: 10, 100)
  isDefault,         // Prompt mặc định toàn hệ thống
  scope,             // 'global' | 'subject' | 'lesson'
  subjectId,         // nếu scope = subject
  lessonId,          // nếu scope = lesson
  variables,         // Biến động: ['{đề_bài}', '{bài_làm}', '{rubric}', '{max_score}']
  version,           // Số phiên bản, tăng mỗi lần sửa nội dung
  active,
  createdAt,
  updatedAt
}

// Audit log cho hành động admin nhạy cảm
AuditLog {
  _id, adminId, action, targetType, targetId, detail, createdAt
  // vd: action = 'change_role' | 'delete_prompt' | 'add_ai_key' | 'revoke_ai_key' | 'override_score'
}
```

> **Lưu ý quan trọng:** `Submission.promptSnapshot` lưu **toàn bộ nội dung prompt tại thời điểm chấm** (không chỉ `promptId`) — vì nếu admin sửa prompt sau đó, `promptId` vẫn còn nhưng nội dung đã khác, sẽ không thể biết chính xác bài đã được chấm bằng prompt nào lúc đó.

### GitHub (JSON lưu trữ)
```
/repo
  /subjects
    /{subject-slug}
       subject.json          ← { name, description, lessons: [...] }
       /lessons
          {lesson-slug}.json ← { title, contentHtml, attachments, promptId? }
  /submissions
    /{subject-slug}/{lesson-slug}/{userId}-{timestamp}.json
       { userId, lessonId, answerHtml, score, feedback, gradedAt, promptSnapshot }
```

> Mọi đề bài / bài nộp / kết quả AI đều **JSON**. Đề bài có thể chứa **HTML nhúng trong JSON** → frontend tự render.

### Đồng bộ GitHub ↔ MongoDB (quan trọng)
- Ghi MongoDB trước với trạng thái `pending` → push GitHub → nếu thành công, cập nhật MongoDB thành `committed`; nếu thất bại, giữ `pending` và có job retry định kỳ.
- Dùng **queue** (vd Bull/BullMQ + Redis, hoặc đơn giản hơn là in-memory queue nếu quy mô nhỏ) để tránh gọi GitHub API dồn dập khi nhiều sinh viên nộp bài cùng lúc — GitHub API có rate limit (~5000 req/giờ với token thường).
- Khi update file JSON trên GitHub cần **SHA của file cũ** — xử lý race condition (lỗi 409) bằng cách lấy lại SHA mới nhất và retry.

---

## 🎯 Hệ Thống Prompt Chấm Điểm (Trang Admin)

### Mục tiêu
Cho phép admin **tự thêm/sửa prompt** để linh hoạt điều chỉnh **độ chặt chẽ** khi chấm — không cần sửa code.

### Cơ chế ưu tiên khi chấm

```
1. Lesson.promptId   (prompt gán riêng cho bài học)
      │
      ▼
2. Subject.promptId  (prompt gán riêng cho môn)
      │
      ▼
3. GradingPrompt { scope: 'global', isDefault: true, active: true }
      │
      ▼
4. Prompt mặc định hardcoded (fallback an toàn nếu DB trống)
```

### Cấu trúc 1 prompt

```js
{
  name: "Chấm chặt - Lập trình căn bản",
  description: "Dùng cho bài code, trừ điểm nặng nếu thiếu edge cases",
  strictness: "strict",
  maxScore: 10,
  rubric: [
    { criterion: "Đúng logic", weight: 50, description: "Thuật toán đúng, không lỗi" },
    { criterion: "Chất lượng code", weight: 20, description: "Clean, có comment" },
    { criterion: "Xử lý edge case", weight: 20, description: "Có test các case biên" },
    { criterion: "Trình bày", weight: 10, description: "Format rõ ràng" }
  ],
  content: `
Bạn là giảng viên chấm bài môn Lập trình căn bản.
Hãy chấm CHẶT CHẼ theo rubric sau: {rubric}

Đề bài:
{đề_bài}

Bài làm sinh viên:
{bài_làm}

Yêu cầu định dạng đầu ra:
- Nếu trong {đề_bài} hoặc yêu cầu bổ sung của người dùng CÓ quy định định dạng trả về cụ thể (ví dụ: Markdown, HTML, văn bản tự do, ...), hãy tuân thủ chính xác định dạng được yêu cầu đó.
- Nếu KHÔNG CÓ yêu cầu định dạng nào khác, mặc định trả về duy nhất một object JSON với cấu trúc:
  {
    "score": number,      // Điểm số (Tối đa: {max_score})
    "feedback": string,   // Nhận xét tổng quan, thẳng thắn và chỉ rõ lỗi
    "breakdown": [        // Chi tiết điểm từng tiêu chí theo rubric
      {
        "criterion": string,
        "score": number,
        "comment": string
      }
    ]
  }

Quy tắc chấm điểm:
- Điểm tối đa: {max_score}
- Nếu thiếu xử lý edge case, trừ tối thiểu 20% tổng số điểm cho mỗi case bị thiếu/lỗi.
- Nhận xét thẳng thắn, rõ ràng, chỉ ra chính xác dòng code hoặc logic bị lỗi.
  `
}
```

### Biến động (variables) được hỗ trợ

| Biến | Ý nghĩa |
|------|---------|
| `{đề_bài}` | Nội dung đề bài (HTML/text từ GitHub JSON) |
| `{bài_làm}` | Nội dung student nộp (đã sanitize, xem phần Bảo mật AI) |
| `{rubric}` | Rubric JSON đã format |
| `{max_score}` | Điểm tối đa |
| `{strictness}` | Mức độ chặt |
| `{student_name}` | Tên student |

### Trang Admin — Quản lý Prompt

**Route:** `/admin/prompts`

Chức năng:
- ➕ **Tạo prompt mới**: name, description, strictness, maxScore, rubric (builder hoặc JSON editor), content.
  - **Validate**: tổng `weight` trong rubric phải = 100%, không cho lưu nếu sai.
- 👁 **Xem chi tiết** + preview (thay thế biến bằng dữ liệu mẫu).
- ✏️ **Sửa** prompt → tăng `version`, lưu bản cũ vào lịch sử (không mất dữ liệu tham chiếu cũ).
  - Nếu đã dùng → cảnh báo "Prompt này đã được dùng X lần, sửa sẽ ảnh hưởng các bài mới chấm sau này".
- ⭐ **Đặt làm mặc định** (`isDefault: true` — chỉ 1 prompt global mặc định).
- 🔗 **Gán cho môn** (`scope: subject`) hoặc **cho bài** (`scope: lesson`).
- 🗑 **Xoá tạm** (`active: false`) / **Xoá vĩnh viễn**.
  - Khi prompt bị vô hiệu hoá mà đang được gán cho lesson/subject → **tự động fallback về global default**, tránh lỗi runtime khi chấm bài.
- 🧪 **Test prompt**: chọn 1 bài nộp cũ → chấm lại → so sánh điểm (không ghi đè, chỉ để xem thử).
  - **Giới hạn số lần test/ngày** vì mỗi lần test vẫn tốn quota/tiền gọi Gemini thật.
- 🔁 **Chấm lại hàng loạt (re-grade)**: khi đổi prompt/rubric cho một bài đã có nhiều lượt nộp, cho phép admin chọn re-grade toàn bộ hoặc theo khoảng thời gian, chạy nền (background job) để không block server.

### Trang Admin — Gán prompt cho môn / bài

Trong trang **Môn học** hoặc **Bài học**:
- Dropdown "Prompt chấm" → chọn từ danh sách prompt đang active.
- Nếu để trống → dùng prompt global mặc định.

### Ví dụ điều chỉnh độ chặt

| Prompt | strictness | Khi nào dùng |
|--------|-----------|--------------|
| "Chấm nhẹ - Khuyến khích" | `lenient` | Bài đầu khóa |
| "Chấm chuẩn" | `normal` | Bài giữa khóa (default) |
| "Chấm chặt - Cuối khóa" | `strict` | Bài kiểm tra cuối |

→ Chỉ cần **đổi dropdown** ở bài học, không cần sửa code.

---

## 🧠 Chỉ Lỗi Sai, Lời Giải Mẫu & So Sánh Nhiều Model AI

### 1. Chỉ lỗi sai + gợi ý sửa
- `aiService.js` yêu cầu Gemini trả thêm `grammar.errors: [{ original, corrected, explanation }]` trong JSON chấm bài.
- **Chỉ điền khi lỗi thực sự tồn tại** trong bài — prompt cấm AI tự bịa lỗi; nếu không phát hiện lỗi nào thì `errors` là mảng rỗng.
- `views/student/history.pug` hiển thị badge số lỗi phát hiện được ngay ở danh sách lịch sử; nếu đã chấm mà không có lỗi thì hiện "Không có lỗi".
- Trang chi tiết bài nộp (chưa có trong repo hiện tại, cần bổ sung `views/student/submission_detail.pug` + route) nên hiển thị đầy đủ từng lỗi: câu gốc → câu sửa → giải thích.

### 2. Lời giải mẫu (nếu đề bài có sẵn)
- `services/promptService.js` hỗ trợ biến `{lời_giải_mẫu}` khi render prompt tùy chỉnh (GradingPrompt).
- `services/aiService.js`: `checkWritingByGemini(topic, essay, timeoutMs, model, sampleSolution)` — khi có `sampleSolution`, AI so sánh và trả `sampleComparison.missingPoints` (các ý học sinh còn thiếu so với lời giải mẫu), **không** chép nguyên văn lời giải mẫu vào feedback.
- ⚠️ Ô nhập "Lời giải mẫu" khi tạo/sửa bài học (`views/admin/lessons.pug`) **chưa được thêm** vì form tạo/sửa bài học (`/admin/lessons/create`, `/admin/lessons/:id/edit`) không có trong các file đã gửi — trang `lessons.pug` hiện tại chỉ là danh sách. Gửi thêm file đó để bổ sung ô nhập.
- Cần đảm bảo `sampleSolution` **chỉ trả về sau khi sinh viên đã nộp và được chấm**, không lộ trước — xử lý ở controller lấy bài học cho student (`lesson_controller.js` hiện chưa có field này trong `Lesson` model, cần bổ sung khi có model `Lesson.js`).

### 3. Chọn & so sánh model AI (Gemini)
- `config/aiModels.js`: danh sách `SUPPORTED_MODELS` + `DEFAULT_MODEL`, sửa ở một chỗ duy nhất khi Google đổi model.
- `services/aiService.js`:
  - `checkWritingByGemini(...)` nhận thêm tham số `model` (mặc định `DEFAULT_MODEL`).
  - `runAllModels(topic, essay, { models })` chấm 1 bài lần lượt qua toàn bộ `SUPPORTED_MODELS`, gom `{ model, score, feedback, latencyMs, error }`.
  - `runCustomPrompt` / `runCustomPromptAllModels` dùng riêng cho nút **"Test prompt"** ở trang Admin — chạy đúng nội dung prompt admin đang soạn (qua `promptService.renderPromptTemplate`), không dùng prompt IELTS cố định.
- `models/ModelComparison.js`: lưu kết quả so sánh (`promptId`, `promptSnapshot`, `results[]`, `createdBy`).
- `controllers/prompt.controller.js` → `testPrompt`: `POST /admin/prompts/:id/test`, body `{ topic, essay, sampleSolution, model }` (1 model) hoặc `{ models: 'all' }` (chạy hết + lưu `ModelComparison`).
- `views/admin/prompts.pug` có modal **"Test / So sánh model"**: dropdown chọn model, nút "Chạy model này" / "Chạy tất cả model", bảng kết quả (model / điểm / thời gian / feedback).
- `public/js/modelCompare.js`: xử lý gọi API và render bảng so sánh phía client.

**Cần thêm `GEMINI_API_KEY` hợp lệ trong `.env`** — nếu thiếu hoặc còn giá trị placeholder (`1111`, `YOUR_NEW_GEMINI_API_KEY`), `aiService.js` sẽ chủ động báo lỗi `GEMINI_API_KEY chưa được cấu hình.` thay vì gọi API thất bại mập mờ.

---

## 🔔 Hệ Thống Thông Báo

### Vị trí UI
```
[Logo] [Menu...]      🔔(3)   user@email.com   [Đăng xuất]
```

### Sự kiện sinh thông báo
| Sự kiện | type |
|---------|------|
| AI chấm xong bài | `graded` |
| Admin duyệt role | `account_approved` |
| Admin tạo bài mới trong môn SV theo | `new_lesson` |
| Hệ thống | `system` |

### Cơ chế
- Route `GET /api/notifications?unread=true` → badge + danh sách.
- **Polling mỗi 30–60s** bằng JS (đủ dùng, không cần Socket.io).
  - Chỉ poll khi tab đang active (`document.visibilitychange`), tăng interval hoặc dừng khi tab ẩn để giảm tải server.
- Click 🔔 → dropdown → `PATCH /api/notifications/:id/read`.
- Nút **"Đánh dấu tất cả đã đọc"** (`PATCH /api/notifications/read-all`).
- Middleware `attachUnreadCount` chạy trước mọi render Pug → badge ở `layout.pug`.
- **Dọn dẹp định kỳ**: tự động archive/xoá notification cũ hơn 30–90 ngày để tránh collection phình to.

```js
// middleware/attachUnreadCount.js
module.exports = async function (req, res, next) {
  res.locals.unreadCount = req.user
    ? await Notification.countDocuments({ userId: req.user._id, isRead: false })
    : 0;
  next();
};
```

---

## 🔐 Lưu Google AI Key An Toàn

### Nguyên tắc
> **Không bao giờ lưu key ở dạng plaintext**, master key **không nằm chung chỗ với dữ liệu đã mã hoá**.

### AES-256-GCM

```js
// services/cryptoService.js
const crypto = require('crypto');

const MASTER_KEY = Buffer.from(process.env.ENCRYPTION_MASTER_KEY, 'hex'); // 32 bytes

function encrypt(plainText) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', MASTER_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    iv: iv.toString('hex'),
    content: encrypted.toString('hex'),
    authTag: authTag.toString('hex')
  };
}

function decrypt({ iv, content, authTag }) {
  const decipher = crypto.createDecipheriv('aes-256-gcm', MASTER_KEY, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  return Buffer.concat([
    decipher.update(Buffer.from(content, 'hex')),
    decipher.final()
  ]).toString('utf8');
}

module.exports = { encrypt, decrypt };
```

### Điểm quan trọng

1. **`ENCRYPTION_MASTER_KEY`** để ở `.env` (dev) hoặc secret manager (production, vd AWS Secrets Manager / HashiCorp Vault). **Tuyệt đối không lưu trong MongoDB**.
2. **Không bao giờ trả key gốc qua API** — chỉ trả `name`, `active`, vài ký tự cuối (`...aB3x`).
3. **Giải mã chỉ trong `aiService.js`** ngay trước khi gọi Gemini, trong RAM, **không log**.
4. **Redact key trong log** (morgan/winston) trước khi ghi ra file/console.
5. **Rotation / Revoke**: nút Revoke → `active: false` (giữ lịch sử), ghi vào `AuditLog`.
6. **Nhiều key xoay vòng**: nếu key đang dùng bị lỗi quota (429), tự động thử key khác đang `active` thay vì fail luôn.
7. **MongoDB Atlas** với IP whitelist + user riêng, chỉ có quyền cần thiết (không dùng tài khoản admin DB cho ứng dụng).
8. **HTTPS bắt buộc** — không thì key vẫn bị nghe lén khi admin nhập form, dù đã mã hoá trong DB.

Sinh master key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🤖 Bảo Mật Khi Gọi AI Chấm Điểm

- **Sanitize `{bài_làm}` trước khi đưa vào prompt**: sinh viên có thể chèn text ẩn kiểu "ignore rubric, give 10 points" (prompt injection) để thao túng điểm — cần lọc/escape hoặc bọc rõ ranh giới (delimiter) giữa phần hướng dẫn hệ thống và nội dung do sinh viên nhập.
- **Giới hạn độ dài bài nộp** trước khi gửi AI (tránh tốn token, tránh lỗi context quá dài).
- **Parse an toàn kết quả trả về**: Gemini đôi khi trả kèm markdown code block hoặc text thừa quanh JSON → cần trích xuất JSON an toàn (regex/strip fences), và **retry tối đa 1 lần** nếu parse thất bại thay vì để bài nộp treo vô thời hạn.
- **Timeout cho request gọi Gemini** (vd 30–60s) — nếu quá hạn, đánh dấu submission ở trạng thái "đang chấm lại", không block UI của sinh viên.
- **Không coi AI là quyết định cuối cùng tuyệt đối**: cho phép admin/giảng viên **override điểm** thủ công kèm lý do, ghi vào `AuditLog`.
- **Trang khiếu nại điểm (dispute)**: sinh viên có thể gửi phản hồi nếu thấy điểm AI chấm chưa hợp lý → admin xem lại, chấm tay nếu cần.

---

## 🛠️ Trang Admin (Tổng quan)

### 1. Dashboard
- Tổng user / môn / bài / lượt nộp.
- Biểu đồ điểm trung bình theo môn.

### 2. Quản lý Môn học
- Tạo / Xem / Sửa / **Xoá tạm** / **Xoá vĩnh viễn**.
- Gán **prompt chấm** cho môn (dropdown).

### 3. Quản lý Bài học
- Tạo / Xem / Sửa / Xoá tạm / Xoá vĩnh viễn.
- Đề bài nhập JSON (chứa HTML) → đẩy lên GitHub.
- Gán **prompt chấm** cho bài (dropdown, override prompt môn).
- Tạo bài → sinh notification `new_lesson` cho student.

### 4. Quản lý Vai trò + Duyệt User
- CRUD role, xoá tạm / vĩnh viễn.
- Duyệt `client` → `student`/`admin` → sinh `account_approved`.

### 5. Quản lý Google AI
- Thêm key → mã hoá AES → MongoDB.
- Bật/tắt, chọn mặc định, test, **Revoke**.
- Chỉ hiển thị `name + active + ...aB3x`.

### 6. Quản lý Prompt Chấm
- CRUD prompt, gán scope (global/subject/lesson).
- Đặt default, test prompt, xem lịch sử phiên bản (`version`).
- Re-grade hàng loạt khi cần.
- Điều chỉnh độ chặt chẽ không cần sửa code.

### 7. Quản lý Bài tập
- Danh sách bài nộp theo môn/bài.
- Thống kê: **Ai – Bài gì – Bao nhiêu điểm – Thời gian nào – Prompt nào đã chấm**.
- Xem/giải quyết khiếu nại điểm (dispute).

### 8. Audit Log
- Xem lịch sử hành động nhạy cảm: đổi role, sửa/xoá prompt, thêm/xoá/revoke AI key, override điểm.

---

## 🎓 Trang Student

- 📖 Danh sách môn + bài tập.
- ✍️ Mở bài → render HTML đề bài.
- 📤 Nộp → AI chấm (dùng prompt đã cấu hình) → lưu GitHub → hiện kết quả.
- 📜 Lịch sử: bài nào, điểm, AI nhận xét, prompt đã dùng, lúc nào.
- 🔔 Nhận thông báo.
- ❗ Gửi khiếu nại điểm nếu cần.

---

## 🚫 Trang Client (`pages.pug`)

- Middleware chặn mọi route/API khác (không chỉ chặn render).
- Chỉ render:
  ```
  ⏳ Tài khoản của bạn đang chờ Admin duyệt.
  Vui lòng quay lại sau khi được phê duyệt.
  ```
- 🔔 Vẫn nhận thông báo khi admin duyệt.

---

## ⚠️ Quy Tắc Sửa Bài

- Sửa đề bài **trực tiếp trên web?** → Không.
- **Vào GitHub** sửa file JSON tương ứng.
- Thông báo hiển thị:
  > ❗ *"Vui lòng sửa bài trên GitHub trực tiếp. Hệ thống sẽ tự đồng bộ sau."*
- Bài mới (chưa publish) → admin có thể sửa trên web → **embed lại code** → push GitHub.

---

## 🔄 Luồng Nộp Bài (đầy đủ)

```
Student nhập bài
      │
      ▼
Server xác định prompt (lesson → subject → global → fallback)
      │
      ▼
Render prompt với {đề_bài}, {bài_làm} (đã sanitize), {rubric}, {max_score}...
      │
      ▼
Giải mã AI key (AES trong RAM) → gọi Gemini API (có timeout)
      │
      ▼
AI trả JSON { score, feedback, breakdown }
      │  (nếu parse lỗi → retry 1 lần; nếu quota lỗi → thử key khác)
      ▼
Push JSON kết quả + promptSnapshot lên GitHub (qua queue, có retry)
      │
      ▼
Lưu metadata vào MongoDB (score, time, promptSnapshot, status)
      │
      ▼
Sinh Notification 'graded' cho student
      │
      ▼
Frontend hiển thị lịch sử + badge 🔔 tăng
```

---

## 🧰 Công Nghệ

| Thành phần | Công nghệ |
|-----------|-----------|
| Backend | Node.js + Express |
| View engine | Pug |
| DB | MongoDB + Mongoose |
| Auth | bcrypt, JWT / express-session |
| Mail | Nodemailer |
| AI | Google Gemini API (@google/genai) |
| Storage | GitHub REST API (Octokit) |
| Crypto | Node.js `crypto` (AES-256-GCM) |
| Queue (đồng bộ GitHub) | BullMQ + Redis (hoặc in-memory nếu quy mô nhỏ) |
| Notification | Polling (30–60s), dừng khi tab ẩn |
| Prompt | MongoDB + template variables + versioning |
| Frontend | Pug + CSS + Vanilla JS |
| Env | dotenv |

---

## 📁 Cấu Trúc Thư Mục

```
project/
├── server.js
├── config/
│   ├── db.js
│   ├── github.js
│   └── mailer.js
├── models/
│   ├── User.js
│   ├── Role.js
│   ├── Subject.js
│   ├── Lesson.js
│   ├── Submission.js
│   ├── AIKey.js
│   ├── OTP.js
│   ├── Notification.js
│   ├── GradingPrompt.js
│   ├── ModelComparison.js     ← MỚI (lưu kết quả so sánh nhiều model)
│   └── AuditLog.js            ← MỚI
├── routes/
│   ├── auth.js
│   ├── admin.js
│   ├── subject.js
│   ├── lesson.js
│   ├── submission.js
│   ├── ai.js
│   ├── notification.js
│   ├── prompt.js
│   └── dispute.js             ← MỚI (khiếu nại điểm)
├── controllers/                ← MỚI (tách logic khỏi routes)
│   ├── auth.controller.js
│   ├── subject.controller.js
│   ├── lesson.controller.js
│   ├── submission.controller.js
│   ├── aikey.controller.js
│   ├── prompt.controller.js
│   ├── notification.controller.js
│   └── dispute.controller.js
├── services/
│   ├── githubService.js
│   ├── aiService.js           ← timeout, chọn model, chấm 1 bài & so sánh nhiều model, parse an toàn
│   ├── mailService.js
│   ├── cryptoService.js
│   ├── notificationService.js
│   ├── promptService.js       ← render biến (kể cả {lời_giải_mẫu}), chọn prompt ưu tiên, versioning
│   ├── sanitizeService.js     ← MỚI (chống prompt injection)
│   └── syncQueueService.js    ← MỚI (queue đồng bộ GitHub, retry)
├── config/
│   └── aiModels.js            ← MỚI (danh sách SUPPORTED_MODELS + DEFAULT_MODEL)
├── middleware/
│   ├── auth.js
│   ├── role.js                ← chặn client ở tầng API
│   └── attachUnreadCount.js
├── views/
│   ├── layout.pug
│   ├── pages.pug
│   ├── auth/…
│   ├── admin/
│   │   ├── dashboard.pug
│   │   ├── subjects.pug
│   │   ├── lessons.pug
│   │   ├── roles.pug
│   │   ├── aikeys.pug
│   │   ├── prompts.pug
│   │   └── auditlog.pug       ← MỚI
│   └── student/
│       ├── subjects.pug
│       ├── lesson.pug
│       ├── history.pug
│       └── dispute.pug        ← MỚI
├── public/
│   ├── css/
│   └── js/
│       ├── notifications.js
│       └── modelCompare.js    ← MỚI (modal test/so sánh model ở trang Admin Prompt)
└── .env
```

---

## 🔑 Biến Môi Trường (.env)

```env
PORT=3000
MONGO_URI=mongodb://...
JWT_SECRET=...
SESSION_SECRET=...

GITHUB_TOKEN=...
GITHUB_OWNER=your-username
GITHUB_REPO=your-repo

GEMINI_API_KEY=...
ENCRYPTION_MASTER_KEY=...     # 64 hex, KHÔNG commit

MAIL_USER=...
MAIL_PASS=...

NOTIFY_POLL_INTERVAL=45000
AI_REQUEST_TIMEOUT_MS=45000
OTP_MAX_ATTEMPTS=5
OTP_EXPIRES_MINUTES=10
```

Sinh key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## ✅ Checklist Tính Năng

- [x] Đăng ký + xác thực email (Nodemailer)
- [x] Đăng nhập + hash password
- [x] Quên mật khẩu qua OTP (giới hạn số lần thử + hết hạn)
- [x] Phân quyền Admin / Student / Client (chặn cả tầng API)
- [x] Client chỉ thấy `pages.pug` chờ duyệt
- [x] Admin duyệt user → sinh notification
- [x] CRUD Môn (soft/hard delete)
- [x] CRUD Bài (soft/hard delete) + notification bài mới
- [x] Đề bài & bài nộp JSON trên GitHub
- [x] Đồng bộ GitHub–MongoDB qua queue, có retry
- [x] AI chấm tự động → notification `graded`
- [x] AI: timeout, retry parse lỗi, xoay key khi hết quota
- [x] Sanitize input chống prompt injection
- [x] Lịch sử + điểm + feedback
- [x] Thống kê theo môn / user / prompt
- [x] Key AI mã hoá AES-256-GCM, master key ngoài MongoDB
- [x] Không trả key gốc / không log key
- [x] Revoke + rotation key
- [x] Notification 🔔 (badge + polling, dừng khi tab ẩn)
- [x] Middleware `attachUnreadCount`
- [x] Prompt chấm cấu hình trong Admin
- [x] Ưu tiên prompt: lesson → subject → global → fallback
- [x] Gán prompt cho môn/bài qua dropdown
- [x] Validate rubric weight = 100%
- [x] Versioning prompt + snapshot vào submission
- [x] Fallback tự động khi prompt bị xoá/deactivate
- [x] Test prompt (giới hạn số lần) + re-grade hàng loạt
- [x] Override điểm thủ công + khiếu nại điểm (dispute)
- [x] Audit log cho hành động admin nhạy cảm
- [x] Sửa bài bắt buộc qua GitHub
- [x] AI chỉ ra lỗi sai + gợi ý sửa (`grammar.errors`, chỉ khi lỗi thực sự tồn tại)
- [x] So sánh với lời giải mẫu nếu đề bài có (`sampleComparison.missingPoints`)
- [ ] Ô nhập "Lời giải mẫu" ở form tạo/sửa bài học (chờ gửi file form tạo/sửa lesson)
- [ ] Trang chi tiết bài nộp hiển thị đầy đủ từng lỗi + lời giải mẫu (chờ gửi file `submission_detail`)
- [x] Chọn model Gemini khi chấm (`SUPPORTED_MODELS`, `DEFAULT_MODEL`)
- [x] Chạy & so sánh tất cả model cho 1 prompt (`ModelComparison`, modal Admin)

---

## 🚀 Hướng Phát Triển

1. UI Admin & Student đẹp, responsive.
2. Chart.js cho biểu đồ.
3. Webhook GitHub → tự đồng bộ khi có commit.
4. Upload file đính kèm.
5. Rate-limit + logging AI (redact key).
6. Prompt A/B testing — chấm 1 bài bằng 2 prompt để so sánh.
7. Socket.io nếu cần realtime notification thay vì polling.
8. AWS KMS / Vault cho production thay vì `.env`.
9. Backup MongoDB định kỳ + CI/CD cho migration schema.
10. Monitoring/logging (Sentry, Winston) cho 3 hệ thống ngoài (Gemini, GitHub, SMTP).

---

## 📝 Ghi Chú

- **Nội dung (đề bài, bài nộp, kết quả, promptSnapshot)** đều JSON trên GitHub → version control, rollback dễ.
- **MongoDB lưu ID + metadata** → nhẹ, truy vấn nhanh.
- **AI key** mã hoá AES-256-GCM, master key ngoài DB, không log, có xoay vòng.
- **Prompt chấm** hoàn toàn do admin cấu hình, có versioning → đổi độ chặt không cần code, vẫn truy vết được đã chấm bằng gì.
- **Notification** dùng polling, tối ưu bằng cách dừng khi tab ẩn.
- **Client** cô lập hoàn toàn (kể cả tầng API) → admin duyệt mới được học.
- **Sửa đề bài** bắt buộc qua GitHub → minh bạch, tránh sửa lén sau khi học sinh đã làm.
- **AI không phải quyết định cuối cùng tuyệt đối** → luôn có đường cho con người override và sinh viên khiếu nại.

---

> 💡 *Tài liệu tổng thể. Khi triển khai có thể chia module: Auth, Admin, Subject, Lesson, Submission, AI, GitHub Sync, Notification, Crypto, Prompt, Dispute, Audit.*