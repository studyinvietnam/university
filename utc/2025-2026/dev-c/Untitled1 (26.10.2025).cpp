#include <stdio.h>

int main() {
    int n, d = 0;
    printf("Nhap n: ");
    scanf("%lld", &n);

    // Nếu n = 0 thì có 1 chữ số
    if (n == 0)
        d = 1;
    else {
        while (n > 0) {
            n = n / 10; // bỏ chữ số cuối
            d++;         // tăng đếm
        }
    }

    printf("So chu so cua n la: %d\n", d);
    return 0;
}
