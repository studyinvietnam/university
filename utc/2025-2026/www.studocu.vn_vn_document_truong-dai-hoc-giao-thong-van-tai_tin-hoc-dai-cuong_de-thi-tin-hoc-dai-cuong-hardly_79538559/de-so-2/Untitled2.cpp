#include <stdio.h>
#include <math.h>

long long giaithua (int n){
	long long gt = 1;
	for (int i = 1; i<= n; i++) {
		gt *= i;
	}
	return gt;
}

int main () {
	printf("I. Bai 1:\n");
	int n;
	printf("Nhap n: ");
	scanf("%d", &n);
	printf("%d! = %lld\n", n, giaithua(n));
	printf("II. Bai 2:\n");
	int a[100];
	printf("Nhap so phan tu n: ");
	scanf("%d", &n);
	for(int i = 0; i < n; i++) {
		printf("a[%d] = ", i);
		scanf("%d = ", a[i]);
	}
	printf("Day so: ");
	for(int i = 0; i < n; i++) {
		printf("|a[%d] =  %d|", n, a[i]);
	}
	double tong = 0;
	for (int i = 0; i < n; i++) {
    	tong += (double)a[i] / (n - i);
		//a1^n + a2^(n-1) + … + an^1 ==> pow(a[i], n - i)
	}
	double S = sqrt(tong);
	int dx = 1;
	for (int i = 0; i < n / 2; i++) {
		// n/2 de tranh so sanh lap lai 2 lan
		dx = 0;
		break; //break; ===> THOAT NGAY LAP TUC
	}
	if(dx)
		printf("\nDay so DOI XUNG");
	else
		printf("\nDay so KHONG DOI XUNG");
}