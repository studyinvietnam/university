#include <stdio.h>

int main () {
	int a[]={1,2,3,4};
	int n = sizeof(a)/sizeof(a[0]);
	int tich_chan=1;
	int tong_le=0;
	for (int i = 0; i < n; i++) {
		if (a[i] % 2 == 0) {
			tich_chan *= a[i];
		} else {
			tong_le += a[i];
		}
	}
	if (tong_le != 0) {
		double S = (double)tich_chan / tong_le;  
		printf("Ket qua S = %.2lf", S);  
	} else {
		printf("Khong co so le de chia.\n");
	}
	return 0;
}