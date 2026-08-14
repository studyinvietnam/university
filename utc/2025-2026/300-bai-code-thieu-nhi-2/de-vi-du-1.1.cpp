#include <stdio.h>
#include <string.h>
#include <math.h>

void bai1() {
	int n;
    float x[1000]; //Khai bao bien
    double S;
	//
    printf("Nhap so phan tu n: ");
    scanf("%d", &n);
	//
	x[0] = 500;
	S = x[0];
	//
    for (int i = 1; i <= n; i++) {
        printf("x[%d] = ", i);
        scanf("%f", &x[i]);
    }
    //
    printf("Day so vua nhap: ");
    for (int i = 1; i <= n; i++) {
        printf("%.2f ", x[i]);
    }
    printf("\n");
    //
	for (int i = 1; i <= n; i++) {
        S += pow(-1, i + 1) * pow(x[i], i + 1); //<math.h>
    }
    //
    printf("Gia tri bieu thuc S = %.2lf\n", S);
}

struct SinhVien {
    char HT[50]; //Ho ten
    //char name[50]: mang ky tu (chuoi)
    //char s[100]: luu chuoi ky tu
    int DTB; //Diem trung binh
    int STC; //So tin chi
    int HB; //Hoc bong
};

void bai2() {
    int n;
    struct SinhVien ds[100];

    printf("Nhap so sinh vien: ");
    scanf("%d", &n);
    getchar(); // xoa bo nho dem

    for (int i = 0; i < n; i++) {
        printf("Nhap thong tin sinh vien thu %d:\n", i + 1);

        printf("Ho ten: ");
        fgets(ds[i].HT, sizeof(ds[i].HT), stdin);
        ds[i].HT[strcspn(ds[i].HT, "\n")] = '\0'; //<string.h>

        printf("So diem trung binh: ");
        scanf("%d", &ds[i].DTB);

        printf("So tin chi: ");
        scanf("%d", &ds[i].STC);
        getchar(); // xoa bo nho dem

        // Tinh tien hoc bong
        if (ds[i].DTB >= 8 && ds[i].STC >= 20)
            ds[i].HB = 3000000;
        else if (ds[i].DTB >= 8 || ds[i].STC >= 20)
            ds[i].HB = 1500000;
        else
            ds[i].HB = 0;
    }

    printf("\nDanh sach sinh vien:\n");
    for (int i = 0; i < n; i++) {
        printf("%-20s | DTB: %d | STC: %d | Hoc bong: %d\n", ds[i].HT, ds[i].DTB, ds[i].STC, ds[i].HB);
    }

    int maxHB = ds[0].HB;
    for (int i = 1; i < n; i++) {
        if (ds[i].HB > maxHB)
            maxHB = ds[i].HB;
    }

    printf("\nCau thu co tien thuong hoc bong cao nhat (%d):\n", maxHB);
    for (int i = 0; i < n; i++) {
        if (ds[i].HB == maxHB) {
            printf("%-20s | DTB: %d | STC: %d\n",
                   ds[i].HT, ds[i].DTB, ds[i].STC); //Ho ten - Diem trung binh - So tin chi
        }
    }
}

int main() {
	printf("Bai 1\n");
    bai1();
	printf("\nBai 2\n");
    bai2();
    return 0;
}