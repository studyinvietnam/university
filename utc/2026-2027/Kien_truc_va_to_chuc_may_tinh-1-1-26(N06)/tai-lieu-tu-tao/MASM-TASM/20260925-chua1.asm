.model small
.stack 100h
.data
    ms1 db  'nhap so thu nhat: $'
    ms2 db  10, 13, 'nhap so thu hai: $'
    ms3 db  10, 13, 'tong hai so: $'

.code
main proc
    mov ax, @data
    mov ds, ax
    
    mov ah, 9
    lea dx, ms1
    int 21h
    
    mov ah, 1
    int 21h
    
    sub al, 48  ; doi thanh so
    mov bl, al  ; luu tam vao bl
    
    mov ah, 9
    lea dx, ms2
    int 21h
    
    mov ah, 1
    int 21h
    sub al, 48
    
    add bl, al  ; tong luu trong bl
    
    mov ah, 9
    lea dx, ms3
    int 21h
    
    ;mov ah, 0
    mov al, bl
    mov bh, 10
    div bh      ; al: thuong, ah: du
    
    mov bh, ah
    
    mov ah, 2
    mov dl, al
    add dl, 48
    int 21h
    
    mov dl, bh
    add dl, 48
    int 21h
    
    
    mov ah, 4ch
    int 21h
    
    main endp
end main