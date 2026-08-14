#include <stdio.h>

int main () {
	int n;
	printf("Nhap so phan tu cua n: ");
	scanf("%d", &n);
	int a[n];
	for (int i = 0; i < n; i++) {
		printf("a[%d] = ", i+1);
		scanf("%d", &a[i]);
	}
	int start_index = -1;
	for (int i = 0; i < n; i++) {
		if (a[i]%2==0) {
		start_index = i;
		break;
		}
	}
	if (start_index == -1) {
		printf("Khong tim thay so chia het cho 2 trong mang.\n");
	} else {
		printf("Cac phan tu o vi tri chan bat dau tu phan tu chia het cho 2:\n");
		for (int i = start_index; i < n; i += 2) {
		printf("a[%d] = %d\n", i+1, a[i]);	
		}
	}
    return 0;
}
