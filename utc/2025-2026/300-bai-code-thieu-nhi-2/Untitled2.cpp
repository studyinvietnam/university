#include <stdio.h>
#include <math.h>

double getX(double x[3], double y[3]) {
    double m12, m23, xc_num, xc_denom;
    m12 = (y[1] - y[0]) / (x[1] - x[0]);
    m23 = (y[2] - y[1]) / (x[2] - x[1]);
    xc_num = m12 * m23 * (y[0] - y[2]) + m23 * (x[0] + x[1]) - m12 * (x[1] + x[2]);
    xc_denom = 2 * (m23 - m12);
    return xc_num / xc_denom;
}

double getY(double x[3], double y[3], double xc) {
    double m12 = (y[1] - y[0]) / (x[1] - x[0]);
    return -(1 / m12) * (xc - (x[0] + x[1]) * (1.0 / 2.0)) + (y[0] + y[1]) * (1.0 / 2.0);
}

int main () {
	double x[3], y[3], xc, yc, r;
    for (int i = 1; i <= 3; i++) {
        printf("Nhap toa do (x,y) diem %d: ", i);
        scanf("%lf %lf", &x[i], &y[i]);
    }
    xc = getX(x, y);
    yc = getY(x, y, xc);
    r = sqrt((x[0]-xc) * (x[0]-xc) + (y[0]-yc) * (y[0]-yc));
    printf("C((%.1f, %.1f), r = %.1f)\n", xc, yc, r);
    return 0;
}