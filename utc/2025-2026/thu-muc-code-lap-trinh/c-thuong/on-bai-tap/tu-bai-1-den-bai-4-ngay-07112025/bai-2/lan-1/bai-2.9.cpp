# include <stdio.h>

int main () {
	int n;
	printf("Nhap so phan tu cua mang: ");
	scanf("%d", &n);
	int a[n];
	printf("Nhap cac phan tu cua mang:\n");
	for (int i = 0; i < n; i++){
		printf("a[%d] = ", i);
		scanf("%d", &a[i]);
	}
	int sum = 0;
	for (int i = 1; i < n; i += 2) {
		sum += a[i];
	}
	printf("Tong cac phan tu o vi tri le: %d", sum);
	return 0;
}