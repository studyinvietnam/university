#include <stdio.h>
#include <string.h> //Bai 1: ts[i].hoten[strcspn(ts[i].hoten, "\n")] = 0;
#include <math.h> //Bai 2: d[i].kc = fabs(d[i].y);

typedef struct {
	char hoten[100];
	float toan, li, hoa;
	float tong;	
}
ThiSinh;

void bai1() {
	FILE *f = fopen("D:\\bai tap dh\\thuc-hanh-lop\\file-cpp\\26.12.2025\\danhsach.txt", "r");
	if (f == NULL) {
		printf("Khong mo duoc file danhsach.txt\n");
		return;
	}
	int n;
	fscanf(f, "%d\n", &n);
	ThiSinh ts[n];
	for (int i = 0; i < n; i++) {
		fgets(ts[i].hoten, 100, f);
		ts[i].hoten[strcspn(ts[i].hoten, "\n")] = 0;
		fscanf(f, "%f %f %f\n", &ts[i].toan, &ts[i].li, &ts[i].hoa);
		ts[i].tong = ts[i].toan + ts[i].li + ts[i].hoa;
	}
	fclose(f);
    for (int i = 0; i < n - 1; i++) {
        for (int j = i + 1; j < n; j++) {
            if (ts[i].tong < ts[j].tong) {
                ThiSinh temp = ts[i];
                ts[i] = ts[j];
                ts[j] = temp;
            }
        }
    }
	printf("I.Bai 1\n");
	printf("---3 thi sinh co tong diem cao nhat---\n");
	for (int i = 0; i < 3 && i < n; i++) {
		printf("Ho ten: %s | Toan: %.1f | Li: %.1f | Hoa: %.1f | Tong: %.1f\n", ts[i].hoten, ts[i].toan, ts[i].li, ts[i].hoa, ts[i].tong);
	}
}

typedef struct {
	float x, y;
	float khoangcach;	
}
Diem;

void bai2() {
	int n;
	Diem d[50];
	FILE *f = fopen("D:\\bai tap dh\\thuc-hanh-lop\\file-cpp\\26.12.2025\\bai2.inp", "r");
	if (f == NULL) {
		printf("Khong mo duoc file bai2.inp\n");
		return;
	}
	fscanf(f, "%d\n", &n);
	for (int i = 0; i < n; i++) {
		fscanf(f, "%f %f\n", &d[i].x, &d[i].y);
		d[i].khoangcach = fabs(d[i].y);
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
	printf("---3 diem gan hoanh do nhat---\n");
	for (int i = 0; i < n; i++) {
		printf("Diem: (%.2f, %.2f) | Khoang cach: %.2f\n", d[i].x, d[i].y, d[i].khoangcach);
	}
}

int main() {
    bai1();
    bai2();
    return 0;
}
	
