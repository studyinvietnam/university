# include <stdio.h>

int main (){
	int a,b,c;
	int count = 0;
	
	printf("Nhap 3 so a, b, c: ");
	scanf("%d %d %d", &a, &b, &c);
	
	if (a % 2 == 0) count++;
	if (b % 2 == 0) count++;
	if (c % 2 == 0) count++;
	
	printf("So luong chan trong 3 so la: %d\n", count);
	
	return 0;
}