#include <stdio.h>

int main() {
    int n;
    printf("Nhap n: ");
    scanf("%d", &n);

    long long fib[50];
    fib[0] = 0;
    fib[1] = 1;

    for (int i = 2; i < n; i++) {
        fib[i] = fib[i - 1] + fib[i - 2];
    }

    printf("Day Fibonacci gom %d so dau tien:\n", n);
    for (int i = 0; i < n; i++) {
        printf("%lld ", fib[i]);
    }

    printf("\n\nCac so Fibonacci chan:\n");
    long long tong = 0;
    for (int i = 0; i < n; i++) {
        if (fib[i] % 2 == 0) {
            printf("%lld ", fib[i]);
            tong += fib[i];
        }
    }

    printf("\nTong cac so Fibonacci chan: %lld\n", tong);
    return 0;
}