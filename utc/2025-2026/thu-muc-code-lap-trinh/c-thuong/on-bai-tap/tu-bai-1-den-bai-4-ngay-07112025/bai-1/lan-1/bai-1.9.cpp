#include <stdio.h>

int main() {
    long a, b, c;
    printf("Nhap 3 so nguyen a, b, c (< 10^6): ");
    scanf("%ld %ld %ld", &a, &b, &c);
	if (a >= 1e6 || b >= 1e6 || c >= 1e6 || a < 0 || b < 0 || c < 0) {
		printf("Khong");
	}
	if (a+b>c&&a+c>b&&b+c>a) {
		printf("Co");
	}
	else {
		printf("Khong");
	}
}
