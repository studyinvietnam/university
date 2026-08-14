#include <stdio.h>
#include <math.h>

double absolute_value_AB(double xA, double yA, double xB, double yB) {
    return sqrt((xB - xA) * (xB - xA) + (yB - yA) * (yB - yA));
}

int main () {
	float xA, yA, xB, yB;
	printf("A(xA,yA)\n");
	printf("xA = ");
	scanf("%f", &xA);
	printf("yA = ");
	scanf("%f", &yA);
	printf("B(xB,yB)\n");
	printf("xB = ");
	scanf("%f", &xB);
	printf("yA = ");
	scanf("%f", &yB);
	double distance = absolute_value_AB(xA, yA, xB, yB);
	printf("|AB| = ", distance);
	return 0;
}