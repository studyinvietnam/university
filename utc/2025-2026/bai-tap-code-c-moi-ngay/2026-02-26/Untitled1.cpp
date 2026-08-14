#include <stdio.h>

void inMang(int a[], int n) {
    for (int i = 0; i < n; i++) {
        printf("%d ", a[i]);
    }
    printf("\n");
}

void bubbleSort(int a[], int n) {
    for (int i = 0; i < n - 1; i++) {
        for (int j = 0; j < n - 1 - i; j++) {
            if (a[j] > a[j + 1]) {
                // Hoán đổi
                int temp = a[j];
                a[j] = a[j + 1];
                a[j + 1] = temp;
            }
        }
    }
}

int main() {
    int n;
    printf("Nhap so phan tu n: ");
    scanf("%d", &n);

    int a[100];
    printf("Nhap %d phan tu:\n", n);
    for (int i = 0; i < n; i++) {
        scanf("%d", &a[i]);
    }

    printf("Mang truoc khi sap xep: ");
    inMang(a, n);

    bubbleSort(a, n);

    printf("Mang sau khi sap xep:  ");
    inMang(a, n);

    return 0;
}