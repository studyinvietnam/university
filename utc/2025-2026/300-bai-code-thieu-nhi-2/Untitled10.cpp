#include <stdio.h>
#include <math.h>

int main () {
	float a, b, c;
	printf("Nhap a, b, c:\n");
	printf("a = ");
	scanf("%f", &a);
	printf("b = ");
	scanf("%f", &b);
	printf("c = ");
	scanf("%f", &c);
	if (!a)
		if (!b) printf(c ? "Vo nghiem\n" : "Vo so nghiem\n");
		else printf("x = %g\n", -c/b);
	else {
		float d = b * b - 4 * a * c;
		if (d > 0) {
			printf("x1 = %g\n", (-b+sqrt(d))/(2*a));
			printf("x2 = %g\n", (-b-sqrt(d))/(2*a));
		}
		else if (d == 0) 
			printf("x1 = x2 = %g\n", - b/(2*a));
		else
			printf("Vo nghiem\n");
	}
	return 0;
}