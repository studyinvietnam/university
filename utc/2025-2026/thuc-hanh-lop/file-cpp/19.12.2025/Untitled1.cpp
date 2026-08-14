#include <stdio.h>

int main() {
	int n;
	do {
	 	printf("Vui long nhap n (n<=100): ");
	 	scanf("%d", &n);
	 	if (n<= 0 || n>=100) {
	 		printf("Ban da nhap sai gia tri n, xin vui long nhap lai gia tri n.\n");
		 }
	 }
	while (n<=0 || n>=100);
	int i;
	int a[100];
	printf("Vui long nhap phan tu n: ");
	scanf("%d", &n);
	printf("Vui long cac phan tu cua n:\n");
	for (i = 0; i < n; i++) {
		printf("a[%d] = ", i+1);
		scanf("%d", &a[i]);
	}
	for (int i = 0; i <= n - 3; i++) {
			// Gia su mang co n phan tu, chi so la: 0;  1;  2;  ...;  n-1
			// Ta can xet 3 so lien tiep: a[i], a[i+1], a[i+2]
			// => i + 2 = n - 1
			// <=> i = n - 3
		if (a[i] % 2 == 0 && a[i + 1] % 2 == 0 && a[i + 2] % 2 == 0) {
			printf("Yes\n");
		}
		else {
			printf("No\n");
		}
	}
	return 0;
}