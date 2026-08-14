#include <stdio.h>

int main () {
	float a, b;
	printf("Nhap a, b:\n");
	printf("a = ");
	scanf("%lf", &a);
	printf("b = ");
	scanf("%lf", &b);
	if (!a) printf(b ? "Vo nghiem\n" : "Vo so nghiem");
	else printf("x = %g\n", -b/a);
	return 0;
}