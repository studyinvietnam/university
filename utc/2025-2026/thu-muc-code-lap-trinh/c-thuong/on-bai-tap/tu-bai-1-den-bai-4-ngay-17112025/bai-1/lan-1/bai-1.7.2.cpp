#include <stdio.h>
#include <stdlib.h>  // Bao gồm thư viện stdlib.h để sử dụng malloc và free

int main() {
    int n;
    printf("Nhap so phan tu cua mang: ");
    scanf("%d", &n);

    // Cấp phát bộ nhớ động cho mảng a
    int *a = (int*)malloc(n * sizeof(int)); 

    // Kiểm tra nếu cấp phát bộ nhớ thất bại
    if (a == NULL) {
        printf("Loi cap phat bo nho!\n");
        return 1; // Nếu không cấp phát được bộ nhớ, thoát chương trình
    }

    printf("Nhap cac phan tu:\n");
    for (int i = 0; i < n; i++) {
        printf("a[%d]: ", i);
        scanf("%d", &a[i]);
    }

    int tongChan = 0;
    int tongLe = 0;

    for (int i = 0; i < n; i++) {
        if (i % 2 == 0)  // Chỉ số chẵn
            tongChan += a[i];
        else  // Chỉ số lẻ
            tongLe += a[i];
    }

    int S = tongChan - tongLe;
    printf("Gia tri cua S la: %d\n", S);

    // Giải phóng bộ nhớ sau khi sử dụng
    free(a);

    return 0;
}
