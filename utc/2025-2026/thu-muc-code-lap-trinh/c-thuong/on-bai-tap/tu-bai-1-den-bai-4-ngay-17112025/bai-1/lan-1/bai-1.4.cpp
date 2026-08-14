#include <stdio.h>

int main () {
	int a[]={1,-2,3,-4,5};
	int n = sizeof(a)/sizeof(a[0]);
	int tong_i_a=0;
	int tong_duong=0;
	for (int i = 0; i < n; i++) {
		tong_i_a += (i+1) * a[i];
		if (a[i] > 0) {
			tong_duong += a[i];
		}
	}
	if (tong_duong!=0) {
		float S = (float)tong_i_a/tong_duong;
		printf("S=%.2f\n",S);
	}
		else{
			printf("Loi: Tong cac so duong bang 0.\n");
		}
	return 0;
}