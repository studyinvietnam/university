#include <stdio.h>
#include <math.h>

int main () {
	double S;
	printf("Nhap dien tich S: ");
	scanf("%lf", &S);
	printf("The tich V = %g\n", 4 * M_PI * (1.0f / 3.0f) * pow(sqrt(S/(4 * M_PI)),3));
	return 0;
}