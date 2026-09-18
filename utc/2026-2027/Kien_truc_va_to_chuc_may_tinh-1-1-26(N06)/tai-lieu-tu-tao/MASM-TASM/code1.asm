.model small
.stack 100h
.data

    ms1 db  'Nhap so thu nhat: $'
    ms2 db  10, 13, 'Nhap so thu hai: $'
    ms3 db  10, 13, 'So thu nhat la: $'
    ms4 db  10, 13, 'So thu hai la: $'
    ms5 db  10, 13, 'Tong hai so: $'
    ms6 db  10, 13, 'Hieu hai so: $'
    
.code
    main proc
        mov ax, @data
        mov ds, ax
        
        ; nhap so 1
        mov ah, 9
        mov dx, offset ms1
        int 21h
        
        mov ah, 1
        int 21h     ; so luu trong al
        
        ;sub al, 48  ; doi thanh so
        mov bl, al  ; luu tam trong bl
        
        mov ah, 9
        lea dx, ms2
        int 21h
        
        mov ah, 1
        int 21h     ; so thu 2
        ;sub al, 30h
        mov bh, al  ; luu tam trong bh
        
        ; in so thu nhat
        mov ah, 9
        lea dx, ms3
        int 21h
        
        mov ah, 2
        mov dl, bl
        int 21h
        
        ; in so thu 2
        mov ah, 9
        lea dx, ms4
        int 21h
        
        mov ah, 2
        mov dl, bh
        int 21h
        
        ; cong hai so
        sub bl, 48
        sub bh, 48
        mov cl, bl
        add bl, bh
        
        mov ah, 9
        lea dx, ms5
        int 21h
        
        mov ah, 2
        mov dl, bl
        add dl, 48
        int 21h 
        
        ; tru hai so
        mov bl, cl
        sub bl, bh
        mov ah, 9
        lea dx, ms6
        int 21h
        
        mov ah, 2
        mov dl, bl
        add dl, 48
        int 21h 
        
        
        mov ah, 4ch
        int 21h
        main endp
    end main