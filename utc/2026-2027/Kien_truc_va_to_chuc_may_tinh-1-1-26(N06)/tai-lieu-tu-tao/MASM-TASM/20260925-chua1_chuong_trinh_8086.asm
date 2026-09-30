; CHƯƠNG TRÌNH MINH HỌA KIẾN THỨC CÂU 1, CÂU 2 VÀ CÂU 3 (CHẠY TRÊN EMU8086)
.model small
.stack 100h

.data
    ; Câu 1: Khai báo biến ms2 gồm 10, 13 (2 byte) và chuỗi 17 ký tự. Tổng cộng 19 byte.
    ms2 db 10, 13, "nhap so thu hai: $"
    
    ; Chuỗi bổ sung để in kết quả/xuống dòng cho đẹp
    msg_c2 db 10, 13, "Gia tri BL nhan duoc (Cau 2): $"
    msg_c3 db 10, 13, "Thuc hien phep chia loi gia dinh (Cau 3): $"
    msg_sucess db 10, 13, "Chuong trinh chay tiep binh thuong, khong bi sap!$"

.code
main proc
    ; Khởi tạo đoạn dữ liệu (Data Segment)
    mov ax, @data
    mov ds, ax

    ; -------------------------------------------------------------
    ; [MINH HỌA CÂU 1]: In chuỗi ms2 ra màn hình để kiểm tra
    ; -------------------------------------------------------------
    mov ah, 9
    lea dx, ms2
    int 21h

    ; -------------------------------------------------------------
    ; [MINH HỌA CÂU 2]: Nhập ký tự '7' từ bàn phím và xử lý
    ; -------------------------------------------------------------
    ; LƯU Ý: Khi chương trình dừng, hãy nhấn phím '7' trên bàn phím
    mov ah, 1
    int 21h         ; AL sẽ nhận mã ASCII của '7' là 37h (55 thập phân)

    sub al, 48      ; Chuyển ASCII về số nguyên: 37h - 30h = 07h
    mov bl, al      ; Sao chép sang BL, lúc này BL = 7

    ; In kiểm tra giá trị số trong BL (cộng lại 48 để hiển thị dạng ký tự)
    mov ah, 9
    lea dx, msg_c2
    int 21h
    
    mov dl, bl
    add dl, 48
    mov ah, 2
    int 21h

    ; -------------------------------------------------------------
    ; [MINH HỌA CÂU 3]: Giả lập phép chia DIV gây tranh cãi
    ; -------------------------------------------------------------
    ; Chuẩn bị các giá trị ban đầu theo đề bài:
    mov bl, 17      ; BL = 17 (11h)
    mov al, bl      ; AL = 17 (11h)
    
    ; Giả định AH không được xóa về 0 và đang giữ giá trị 09h
    mov ah, 09h     
    
    ; Lúc này thanh ghi AX tự động ghép từ AH và AL thành: 0911h 
    ; Giá trị thập phân của AX = (9 * 256) + 17 = 2321
    
    ; Gán số chia BH = 10 (hệ thập phân)
    mov bh, 10
    
    ; Thực hiện phép chia: AX / BH  (tức là 2321 / 10)
    ; Kết quả toán học: Thương số = 232, Số dư = 1
    ; Vì 232 <= 255 nên kết quả vừa vặn trong AL (8-bit). Không bị bẫy lỗi "Divide Overflow".
    div bh          
    
    ; Nếu chương trình chạy đến đây mà không bị Crash/Sập: Chứng tỏ đáp án D chính xác!
    ; Lưu kết quả thương số tạm thời vào BL để tránh bị ghi đè khi gọi ngắt
    mov bl, al 

    mov ah, 9
    lea dx, msg_c3
    int 21h

    ; In ký tự rác tương ứng với mã ASCII 232 (Thương số) ra màn hình
    mov dl, bl
    mov ah, 2
    int 21h

    ; Thông báo chương trình an toàn
    mov ah, 9
    lea dx, msg_sucess
    int 21h

    ; Thoát chương trình, trả quyền điều khiển về DOS
    mov ax, 4c00h
    int 21h
main endp
end main
