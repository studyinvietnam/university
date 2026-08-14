#include <stdio.h>

int main () {
	int n;
	printf("Nhap so luong phan tu n: ");
	scanf("%d", &n);
	int i;
	int a[n];
	printf("Nhap cac phan tu n:\n");
	for (i = 0; i < n; i++) {
		printf("a[%d] = ", i);
		scanf("%d", &a[i]);
	}
	int tong = 0;
	double tich = 1.0;
	int coTich = 0;
	for (int i = 0; i < n; i++) {
		if (a[i] % 3 == 0) {
			tong += a[i];
		}
		else {
			tich *= (double)a[i];
			coTich = 1;
		}
	}
	if (coTich == 0) {
		printf("Do o tich khong co phan tu nao khong chia het cho 3 (hoac co 0 trong phan tu) nen khong tinh duoc S.\n");
	}
	else {
		double S = tong / tich;
		printf("S = %.3f\n", S);
	}
	return 0;
}
	