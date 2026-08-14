# include <stdio.h>
int main () {
	int n;
	printf("Nhap so phan tu cua mang: ");
	scanf("%d", &n);
	int a[n];
	printf("Nhap cac phan tu cua mang:\n");
	for (int i = 0; i < n; i++) {
		printf("a[%d] = ", i);
		scanf("%d", &a[i]);
	}
	int max = a[0];
	int min = a[0];
	for (int i = 1; i < n; i++) {
		if (a[i] > max) {
			max = a[i];
		}
		if (a[i] < min) {
			min = a[i];
		}
		printf("Phan tu lon nhat trong mang la: %d\n", max);
		printf("Phan tu nho nhat trong mang la: %d\n", min);
		return 0;
	}
}