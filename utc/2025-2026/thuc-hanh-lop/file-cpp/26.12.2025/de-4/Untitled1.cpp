#include <stdio.h>
#include <string.h>

typedef struct{
	char hoten[50];
	float thang1, thang2, thang3;
	float tong;
} NhanVien;

int main() {
	int n;
	FILE *f = fopen ("D:\\bai tap dh\\thuc-hanh-lop\\file-cpp\\26.12.2025\\de-4\\nhanvien.txt", "r");
	if (f == NULL) {
		printf("Loi file nhanvien.txt\n");
		return 1;
	}
	fscanf(f, "%d", &n);
	int i;
	NhanVien nv[100];
	for(int i = 0; i < n; i++) {
		fgets(nv[i].hoten, 100, f);
		nv[i].hoten[strcspn(nv[i].hoten, "\n")] = 0;
		fscanf(f, "%f %f %f\n", &nv[i].thang1, &nv[i].thang2, &nv[i].thang3);
		nv[i].tong = nv[i].thang1 + nv[i].thang2 + nv[i].thang3;
	}
	fclose(f);
	for (int i = 0; i < n - 1; i++) {
		for (int j = i + 1;j < n; j++) {
			if (nv[i].tong<nv[j].tong){
				NhanVien temp = nv[i];
				nv[i] = nv[j];
				nv[j] = temp;
			}
		}
	}
	printf("3 nguoi co tong luong cao nhat\n");
	for (int i = 0; i < 3; i++) {
	printf("%s | Thang 1: %.lf | Thang 2: %.lf | Thang 3: %.lf | Tong: %.lf\n", nv[i].hoten, nv[i].thang1, nv[i].thang2, nv[i].thang3, nv[i].tong);
	}
	return 0;
}