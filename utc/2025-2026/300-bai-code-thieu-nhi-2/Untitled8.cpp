#include <stdio.h>

int main () {
	int a, b, c, t;
	printf("Nhap a, b, c:\n");
	printf("a = ");
	scanf("%d", &a);
	printf("b = ");
	scanf("%d", &b);
	printf("c = ");
	scanf("%d", &c);
	if (a < b) {t=a;a=b;b=t;}
	if (a < c) {t=a;a=c;c=t;}
	if (b < c) {t=b;b=c;c=t;}
	printf("Tang dan: %d %d %d\n", c, b, a);
	return 0;
}