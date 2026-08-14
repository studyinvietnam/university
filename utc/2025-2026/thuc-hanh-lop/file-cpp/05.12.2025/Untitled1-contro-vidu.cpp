#include <stdio.h>
#include <stdlib.h>

int main() {
    int n;

    // Nhập n hợp lệ
    do {
        printf("Vui long nhap n (1 <= n < 100): ");
        scanf("%d", &n);
        if (n <= 0 || n >= 100) {
            printf("Gia tri n khong hop le, vui long nhap lai!\n");
        }
    } while (n <= 0 || n >= 100);

    // Cấp phát bộ nhớ bằng con trỏ
    int *a = (int *)malloc(n * sizeof(int));
    if (a == NULL) {
        printf("Khong cap phat duoc bo nho!\n");
        return 1;
    }

    // Nhập mảng
    for (int i = 0; i < n; i++) {
        printf("a[%d] = ", i);
        scanf("%d", a + i);
    }

    // Mở file để ghi
    FILE *f = fopen(
        "D:\\bai tap dh\\thuc-hanh-lop\\file-cpp\\05.12.2025\\Untitled1-contro-vidu-ketqua.txt",
        "w"
    );

    if (f == NULL) {
        printf("Khong mo duoc file!\n");
        free(a);
        return 1;
    }

    // Kiểm tra 3 phần tử liên tiếp có số 2 hay không
    int found = 0;
    for (int i = 0; i <= n - 3; i++) {
        if (*(a + i) == 2 || *(a + i + 1) == 2 || *(a + i + 2) == 2) {
            found = 1;
            break;
        }
    }

    // Ghi kết quả ra file
    if (found) {
        fprintf(f, "Yes\n");
        printf("Yes\n");
    } else {
        fprintf(f, "No\n");
        printf("No\n");
    }

    // Đóng file & giải phóng bộ nhớ
    fclose(f);
    free(a);

    return 0;
}
