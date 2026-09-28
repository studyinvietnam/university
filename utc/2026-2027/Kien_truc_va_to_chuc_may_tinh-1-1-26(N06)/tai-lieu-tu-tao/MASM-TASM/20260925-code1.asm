.model small
.stack 100h
.data
    ms1 db 'nhap so thu nhat: $'
    ms2 db 10, 13, 'nhap so thu hai: $'
    ms3 db 10, 13, 'tong hai so la: $'

.code

main proc
    mov ax, @data
    mov ds, ax

    ; nhap so thu nhat
    lea dx, ms1
    mov ah, 09h
    int 21h

    mov ah, 01h
    int 21h
    sub al, '0' ; chuyen ky tu sang so
    mov bl, al ; luu so thu nhat vao BL

    ; nhap so thu hai
    lea dx, ms2
    mov ah, 09h
    int 21h

    mov ah, 01h
    int 21h
    sub al, '0' ; chuyen ky tu sang so
    add bl, al ; cong so thu hai vao BL

    ; hien thi ket qua
    lea dx, ms3
    mov ah, 09h
    int 21h

    add bl, '0' ; chuyen so sang ky tu de hien thi
    mov dl, bl
    mov ah, 02h
    int 21h

    ; ket thuc chuong trinh
    mov ah, 4Ch
    int 21h
main endp
end main