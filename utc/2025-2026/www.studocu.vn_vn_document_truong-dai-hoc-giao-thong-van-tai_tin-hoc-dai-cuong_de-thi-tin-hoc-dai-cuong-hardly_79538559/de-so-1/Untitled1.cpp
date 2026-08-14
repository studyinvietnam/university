#include <stdio.h>

int UCLN(int x, int y) {
	while (y != 0) {
		int r = x % y;
		x = y;
		y = r;
	}
	return x;
}

int main () {
	
	printf("I. Bai 1\n");
	int x, y;
	printf("Nhap 2 so nguyen duong:\n");
	printf("x = ");
	scanf("%d", &x);
	printf("y = ");
	scanf("%d", &y);
	printf("UCLN(%d, %d) = %d", x, y, UCLN(x, y));
	
	printf("II. Bai 2\n");
	int n;
	printf("Nhap so phan tu n: ");
	scanf("%d", &n);
	int i;
	int a[100];
	printf("Nhap lan luot %d gia tri sau day:\n");
	for(i = 0; i <= n; i++) {
		printf("a[%d] = ", i);
		scanf("%d", &a[i]);
	}
	int dem = 0;
	for(i = 0; i <= n - 1; i++) {
		if((a[i] % 2 == a[i + 1] % 2) && (a[i + 1] > a[i])) {
			dem++;
		}
	}
	printf("\nSo cap cung chan/le va so sau lon hon: %d", dem);
	int tang = 1;
	for (int i = 0; i < n - 1; i++) {
		if (a[i] >= a[i + 1]) {
			tang = 0;
			break;
		}
	}
	if (tang)
		printf("\nDay so nay TANG DAN");
	else
		printf("\nDay so nay KHONG TANG DAN");
	
	return 0;
}