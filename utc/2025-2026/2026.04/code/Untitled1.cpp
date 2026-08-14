#include <stdio.h>

int main() {
    int n, x;

    // Nhập số lượng phần tử
    printf("Nhap so luong so nguyen N: ");
    scanf("%d", &n);

    // Mở file để ghi
    FILE *f = fopen("numbers.txt", "w");
    if (f == NULL) {
        printf("Khong mo duoc file de ghi!\n");
        return 1;
    }

    // Nhập và ghi vào file
    printf("Nhap %d so nguyen:\n", n);
    for (int i = 0; i < n; i++) {
        scanf("%d", &x);
        fprintf(f, "%d\n", x);
    }

    fclose(f);

    // Mở file để đọc
    f = fopen("numbers.txt", "r");
    if (f == NULL) {
        printf("Khong mo duoc file de doc!\n");
        return 1;
    }

    int sum = 0;

    // Đọc từng số và tính tổng
    while (fscanf(f, "%d", &x) != EOF) {
        sum += x;
    }

    fclose(f);

    // In kết quả
    printf("Tong cac so trong file la: %d\n", sum);

    return 0;
}