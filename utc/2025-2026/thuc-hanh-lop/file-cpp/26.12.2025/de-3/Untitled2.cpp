#include <stdio.h>
#include <math.h>

typedef struct {
	float x, y;
	float khoangcach;
} Diem;

int main() {
	int n;
	Diem d[50];
	FILE *f = fopen("D:\\bai tap dh\\thuc-hanh-lop\\file-cpp\\26.12.2025\\de-3\\bai2.inp", "r");
	if (f == NULL) {
		printf("Khong mo duoc file bai2.inp\n");
		return 1;
	}
	fscanf(f, "%d\n", &n);
	for (int i = 0; i < n; i++) {
		fscanf(f, "%f %f\n", &d[i].x, &d[i].y);
		d[i].khoangcach = sqrt((d[i].x-5)*(d[i].x-5)+(d[i].y-5)*(d[i].y-5));
	}
	fclose(f);
    for (int i = 0; i < n; i++) {
        for (int j = i + 1; j < n; j++) {
            if (d[i].khoangcach > d[j].khoangcach) {
                Diem temp = d[i];
                d[i] = d[j];
                d[j] = temp;
            }
        }
    }
	printf("II.Bai 2\n");
	printf("---3 diem gan diem A(5,5) nhat---\n");
	for (int i = 0; i < n; i++) {
		printf("Diem: (%.2f, %.2f) | Khoang cach: %.2f\n", d[i].x, d[i].y, d[i].khoangcach);
	}
	return 0;
}