#include <stdio.h>

int main (){
	int a,b,c;
	printf("Nhap 3 so nguyen (a,b,c < 10^6): ");
	scanf("%d %d %d", &a, &b, &c);
	int tong = a+b+c;
	printf("Tong 3 so nguyen tren la: %d\n", tong);
	return 0;
}