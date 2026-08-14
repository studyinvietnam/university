#include <stdio.h>
#include <math.h>
#define swap(a, b) {double t = a; a = b; b = t;}
#define eps 1e-10

int main() {
	double a,b,c;
	printf("Nhap 3 canh tam giac:\n");
	printf("a = ");
	scanf("%lf", &a);
	printf("b = ");
	scanf("%lf", &b);
	printf("c = ");
	scanf("%lf", &c);
	if (a > b) swap (a, b);
	if (a > c) swap (a, c);
	if (b > c) swap (b, c);
	if (a > 0 && a + b > c) {
		if (a == c) printf ("Tam giac deu\n");
		else if (fabs((c+a)*(c-a)-b*b)<eps)
			if (a == b || b == c) printf("Tam giac vuong can\n");
			else printf("Tam giac vuong\n");
		else
			if (a == b || b == c) printf("Tam giac can\n");
			else printf("Tam giac thuong\n");
		double p = (a+b+c)/2;
		printf("Dien tich S = %g\n",sqrt(p*(p-a)*(p-b)*(p-c)));
	}
	else printf ("khong hop le\n");
	return 0;
}