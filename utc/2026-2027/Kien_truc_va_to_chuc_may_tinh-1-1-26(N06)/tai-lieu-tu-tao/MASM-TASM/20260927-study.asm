
model small
stack 100h
; link học 1: https://www.youtube.com/watch?v=_fThJ6wvHfQ
; link học 2 (Cộng, trừ, nhân, chia): https://www.youtube.com/watch?v=GpoJWkz9xBs
; MASM-TASM dùng hệ 16 (thập lục phân) để biểu diễn các số, ví dụ: 0-9 là 0-9, A-F là 10-15
.data
    ; nhan db "Xin chao $" ; ham ngat ah loai 9
    cong db "Cong: $"
    tru db 13,10,"Tru: $"
    nhan db 13,10,"Nhan: $"
    chia db 13,10,"Chia: $"
    du db ", Du: $"

.code
main proc

    ; ham ngat ah loại 1
    ; de nhap vao 1 ky tu tu ban phim
    ; mov ah, 1
    ; int 21h

    ; ; ham ngat ah loai 2
    ; ; de in ra 1 ky tu
    ; mov ah, 2
    ; mov dl, 35h
    ; int 21h

    ; ; ham ngat ah loai 9
    ; ; de in ra 1 dong ki tu
    ; mov ax, @data
    ; mov ds,ax
    ; mov ah,9
    ; lea dx,nhan
    ; int 21h


    ; ; ham ngat ah, 4ch
    ; ; de dung chuong trinh
    ; mov ah, 4Ch
    ; int 21h


    ;ham 1: nhap 1 ky tu
    ; mov ah, 1
    ; int 21h
    ; ;ham 2:hien thi 1 ky tu
    ; mov bl,36h
    ; mov ah, 2
    ; mov dl,bl
    ; int 21h
    ; ;ham 9: in ra 1 chuoi ky tu
    ; mov ax, @data
    ; mov ds, ax
    ; mov ah, 9
    ; lea dx,nhan
    ; int 21h
    ; ;ham 4: dung chuong trinh
    ; mov ah, 4Ch
    ; int 21h


    mov ax, @data
    mov ds, ax


    ; comment: Cộng 2 số
    mov al, 4
    mov bl, 5
    add bl, al ; ket qua: bl = 9

    ; in ket qua cong
    lea dx, cong
    mov ah, 9
    int 21h

    mov dl, bl
    add dl, '0'
    mov ah, 2
    int 21h


    ; comment: Trừ 2 số
    mov al, 9
    mov bl, 4
    sub al, bl ; ket qua: al = 5

    ; in ket qua tru
    lea dx, tru
    mov ah, 9
    int 21h

    mov dl, al
    add dl, '0'
    mov ah, 2
    int 21h


    ;comment: Nhân 2 số
    mov al, 200
    mov bl, 4
    mul bl ; ket qua: AX = 800
    ; bat buoc phai luu vao AX

    ; in ket qua nhan
    lea dx, nhan
    mov ah, 9
    int 21h

    ; 800 = 0320h
    ; in 800
    mov bx, ax
    mov ax, bx
    mov cx, 10
    xor dx, dx
    div cx
    push dx
    xor dx, dx
    div cx
    push dx
    xor dx, dx
    div cx

    add al, '0'
    mov dl, al
    mov ah, 2
    int 21h

    pop dx
    add dl, '0'
    mov ah, 2
    int 21h

    pop dx
    add dl, '0'
    mov ah, 2
    int 21h


    ;comment: Chia 2 số
    mov ax, 20
    mov bx, 6
    xor dx, dx
    div bx
    ; ket qua: AX = 3, DX = 2 (số dư)

    ; in ket qua chia
    lea dx, chia
    mov ah, 9
    int 21h

    mov dl, al
    add dl, '0'
    mov ah, 2
    int 21h

    ; in so du
    lea dx, du
    mov ah, 9
    int 21h

    mov dl, dl
    add dl, '0'
    mov ah, 2
    int 21h


    ; ham 4ch: dung chuong trinh
    mov ah, 4Ch
    int 21h

main endp
end main

