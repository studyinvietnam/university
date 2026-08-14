#include <stdio.h>
#include <stdlib.h>

int main() {
    int a, b, c;
    printf("Nhap 3 so nguyen a, b, c (< 10^6): ");
    scanf("%d %d %d", &a, &b, &c);

    if (a >= 1e6 || b >= 1e6 || c >= 1e6) {
        printf("Moi so phai nho hon 10^6!\n");
        return 1;
    }

    int hieu1 = abs(a - b);
    printf("Ta co: |a - b| = %d\n", hieu1);

    int hieu2 = abs(a - c);
    printf("Ta co: |a - c| = %d\n", hieu2);

    int hieu3 = abs(b - c);
    printf("Ta co: |b - c| = %d\n", hieu3);

    int max = hieu1;
    if (hieu2 > max) max = hieu2;
    if (hieu3 > max) max = hieu3;

    printf("Hieu lon nhat giua hai so bat ky la: %d\n", max);
    return 0;
}
