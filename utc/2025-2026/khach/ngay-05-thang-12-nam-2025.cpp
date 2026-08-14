#include <stdio.h>
#include <string.h>

char MAX_N = 100;  

struct nhanvien {
    char holot[50];
    char ten[50];
    char gioitinh[10];
    char ngaysinh[20];
    float luong;
};

void nhapdanhsach(struct nhanvien *nv) {
    printf("Nhap ho lot: ");
    scanf(" %[^\n]%*c", nv->holot);
    printf("Nhap ten: ");
    scanf(" %[^\n]%*c", nv->ten);
    printf("Nhap gioi tinh (nam/nu): ");
    scanf(" %[^\n]%*c", nv->gioitinh);
    printf("Nhap ngay sinh: ");
    scanf(" %[^\n]%*c", nv->ngaysinh);
    printf("Nhap luong: ");
    scanf("%f", &nv->luong);
}

void indanhsachnhanvien(struct nhanvien ds[], int n) {
    printf("\n--- Danh sach nhan vien ---\n");
    for (int i = 0; i < n; i++) {
        printf("%s %s - %s - %s - %.2f\n",
               ds[i].holot, ds[i].ten, ds[i].gioitinh,
               ds[i].ngaysinh, ds[i].luong);
    }
}

void timluongcao(struct nhanvien ds[], int n) {
    int max = 0;
    for (int i = 1; i < n; i++) {
        if (ds[i].luong > ds[max].luong)
            max = i;
    }
    printf("\nNhan vien luong cao nhat: %s %s (%.2f)\n",
           ds[max].ten, ds[max].holot, ds[max].luong);
}

int demnam(struct nhanvien ds[], int n) {
    int dem = 0;
    for (int i = 0; i < n; i++) {
        if (strcmp(ds[i].gioitinh, "nam") == 0)
            dem++;
    }
    return dem;
}

void timten(struct nhanvien ds[], int n, char ten[]) {
    int found = 0;
    for (int i = 0; i < n; i++) {
        if (strcmp(ds[i].ten, ten) == 0) {
            printf("\nTim thay: %s %s - %s - %s - %.2f\n",
                   ds[i].holot, ds[i].ten, ds[i].gioitinh,
                   ds[i].ngaysinh, ds[i].luong);
            found = 1;
        }
    }
    if (!found) {
        printf("\nKhong tim thay ten %s\n", ten);
    }
}


float tongluong(struct nhanvien ds[], int n) {
    float tong = 0;
    for (int i = 0; i < n; i++)
        tong += ds[i].luong;
    return tong;
}

int main() {
    int n;
    struct nhanvien ds[(int)MAX_N];  

    printf("Nhap so luong nhan vien: ");
    scanf("%d", &n);

    for (int i = 0; i < n; i++) {
        printf("\nNhap nhan vien %d:\n", i + 1);
        nhapdanhsach(&ds[i]);
    }

    indanhsachnhanvien(ds, n);
    timluongcao(ds, n);

    printf("\nSo nhan vien nam: %d\n", demnam(ds, n));

    char ten[50];
    printf("\nNhap ten can tim: ");
    scanf(" %[^\n]%*c", ten);
    timten(ds, n, ten);

    printf("\nTong luong cong ty: %.2f\n", tongluong(ds, n));

    return 0;
}
