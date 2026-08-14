#include <stdio.h>

int main (){
	int a,b,c;
	printf("Nhap 3 so nguyen (a,b,c < 10^6): ");
	scanf("%d %d %d", &a, &b, &c);
	double trungbinh = (a+b+c)/3;
	printf("Trung binh cong 3 so nguyen tren la: %.2lf\n", trungbinh);
	return 0;
}