#include <stdio.h>

int main () {
	int n;
	printf("Nhap so phan tu cua mang:");
	scanf("%d", &n);
	int a[n];
	int i;
	printf("Nhap cac phan tu cua mang:\n");
	for (i = 0; i < n; i++) {
		printf("Phan tu a[%d]: ", i);
		scanf("%d", &a[i]);
	}
	int tuso = 0;
	int mauso = a[0] + a[n-1];
	for (i = 0; i < n/2; i++) {
		tuso += a[i] * a[n-1-i];
	}
	if (n % 2 != 0) {
		tuso += a[n / 2] * a[n / 2];
	}
	float S = float(tuso)/mauso;
	printf("Gia tri cua S la: %.2f\n", S);
	return 0;
}