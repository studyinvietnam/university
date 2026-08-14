#include <stdio.h>

int main(){
	int choice;
    printf("=== CHON BAI TAP ===\n");
    printf("1. Bai 1: Dem so chan trong mang\n");
    printf("2. Bai 2: Tinh tong dac biet\n");
    printf("3. Bai 3: Tinh giai thua n!\n");
    printf("Nhap so bai: ");
    scanf("%d", &choice);
    
    switch (choice){
    	case 1: {
    		printf("=== BAI 1 ===\n");
    		int n, a[100], count = 0;
    		printf("Nhap n (<100): ");
    		scanf("%d", &n);
    		printf("Nhap %d phan tu: ", n);
    		for (int i = 0; i < n; i++)
    		scanf("%d", &a[i]);
    		for (int i = 0; i < n; i++)
    		if (a[i] % 2 == 0) count++;
            printf("So luong phan tu chan: %d\n", count);
			break;
		}
    	case 2: {
    		printf("=== BAI 2 ===\n");
    		int n, a[100];
    		int res = 0;
    		printf("Nhap n (<100): ");
    		scanf("%d", &n);
    		printf("Nhap %d phan tu: ", n);
    		for (int i = 0; i < n; i++)
    		scanf("%d", &a[i]);
    		for (int i = 0; i < n; i++) {
    			if ( i % 2 == 0)
				res += a[i];
    			else res -= a[i];
			}
			printf("Ket qua = %d\n", res);
			break;
		}
    	case 3: {
    		printf("=== BAI 3 ===\n");
    		int n;
    		printf("Nhap n: ");
    		scanf("%d", &n);
    		long long gt = 1;
    		for (int i = 1; i <= n; i++) gt *= i;
    		printf("Ket qua: %lld\n", gt);
			break;
		}
		default:
			printf("Khong co bai nay!\n");
			break;
		
	}
    
	return 0;
}