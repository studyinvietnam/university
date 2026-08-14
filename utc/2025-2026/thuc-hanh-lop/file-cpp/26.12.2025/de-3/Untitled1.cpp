#include <stdio.h>
#include <string.h>

typedef struct {
	char hoten[100];
	float vong1, vong2, vong3;
	float tong;
} VanDongVien;

int main() {
	FILE *f = fopen("D:\\bai tap dh\\thuc-hanh-lop\\file-cpp\\26.12.2025\\de-3\\vandongvien.txt", "r");
	if (f == NULL) {
		printf("Khong mo duoc file vandongvien.txt\n");
		return 1;
	}
	int n;
	fscanf(f, "%d\n", &n);
	VanDongVien vdv[n];
	for (int i = 0; i < n; i++) {
		fgets(vdv[i].hoten, 100, f);
		vdv[i].hoten[strcspn(vdv[i].hoten, "\n")] = 0;
		fscanf(f, "%f %f %f\n", &vdv[i].vong1, &vdv[i].vong2, &vdv[i].vong3);
		vdv[i].tong = vdv[i].vong1 + vdv[i].vong2 + vdv[i].vong3;
	}
	fclose(f);
	for (int i = 0; i < n - 1; i++) { //i < n - 1
        for (int j = i + 1; j < n; j++) { //j = i + 1
            if (vdv[i].tong < vdv[j].tong) {
                VanDongVien temp = vdv[i];
                vdv[i] = vdv[j];
                vdv[j] = temp;
            }
        }
    }
    printf("I.Bai 1\n");
	printf("---3 thi sinh co tong diem cao nhat---\n");
	for (int i = 0; i < 3 && i < n; i++) {
		printf("Ho ten: %s | Vong 1: %.1f | Vong 2: %.1f | Vong 3: %.1f | Tong: %.1f\n", vdv[i].hoten, vdv[i].vong1, vdv[i].vong2, vdv[i].vong3, vdv[i].tong);
	}
}