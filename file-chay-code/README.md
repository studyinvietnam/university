# ⚡ Code Quick Runner

> Một chương trình nhỏ mình tự làm để **chạy nhanh code C, C++, Python và Java trên Windows** bằng giao diện dòng lệnh (CMD).
>
> Mục tiêu ban đầu khá đơn giản: **chọn ngôn ngữ → paste đường dẫn file code → compile/chạy → xem kết quả**, khỏi phải mỗi lần tự gõ một đống lệnh trong terminal. :))

---

## ✨ Có gì trong Code Quick Runner?

Code Quick Runner hỗ trợ 4 ngôn ngữ:

```text
[1] C
[2] C++
[3] Python
[4] Java
[0] Thoat
```

Quy trình sử dụng:

```text
Chọn ngôn ngữ
      ↓
Paste đường dẫn file code
      ↓
Kiểm tra file
      ↓
Compile (nếu cần)
      ↓
Chạy chương trình
      ↓
Hiển thị output
      ↓
Tự dọn file tạm
```

### 🧹 Tự động dọn file tạm

Một trong những phần mình chú ý nhất là **không để rác `.exe`, `.class`, `.pyc` lung tung trong thư mục bài tập**.

Cụ thể:

* **C / C++:** file `.exe` được tạo trong thư mục tạm.
* Chạy xong sẽ tự động xoá `.exe` và thư mục tạm.
* **Java:** file `.class` được tạo trong thư mục tạm rồi xoá sau khi chạy.
* **Python:** chạy với tùy chọn `-B` để hạn chế việc tạo `.pyc` / `__pycache__`.

Phần cleanup được xử lý theo kiểu **RAII**, tức là tài nguyên tạm được gắn với vòng đời của đối tượng và được dọn khi đối tượng ra khỏi phạm vi.

> Mục tiêu: **code của bạn ở lại, file build tạm thì biến mất.** 🧹

---

# 🛠️ Cách hoạt động

## 1. C và C++

Code Runner sử dụng:

```text
gcc.exe
g++.exe
```

để compile source thành file `.exe`.

Quy trình:

```text
Bang_chan_tri_cpp.cpp
        ↓
      g++.exe
        ↓
   program.exe
        ↓
     chạy
        ↓
    tự xoá
```

### Compiler được tìm ở đâu?

Runner ưu tiên bộ MinGW nằm trong project:

```text
D:\bai_tap_dh\file-chay-code\mingw64\mingw32\bin\
```

Trong đó cần có tối thiểu:

```text
D:\bai_tap_dh\file-chay-code\mingw64\mingw32\bin\gcc.exe
D:\bai_tap_dh\file-chay-code\mingw64\mingw32\bin\g++.exe
```

Nếu không tìm thấy tại đây, runner có thể fallback sang `gcc` / `g++` có sẵn trong `PATH`.

### C++ sử dụng runtime tĩnh

Khi compile C++ runner sử dụng:

```text
-static
-static-libgcc
-static-libstdc++
```

Mục đích là giảm phụ thuộc vào các DLL runtime MinGW khác nhau trong hệ thống.

Điều này đặc biệt hữu ích khi máy có nhiều bộ MinGW/GCC khác nhau và từng xảy ra lỗi:

```text
0xC0000005
Access Violation
```

---

## 2. Python

Python không cần compile thành `.exe`.

Runner thực hiện tương đương:

```cmd
python -B "duong_dan_file.py"
```

Tùy chọn:

```text
-B
```

giúp Python không ghi bytecode `.pyc` trong quá trình chạy.

Vì vậy khi chạy bài tập Python, thư mục source sẽ sạch hơn.

---

## 3. Java

Java được compile bằng:

```cmd
javac
```

Nhưng file `.class` **không được tạo trực tiếp trong thư mục chứa source**.

Thay vào đó:

```text
File.java
   ↓
javac
   ↓
thư mục TEMP
   ↓
File.class
   ↓
java
   ↓
tự xoá thư mục TEMP
```

Nhờ vậy thư mục bài tập không bị đầy `.class` sau mỗi lần chạy.

> Không để thư mục học tập biến thành nghĩa địa `.class` sau vài tuần. 💀

---

# 📁 Cấu trúc thư mục

Ví dụ project của mình được đặt tại:

```text
D:\bai_tap_dh\file-chay-code\
│
├── Code-Quick-Runner.cpp
├── Code-Quick-Runner.exe
│
└── mingw64\
    └── mingw32\
        └── bin\
            ├── gcc.exe
            ├── g++.exe
            └── ...
```

### 📌 Đường dẫn compiler

Runner ưu tiên kiểm tra:

```text
D:\bai_tap_dh\file-chay-code\mingw64\mingw32\bin\
```

Cụ thể:

```text
D:\bai_tap_dh\file-chay-code\mingw64\mingw32\bin\gcc.exe
D:\bai_tap_dh\file-chay-code\mingw64\mingw32\bin\g++.exe
```

> **Lưu ý:** đường dẫn trên là đường dẫn của project hiện tại. Nếu bạn copy project sang ổ/thư mục khác thì cần chỉnh lại đường dẫn compiler trong code hoặc sắp xếp thư mục tương ứng.

---

# ⚙️ Cài MinGW vào PATH

> Phần này **không bắt buộc nếu runner đã tìm thấy `gcc.exe` / `g++.exe` trong thư mục MinGW của project**.
>
> Chỉ cần thực hiện khi bạn muốn gọi `gcc`, `g++` trực tiếp từ CMD hoặc môi trường hiện tại chưa nhận compiler từ `PATH`.

## Bước 1: Thêm MinGW vào PATH

Mở **CMD với quyền Administrator** và chạy:

```cmd
setx PATH "%PATH%;D:\bai_tap_dh\file-chay-code\mingw64\mingw32\bin" /M
```

> ⚠️ CMD bắt buộc phải được chạy bằng quyền **Administrator**.

### Cách mở CMD quyền Admin

1. Nhấn `Win`.
2. Gõ `cmd`.
3. Click chuột phải vào **Command Prompt**.
4. Chọn **Run as administrator**.
5. Chạy lệnh ở trên.

Nếu thành công, CMD sẽ hiển thị:

```text
SUCCESS: Specified value was saved.
```

> 💡 Sau khi chạy `setx`, hãy **đóng CMD hiện tại và mở CMD mới** để môi trường mới được nhận.

---

# 🔎 Kiểm tra MinGW

Mở **CMD mới** và chạy:

```cmd
gcc --version
```

sau đó:

```cmd
g++ --version
```

Nếu hiện thông tin phiên bản GCC/G++, nghĩa là PATH đã nhận compiler.

Ví dụ:

```text
gcc (MinGW ...)
g++ (MinGW ...)
```

Bạn cũng có thể kiểm tra chính xác compiler Windows đang tìm bằng:

```cmd
where gcc
```

và:

```cmd
where g++
```

Nếu muốn ưu tiên bộ compiler của project, kết quả nên trỏ về:

```text
D:\bai_tap_dh\file-chay-code\mingw64\mingw32\bin\
```

---

# ▶️ Cách sử dụng

Chạy:

```text
Code Quick Runner.exe
```

Bạn sẽ thấy:

```text
============================================
             CODE QUICK RUNNER
============================================
[1] C
[2] C++
[3] Python
[4] Java
[0] Thoat
============================================
Chon ngon ngu:
```

---

## Ví dụ chạy C++

Chọn:

```text
2
```

Sau đó paste đường dẫn file:

```text
D:\bai_tap_dh\utc\2026-2027\Toan_roi_rac-1-1-26(N06)\tu-chup\tuan-1\Bang_chan_tri_cpp.cpp
```

Runner sẽ xử lý:

```text
[1/2] Dang compile C++...
[OK] Compile thanh cong.

[2/2] Dang chay...
```

Output của chương trình được hiển thị trực tiếp trong terminal.

Ví dụ:

```text
=====================================================================
 p  q | !p | !q | p^q | p+q | p xor q | p->q | p<->q
=====================================================================
true true | false  | false  | true  | true  |   false | true  |  true
true false | false  | true  | false | true  |    true | false  | false
false true | true  | false  | false | true  |    true | true  | false
false false | true  | true  | false | false  |   false | true  |  true
=====================================================================
```

Khi chương trình kết thúc:

```text
[EXIT CODE] 0
[FINISHED] Chuong trinh da ket thuc binh thuong.
```

`EXIT CODE 0` nghĩa là chương trình kết thúc bình thường.

---

# 🧪 Ví dụ C++

File:

```cpp
#include <iostream>
using namespace std;

int main() {
    cout << "Hello from Code Quick Runner!\n";
    return 0;
}
```

Chọn:

```text
[2] C++
```

Paste đường dẫn:

```text
D:\...\main.cpp
```

Kết quả:

```text
Hello from Code Quick Runner!

[EXIT CODE] 0
[FINISHED] Chuong trinh da ket thuc binh thuong.
```

---

# 🧪 Ví dụ C

File C:

```c
#include <stdio.h>

int main() {
    printf("Hello from C!\n");
    return 0;
}
```

Chọn:

```text
[1] C
```

Paste đường dẫn:

```text
D:\...\main.c
```

Runner sẽ compile bằng `gcc.exe`, chạy chương trình rồi tự xoá file `.exe` tạm.

---

# 🧪 Ví dụ Python

File:

```python
print("Hello from Python!")
```

Chọn:

```text
[3] Python
```

Paste:

```text
D:\...\main.py
```

Runner tương đương với:

```cmd
python -B "D:\...\main.py"
```

---

# 🧪 Ví dụ Java

File:

```java
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello from Java!");
    }
}
```

Chọn:

```text
[4] Java
```

Paste:

```text
D:\...\Main.java
```

Runner sẽ:

```text
Main.java
   ↓
javac
   ↓
TEMP
   ↓
Main.class
   ↓
java
   ↓
xoá TEMP
```

---

# 🧠 Kiểm tra file đầu vào

Runner kiểm tra:

### File có tồn tại không?

```text
[ERROR] Khong tim thay file
```

### Đường dẫn có phải file không?

Nếu đưa thư mục thay vì file:

```text
[ERROR] Duong dan khong phai file.
```

### Đúng phần mở rộng chưa?

C:

```text
.c
```

C++:

```text
.cpp
.cc
.cxx
```

Python:

```text
.py
```

Java:

```text
.java
```

Ví dụ chọn C nhưng đưa:

```text
main.cpp
```

Runner báo:

```text
[ERROR] C can file .c
```

---

# 🚨 Xử lý lỗi khi chạy

Runner phân biệt được hai giai đoạn:

```text
Compile
   ↓
Chạy
```

### Compile lỗi

Ví dụ C++ sai cú pháp:

```text
[ERROR] Compile C++ that bai!
```

Lúc này chương trình chưa được chạy.

### Compile thành công nhưng chương trình lỗi

Ví dụ:

```text
[EXIT CODE] ...
[CRASH/ERROR] Chuong trinh ket thuc voi ma: ...
```

Điều này cho biết compiler đã tạo được chương trình nhưng chương trình con gặp lỗi khi chạy.

### Một trường hợp đặc biệt

Nếu gặp:

```text
0xC0000005
```

đây là mã Windows thường tương ứng với **Access Violation**.

Đó là lỗi của process đang chạy, **không đồng nghĩa với việc máy tính bị hỏng hoặc RAM bị tràn**.

---

# 🧹 Vì sao phải dùng file tạm?

Cách đơn giản nhất là compile ngay cạnh source:

```text
main.cpp
   ↓
main.exe
```

Nhưng sau một thời gian thư mục sẽ thành:

```text
main.exe
test.exe
abc.exe
abc2.exe
main.class
...
```

Code Quick Runner chuyển sang:

```text
Source code
    ↓
TEMP
    ↓
Compile
    ↓
Run
    ↓
Cleanup
```

Do đó thư mục bài tập chủ yếu chỉ giữ source code.

> **Code của bạn ở lại — file build tạm thì biến mất.** 🗑️

---

# 🔐 An toàn và giới hạn

Code Quick Runner chủ yếu dành cho:

* học lập trình;
* chạy bài tập;
* test code;
* kiểm tra những chương trình nhỏ;
* thực hành C / C++ / Python / Java trên Windows.

Đây **không phải sandbox bảo mật**.

Chương trình được chạy với quyền của tài khoản Windows hiện tại và có thể truy cập tài nguyên mà tài khoản đó được phép truy cập.

Vì vậy:

> ⚠️ **Không nên dùng runner để chạy code `.c`, `.cpp`, `.py`, `.java` không rõ nguồn gốc.**

Đặc biệt cẩn thận với code có:

```text
xóa file
sửa registry
chạy lệnh hệ thống
tải file từ Internet
thay đổi cấu hình Windows
```

---

# 🧩 Công nghệ sử dụng

Project sử dụng chủ yếu:

```text
C++
├── std::filesystem
├── CreateProcessW
├── RAII cleanup
├── Windows API
└── Signal handling
```

Compiler / runtime:

```text
GCC / MinGW
Python
Java JDK
```

---

# 💡 Tại sao mình làm project này?

Mình làm Code Quick Runner chủ yếu để phục vụ việc học.

Thay vì mỗi lần phải nhớ:

```text
gcc ...
g++ ...
python ...
javac ...
java ...
```

thì gom lại thành một menu:

```text
1 → C
2 → C++
3 → Python
4 → Java
```

Sau đó:

```text
Paste đường dẫn
       ↓
     Enter
       ↓
      Run
       ↓
  xem kết quả
       ↓
   dọn file tạm
```

Một project không quá lớn, nhưng đủ tiện cho việc:

> **gõ code → test bài → sửa code → chạy lại → học tiếp.**

---

## 📌 Ghi chú

Đây là project mình tự làm để học và nghịch code.

Không phải IDE xịn sò gì cả.

Nó chỉ đơn giản là:

> **“Có file code → đưa đây → để tôi chạy cho.”** :))

Và nguyên tắc quan trọng nhất:

> **Chạy xong nhớ dọn rác.** 🧹

---

## ❤️ Made for learning

> Một project nhỏ phục vụ việc học, thực hành và ôn lại các bài lập trình.
>
> Không cầu kỳ.
> Không màu mè.
> Chủ yếu là **bấm số → paste đường dẫn → chạy code**.
>
> Còn phần khó chịu nhất như compile, chạy và dọn file tạm...
>
> **Để Code Quick Runner lo.** 😎
