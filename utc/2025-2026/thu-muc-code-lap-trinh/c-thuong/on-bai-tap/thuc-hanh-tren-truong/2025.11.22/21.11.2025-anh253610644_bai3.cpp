#include <stdio.h>

int main () {
	int n;
	printf("Nhap 1 so nguyen n: ");
	scanf("%d", &n);
	int a[100][100];
	printf("Nhap ma tran %d x %d (0 hoac 1):\n", n, n);
		for (int i = 0; i < n ; i++) {
			for (int j = 0; j < n ; j++) {
				printf("a[%d][%d] = ", i, j);
				scanf("%d", &a[i][j]);
			}
		}
		int ok = 1;
		for (int i = 0; i < n; i++) {
			for (int j = 0; j < n; j++) {
				if(a[i][j] == 1) {
					for (int k = 0; k < n; k++) {
						if (k != j && a[i][k] == 1)
						ok = 0;
					}
					for (int k = 0; k < n; k++) {
						if (k != i && a[k][j] == 1)
						ok = 0;
					}
					for(int k = 1; k < n; k++) {
						if (i+k<n && j+k<n && a[i+k][j+k] == 1)
						ok = 0;
						if (i+k<n && j-k>=0 && a[i+k][j-k] == 1)
						ok = 0;
						if (i-k>=0 && j+k<n && a[i-k][j+k] == 1)
						ok = 0;
						if (i-k>=0 && j-k>=0 && a[i-k][j-k] == 1)
						ok = 0;
					}
				}
			}
		}
		if(ok) {
		printf("yes\n");
			   }
		else {
        printf("no\n");
    		 }
		return 0;
}
