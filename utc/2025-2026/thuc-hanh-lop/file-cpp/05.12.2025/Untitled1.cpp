#include <stdio.h>

int main () {
	int n;
	do {
		printf("Vui long nhap n (n<=100): ");
		scanf("%d", &n);
		if (n<=0 || n>=100) {
			printf("Ban da nhap sai gia tri n, xin vui long nhap lai gia tri n.\n");
		}
	}
	while (n<=0 || n>=100);
	int i;
	int a[i];
	for (i = 0; i <= n; i++) {
		printf("a[%d] = ", n);
		scanf("%d", &a[i]);
	}
	for (i = 0; i < n - 2; i++) {
		if (a[i] == 2 || a[i+1] == 2 || a[i+2] == 2) {
			printf("Yes.\n");
			return 0;
		}
		else {
			printf("No.\n");
			return 0;
		}
	}
}