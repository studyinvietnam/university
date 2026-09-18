.model small
.stack 100h
.data

    ms1 db  'Nhap ky tu: $'
    ms2 db  10, 13, 'Ky tu vua nhap la: $'
    ms3 db  10, 13, 'Ky tu dung truoc: $'
    ms4 db  10, 13, 'Ky tu dung sau: $'
    
.code
    main proc
        mov ax, @data
        mov ds, ax
        
        ; Nhap Ky tu
        mov ah, 9
        mov dx, offset ms1
        int 21h
        
        mov ah, 1
        int 21h     ; so luu trong al
        
        mov bl, al  ; luu tam trong bl
        
        mov ah, 9
        lea dx, ms2
        int 21h
        
        ; hien ky tu
        mov ah, 2
        mov dl, bl
        int 21h
        
        ; ky tu dung truoc
        
        mov ah, 9
        lea dx, ms3
        int 21h
        
        mov ah, 2
        mov dl, bl
        dec dl
        int 21h
        
        ; Ky tu dung sau
        mov ah, 9
        lea dx, ms4
        int 21h
        
        mov ah, 2
        mov dl, bl
        inc dl
        int 21h
        
        
        mov ah, 4ch
        int 21h
        main endp
    end main