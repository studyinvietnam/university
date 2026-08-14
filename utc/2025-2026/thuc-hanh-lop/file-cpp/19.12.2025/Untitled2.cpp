#include <stdio.h>

int main () {
	int n;
	do {
		printf("Vui long nhap n (n<=1000000): ");
		scanf("%d", &n);
		if (n<=0 || n>=1000000) {
			printf("Ban da nhap sai gia tri n, xin vui long nhap lai gia tri n.\n");
		}
	}
	while (n<=0 || n>=1000000);
	int first = 1;
	for (int i = 2; i * i <= n; i++) {
		while (n % i == 0) {
			if (!first) {
				printf("*");
			}
			printf("%d", i);
			first = 0;
			n /= i;
		}
	}
	if (n > 1) {
		if (!first) {
			printf("*");
		}
		printf("%d", n);
	}
	return 0;
}