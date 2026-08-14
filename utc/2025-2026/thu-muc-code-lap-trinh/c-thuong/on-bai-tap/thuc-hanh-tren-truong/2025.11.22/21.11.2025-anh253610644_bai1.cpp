#include <stdio.h>
#include <math.h>

int main () {
    int n;
    printf("Nhap so nguyen duong n (n<10^4): ");
    scanf("%d", &n);

    double a[n];
    for (int i = 0; i < n; i++) {
        printf("a[%d] = ", i);
        scanf("%lf", &a[i]);		
    }

    int first = 1;

    for (int i = 0; i < n; i++) {
        double coef = a[i];
        int power = i;

        if (fabs(coef) < 1e-12) continue;  

        
        if (!first) {
            if (coef > 0) printf(" + ");
            else printf(" - ");
        } else {
            if (coef < 0) printf("-");
            first = 0;
        }

        double abs_coef = fabs(coef);

        
        if (power == 0) {
            printf("%g", abs_coef);
        } else {
            if (fabs(abs_coef - 1) > 1e-12) 
                printf("%g", abs_coef);

            printf("x");
            if (power > 1)
                printf("^%d", power);
        }
    }

    if (first)  
        printf("0");

    return 0;
}

