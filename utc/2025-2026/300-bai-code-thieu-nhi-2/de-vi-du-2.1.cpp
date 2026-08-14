#include <stdio.h>
#include <math.h>
#include <string.h>

void bai1() {
	int n;
	float x[1000];
	double S;
	x[0] = 1000;
	S = x[0];
	printf("Nhap so phan tu n: "); scanf("%d", &n);
	printf("Vui long nhap tung so trong %d so tat ca.\n", n);
	for (int i = 1; i <= n; i++) {
		printf("x[%d] = ", i); scanf("%f", &x[i]);
	}
	printf("Day so vua nhap: ");
	for (int i = 1; i <= n; i++) { printf("%.2f ", x[i]);
	}
	printf("\n");
	for (int i = 1; i <= n; i++) {
		S += pow(-1, i + 1) * pow(x[i], i + 1);
	}
	printf("Gia tri bieu thuc S = %.2lf\n", S);
}

struct CongNhan {
	char HT[50];
	int NC;
	int LCB;
	int TL;
};

void bai2() {	
}

int main() {
	printf("Bai 1\n");
	bai1();
	printf("\nBai 2\n");
	bai2();
	return 0;
}