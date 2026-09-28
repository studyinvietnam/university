.model small
.stack 100h
.data
    ms1 db  'nhap so thu nhat: $'
    ms2 db  10, 13, 'nhap so thu hai: $'
    ms3 db  10, 13, 'tong hai so: $'
    a   db 0
    b   db 0

.code
main proc
    mov ax, @data
    mov ds, ax
    
    mov ah, 9
    lea dx, ms1
    int 21h

; nhap so thu nhat    
    mov ah, 1
    int 21h
    
    sub al, 48  ; doi thanh so
    
    mov bl, 10
    mul bl      ; ket qua trong ax
    
    mov bx, ax  ; luu tam vao bl/bx
    
    mov ah, 1
    int 21h
    sub al, 48
    add bl, al  ; luu so thu nhat
    mov a, bl   ; luu vao bien a
    
    mov ah, 9
    lea dx, ms2
    int 21h    
    
; nhap so thu 2    
    mov ah, 1
    int 21h
    sub al, 48
    
    mov bl, 10
    mul bl
    
    mov bl, al
    
    mov ah, 1
    int 21h
    sub al, 48
    add bl, al  ; luu so thu 2
    
    
    add bl, a  ; tong luu trong bl
    
    mov ah, 9
    lea dx, ms3
    int 21h
    
    mov ah, 0
    mov al, bl
    mov bl, 10
    div bl      ; al: thuong, ah: du
    
    mov a, ah
    
    mov ah, 2
    mov dl, al
    add dl, 48
    int 21h
    
    mov dl, a
    add dl, 48
    int 21h
    
    
    mov ah, 4ch
    int 21h
    
    main endp
end main