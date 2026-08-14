#include <stdio.h>

int main() {
    int n;
    printf("Nhap so phan tu cua mang: ");
    scanf("%d", &n);

    int a[n];
    
    printf("Nhap cac phan tu:\n");
    for (int i = 0; i < n; i++) {
        printf("a[%d]: ", i);
        scanf("%d", &a[i]);
    }

    int tongBinhPhuong = 0;

    for (int i = 0; i < n; i++) {
        if (i % 2 == 1) {   // vị trí lẻ
            tongBinhPhuong += a[i] * a[i];
        }
    }

    float S = (float)tongBinhPhuong / n;

    printf("Gia tri cua S la: %.2f\n", S);

    return 0;
}
