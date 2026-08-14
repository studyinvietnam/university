#include <stdio.h>

int main() {
    int a[] = {10, 20, 30, 40, 50, 60, 70};
    int n = sizeof(a) / sizeof(a[0]);

    int tong = 0;
    for (int i = 0; i < n; i++) {
        tong += a[i];
    }

    float trung_binh = (float)tong / n;

    int tong_lon_hon_tb = 0;
    int dem_chan = 0;

    for (int i = 0; i < n; i++) {
        if (a[i] > trung_binh) {
            tong_lon_hon_tb += a[i];
        }
        if (a[i] % 2 == 0) {
            dem_chan++;
        }
    }

    if (dem_chan != 0) {
        float S = (float)tong_lon_hon_tb / dem_chan;
        printf("S = %.2f\n", S);
    } else {
        printf("Loi: Khong co so chan.\n");
    }

    return 0;
}
