#include <stdio.h>

int main() {
    int n;
    printf("Nhap so phan tu cua mang: ");
    scanf("%d", &n);
    int a[n];
    int i;
    printf("Nhap cac phan tu:\n");
    for (i = 0; i < n; i++) {
        printf("a[%d]: ", i);
        scanf("%d", &a[i]); 
    }
    int tongChan = 0;
    int tongLe = 0;
    for (i = 0; i < n; i++) {
if (i % 2 == 0)
    tongChan += a[i];
else
    tongLe += a[i];

    }
    int S = tongChan - tongLe;
    printf("Gia tri cua S la: %d\n", S);
    return 0;
}
