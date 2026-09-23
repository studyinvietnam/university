// fix-views.js
// Chạy: node fix-views.js
// Sửa Pug: chuyển shorthand .class:xxx -> div(class="...") + fix ?. ??

const fs = require('fs');
const path = require('path');

const VIEWS_DIR = path.join(__dirname, 'views');

// ============================================================
// WALK
// ============================================================
function walk(dir, out = []) {
    for (const item of fs.readdirSync(dir)) {
        const p = path.join(dir, item);
        if (fs.statSync(p).isDirectory()) walk(p, out);
        else if (p.endsWith('.pug')) out.push(p);
    }
    return out;
}

// ============================================================
// FIX EXPRESSION: = a?.b ?? c
// ============================================================
function fixExpression(expr) {
    let e = expr;

    // 1) a?.b.c  →  (a && a.b.c)
    e = e.replace(
        /([a-zA-Z_$][\w$]*)\?\.([a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*)*)/g,
        '($1 && $1.$2)'
    );

    // 2) left ?? right  →  ((left) != null ? (left) : (right))
    if (e.includes('??')) {
        const idx = e.indexOf('??');
        const left = e.slice(0, idx).trim();
        const right = e.slice(idx + 2).trim();
        e = '(' + left + ' != null ? ' + left + ' : ' + right + ')';
    }

    return e;
}

// ============================================================
// SPLIT CLASS: "flex.items-center.sm\:px-6" -> ["flex","items-center","sm:px-6"]
// ============================================================
function splitClasses(raw) {
    // raw KHÔNG có dấu . đầu tiên
    const classes = [];
    let cur = '';
    let i = 0;

    while (i < raw.length) {
        const ch = raw[i];

        // Escape \: → :
        if (ch === '\\' && raw[i + 1] === ':') {
            cur += ':';
            i += 2;
            continue;
        }

        // Dấu . phân tách class MỚI nếu theo sau là chữ/_/[ hoặc \
        if (ch === '.' && /[a-zA-Z_\[\\]/.test(raw[i + 1] || '')) {
            if (cur) classes.push(cur);
            cur = '';
            i++;
            continue;
        }

        cur += ch;
        i++;
    }
    if (cur) classes.push(cur);

    return classes;
}

// ============================================================
// FIX 1 DÒNG
// ============================================================
function fixLine(line) {
    // ---- 1) Fix = expr ----
    const mExpr = line.match(/^(\s*)=\s*(.+)$/);
    if (mExpr) {
        const fixed = fixExpression(mExpr[2]);
        if (fixed !== mExpr[2]) {
            return mExpr[1] + '= ' + fixed;
        }
        return line;
    }

    // ---- 2) Fix shorthand class ----
    // Match: indent + optional tag + (.class)+ + (rest)
    // rest có thể: rỗng | text | (attribute)
    const m = line.match(
        /^(\s*)([a-zA-Z][a-zA-Z0-9]*)?((?:\.[a-zA-Z0-9_\-\\:\[\]\(\)%/]+)+)(.*)$/
    );
    if (!m) return line;

    const indent = m[1];
    const tag = m[2] || 'div';
    const classStr = m[3];
    const rest = m[4] || '';

    // Chỉ fix nếu có ký tự đặc biệt
    if (!/\\:|:|\]|\[/.test(classStr)) return line;

    // Parse classes
    const raw = classStr.slice(1); // bỏ dấu . đầu
    const classes = splitClasses(raw);
    const classList = classes.join(' ');

    // ---- Rest xử lý ----
    const trimmedRest = rest.trimStart();

    // 2a) Không có gì sau → thuần class
    if (trimmedRest === '') {
        return indent + tag + '(class="' + classList + '")';
    }

    // 2b) Bắt đầu bằng ( → có attribute
    if (trimmedRest.startsWith('(')) {
        // Tìm dấu ) đóng đầu tiên (đơn giản, không nested sâu)
        // Giữ nguyên toàn bộ attr, chỉ chèn class vào đầu
        const inner = trimmedRest.slice(1); // bỏ ( đầu
        // Tìm ) đóng cuối cùng của dòng (đơn giản)
        const closing = inner.lastIndexOf(')');
        if (closing === -1) {
            // Không có ) → để nguyên, không fix
            return line;
        }
        const attrs = inner.slice(0, closing).trim();
        const afterParen = inner.slice(closing + 1); // sau )

        let newAttrs;
        if (attrs === '') {
            newAttrs = 'class="' + classList + '"';
        } else {
            newAttrs = 'class="' + classList + '", ' + attrs;
        }

        return indent + tag + '(' + newAttrs + ')' + afterParen;
    }

    // 2c) Có text sau
    return (
        indent + tag + '(class="' + classList + '")' + rest
    );
}

// ============================================================
// PROCESS
// ============================================================
function processFile(file) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    const out = [];
    let changed = false;

    for (const line of lines) {
        const fixed = fixLine(line);
        if (fixed !== line) changed = true;
        out.push(fixed);
    }

    if (changed) {
        fs.writeFileSync(file, out.join('\n'), 'utf8'); // UTF-8 không BOM
        console.log('✅ Fixed: ' + path.relative(__dirname, file));
    }
}

// ============================================================
// MAIN
// ============================================================
console.log('Scanning: ' + VIEWS_DIR);
const files = walk(VIEWS_DIR);
console.log('Found ' + files.length + ' .pug files\n');

for (const f of files) processFile(f);

console.log('\n=== DONE ===');