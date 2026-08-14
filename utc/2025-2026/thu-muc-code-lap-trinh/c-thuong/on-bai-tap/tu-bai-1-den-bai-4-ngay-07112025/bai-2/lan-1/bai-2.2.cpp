#include <stdio.h>

int main() {
    int n, i;
    int sum = 0;
    int a[100];
    printf("Nhap so phan tu cua mang: ");
    scanf("%d", &n);
    printf("Nhap cac phan tu cua mang:\n");
    for (i = 0; i < n; i++) {
    	printf ("a[%d] = ", i+1);
    	scanf ("%d", &a[i]);
	}
    for (i = 0; i < n; i++) {
    	if (a[i] % 2 == 0) {
    		sum += a[i];
		}
}
		printf("Tong cac phan tu chan trong mang la: %d\n", sum);
		return 0;
}
