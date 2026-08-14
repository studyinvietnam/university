#include <stdio.h>
#include <math.h>

int main () {
	int n, m;
	printf("Nhap so hang va cot cua ma tran n*m:\n");
	printf("So hang: n = ");
	scanf("%d", &n);
	printf("So cot: m = ");
	scanf("%d", &m);
	int a[100][100];
	printf("Nhap phan tu cua cac ma tran:\n");
		for (int i = 0; i < n ; i++) {
			for (int j = 0; j < m ; j++) {
				printf("a[%d][%d] = ", i, j);
				scanf("%d", &a[i][j]);
			}
		}
			int tongmax = 0;
			for (int i = 0; i < n ; i++) {
				int maxrow = a[i][0];
				for (int j = 0; j < m ; j++) {
					if (a[i][j] > maxrow)
					maxrow = a[i][j];
				}
				tongmax += maxrow;
			}
			printf("\nTong cac so lon nhat tren tung hang = %d\n", tongmax);
			return 0;
}
