#include <stdio.h>

int main () {
	int n;
	int m;
	int a[10][10];
	do {
		printf("Vui long nhap n,m (n,m<=10):\n");
		printf("n = ");
		scanf("%d", &n);
		printf("m = ");
		scanf("%d", &m);
		if (n<=0 || n>=10 || m<=0 || m>=10) {
			printf("Ban da nhap sai gia tri n hoac m, xin vui long nhap lai gia tri sai.\n");
		}
	}
	while (n<=0 || n>10 || m<=0 || m>10);
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < m; j++) {
            scanf("%d", &a[i][j]);
        }
    }

}