#include <stdio.h>

int main () {
	int n;
	do {
		printf("Nhap so luong n: ");
		scanf("%d", &n);
		if (n <= 1 || n > 1000000) {
			printf("Ban da nhap sai gia tri n, xin vui long nhap lai gia tri n.\n");
		}
	}
	while (n <= 1 || n > 1000000);
	printf("Output: ");
	int first = 1;
	for(int i = 2; i * i <= n; i++) {
		while (n % i == 0) {
			if (!first) printf("*");
			printf("%d", i);
			n /= i;
			first = 0;
		}
	}
	if (n > 1) {
		if (!first) printf("*");
		printf("%d", n);
	}	
	return 0;
}