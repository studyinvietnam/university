#include <stdio.h>

void inDaThuc (int heSo[], int n) {
	int laHienThiDauTien = 1;
	for (int i = 0; i < n; i++) {
		if (heSo[i] == 0) {
			continue;
		}
		if (laHienThiDauTien) {
			if (heSo[i] < 0) {
				printf("- ");
			}
			else if (heSo[i] > 0 && i != 0) {
				printf("+ ");
			}
			laHienThiDauTien = 0;
		}
		else {
            if (heSo[i] < 0) {
            	printf("- ");
			}
			else {
                printf("+ ");
            }
		}
		if (i == 0) {
            printf("%d ", heSo[i]);
        } 
		else if (i == 1) {
            printf("%dx ", heSo[i]);
        } 
        else {
        	printf("%dx^%d ", heSo[i], i);
		}
	}
		printf("\n");
}


		int main() {
			int n;
			printf("Nhap so luong he so cua da thuc: ");
			scanf("%d", &n);
			int heSo[n];
			printf("Nhap cac he so:\n");
			for (int i = 0; i < n; i++) {
				printf("a[%d] = ", i);
				scanf("%d", &heSo[i]);
			}
			printf("Da thuc: ");
			inDaThuc(heSo, n);
			return 0;
		}