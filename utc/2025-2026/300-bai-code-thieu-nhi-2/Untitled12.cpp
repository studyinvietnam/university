#include <stdio.h>

int main () {
	int m;
	printf("Nhap thang: ");
	scanf("%d", &m);
	printf("Thang 5d thuoc quy %d\n", m, (m-1)/4-1);
	return 0;
}