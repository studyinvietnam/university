# include <stdio.h>
int main () {
	int n;
	printf("Nhap so phan tu cua n: ");
	scanf("%d", &n);
	int a[n];
	float sum = 0;
	printf("Nhap cac phan tu cua mang:\n");
	for (int i = 0; i < n; i++) {
		printf("a[%d] = ", i+1);
		scanf("%d", &a[i]);
		sum += a[i];
	}
	float avg = sum / n;
	int count = 0;
	for (int i = 0; i < n; i++) {
		if (a[i] > avg) {
			count++;
		}
	}
	printf("Trung binh cong cua mang la: %.2f\n", avg);
	printf("Co %d so lon hon trung binh cong", count);
}