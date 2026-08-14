#include <stdio.h>

int main () {
	int n;
	printf("Nhap so phan tu n: ");
	scanf("%d", &n);
	int a[n];
	int i;
	printf("Nhap cac phan tu:\n");
	for (i = 0; i < n; i++) {
		printf("a[n] = ", n);
		scanf("%d", &a[i]);	
	}
	double S=a[0];
	for (int i = 2; i < n; i+=2) {
		S += (double)a[i] / a[i - 1];
	}
	printf("Gia tri S = %.4f\n", S);
	return 0;
}