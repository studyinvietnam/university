#include <stdio.h>

int main () {
	double xC, yC, R, xM, yM, d;
	printf("Nhap toa do tam C(xC, yC)\n");
	printf("xC = ");
	scanf("%lf", &xC);
	printf("yC = ");
	scanf("%lf", &yC);
	
	printf("Nhap toa do tam M(xM, yM)\n");
	printf("xM = ");
	scanf("%lf", &xM);
	printf("yM = ");
	scanf("%lf", &yM);
	
	printf("Nhap ban kinh R = ");
	scanf("%lf", &R);
	
	d = R * R - ((xM - xC) * (xM - xC) + (yM - yC) * (yM - yC));
	printf("=> d = %g\n", d);
	if (d>0) printf("=> M nam trong C()\n");
		else if (d<0) printf("=> M nam ngoai C()\n");
			else printf("=> M nam tren C()\n");
	return 0;
}