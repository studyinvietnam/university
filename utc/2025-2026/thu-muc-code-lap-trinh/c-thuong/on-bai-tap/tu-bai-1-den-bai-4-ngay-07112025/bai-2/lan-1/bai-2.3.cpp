#include <stdio.h>

int main (){
	int n, i;
	int a[100];
	int sum = 0;
	printf("Nhap so phan tu cua mang: ");
	scanf("%d",&n);
	printf("Nhap cac phan tu cua mang:\n");
			for(i=0;i<n;i++){
			printf("a[%d] = ",i);
			scanf("%d",&a[i]);
			}
		for(i=0;i<n;i++){
			if(a[i] % 2 != 0) {
				sum += a[i];
			}
		}
		printf("Tong cac phan tu le trong mang la: %d",sum);
		return 0;
}