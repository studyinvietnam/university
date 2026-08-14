#include <stdio.h>

int main() {
    int n;
    printf("Nhap so phan tu cua mang: ");
    scanf("%d", &n);

    int a[n];
    printf("Nhap cac phan tu cua mang:\n");
    for (int i = 0; i < n; i++) {
        printf("a[%d] = ", i);
        scanf("%d", &a[i]);
    }

    int dem = 0;
    for (int i = 0; i < n; i++) {
        if (a[i] < 0)
            dem++;
    }

    printf("So luong so am trong mang la: %d\n", dem);

    return 0;
}
