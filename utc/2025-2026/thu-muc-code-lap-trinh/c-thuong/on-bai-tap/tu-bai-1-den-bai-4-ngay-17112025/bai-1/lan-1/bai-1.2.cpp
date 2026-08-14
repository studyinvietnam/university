#include <stdio.h>
#include <stdbool.h>

bool so_nguyen_to(int n) {
    if (n <= 1) return false;
    for (int i = 2; i * i <= n; i++) {
        if (n % i == 0) return false;
    }
    return true;
}

int main () {
	int a[]={2,3,4,5,6,7};
	int n = sizeof(a) / sizeof(a[0]);
	int tong_binh_phuong=0;
	int tong_so_nguyen_to=0;
	for (int i = 0; i < n; i++) {
		tong_binh_phuong += a[i] * a[i];
		if (so_nguyen_to(a[i])) {
			tong_so_nguyen_to += a[i];
		}
	}
	if (tong_so_nguyen_to!=0) {
		double ket_qua = (double)tong_binh_phuong / tong_so_nguyen_to;
		printf("Ket qua S = %.2lf", ket_qua);
	} else {
		printf("Khong co so nguyen to trong day.\n");
	}
	return 0;
}
