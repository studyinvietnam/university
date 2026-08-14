#include <stdio.h>
#include <stdlib.h>
#include <math.h>

int songuyento(int n) {
    if (n < 2) return 0;
    if (n == 2) return 1;
    if (n % 2 == 0) return 0;
    for (int i = 3; i <= sqrt(n); i += 2) {
        if (n % i == 0)
            return 0;
    }
    return 1;
}

int cmp(const void *a, const void *b) {
    int x = *(int*)a;
    int y = *(int*)b;
    return x - y;
}

int main() {
    FILE *f = fopen("D:\\bai tap dh\\28tech\\c\\22._Bai_tap_File.pdf\\Bai_1._So_nguyen_to\\28tech_number.txt", "r");
    if (f == NULL) {
        printf("Loi file 28tech_number.txt!\n");
        return 1;
    }
    int a[100000];
    int n = 0, x;
    while (fscanf(f, "%d", &x) != EOF) {
        if (songuyento(x)) {
            a[n++] = x;
        }
    }
    fclose(f);
    qsort(a, n, sizeof(int), cmp);
    FILE *out = fopen("D:\\bai tap dh\\28tech\\c\\22._Bai_tap_File.pdf\\Bai_1._So_nguyen_to\\28tech_prime.txt", "w");
    if (out == NULL) {
        printf("Loi file 28tech_prime.txt!\n");
        return 1;
    }
    for (int i = 0; i < n; i++) {
        fprintf(out, "%d ", a[i]);
    }
    fclose(out);
    printf("Da loc va ghi cac so nguyen to thanh cong!\n");
    return 0;
}