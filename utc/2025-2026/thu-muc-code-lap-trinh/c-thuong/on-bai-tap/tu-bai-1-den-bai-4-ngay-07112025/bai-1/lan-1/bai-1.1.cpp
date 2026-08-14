#include <stdio.h>

int main(){
	int a,b,c;
	printf("Nhap 3 so nguyen (a,b,c < 10^6): ");
	scanf("%d %d %d", &a, &b, &c);
	
	int min = a;
	if (b < min) min = b;
	if (c < min) min = c;
	printf("So nho nhat la: %d\n", min);
	return 0;
}