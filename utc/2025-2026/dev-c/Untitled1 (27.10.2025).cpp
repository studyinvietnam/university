#include <stdio.h>

int main() {
    int choice;
    printf("===== MENU BAI TAP =====\n");
    printf("1. Bai 4\n");
    printf("2. Bai 5\n");
    printf("=========================\n");
    printf("Chon bai: ");
    scanf("%d", &choice);

    switch (choice) {
        case 4: {
    double x, S = 0, mau = 0, luythua = 1;
    int n;

    printf("Nhap x, n: ");
    scanf("%lf %d", &x, &n);

    for (int i = 1; i <= n; i++) {
        luythua *= x;   // x^i
        mau += i;       // 1+2+...+i
        S += luythua / mau;
    }

    printf("S = %.6f", S);
}


        case 5: {

    int n, i, j, min, vt, tmp;
    printf("Nhap n: ");
    scanf("%d", &n);
    int a[n];
    for (i = 0; i < n; i++) scanf("%d", &a[i]);

   
    min = a[0]; vt = 0;
    for (i = 1; i < n; i++)
        if (a[i] < min) { min = a[i]; vt = i; }

    printf("Min = %d tai vi tri %d\n", min, vt+1);

  
    for (i = 0; i < n - 1; i++)
        for (j = i + 1; j < n; j++)
            if (a[i] > a[j]) { tmp = a[i]; a[i] = a[j]; a[j] = tmp; }

    for (i = 0; i < n; i++) printf("%d ", a[i]);

}


    return 0;
}
}
