#include <stdio.h>

int main() {
    FILE *file = fopen("matran.txt", "r");
    if (file == NULL) {
        printf("Khong the mo file matran.txt\n");
        return 1;
    }

    int m, n;
    if (fscanf(file, "%d %d", &m, &n) != 2) {
        printf("Loi khi doc kich thuoc ma tran\n");
        fclose(file);
        return 1;
    }

    int matrix[m][n];
    for (int i = 0; i < m; i++) {
        for (int j = 0; j < n; j++) {
            if (fscanf(file, "%d", &matrix[i][j]) != 1) {
                printf("Loi khi doc gia tri ma tran tai dong %d, cot %d\n", i+1, j+1);
                fclose(file);
                return 1;
            }
        }
    }

    fclose(file);

    // Tinh trung binh cong cac phan tu le
    int sum = 0;
    int count = 0;
    for (int i = 0; i < m; i++) {
        for (int j = 0; j < n; j++) {
            if (matrix[i][j] % 2 != 0) {  // ki?m tra s? l?
                sum += matrix[i][j];
                count++;
            }
        }
    }

    if (count == 0) {
        printf("Khong co phan tu le trong ma tran.\n");
    } else {
        double average = (double)sum / count;
        printf("Trung binh cong cac phan tu le: %.2f\n", average);
    }

    return 0;
}