#include <stdio.h>
#include <string.h>
#include <math.h>

void bai1() {
    int n;
    float x[100];
    double S = 2023;

    printf("Nhap so phan tu n: ");
    scanf("%d", &n);

    for (int i = 0; i < n; i++) {
        printf("x[%d] = ", i + 1);
        scanf("%f", &x[i]);
    }

    printf("Day so vua nhap: ");
    for (int i = 0; i < n; i++) {
        printf("%.2f ", x[i]);
    }
    printf("\n");

    for (int i = 0; i < n; i++) {
        S += pow(-1, i + 2) * pow(x[i], i + 1); //<math.h>
    }

    printf("Gia tri bieu thuc S = %.2lf\n", S);
}

struct CauThu {
    char HT[50]; //Ho ten
    int SBT; //So ban thang
    int SP; //So phut thi dau
    int T; //Tien thuong
};

void bai2() {
    int n;
    struct CauThu ds[100];

    printf("\nNhap so cau thu: ");
    scanf("%d", &n);
    getchar(); // xoa bo nho dem

    for (int i = 0; i < n; i++) {
        printf("\nNhap thong tin cau thu %d:\n", i + 1);

        printf("Ho ten: ");
        fgets(ds[i].HT, sizeof(ds[i].HT), stdin);
        ds[i].HT[strcspn(ds[i].HT, "\n")] = '\0'; //<string.h>

        printf("So ban thang: ");
        scanf("%d", &ds[i].SBT);

        printf("So phut thi dau: ");
        scanf("%d", &ds[i].SP);
        getchar();

        // Tinh tien thuong
        if (ds[i].SBT >= 3 && ds[i].SP >= 500)
            ds[i].T = 5000000;
        else if (ds[i].SBT >= 3 || ds[i].SP >= 500)
            ds[i].T = 2000000;
        else
            ds[i].T = 0;
    }

    printf("\nDanh sach cau thu:\n");
    for (int i = 0; i < n; i++) {
        printf("%-20s | SBT: %d | SP: %d | Thuong: %d\n",
               ds[i].HT, ds[i].SBT, ds[i].SP, ds[i].T);
    }

    int maxT = ds[0].T;
    for (int i = 1; i < n; i++) {
        if (ds[i].T > maxT)
            maxT = ds[i].T;
    }

    printf("\nCau thu co tien thuong cao nhat (%d):\n", maxT);
    for (int i = 0; i < n; i++) {
        if (ds[i].T == maxT) {
            printf("%-20s | SBT: %d | SP: %d\n",
                   ds[i].HT, ds[i].SBT, ds[i].SP); //Ho ten - So ban thang - So phut thi dau
        }
    }
}

int main() {
	printf("Bai 1\n");
    bai1();
	printf("Bai 2\n");
    bai2();
    return 0;
}
