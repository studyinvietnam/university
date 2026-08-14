#include <stdio.h>

int main (){
	int n;
	printf("Nhap so luong phan tu cua mang: ");
	scanf("%d", &n);
	int a[n];
	float sum = 0;
	printf("Nhap cac phan tu cua mang:\n");
	for (int i = 0; i < n; i++) {
		printf("a[%d] = ", i);
		scanf("%d", &a[i]);
		sum += a[i];
	}
	float average = sum / n;
	printf("Trung binh cong cua cac phan tu trong mang la: %.2f\n", average);
	return 0;
}