#include <stdio.h>

int main () {
	int n;
	printf("Nhap so phan tu cua mang: ");
	scanf("%d", &n);
	int a[n];
	printf("Nhap cac phan tu cua mang:\n");
	for (int i = 0; i < n; i++) {
		scanf("%d", &a[i]);
	}
	for (int i = 0; i < n - 1; i++) {
		for (int j = i + 1; j < n; i++) {
			if (a[i]>a[j]) {
				int temp = a[i];
				a[i]=a[j];
				a[j]=temp;
			}
		}
	}
	printf("Mang sau theo thu tu tang dan:\n");
	for (int i = 0; i < n; i++) {
		printf("%d", &a[i]);
	}
	printf("\n");
	return 0;
}