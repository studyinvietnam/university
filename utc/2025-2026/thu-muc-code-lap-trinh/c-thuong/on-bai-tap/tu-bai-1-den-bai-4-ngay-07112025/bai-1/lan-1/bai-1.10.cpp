#include <stdio.h>
#include <math.h>
#include <stdbool.h>

// Hàm kiểm tra số nguyên tố
bool isPrime(int n) {
if (n < 2) return false;
if (n == 2 || n == 3) return true;
if (n%2== 0 || n%3==0) return false;
int i;
for (i=5; i <= sqrt(n); i+= 6) {
if (n%i== 0 || n% (i+ 2) == 0)
return false;
}
return true;
}

int main() {
int a, b, c;
printf("Nhap 3 so nguyen a, b, c (< 10^6): ");
scanf("%d %d %d", &a, &b, &c);

int found = 0; // cờ kiểm tra có số nguyên tố không
if (isPrime(a)) {
printf("%d ", a);
found = 1;
}
if (isPrime(b)) {
printf("%d ", b);
found = 1;
}
if (isPrime(c)) {
printf("%d ", c);
found = 1;
}

if (!found) printf("0");

return 0;
}
